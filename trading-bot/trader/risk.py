"""لایه‌ی مدیریت ریسک — تنها جایی که اندازه‌ی سفارش تعیین می‌شود.

هیچ تصمیمی (قاعده‌محور یا هوش مصنوعی) بدون عبور از این لایه اجرا نمی‌شود.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .models import Action, Decision, Position


@dataclass
class RiskConfig:
    max_position_pct: float = 5.0
    max_total_position_pct: float = 15.0
    max_daily_loss_pct: float = 3.0
    max_trades_per_day: int = 8
    cooldown_minutes: int = 30
    max_spread_pct: float = 1.5
    min_trade_quote: float = 100_000.0
    quote_is_rial: bool = True
    stop_loss_pct: float = 2.0
    take_profit_pct: float = 4.0


@dataclass
class RiskVerdict:
    approved: bool
    quantity: float = 0.0
    reason: str = ""
    checks: list[str] = field(default_factory=list)

    @property
    def quote_amount(self) -> float:
        return self.quantity


@dataclass
class MarketState:
    price: float
    spread_pct: float
    equity_quote: float
    cash_quote: float
    holdings: float
    trades_today: int
    daily_pnl_pct: float
    seconds_since_last_trade: float | None
    trading_halted: bool = False
    halt_reason: str = ""


class RiskManager:
    def __init__(self, config: RiskConfig) -> None:
        self.config = config

    # ------------------------------------------------------------ اندازه‌گذاری
    def size_buy(self, market: MarketState) -> RiskVerdict:
        cfg = self.config
        checks: list[str] = []

        if market.price <= 0:
            return RiskVerdict(False, reason="قیمت معتبر نیست.", checks=checks)
        if market.trading_halted:
            return RiskVerdict(False, reason=market.halt_reason or "معامله متوقف است.", checks=checks)
        if market.spread_pct > cfg.max_spread_pct:
            return RiskVerdict(
                False,
                reason=f"اسپرد بازار {market.spread_pct:.2f}% بیش از حد مجاز ({cfg.max_spread_pct}%) است.",
                checks=checks,
            )
        if market.daily_pnl_pct <= -cfg.max_daily_loss_pct:
            return RiskVerdict(
                False,
                reason=f"سقف ضرر روزانه فعال شد ({market.daily_pnl_pct:.2f}%). تا فردا معامله‌ی جدیدی انجام نمی‌شود.",
                checks=checks,
            )
        if market.trades_today >= cfg.max_trades_per_day:
            return RiskVerdict(
                False,
                reason=f"سقف تعداد معاملات روز ({cfg.max_trades_per_day}) پر شده است.",
                checks=checks,
            )
        if (
            market.seconds_since_last_trade is not None
            and market.seconds_since_last_trade < cfg.cooldown_minutes * 60
        ):
            remaining = cfg.cooldown_minutes * 60 - market.seconds_since_last_trade
            return RiskVerdict(
                False,
                reason=f"دوره‌ی خنک‌شدن فعال است؛ {int(remaining / 60) + 1} دقیقه‌ی دیگر.",
                checks=checks,
            )

        equity = max(market.equity_quote, 0.0)
        current_position_value = market.holdings * market.price
        room_total = equity * cfg.max_total_position_pct / 100.0 - current_position_value
        target_quote = equity * cfg.max_position_pct / 100.0
        spendable = min(market.cash_quote, room_total, target_quote)

        if spendable <= 0:
            return RiskVerdict(
                False,
                reason="سقف موقعیت باز یا موجودی نقدی اجازه‌ی افزایش موقعیت را نمی‌دهد.",
                checks=checks,
            )

        quantity = spendable / market.price
        quote_value = quantity * market.price

        if quote_value < cfg.min_trade_quote:
            return RiskVerdict(
                False,
                reason=(
                    f"حجم محاسبه‌شده ({quote_value:,.0f}) کمتر از حداقل سفارش "
                    f"({cfg.min_trade_quote:,.0f}) است."
                ),
                checks=checks,
            )

        checks.append(f"سقف موقعیت: {cfg.max_position_pct}% سرمایه")
        checks.append(f"اسپرد: {market.spread_pct:.2f}% (حداکثر {cfg.max_spread_pct}%)")
        checks.append(f"ضرر روزانه: {market.daily_pnl_pct:.2f}% (حداکثر -{cfg.max_daily_loss_pct}%)")
        return RiskVerdict(True, quantity=quantity, reason="تأیید شد.", checks=checks)

    def size_sell(self, market: MarketState, decision: Decision | None = None) -> RiskVerdict:
        cfg = self.config
        checks: list[str] = []
        # خروج از موقعیت همیشه مجاز است؛ توقف فقط از ورود جدید جلوگیری می‌کند.
        if market.holdings <= 0:
            return RiskVerdict(False, reason="موقعیت بازِ قابل فروشی وجود ندارد.", checks=checks)

        quantity = market.holdings
        if quantity * market.price < cfg.min_trade_quote:
            return RiskVerdict(
                False,
                reason="ارزش موقعیت از حداقل سفارش صرافی کمتر است؛ فروش ممکن نیست.",
                checks=checks,
            )
        checks.append("فروش کامل موقعیت (خروج)")
        return RiskVerdict(True, quantity=quantity, reason="خروج تأیید شد.", checks=checks)

    # -------------------------------------------------------------- خروج اضطراری
    @staticmethod
    def should_stop_out(
        position: Position, price: float, stop_loss_pct: float, take_profit_pct: float
    ) -> tuple[bool, str]:
        if not position.is_open or position.avg_price <= 0:
            return False, ""
        change = (price - position.avg_price) / position.avg_price * 100.0
        if change <= -stop_loss_pct:
            return True, f"حد ضرر فعال شد ({change:.2f}%)"
        if change >= take_profit_pct:
            return True, f"حد سود فعال شد (+{change:.2f}%)"
        return False, ""
