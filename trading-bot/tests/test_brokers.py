from trader.broker.base import ExchangeError
from trader.broker.nobitex import NobitexClient
from trader.broker.paper import PaperBroker
from trader.models import Action, OrderRequest, Ticker


class StubMarket:
    symbol = "BTCIRT"
    base_currency = "BTC"
    quote_currency = "IRT"

    def __init__(self, price: float = 1_000_000.0) -> None:
        self.price = price

    def fetch_ticker(self) -> Ticker:
        return Ticker("BTCIRT", self.price, self.price * 0.999, self.price * 1.001)

    def fetch_candles(self, resolution="5", limit=240):
        return []


def test_paper_broker_buy_updates_cash_and_holdings():
    broker = PaperBroker(StubMarket(), cash=1_000_000.0, slippage_pct=0.0, fee_pct=0.4)
    result = broker.place_order(
        OrderRequest("c1", "BTCIRT", Action.BUY, quantity=0.5, price=1_000_000.0)
    )
    assert result.ok and result.status == "Filled"
    assert result.filled_quantity == 0.5
    assert abs(result.fee_quote - 2000.0) < 1e-6
    assert broker.holdings == 0.5
    assert abs(broker.cash - (1_000_000 - 500_000 - 2000)) < 1e-6


def test_paper_broker_rejects_overspend_and_oversell():
    broker = PaperBroker(StubMarket(), cash=100_000.0, slippage_pct=0.0, fee_pct=0.0)
    too_big = broker.place_order(
        OrderRequest("c2", "BTCIRT", Action.BUY, quantity=1.0, price=1_000_000.0)
    )
    assert not too_big.ok and "ناکافی" in too_big.message
    too_much = broker.place_order(
        OrderRequest("c3", "BTCIRT", Action.SELL, quantity=0.1, price=1_000_000.0)
    )
    assert not too_much.ok


def test_paper_broker_round_trip_keeps_books_balanced():
    broker = PaperBroker(StubMarket(), cash=1_000_000.0, slippage_pct=0.0, fee_pct=0.0)
    broker.place_order(OrderRequest("b1", "BTCIRT", Action.BUY, quantity=0.4, price=900_000.0))
    broker.place_order(OrderRequest("s1", "BTCIRT", Action.SELL, quantity=0.4, price=1_100_000.0))
    assert broker.holdings == 0.0
    assert abs(broker.cash - (1_000_000 + 0.4 * 200_000)) < 1e-6


def test_nobitex_normalizes_rial_prices_to_toman(monkeypatch):
    client = NobitexClient(token="t", symbol="BTCIRT")
    responses = {
        "/v3/orderbook/BTCIRT": {
            "lastTradePrice": "6000000000",
            "bids": [["5990000000", "0.1"]],
            "asks": [["6010000000", "0.1"]],
            "lastUpdate": 1700000000,
        }
    }
    monkeypatch.setattr(client, "_request", lambda method, url, **kw: responses[url.split("ir")[-1]])
    ticker = client.fetch_ticker()
    assert ticker.last == 600_000_000  # ۶۰۰ میلیون تومان
    assert ticker.bid == 599_000_000
    assert ticker.ask == 601_000_000
    assert 0 < ticker.spread_pct < 1


def test_nobitex_candles_parsed_and_normalized(monkeypatch):
    client = NobitexClient(token="t", symbol="BTCIRT")
    payload = {
        "status": "ok",
        "ohlc": [
            [1700000000, "1000000000", "1100000000", "900000000", "1050000000", "12.5"],
            [1700000300, "1050000000", "1150000000", "1000000000", "1120000000", "9.0"],
        ],
    }
    monkeypatch.setattr(client, "_request", lambda *a, **kw: payload)
    candles = client.fetch_candles("5", 100)
    assert len(candles) == 2
    assert candles[-1].close == 112_000_000
    assert candles[0].open == 100_000_000
    assert candles[0].volume == 12.5


def test_nobitex_order_payload_uses_rial_and_base_amount(monkeypatch):
    client = NobitexClient(token="t", symbol="BTCIRT")
    captured = {}

    def fake_request(method, url, **kwargs):
        captured["url"] = url
        captured["json"] = kwargs["json"]
        return {"status": "ok", "order": {"id": 42, "clientOrderId": kwargs["json"]["clientOrderId"], "status": "Open"}}

    monkeypatch.setattr(client, "_request", fake_request)
    result = client.place_order(
        OrderRequest("cid-1", "BTCIRT", Action.BUY, quantity=0.0005, price=600_000_000.0)
    )
    assert result.ok and result.exchange_order_id == "42"
    assert captured["url"].endswith("/market/orders/add")
    assert captured["json"]["price"] == "6000000000"  # تومان → ریال
    assert captured["json"]["amount"] == "0.0005"
    assert captured["json"]["srcCurrency"] == "btc"
    assert captured["json"]["dstCurrency"] == "rls"
    assert captured["json"]["type"] == "buy"
    assert captured["json"]["clientOrderId"] == "cid-1"


def test_nobitex_failed_order_returns_not_ok(monkeypatch):
    client = NobitexClient(token="t", symbol="BTCUSDT")
    monkeypatch.setattr(
        client,
        "_request",
        lambda *a, **kw: {"status": "failed", "code": "InvalidMarketPair", "message": "bad"},
    )
    result = client.place_order(OrderRequest("x", "BTCUSDT", Action.SELL, 1.0, 100.0))
    assert not result.ok and "InvalidMarketPair" in result.message


def test_clients_require_credentials_for_account_calls():
    for client in (NobitexClient(symbol="BTCIRT"),):
        try:
            client.fetch_free_balances()
        except ExchangeError as exc:
            assert "کلید" in str(exc)
        else:  # pragma: no cover
            raise AssertionError("بدون کلید نباید درخواست حساب ارسال شود")
