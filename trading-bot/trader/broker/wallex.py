"""کلاینت API والکس (https://developers.wallex.ir).

احراز هویت با هدر ``x-api-key`` انجام می‌شود. قیمت بازارهای IRT در والکس
تومانی است؛ بنابراین ضریب تبدیل ۱ است.
"""

from __future__ import annotations

import time
import uuid

from ..models import Candle, OrderRequest, OrderResult, Ticker
from .base import BaseClient, ExchangeError, pick, to_float

BASE_URL = "https://api.wallex.ir"


class WallexClient(BaseClient):
    name = "wallex"

    def __init__(
        self,
        api_key: str = "",
        symbol: str = "BTCUSDT",
        timeout: int = 15,
        user_agent: str = "danesh-trader/0.1",
        base_url: str = BASE_URL,
    ) -> None:
        super().__init__(timeout=timeout, user_agent=user_agent)
        self.api_key = api_key.strip()
        self.symbol = symbol.strip().upper()
        self.base_url = base_url.rstrip("/")
        self.base_currency, self.quote_currency = self._split(self.symbol)
        self.quote_label = self.quote_currency
        if self.api_key:
            self.session.headers.update({"x-api-key": self.api_key})

    @staticmethod
    def _split(symbol: str) -> tuple[str, str]:
        for quote in ("USDT", "USDC", "IRT", "RLS", "TMN"):
            if symbol.endswith(quote) and len(symbol) > len(quote):
                return symbol[: -len(quote)], quote
        raise ExchangeError(f"نماد والکس نامعتبر است: {symbol}")

    # ------------------------------------------------------------------ بازار
    def fetch_ticker(self) -> Ticker:
        data = self._request(
            "GET", f"{self.base_url}/v1/markets", params={"symbol": self.symbol}
        )
        symbols = pick(pick(data, "result", default={}), "symbols", default={}) or {}
        entry = symbols.get(self.symbol) or next(iter(symbols.values()), None)
        if not isinstance(entry, dict):
            raise ExchangeError(f"بازار {self.symbol} در والکس پیدا نشد.")
        stats = entry.get("stats") or entry
        last = to_float(pick(stats, "lastPrice", "last", "closePrice", "price"))
        bid = to_float(pick(stats, "bidPrice", "bestBuy", "bid", default=last))
        ask = to_float(pick(stats, "askPrice", "bestSell", "ask", default=last))
        if last <= 0:
            raise ExchangeError("قیمت لحظه‌ای والکس صفر بود (بازار بسته؟).")
        return Ticker(
            symbol=self.symbol,
            last=last,
            bid=bid or last,
            ask=ask or last,
            ts=int(time.time()),
        )

    def fetch_candles(self, resolution: str = "5", limit: int = 240) -> list[Candle]:
        seconds = _resolution_seconds(resolution)
        now = int(time.time())
        start = now - seconds * (limit + 3)
        data = self._request(
            "GET",
            f"{self.base_url}/v1/udf/history",
            params={
                "symbol": self.symbol,
                "resolution": resolution,
                "from": start,
                "to": now,
            },
        )
        if str(data.get("s", "ok")).lower() == "no_data":
            return []
        timestamps = data.get("t") or []
        opens = data.get("o") or []
        highs = data.get("h") or []
        lows = data.get("l") or []
        closes = data.get("c") or []
        volumes = data.get("v") or []

        candles: list[Candle] = []
        for index, ts in enumerate(timestamps):
            try:
                candle = Candle(
                    ts=int(to_float(ts)),
                    open=to_float(opens[index]),
                    high=to_float(highs[index]),
                    low=to_float(lows[index]),
                    close=to_float(closes[index]),
                    volume=to_float(volumes[index]) if index < len(volumes) else 0.0,
                )
            except IndexError:
                break
            if candle.is_valid:
                candles.append(candle)
        return candles[-limit:]

    # --------------------------------------------------------------- حساب
    def fetch_free_balances(self) -> dict[str, float]:
        self._require_key()
        data = self._request("GET", f"{self.base_url}/v1/account/balances")
        result = pick(data, "result", default={}) or {}
        entries = pick(result, "balances", default=result) or {}
        balances: dict[str, float] = {}
        if isinstance(entries, dict):
            for asset, payload in entries.items():
                if isinstance(payload, dict):
                    free = to_float(
                        pick(payload, "value", "available", "free", "balance")
                    )
                    locked = to_float(pick(payload, "locked", default=0))
                    total = to_float(pick(payload, "total", default=free + locked))
                    balances[str(asset).upper()] = total if total > free else free
                else:
                    balances[str(asset).upper()] = to_float(payload)
        return balances

    # --------------------------------------------------------------- سفارش
    def place_order(self, request: OrderRequest) -> OrderResult:
        self._require_key()
        payload = {
            "client_id": request.client_id,
            "price": _num(request.price),
            "quantity": _num(request.quantity),
            "side": request.side.value,
            "symbol": self.symbol,
            "type": "LIMIT",
        }
        data = self._request("POST", f"{self.base_url}/v1/account/orders", json=payload)
        result = pick(data, "result", default={}) or {}
        client_id = str(pick(result, "clientOrderId", default=request.client_id))
        if not result and str(data.get("message", "")).lower() not in {"", "ok"}:
            return OrderResult(
                ok=False,
                client_id=request.client_id,
                status="failed",
                message=str(data.get("message", "ثبت سفارش ناموفق")),
            )
        executed_qty = to_float(pick(result, "executedQty", default=0))
        executed_price = to_float(pick(result, "executedPrice", default=0))
        return OrderResult(
            ok=True,
            client_id=client_id,
            exchange_order_id=str(pick(result, "id", default="")) or None,
            filled_quantity=executed_qty,
            avg_price=executed_price or request.price,
            status="Filled" if to_float(pick(result, "executedPercent", default=0)) >= 100 else "Open",
            message="سفارش در والکس ثبت شد.",
        )

    def fetch_order(self, client_id: str) -> dict:
        self._require_key()
        data = self._request("GET", f"{self.base_url}/v1/account/orders/{client_id}")
        return pick(data, "result", default={}) or {}

    def wait_for_fill(self, client_id: str, timeout_seconds: int = 30) -> tuple[str, float, float]:
        deadline = time.time() + max(5, timeout_seconds)
        last_status = "Open"
        while time.time() < deadline:
            order = self.fetch_order(client_id)
            last_status = str(pick(order, "status", default="Open"))
            quantity = to_float(pick(order, "executedQty", default=0))
            if last_status.lower() in {"filled", "done", "closed"} or quantity > 0:
                price = to_float(pick(order, "executedPrice", default=0))
                return last_status, quantity, price
            time.sleep(3)
        return last_status, 0.0, 0.0

    def cancel_order(self, client_id: str) -> bool:
        self._require_key()
        try:
            data = self._request(
                "DELETE", f"{self.base_url}/v1/account/orders", params={"clientOrderId": client_id}
            )
            return bool(pick(data, "result", default=False))
        except ExchangeError:
            return False

    # --------------------------------------------------------------- کمکی
    def _require_key(self) -> None:
        if not self.api_key:
            raise ExchangeError("برای این عملیات کلید WALLEX_API_KEY لازم است.")

    def new_client_id(self) -> str:
        return f"dt_{uuid.uuid4().hex[:20]}"


def _num(value: float) -> str:
    if float(value).is_integer():
        return str(int(value))
    return f"{value:.10f}".rstrip("0").rstrip(".")


def _resolution_seconds(resolution: str) -> int:
    mapping = {"1": 60, "5": 300, "15": 900, "30": 1800, "60": 3600, "1H": 3600, "D": 86400, "4H": 14400}
    return mapping.get(str(resolution).upper(), 300)
