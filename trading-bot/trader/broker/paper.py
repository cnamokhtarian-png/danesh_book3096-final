"""کارگزار کاغذی (Paper Broker).

همه‌ی سفارش‌ها در حافظه/دیتابیس محلی اجرا می‌شوند و هیچ درخواستی به صرافی
فرستاده نمی‌شود. قیمت‌ها از بازار واقعی (فقط خواندنی) گرفته می‌شوند تا نتیجه
شبیه‌سازی به واقعیت نزدیک باشد.
"""

from __future__ import annotations

import uuid

from ..models import Action, Candle, OrderRequest, OrderResult, Ticker
from .base import BaseClient


class PaperBroker(BaseClient):
    name = "paper"

    def __init__(
        self,
        market: BaseClient,
        quote_asset: str = "IRT",
        cash: float = 10_000_000.0,
        holdings: float = 0.0,
        slippage_pct: float = 0.05,
        fee_pct: float = 0.4,
    ) -> None:
        super().__init__()
        self.market = market
        self.quote_asset = quote_asset.upper()
        self.base_asset = market.symbol
        self.cash = float(cash)
        self.holdings = float(holdings)
        self.slippage_pct = max(0.0, slippage_pct)
        self.fee_pct = max(0.0, fee_pct)
        self.symbol = market.symbol

    # ------------------------------------------------------------------ بازار
    def fetch_ticker(self) -> Ticker:
        return self.market.fetch_ticker()

    def fetch_candles(self, resolution: str = "5", limit: int = 240) -> list[Candle]:
        return self.market.fetch_candles(resolution, limit)

    def fetch_free_balances(self) -> dict[str, float]:
        return {self.quote_asset: self.cash, **self._base_balance()}

    def _base_balance(self) -> dict[str, float]:
        base = getattr(self.market, "base_currency", None) or self.symbol
        return {str(base): self.holdings}

    # --------------------------------------------------------------- سفارش
    def place_order(self, request: OrderRequest) -> OrderResult:
        quantity = float(request.quantity)
        price = float(request.price)
        if quantity <= 0 or price <= 0:
            return OrderResult(
                ok=False, client_id=request.client_id, status="rejected",
                message="مقدار یا قیمت سفارش نامعتبر است.",
            )

        slip = price * self.slippage_pct / 100.0
        fill_price = price + slip if request.side is Action.BUY else max(0.0, price - slip)
        gross = quantity * fill_price
        fee = gross * self.fee_pct / 100.0

        if request.side is Action.BUY:
            total = gross + fee
            if total > self.cash + 1e-9:
                return OrderResult(
                    ok=False,
                    client_id=request.client_id,
                    status="rejected",
                    message=f"موجودی ناکافی در شبیه‌سازی ({total:,.0f} لازم بود).",
                )
            self.cash -= total
            self.holdings += quantity
        else:
            if quantity > self.holdings + 1e-12:
                return OrderResult(
                    ok=False,
                    client_id=request.client_id,
                    status="rejected",
                    message=f"دارایی کافی برای فروش نیست ({quantity} از {self.holdings}).",
                )
            self.holdings -= quantity
            self.cash += gross - fee

        return OrderResult(
            ok=True,
            client_id=request.client_id,
            exchange_order_id=f"paper-{uuid.uuid4().hex[:10]}",
            filled_quantity=quantity,
            avg_price=fill_price,
            fee_quote=fee,
            status="Filled",
            message="سفارش کاغذی اجرا شد (بدون تماس با صرافی).",
        )

    def wait_for_fill(self, client_id: str, timeout_seconds: int = 0) -> tuple[str, float, float]:
        return "Filled", 0.0, 0.0

    def __repr__(self) -> str:  # pragma: no cover
        return f"PaperBroker(cash={self.cash}, holdings={self.holdings})"
