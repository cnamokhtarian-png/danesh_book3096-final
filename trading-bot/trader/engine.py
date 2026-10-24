"""هسته‌ی اجرایی: از داده‌ی بازار تا تصمیم، ریسک، سفارش و گزارش.

ترتیب سخت‌گیرانه‌ی چرخه:

1. سوئیچ توقف (فایل STOP) بررسی می‌شود.
2. داده‌ی کندل و قیمت لحظه‌ای گرفته می‌شود.
3. حد ضرر/حد سود موقعیت باز بررسی می‌شود (اولویت مطلق).
4. استراتژی قاعده‌محور تصمیم می‌دهد.
5. هوش مصنوعی (اگر فعال باشد) فقط تأیید/وتو می‌کند.
6. لایه‌ی ریسک اندازه‌ی سفارش را تعیین می‌کند.
7. سفارش ثبت و نتیجه ثبت می‌شود.
8. گزارش به لاگ/تلگرام می‌رود.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

from .broker import BaseClient, ExchangeError, build_broker, build_live_client
from .config import Settings
from .db import Store
from .models import Action, Decision, OrderRequest, Position
from .notify.telegram import Notifier, TelegramNotifier
from .risk import MarketState, RiskConfig, RiskManager
from .strategy.ai import AiAdvisor
from .strategy.rules import RuleConfig, Snapshot, build_snapshot, decide
from .util import fmt_number, fmt_pct, register_secrets, sleep_until, today_utc, utc_now_iso

logger = logging.getLogger("trader.engine")


@dataclass
class CycleResult:
    ts: str = field(default_factory=utc_now_iso)
    price: float = 0.0
    equity: float = 0.0
    snapshot: Snapshot | None = None
    decision: Decision | None = None
    executed: bool = False
    note: str = ""


class Engine:
    def __init__(
        self,
        settings: Settings,
        store: Store | None = None,
        broker: BaseClient | None = None,
        notifier: Notifier | None = None,
        market: BaseClient | None = None,
    ) -> None:
        settings.validate()
        register_secrets(settings.secret_values())
        self.settings = settings
        settings.ensure_dirs()

        self.store = store or Store(settings.db_path)
        self.notifier = notifier or Notifier(
            TelegramNotifier(settings.telegram_bot_token, settings.telegram_chat_id)
        )
        self.rules = RuleConfig(
            ema_fast=settings.ema_fast,
            ema_slow=settings.ema_slow,
            ema_trend=settings.ema_trend,
            rsi_period=settings.rsi_period,
            atr_period=settings.atr_period,
            stop_loss_pct=settings.stop_loss_pct,
            take_profit_pct=settings.take_profit_pct,
        )
        self.risk = RiskManager(
            RiskConfig(
                max_position_pct=settings.max_position_pct,
                max_total_position_pct=settings.max_total_position_pct,
                max_daily_loss_pct=settings.max_daily_loss_pct,
                max_trades_per_day=settings.max_trades_per_day,
                cooldown_minutes=settings.cooldown_minutes,
                max_spread_pct=settings.max_spread_pct,
                min_trade_quote=settings.min_trade_quote_effective,
                quote_is_rial=settings.quote_is_rial,
                stop_loss_pct=settings.stop_loss_pct,
                take_profit_pct=settings.take_profit_pct,
            )
        )
        self.ai = AiAdvisor(
            enabled=settings.llm_enabled,
            api_key=settings.llm_api_key,
            model=settings.llm_model,
            base_url=settings.llm_base_url,
            timeout=settings.llm_timeout,
            min_confidence=settings.llm_min_confidence,
            mode=settings.ai_decision_mode,
        )

        self.state = self.store.load_state(settings.starting_cash_quote_effective)
        self.market: BaseClient = market or build_live_client(settings)
        self.broker: BaseClient | None = broker
        self._consecutive_errors = 0
        self._last_heartbeat = 0.0
        self._stopping = False

    # ------------------------------------------------------------ آماده‌سازی
    def bootstrap(self) -> None:
        s = self.settings
        self.notifier.notify(
            f"ربات در حالت {s.mode.upper()} شروع شد — {s.symbol}",
            f"صرافی: {s.exchange} | چرخه: هر {s.cycle_seconds} ثانیه | "
            f"حداکثر موقعیت: {s.max_position_pct}% | حد ضرر: {s.stop_loss_pct}%",
        )

        if s.is_live:
            balances = self.market.fetch_free_balances()
            quote_free = balances.get(s.quote_asset, 0.0)
            base_free = balances.get(s.base_asset, 0.0)
            tracked_cash = float(self.state["cash_quote"])
            if tracked_cash <= 0:
                tracked_cash = quote_free
            else:
                tracked_cash = min(tracked_cash, quote_free) if quote_free > 0 else tracked_cash
            self.state["cash_quote"] = tracked_cash
            if base_free < float(self.state["holdings"]) - 1e-9:
                logger.warning(
                    "موجودی %s در صرافی (%s) کمتر از موقعیت ثبت‌شده‌ی ربات (%s) است.",
                    s.base_asset,
                    fmt_number(base_free, 8),
                    fmt_number(float(self.state["holdings"]), 8),
                )
            if base_free > 0 and float(self.state["holdings"]) == 0:
                self.notifier.notify(
                    "دارایی از پیش موجود نادیده گرفته می‌شود",
                    f"{fmt_number(base_free, 8)} {s.base_asset} در حساب شما هست اما ربات آن را "
                    "مدیریت نمی‌کند (فقط موقعیت‌هایی را می‌فروشد که خودش خریده باشد).",
                    important=True,
                )
            self.store.save_state(
                cash_quote=self.state["cash_quote"],
                holdings=float(self.state["holdings"]),
                position_avg_price=float(self.state["position_avg_price"]),
                start_of_day_equity=float(self.state["start_of_day_equity"]),
                day=str(self.state["day"]),
                trades_today=int(self.state["trades_today"]),
                last_trade_ts=self.state["last_trade_ts"],
                peak_equity=float(self.state["peak_equity"]),
            )
        elif float(self.state["holdings"]) == 0:
            logger.info(
                "حالت کاغذی: سرمایه‌ی شبیه‌سازی‌شده %s %s",
                fmt_number(float(self.state["cash_quote"])),
                s.quote_asset,
            )

        if self.broker is None:
            self.broker = build_broker(
                s,
                cash=float(self.state["cash_quote"]),
                holdings=float(self.state["holdings"]),
            )
        if s.llm_enabled and not self.ai.enabled:
            logger.warning("LLM_ENABLED روشن است اما کلید مدل خالی است؛ تصمیم‌ها فقط قاعده‌محور می‌شوند.")
        if s.is_live:
            self.notifier.notify(
                "⚠️ معامله‌ی واقعی فعال است",
                "سفارش‌ها با پول واقعی ثبت می‌شوند. مطمئن شوید مجوز برداشت کلید API خاموش است.",
                important=True,
            )

    # --------------------------------------------------------------- چرخه
    def run_cycle(self) -> CycleResult:
        s = self.settings
        result = CycleResult()

        if s.kill_switch_path.exists():
            self._stopping = True
            self.notifier.notify(
                "سوئیچ توقف فعال است",
                f"فایل {s.kill_switch_path} وجود دارد؛ هیچ سفارشی ثبت نمی‌شود.",
                important=True,
            )
            return result

        self._sync_broker_state()

        candles = self.market.fetch_candles(s.candle_resolution, s.candle_lookback)
        if len(candles) < max(s.ema_slow, s.rsi_period) + 5:
            raise ExchangeError(
                f"کندل کافی دریافت نشد ({len(candles)} عدد). اندیکاتورها معتبر نیستند."
            )
        ticker = self.market.fetch_ticker()
        result.price = ticker.last

        snapshot = build_snapshot(candles, self.rules, int(s.candle_resolution or 5))
        result.snapshot = snapshot

        state = self._roll_day_if_needed(ticker.last)
        holdings = float(state["holdings"])
        position = Position(quantity=holdings, avg_price=float(state["position_avg_price"]))
        equity = self._equity(ticker.last)
        result.equity = equity
        daily_pnl_pct = self._daily_pnl_pct(equity, state)
        market_state = MarketState(
            price=ticker.last,
            spread_pct=ticker.spread_pct,
            equity_quote=equity,
            cash_quote=float(state["cash_quote"]),
            holdings=holdings,
            trades_today=int(state["trades_today"]),
            daily_pnl_pct=daily_pnl_pct,
            seconds_since_last_trade=(
                time.time() - float(state["last_trade_ts"])
                if state["last_trade_ts"] is not None
                else None
            ),
        )

        self._update_peak(equity)

        # 1) خروج اضطراری: حد ضرر / حد سود
        stop_hit, stop_reason = self.risk.should_stop_out(
            position, ticker.last, s.stop_loss_pct, s.take_profit_pct
        )
        if stop_hit:
            decision = Decision(Action.SELL, 1.0, stop_reason, source="risk")
        else:
            # 2) تصمیم قاعده‌محور
            decision = decide(snapshot, self.rules)
            # 3) نظر مدل هوش مصنوعی (فقط در صورت فعال بودن)
            if self.ai.enabled:
                risk_context = {
                    "symbol": s.symbol,
                    "timeframe_minutes": int(s.candle_resolution or 5),
                    "equity_quote": round(equity, 2),
                    "cash_quote": round(float(state["cash_quote"]), 2),
                    "position_value": round(holdings * ticker.last, 2),
                    "daily_pnl_pct": round(daily_pnl_pct, 2),
                    "max_position_pct": s.max_position_pct,
                }
                if self.ai.mode == "independent":
                    proposal = self.ai.propose(snapshot, position.is_open, risk_context)
                    if proposal is not None and proposal.action is not Action.HOLD:
                        decision = proposal
                    elif proposal is not None:
                        decision = proposal
                else:
                    decision = self.ai.review(snapshot, decision, position.is_open, risk_context)

        result.decision = decision

        if decision.action is Action.HOLD:
            self.store.log_decision(
                price=ticker.last,
                action=decision.action.value,
                confidence=decision.confidence,
                source=decision.source,
                status="hold",
                reason=decision.reason,
                snapshot=snapshot.as_dict(),
            )
            logger.info(
                "%s | قیمت %s | تصمیم: HOLD | %s",
                s.symbol,
                fmt_number(ticker.last),
                decision.reason,
            )
            self._maybe_heartbeat(ticker.last, equity)
            return result

        # 4) ریسک
        if decision.action is Action.BUY:
            if position.is_open:
                self.store.log_decision(
                    price=ticker.last,
                    action=decision.action.value,
                    confidence=decision.confidence,
                    source=decision.source,
                    status="skipped",
                    reason="موقعیت از قبل باز است؛ افزایش موقعیت مجاز نیست.",
                    snapshot=snapshot.as_dict(),
                )
                logger.info("سیگنال خرید داریم اما موقعیت باز است؛ نادیده گرفته شد.")
                return result
            if (ticker.ask - ticker.last) / ticker.last * 100 > s.max_slippage_pct:
                self.store.log_decision(
                    price=ticker.last,
                    action=decision.action.value,
                    confidence=decision.confidence,
                    source=decision.source,
                    status="skipped",
                    reason=f"فاصله‌ی قیمت خرید تا آخرین معامله بیش از {s.max_slippage_pct}% است.",
                    snapshot=snapshot.as_dict(),
                )
                return result
            verdict = self.risk.size_buy(market_state)
            limit_price = ticker.ask if ticker.ask > 0 else ticker.last
        else:
            verdict = self.risk.size_sell(market_state, decision)
            limit_price = ticker.bid if ticker.bid > 0 else ticker.last

        if not verdict.approved:
            self.store.log_decision(
                price=ticker.last,
                action=decision.action.value,
                confidence=decision.confidence,
                source=decision.source,
                status="blocked",
                reason=verdict.reason,
                snapshot=snapshot.as_dict(),
            )
            logger.info("سفارش %s رد شد: %s", decision.action.value, verdict.reason)
            return result

        quantity = self._quantize(verdict.quantity)
        if quantity <= 0:
            return result
        notional = quantity * limit_price
        if notional < s.min_trade_quote_effective:
            self.store.log_decision(
                price=ticker.last,
                action=decision.action.value,
                confidence=decision.confidence,
                source=decision.source,
                status="blocked",
                reason="حجم سفارش پس از گرد کردن کمتر از حداقل مجاز شد.",
                snapshot=snapshot.as_dict(),
            )
            return result

        # 5) ثبت سفارش
        client_id = self._new_client_id()
        if self.store.has_client_id(client_id):  # محافظت در برابر تکرار
            logger.warning("client_id تکراری %s؛ سفارش ارسال نشد.", client_id)
            return result

        request = OrderRequest(
            client_id=client_id,
            symbol=s.symbol,
            side=decision.action,
            quantity=quantity,
            price=limit_price,
            reason=decision.reason,
        )
        assert self.broker is not None
        order = self.broker.place_order(request)

        filled_qty = order.filled_quantity
        avg_price = order.avg_price or limit_price

        if order.ok and s.is_live and filled_qty <= 0:
            status, filled_qty, avg_price = _wait(self.broker, client_id, s.order_fill_timeout)
            if filled_qty <= 0:
                self.broker.cancel_order(client_id)
                order.ok = False
                order.status = status
                order.message = "سفارش در مهلت مقرر پر نشد و لغو شد."

        if not order.ok:
            self.store.log_decision(
                price=ticker.last,
                action=decision.action.value,
                confidence=decision.confidence,
                source=decision.source,
                status="failed",
                reason=order.message or "ثبت سفارش ناموفق",
                snapshot=snapshot.as_dict(),
            )
            self.notifier.notify(
                "سفارش ثبت نشد",
                f"{decision.action.value} {fmt_number(quantity, 8)} {s.base_asset} — {order.message}",
                important=True,
            )
            return result

        if filled_qty <= 0:
            filled_qty = quantity
            avg_price = avg_price or limit_price

        fee_quote = order.fee_quote or (filled_qty * avg_price * s.fee_pct / 100.0)
        self._apply_fill(decision.action, filled_qty, avg_price, fee_quote)
        self.store.log_trade(
            client_id=order.client_id or client_id,
            symbol=s.symbol,
            side=decision.action.value,
            mode=s.mode,
            quantity=filled_qty,
            price=avg_price,
            fee_quote=fee_quote,
            status=order.status,
            note=decision.reason[:300],
        )
        self.store.log_decision(
            price=avg_price,
            action=decision.action.value,
            confidence=decision.confidence,
            source=decision.source,
            status="executed",
            reason=decision.reason,
            snapshot=snapshot.as_dict(),
        )
        result.executed = True

        equity_after = self._equity(avg_price)
        self.store.snapshot_equity(
            equity_after, avg_price, float(self.state["cash_quote"]), float(self.state["holdings"])
        )
        self.notifier.notify(
            f"{'خرید' if decision.action is Action.BUY else 'فروش'} انجام شد — {s.symbol}",
            f"مقدار: {fmt_number(filled_qty, 8)} {s.base_asset}\n"
            f"قیمت: {fmt_number(avg_price)} {s.quote_asset}\n"
            f"ارزش: {fmt_number(filled_qty * avg_price)} {s.quote_asset} | کارمزد تقریبی: "
            f"{fmt_number(fee_quote)}\n"
            f"حد ضرر: {s.stop_loss_pct}% | حد سود: {s.take_profit_pct}%\n"
            f"دارایی کل: {fmt_number(equity_after)}\n"
            f"دلیل: {decision.reason}",
        )
        result.note = decision.reason
        return result

    # ---------------------------------------------------------------- حلقه
    def run_forever(self) -> None:
        self.bootstrap()
        logger.info("چرخه‌ی اصلی آغاز شد (Ctrl+C برای توقف).")
        while not self._stopping:
            started = time.time()
            try:
                self.run_cycle()
                self._consecutive_errors = 0
            except ExchangeError as exc:
                self._consecutive_errors += 1
                logger.warning("خطای صرافی (تلاش %s): %s", self._consecutive_errors, exc)
                if self._consecutive_errors in (3, 10):
                    self.notifier.notify(
                        "اختلال در ارتباط با صرافی",
                        f"{exc}\nربات تلاش را ادامه می‌دهد.",
                        important=True,
                    )
                if self._consecutive_errors >= 10:
                    self.notifier.notify(
                        "توقف موقت ربات",
                        "۱۰ خطای پیاپی رخ داد؛ ربات برای جلوگیری از رفتار ناخواسته متوقف شد.",
                        important=True,
                    )
                    return
            except Exception as exc:  # noqa: BLE001 - هر خطای غیرمنتظره باید امن متوقف شود
                logger.exception("خطای غیرمنتظره در چرخه: %s", exc)
                self.notifier.notify(
                    "خطای غیرمنتظره",
                    f"{type(exc).__name__}: {exc}\nربات متوقف شد؛ لاگ را بررسی کنید.",
                    important=True,
                )
                return

            delay = max(5.0, self.settings.cycle_seconds - (time.time() - started))
            sleep_until(time.time() + delay, chunk=5.0)

    def stop(self) -> None:
        self._stopping = True

    # --------------------------------------------------------------- کمکی
    def _sync_broker_state(self) -> None:
        """موجودی کارگزار کاغذی را با وضعیت ذخیره‌شده هم‌تراز می‌کند."""
        broker = self.broker
        if broker is None or getattr(broker, "name", "") != "paper":
            return
        broker.cash = float(self.state["cash_quote"])
        broker.holdings = float(self.state["holdings"])

    def _new_client_id(self) -> str:
        factory = getattr(self.market, "new_client_id", None)
        if callable(factory):
            return str(factory())
        return f"dt-{int(time.time())}"

    def _quantize(self, quantity: float) -> float:
        """گرد کردن مقدار به ۸ رقم اعشار (کف) تا صرافی رد نکند."""
        return float(int(quantity * 10**8) / 10**8)

    def _equity(self, price: float) -> float:
        return float(self.state["cash_quote"]) + float(self.state["holdings"]) * price

    def _daily_pnl_pct(self, equity: float, state: dict) -> float:
        start = float(state["start_of_day_equity"])
        if start <= 0:
            return 0.0
        return (equity - start) / start * 100.0

    def _roll_day_if_needed(self, price: float) -> dict:
        state = self.state
        current_day = today_utc()
        if str(state["day"]) != current_day:
            eq = self._equity(price) if price > 0 else float(state["cash_quote"])
            state["day"] = current_day
            state["start_of_day_equity"] = eq
            state["trades_today"] = 0
            self._persist()
            logger.info("روز معاملاتی جدید (%s)؛ سرمایه‌ی مبنا: %s", current_day, fmt_number(eq))
        return state

    def _update_peak(self, equity: float) -> None:
        peak = float(self.state["peak_equity"])
        if equity > peak:
            self.state["peak_equity"] = equity
            self._persist()
        elif peak > 0 and (peak - equity) / peak * 100 >= self.settings.max_daily_loss_pct:
            drawdown = (peak - equity) / peak * 100
            logger.warning("افت سرمایه از سقف: %s", fmt_pct(drawdown))

    def _apply_fill(self, action: Action, quantity: float, price: float, fee: float) -> None:
        state = self.state
        cash = float(state["cash_quote"])
        holdings = float(state["holdings"])
        avg = float(state["position_avg_price"])

        if action is Action.BUY:
            cash -= quantity * price + fee
            new_holdings = holdings + quantity
            if new_holdings > 0:
                avg = (holdings * avg + quantity * price) / new_holdings
            holdings = new_holdings
        else:
            cash += quantity * price - fee
            holdings = max(0.0, holdings - quantity)
            if holdings <= 1e-9:
                holdings = 0.0
                avg = 0.0

        state["cash_quote"] = max(0.0, cash)
        state["holdings"] = holdings
        state["position_avg_price"] = avg
        state["trades_today"] = int(state["trades_today"]) + 1
        state["last_trade_ts"] = time.time()
        self._persist()

        if self.settings.is_live and self.broker is not None and self.broker.name != "paper":
            # همگام‌سازی نرم با موجودی واقعی؛ اختلاف‌ها فقط لاگ می‌شوند
            try:
                balances = self.broker.fetch_free_balances()
                actual_quote = balances.get(self.settings.quote_asset, 0.0)
                if actual_quote + 1e-6 < cash:
                    logger.warning(
                        "اختلاف موجودی: ربات %s %s ثبت کرده اما صرافی %s نشان می‌دهد.",
                        fmt_number(cash),
                        self.settings.quote_asset,
                        fmt_number(actual_quote),
                    )
            except ExchangeError:
                pass

    def _persist(self) -> None:
        state = self.state
        self.store.save_state(
            cash_quote=float(state["cash_quote"]),
            holdings=float(state["holdings"]),
            position_avg_price=float(state["position_avg_price"]),
            start_of_day_equity=float(state["start_of_day_equity"]),
            day=str(state["day"]),
            trades_today=int(state["trades_today"]),
            last_trade_ts=state["last_trade_ts"],
            peak_equity=float(state["peak_equity"]),
        )

    def _maybe_heartbeat(self, price: float, equity: float) -> None:
        interval = 6 * 3600
        now = time.time()
        if now - self._last_heartbeat < interval:
            return
        self._last_heartbeat = now
        s = self.settings
        self.store.snapshot_equity(equity, price, float(self.state["cash_quote"]), float(self.state["holdings"]))
        daily = self._daily_pnl_pct(equity, self.state)
        self.notifier.notify(
            f"گزارش دوره‌ای — {s.symbol}",
            f"قیمت: {fmt_number(price)} {s.quote_asset}\n"
            f"دارایی کل: {fmt_number(equity)} | تغییر امروز: {fmt_pct(daily)}\n"
            f"موقعیت: {fmt_number(float(self.state['holdings']), 8)} {s.base_asset}\n"
            f"معاملات امروز: {int(self.state['trades_today'])}/{s.max_trades_per_day}",
        )

    def status(self) -> dict:
        s = self.settings
        price = 0.0
        try:
            price = self.market.fetch_ticker().last
        except ExchangeError:
            pass
        equity = self._equity(price) if price else float(self.state["cash_quote"])
        return {
            "mode": s.mode,
            "exchange": s.exchange,
            "symbol": s.symbol,
            "price": price,
            "cash": float(self.state["cash_quote"]),
            "holdings": float(self.state["holdings"]),
            "position_avg_price": float(self.state["position_avg_price"]),
            "equity": equity,
            "daily_pnl_pct": self._daily_pnl_pct(equity, self.state),
            "trades_today": int(self.state["trades_today"]),
            "kill_switch": s.kill_switch_path.exists(),
        }


def _wait(broker: BaseClient, client_id: str, timeout: int) -> tuple[str, float, float]:
    waiter = getattr(broker, "wait_for_fill", None)
    if callable(waiter):
        try:
            return waiter(client_id, timeout)
        except ExchangeError as exc:
            logger.warning("بررسی وضعیت سفارش ناموفق بود: %s", exc)
    return "unknown", 0.0, 0.0


