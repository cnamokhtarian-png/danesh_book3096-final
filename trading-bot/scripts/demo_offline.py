#!/usr/bin/env python3
"""دموی آفلاین: کل چرخه‌ی ربات با بازار ساختگی — بدون اینترنت و بدون کلید.

اجرا:  python scripts/demo_offline.py
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from trader.broker.paper import PaperBroker  # noqa: E402
from trader.config import Settings  # noqa: E402
from trader.db import Store  # noqa: E402
from trader.engine import Engine  # noqa: E402
from trader.models import Candle, Ticker  # noqa: E402
from trader.notify.telegram import Notifier  # noqa: E402


class SyntheticMarket:
    """بازار ساختگی با روند قابل تغییر (برای نمایش تصمیم‌ها)."""

    name = "synthetic"
    symbol = "BTCIRT"
    base_currency = "BTC"
    quote_currency = "IRT"

    def __init__(self, base: float = 900_000.0) -> None:
        self.base = base
        self.price = base
        self.counter = 0
        self.phase = "up"

    def _closes(self) -> list[float]:
        closes = []
        step = 2_000.0
        for index in range(260):
            drift = step if self.phase == "up" else -step
            closes.append(self.base + index * drift + ((index % 9) - 4) * step * 1.5)
        return closes

    def fetch_ticker(self) -> Ticker:
        half = self.price * 0.001
        return Ticker(self.symbol, self.price, self.price - half, self.price + half)

    def fetch_candles(self, resolution: str = "5", limit: int = 240):
        candles = []
        for index, close in enumerate(self._closes()[-limit:]):
            candles.append(
                Candle(index * 300, close * 0.999, close * 1.002, close * 0.998, close, 100.0)
            )
        return candles

    def fetch_free_balances(self):
        return {"IRT": 10_000_000.0, "BTC": 0.0}

    def new_client_id(self) -> str:
        self.counter += 1
        return f"demo-{self.counter}"


def main() -> int:
    settings = Settings.from_env(
        env={
            "STATE_DIR": tempfile.mkdtemp(prefix="trader-demo-"),
            "SYMBOL": "BTCIRT",
            "TRADING_MODE": "paper",
            "LOG_LEVEL": "WARNING",
        },
        use_dotenv=False,
    )
    market = SyntheticMarket()
    market.price = market.fetch_candles()[-1].close

    store = Store(settings.db_path)
    engine = Engine(settings, store=store, market=market, notifier=Notifier())
    engine.broker = PaperBroker(market, cash=10_000_000.0, slippage_pct=0.02, fee_pct=0.4)
    engine.bootstrap()

    print("\n=== چرخه ۱: روند صعودی (انتظار: خرید) ===")
    result = engine.run_cycle()
    print(f"قیمت: {result.price:,.0f} | تصمیم: {result.decision.action.value} | {result.decision.reason}")

    print("\n=== چرخه ۲: همان روند، موقعیت باز (انتظار: بدون خرید دوم) ===")
    result = engine.run_cycle()
    print(f"تصمیم: {result.decision.action.value} | اجرا شد؟ {result.executed}")

    print("\n=== چرخه ۳: ریزش ۲.۵٪ (انتظار: حد ضرر) ===")
    market.price *= 0.975
    result = engine.run_cycle()
    print(f"تصمیم: {result.decision.action.value} | منبع: {result.decision.source} | {result.decision.reason}")

    print("\n=== وضعیت نهایی ===")
    status = engine.status()
    for key in ("cash", "holdings", "equity", "daily_pnl_pct", "trades_today"):
        print(f"  {key}: {status[key]:,.4f}" if isinstance(status[key], float) else f"  {key}: {status[key]}")

    print("\n=== معاملات ثبت‌شده ===")
    for trade in store.recent_trades():
        print(
            f"  {trade['side']} {trade['quantity']:.6f} @ {trade['price']:,.0f} "
            f"({trade['status']}) — {trade['note'][:60]}"
        )
    print(f"\nدیتابیس دمو: {settings.db_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
