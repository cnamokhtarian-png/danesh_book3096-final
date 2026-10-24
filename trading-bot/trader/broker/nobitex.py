"""کلاینت API نوبیتکس (https://apidocs.nobitex.ir).

نکته‌ی مهم: نوبیتکس قیمت‌ها را به **ریال** برمی‌گرداند، اما این کلاینت آن‌ها را
به **تومان** نرمال می‌کند تا اعداد گزارش‌ها با عرف بازار ایران بخواند.
"""

from __future__ import annotations

import time
import uuid

from ..models import Action, Candle, OrderRequest, OrderResult, Ticker
from .base import BaseClient, ExchangeError, pick, to_float

BASE_URL = "https://apiv2.nobitex.ir"
RIAL_DESTINATIONS = {"rls", "irt"}


class NobitexClient(BaseClient):
    name = "nobitex"

    def __init__(
        self,
        token: str = "",
        symbol: str = "BTCIRT",
        timeout: int = 15,
        user_agent: str = "danesh-trader/0.1",
        base_url: str = BASE_URL,
    ) -> None:
        super().__init__(timeout=timeout, user_agent=user_agent)
        self.token = token.strip()
        self.symbol = symbol.strip().upper()
        self.base_url = base_url.rstrip("/")
        self.base_currency, self.quote_currency = self._split(self.symbol)
        self.src = self.base_currency.lower()
        self.dst = (
            "rls" if self.quote_currency.lower() in RIAL_DESTINATIONS else self.quote_currency.lower()
        )
        self._quote_scale = 0.1 if self.dst == "rls" else 1.0
        self.quote_label = "IRT" if self.dst == "rls" else self.quote_currency.upper()
        if self.token:
            self.session.headers.update({"Authorization": f"Token {self.token}"})

    @staticmethod
    def _split(symbol: str) -> tuple[str, str]:
        for quote in ("USDT", "USDC", "IRT", "RLS"):
            if symbol.endswith(quote) and len(symbol) > len(quote):
                return symbol[: -len(quote)], quote
        raise ExchangeError(f"نماد نوبیتکس نامعتبر است: {symbol}")

    # ------------------------------------------------------------------ بازار
    def fetch_ticker(self) -> Ticker:
        try:
            data = self._request("GET", f"{self.base_url}/v3/orderbook/{self.symbol}")
            bids = data.get("bids") or []
            asks = data.get("asks") or []
            last = to_float(pick(data, "lastTradePrice", "last"))
            best_bid = to_float(bids[0][0]) if bids else last
            best_ask = to_float(asks[0][0]) if asks else last
            if not last:
                last = (best_bid + best_ask) / 2 if best_bid and best_ask else 0.0
            if last <= 0:
                raise ExchangeError("قیمت لحظه‌ای نوبیتکس خالی بود.")
            return Ticker(
                symbol=self.symbol,
                last=self._normalize_price(last),
                bid=self._normalize_price(best_bid),
                ask=self._normalize_price(best_ask),
                ts=int(pick(data, "lastUpdate", "lastUpdated", default=time.time())),
            )
        except ExchangeError:
            return self._ticker_from_stats()

    def _ticker_from_stats(self) -> Ticker:
        data = self._request(
            "GET",
            f"{self.base_url}/market/stats",
            params={"srcCurrency": self.src, "dstCurrency": self.dst},
        )
        stats = data.get("stats") or {}
        entry = stats.get(f"{self.src}-{self.dst}") or next(iter(stats.values()), None)
        if not isinstance(entry, dict):
            raise ExchangeError("آمار بازار نوبیتکس قابل خواندن نبود.")
        last = to_float(pick(entry, "last", "latest", "close"))
        bid = to_float(pick(entry, "bestBuy", default=last))
        ask = to_float(pick(entry, "bestSell", default=last))
        if last <= 0:
            raise ExchangeError("قیمت لحظه‌ای نوبیتکس صفر بود (بازار بسته؟).")
        return Ticker(
            symbol=self.symbol,
            last=self._normalize_price(last),
            bid=self._normalize_price(bid),
            ask=self._normalize_price(ask),
            ts=int(time.time()),
        )

    def fetch_candles(self, resolution: str = "5", limit: int = 240) -> list[Candle]:
        resolution_seconds = _resolution_seconds(resolution)
        now = int(time.time())
        # چند کندل اضافه می‌گیریم تا حذف کندل ناقص، سری را کوتاه نکند
        start = now - resolution_seconds * (limit + 3)
        data = self._request(
            "GET",
            f"{self.base_url}/market/ohlc",
            params={
                "symbol": self.symbol,
                "resolution": resolution,
                "from": start,
                "to": now,
            },
        )
        rows = data.get("ohlc") or []
        candles: list[Candle] = []
        for row in rows:
            if not isinstance(row, (list, tuple)) or len(row) < 6:
                continue
            candle = Candle(
                ts=int(to_float(row[0])),
                open=self._normalize_price(to_float(row[1])),
                high=self._normalize_price(to_float(row[2])),
                low=self._normalize_price(to_float(row[3])),
                close=self._normalize_price(to_float(row[4])),
                volume=to_float(row[5]),
            )
            if candle.is_valid:
                candles.append(candle)
        return candles[-limit:]

    # --------------------------------------------------------------- حساب
    def fetch_free_balances(self) -> dict[str, float]:
        self._require_token()
        data = self._request("POST", f"{self.base_url}/users/wallets/list")
        wallets = data.get("wallets") or []
        balances: dict[str, float] = {}
        for wallet in wallets:
            currency = str(pick(wallet, "currency", default="")).upper()
            if not currency:
                continue
            free = to_float(
                pick(wallet, "activeBalance", "balance", "availableBalance")
            )
            balances[currency] = balances.get(currency, 0.0) + free
        return balances

    # --------------------------------------------------------------- سفارش
    def place_order(self, request: OrderRequest) -> OrderResult:
        self._require_token()
        payload = {
            "type": request.side.value.lower(),
            "execution": "limit",
            "srcCurrency": self.src,
            "dstCurrency": self.dst,
            "amount": _num(request.quantity),
            "price": _num(self._denormalize_price(request.price)),
            "clientOrderId": request.client_id,
        }
        data = self._request("POST", f"{self.base_url}/market/orders/add", json=payload)
        if str(data.get("status", "")).lower() != "ok":
            return OrderResult(
                ok=False,
                client_id=request.client_id,
                status=str(data.get("status", "failed")),
                message=f"{data.get('code', 'Error')}: {data.get('message', 'ثبت سفارش ناموفق')}",
            )
        order = data.get("order") or {}
        return OrderResult(
            ok=True,
            client_id=str(pick(order, "clientOrderId", default=request.client_id)),
            exchange_order_id=str(pick(order, "id", default="")) or None,
            status=str(pick(order, "status", default="Open")),
            message="سفارش در نوبیتکس ثبت شد.",
        )

    def fetch_order(self, client_id: str) -> dict:
        self._require_token()
        data = self._request(
            "POST", f"{self.base_url}/market/orders/status", json={"clientOrderId": client_id}
        )
        if str(data.get("status", "")).lower() != "ok":
            raise ExchangeError(f"وضعیت سفارش خوانده نشد: {data.get('code')}")
        return data.get("order") or {}

    def wait_for_fill(self, client_id: str, timeout_seconds: int = 30) -> tuple[str, float, float]:
        """تا تکمیل سفارش صبر می‌کند و (وضعیت، مقدار پرشده، قیمت میانگین) می‌دهد."""
        deadline = time.time() + max(5, timeout_seconds)
        last_status = "Open"
        while time.time() < deadline:
            order = self.fetch_order(client_id)
            last_status = str(pick(order, "status", default="Open"))
            executed = to_float(
                pick(order, "executedAmount", "executed", "partialAmount", default=0)
            )
            matched = to_float(pick(order, "matchedAmount", default=0))
            quantity = max(executed, matched)
            if last_status.lower() in {"done", "filled", "closed"} or quantity > 0:
                avg = to_float(pick(order, "averagePrice", "avgPrice", default=0))
                if avg <= 0:
                    avg = to_float(pick(order, "price", default=0))
                return last_status, quantity, self._normalize_price(avg)
            time.sleep(3)
        return last_status, 0.0, 0.0

    def cancel_order(self, client_id: str) -> bool:
        self._require_token()
        try:
            order = self.fetch_order(client_id)
            order_id = pick(order, "id")
            if order_id is None:
                return False
            data = self._request(
                "POST",
                f"{self.base_url}/market/orders/update-status",
                json={"order": order_id, "status": "canceled"},
            )
            return str(data.get("status", "")).lower() == "ok"
        except ExchangeError:
            return False

    # --------------------------------------------------------------- کمکی
    def _require_token(self) -> None:
        if not self.token:
            raise ExchangeError("برای این عملیات کلید NOBITEX_API_TOKEN لازم است.")

    def new_client_id(self) -> str:
        return f"dt-{uuid.uuid4().hex[:20]}"


def _num(value: float) -> str:
    """قالب‌بندی عدد برای نوبیتکس؛ عدد صحیح را بدون اعشار می‌فرستد."""
    if float(value).is_integer():
        return str(int(value))
    return f"{value:.10f}".rstrip("0").rstrip(".")


def _resolution_seconds(resolution: str) -> int:
    mapping = {"1": 60, "5": 300, "15": 900, "30": 1800, "60": 3600, "1H": 3600, "D": 86400, "4H": 14400}
    return mapping.get(str(resolution).upper(), 300)
