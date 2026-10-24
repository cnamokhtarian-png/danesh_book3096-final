"""تست‌های سرتاسری چرخه‌ی ربات با بازار جعلی (بدون شبکه و بدون پول واقعی)."""

import pytest

from trader.config import Settings
from trader.db import Store
from trader.engine import Engine
from trader.models import Action, Candle, Ticker
from trader.notify.telegram import Notifier
from trader.strategy.ai import AiAdvisor


class FakeMarket:
    name = "fake"
    symbol = "BTCIRT"
    base_currency = "BTC"
    quote_currency = "IRT"
    quote_label = "IRT"

    def __init__(self, closes, spread_pct=0.2):
        self.closes = closes
        self.spread_pct = spread_pct
        self.price = closes[-1]
        self.order_counter = 0

    def fetch_ticker(self) -> Ticker:
        half = self.price * self.spread_pct / 200.0
        return Ticker(self.symbol, self.price, self.price - half, self.price + half)

    def fetch_candles(self, resolution="5", limit=240):
        candles = []
        for index, close in enumerate(self.closes[-limit:]):
            candles.append(
                Candle(
                    ts=index * 300,
                    open=close * 0.999,
                    high=close * 1.002,
                    low=close * 0.998,
                    close=close,
                    volume=100.0,
                )
            )
        return candles

    def fetch_free_balances(self):
        return {"IRT": 10_000_000.0, "BTC": 0.0}

    def new_client_id(self) -> str:
        self.order_counter += 1
        return f"fake-{self.order_counter}"


def make_engine(tmp_path, closes, spread_pct=0.2, env=None):
    payload = {
        "STATE_DIR": str(tmp_path / "state"),
        "SYMBOL": "BTCIRT",
        "TRADING_MODE": "paper",
        "MAX_POSITION_PCT": "5",
        "MIN_TRADE_QUOTE": "100000",
        **(env or {}),
    }
    settings = Settings.from_env(env=payload, use_dotenv=False)
    market = FakeMarket(closes, spread_pct=spread_pct)
    store = Store(settings.db_path)
    engine = Engine(settings, store=store, market=market, notifier=Notifier())
    from trader.broker.paper import PaperBroker

    engine.broker = PaperBroker(market, cash=10_000_000.0, slippage_pct=0.0, fee_pct=0.4)
    return engine, market, store


def uptrend(n=260, start=900_000.0, step=2_000.0):
    """روند صعودی با نویز تا RSI در ناحیه‌ی خرید بماند."""
    return [start + i * step + ((i % 9) - 4) * step * 1.5 for i in range(n)]


def flat(n=260, price=1_000_000.0):
    return [price] * n


def test_paper_cycle_buys_with_managed_risk(tmp_path):
    engine, market, store = make_engine(tmp_path, uptrend())
    engine.bootstrap()
    result = engine.run_cycle()

    assert result.executed is True
    assert result.decision is not None and result.decision.action is Action.BUY
    assert engine.state["holdings"] > 0
    # ۵ درصد از ۱۰ میلیون = ۵۰۰ هزار تومان
    assert abs(engine.state["holdings"] * result.price - 500_000) / 500_000 < 0.02
    trades = store.recent_trades()
    assert len(trades) == 1 and trades[0]["side"] == "BUY"


def test_flat_market_does_not_trade(tmp_path):
    engine, _, store = make_engine(tmp_path, flat())
    engine.bootstrap()
    result = engine.run_cycle()
    assert result.executed is False
    assert result.decision is not None
    assert result.decision.action is Action.HOLD
    assert store.recent_trades() == []


def test_kill_switch_blocks_cycle(tmp_path):
    engine, _, store = make_engine(tmp_path, uptrend())
    engine.bootstrap()
    engine.settings.kill_switch_path.write_text("stop", encoding="utf-8")
    result = engine.run_cycle()
    assert result.executed is False
    assert store.recent_trades() == []


def test_stop_loss_triggers_sell(tmp_path):
    engine, market, store = make_engine(tmp_path, uptrend())
    engine.bootstrap()
    # موقعیت باز با میانگین خرید بالاتر از قیمت فعلی + افت بیش از حد ضرر
    engine.state["holdings"] = 0.5
    engine.state["position_avg_price"] = market.price * 1.10
    engine.state["cash_quote"] = 9_000_000.0
    engine._persist()

    result = engine.run_cycle()
    assert result.decision is not None
    assert result.decision.source == "risk"
    assert result.decision.action is Action.SELL
    assert engine.state["holdings"] == 0.0
    trades = store.recent_trades()
    assert trades[0]["side"] == "SELL"
    assert "حد ضرر" in trades[0]["note"] or "حد ضرر" in result.decision.reason


def test_take_profit_triggers_sell(tmp_path):
    engine, market, store = make_engine(tmp_path, uptrend())
    engine.bootstrap()
    engine.state["holdings"] = 0.5
    engine.state["position_avg_price"] = market.price * 0.90
    engine.state["cash_quote"] = 9_000_000.0
    engine._persist()

    result = engine.run_cycle()
    assert result.decision is not None and result.decision.action is Action.SELL
    assert "حد سود" in result.decision.reason


def test_daily_loss_limit_blocks_new_buy(tmp_path):
    engine, _, store = make_engine(tmp_path, uptrend())
    engine.bootstrap()
    engine.state["start_of_day_equity"] = 30_000_000.0  # افت بزرگ نسبت به شروع روز
    engine._persist()
    result = engine.run_cycle()
    assert result.executed is False
    assert store.recent_trades() == []
    decisions = store.recent_decisions()
    assert decisions[0]["status"] == "blocked"
    assert "ضرر روزانه" in decisions[0]["reason"]


def test_wide_spread_blocks_buy(tmp_path):
    engine, _, store = make_engine(tmp_path, uptrend(), spread_pct=5.0)
    engine.bootstrap()
    result = engine.run_cycle()
    assert result.executed is False
    assert store.recent_trades() == []


def test_ai_veto_prevents_trade(tmp_path):
    engine, _, store = make_engine(tmp_path, uptrend())
    engine.bootstrap()

    class VetoAdvisor(AiAdvisor):
        def __init__(self):
            super().__init__(enabled=True, api_key="k", mode="veto")

        def review(self, snapshot, rule_decision, position_open, risk_context):
            return __import__("trader.models", fromlist=["Decision"]).Decision(
                Action.HOLD, 0.0, "وتوی تستی", source="ai-veto"
            )

    engine.ai = VetoAdvisor()
    result = engine.run_cycle()
    assert result.executed is False
    assert result.decision is not None and result.decision.source == "ai-veto"
    assert store.recent_trades() == []


def test_status_and_report_survive_empty_state(tmp_path):
    engine, _, _ = make_engine(tmp_path, flat())
    status = engine.status()
    assert status["mode"] == "paper"
    assert status["kill_switch"] is False
    assert status["holdings"] == 0.0


def test_second_buy_is_skipped_while_position_open(tmp_path):
    engine, _, store = make_engine(tmp_path, uptrend())
    engine.bootstrap()
    first = engine.run_cycle()
    assert first.executed

    # با وجود موقعیت باز، سیگنال خرید دوم نباید سفارش بگذارد
    engine.state["trades_today"] = 0
    engine.state["last_trade_ts"] = None
    engine._persist()
    second = engine.run_cycle()
    assert second.executed is False
    assert len(store.recent_trades()) == 1


def test_live_cash_is_capped_by_exchange_balance(tmp_path):
    payload = {
        "STATE_DIR": str(tmp_path / "state"),
        "SYMBOL": "BTCIRT",
        "TRADING_MODE": "live",
        "LIVE_TRADING_CONFIRM": "I-UNDERSTAND-THE-RISK",
        "NOBITEX_API_TOKEN": "tok-not-used-in-fake",
    }
    settings = Settings.from_env(env=payload, use_dotenv=False)
    market = FakeMarket(uptrend())
    market.fetch_free_balances = lambda: {"IRT": 200_000.0, "BTC": 0.25}

    store = Store(settings.db_path)
    engine = Engine(settings, store=store, market=market, notifier=Notifier())
    engine.bootstrap()

    # ۲۵۰ هزار تومان دارایی از پیش موجود نباید مدیریت شود
    assert engine.state["holdings"] == 0.0
    assert engine.state["cash_quote"] == 200_000.0
