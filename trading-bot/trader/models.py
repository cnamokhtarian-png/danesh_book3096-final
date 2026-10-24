"""مدل‌های داده‌ی مشترک بین صرافی، استراتژی، ریسک و اجرا."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Action(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


@dataclass(frozen=True)
class Candle:
    ts: int
    open: float
    high: float
    low: float
    close: float
    volume: float

    @property
    def is_valid(self) -> bool:
        return (
            self.close > 0
            and self.high >= self.low > 0
            and self.open > 0
        )


@dataclass(frozen=True)
class Ticker:
    symbol: str
    last: float
    bid: float
    ask: float
    ts: int = 0

    @property
    def spread_pct(self) -> float:
        if self.bid <= 0 or self.ask <= 0:
            return 100.0
        return max(0.0, (self.ask - self.bid) / self.bid * 100.0)


@dataclass(frozen=True)
class Decision:
    action: Action
    confidence: float
    reason: str
    source: str = "rules"
    stop_loss_pct: float | None = None
    take_profit_pct: float | None = None

    @property
    def is_entry_or_exit(self) -> bool:
        return self.action is not Action.HOLD


@dataclass(frozen=True)
class OrderRequest:
    client_id: str
    symbol: str
    side: Action
    quantity: float
    price: float
    order_type: str = "limit"
    reason: str = ""


@dataclass
class OrderResult:
    ok: bool
    client_id: str
    exchange_order_id: str | None = None
    filled_quantity: float = 0.0
    avg_price: float = 0.0
    fee_quote: float = 0.0
    status: str = "unknown"
    message: str = ""

    @property
    def filled_quote(self) -> float:
        return self.filled_quantity * self.avg_price


@dataclass(frozen=True)
class Position:
    quantity: float = 0.0
    avg_price: float = 0.0

    @property
    def is_open(self) -> bool:
        return self.quantity > 0

    def value(self, price: float) -> float:
        return self.quantity * price
