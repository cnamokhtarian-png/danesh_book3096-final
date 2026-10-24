from trader.models import Action, Candle
from trader.strategy.ai import AiAdvisor, _parse_json
from trader.strategy.rules import RuleConfig, build_snapshot, decide

CONFIG = RuleConfig(ema_fast=5, ema_slow=10, ema_trend=20, max_atr_pct=50.0)


def make_candles(closes, noise=0.001):
    candles = []
    for index, close in enumerate(closes):
        high = close * (1 + noise)
        low = close * (1 - noise)
        candles.append(
            Candle(ts=index * 300, open=close * (1 - noise / 2), high=high, low=low, close=close, volume=100.0)
        )
    return candles


def realistic_uptrend(n=40, start=100.0, step=0.9):
    """روند صعودی با نویز کوچک تا RSI در ناحیه‌ی سالم بماند."""
    return [start + i * step + ((i % 9) - 4) * step * 1.5 for i in range(n)]


def test_uptrend_produces_buy_with_stop_and_target():
    closes = realistic_uptrend()
    snapshot = build_snapshot(make_candles(closes), CONFIG, 5)
    decision = decide(snapshot, CONFIG)
    assert decision.action is Action.BUY
    assert 0 < decision.confidence <= 1
    assert decision.stop_loss_pct and decision.take_profit_pct
    assert decision.stop_loss_pct < decision.take_profit_pct


def test_downtrend_produces_sell():
    closes = [130 - i * 0.9 + ((i % 5) - 2) * 0.3 for i in range(30)]
    snapshot = build_snapshot(make_candles(closes), CONFIG, 5)
    decision = decide(snapshot, CONFIG)
    assert decision.action is Action.SELL


def test_insufficient_data_holds():
    snapshot = build_snapshot(make_candles([100, 101, 102]), CONFIG, 5)
    decision = decide(snapshot, CONFIG)
    assert decision.action is Action.HOLD


def test_extreme_volatility_blocks_entry():
    config = RuleConfig(ema_fast=5, ema_slow=10, ema_trend=20, max_atr_pct=0.5)
    closes = realistic_uptrend()
    snapshot = build_snapshot(make_candles(closes, noise=0.05), config, 5)
    decision = decide(snapshot, config)
    assert decision.action is Action.HOLD
    assert "نوسان" in decision.reason


def test_snapshot_dict_is_json_friendly():
    closes = realistic_uptrend()
    snapshot = build_snapshot(make_candles(closes), CONFIG, 5)
    payload = snapshot.as_dict()
    assert payload["candles"] == len(realistic_uptrend())
    assert isinstance(payload["rsi"], float)


def test_flat_market_is_hold():
    config = RuleConfig(ema_fast=5, ema_slow=10, ema_trend=20)
    snapshot = build_snapshot(make_candles([100.0] * 30), config, 5)
    assert decide(snapshot, config).action is Action.HOLD


def test_ai_disabled_returns_rule_decision():
    config = RuleConfig(ema_fast=5, ema_slow=10, ema_trend=20)
    snapshot = build_snapshot(make_candles(realistic_uptrend()), config, 5)
    decision = decide(snapshot, config)
    advisor = AiAdvisor(enabled=False)
    assert advisor.review(snapshot, decision, False, {}) is decision
    assert advisor.propose(snapshot, False, {}) is None


def test_ai_review_vetoes_on_hold_answer(monkeypatch):
    advisor = AiAdvisor(enabled=True, api_key="k", min_confidence=0.6)
    monkeypatch.setattr(advisor, "_chat", lambda payload: {"action": "HOLD", "confidence": 0.9, "reason": "خطر برگشت"})
    rule = __import__("trader.models", fromlist=["Decision"]).Decision(Action.BUY, 0.7, "روند صعودی")
    config = RuleConfig(ema_fast=5, ema_slow=10, ema_trend=20)
    snapshot = build_snapshot(make_candles(realistic_uptrend()), config, 5)
    result = advisor.review(snapshot, rule, False, {})
    assert result.action is Action.HOLD
    assert result.source == "ai-veto"


def test_ai_review_confirms_matching_action(monkeypatch):
    from trader.models import Decision

    advisor = AiAdvisor(enabled=True, api_key="k", min_confidence=0.6)
    monkeypatch.setattr(
        advisor, "_chat", lambda payload: {"action": "BUY", "confidence": 0.82, "reason": "ادامه‌ی روند"}
    )
    rule = Decision(Action.BUY, 0.7, "روند صعودی", stop_loss_pct=2.0, take_profit_pct=4.0)
    config = RuleConfig(ema_fast=5, ema_slow=10, ema_trend=20)
    snapshot = build_snapshot(make_candles(realistic_uptrend()), config, 5)
    result = advisor.review(snapshot, rule, False, {})
    assert result.action is Action.BUY
    assert result.source == "ai-confirmed"
    assert result.stop_loss_pct == 2.0


def test_ai_low_confidence_is_downgraded(monkeypatch):
    from trader.models import Decision

    advisor = AiAdvisor(enabled=True, api_key="k", min_confidence=0.75)
    monkeypatch.setattr(advisor, "_chat", lambda payload: {"action": "BUY", "confidence": 0.4, "reason": "نامطمئن"})
    rule = Decision(Action.BUY, 0.7, "روند صعودی")
    config = RuleConfig(ema_fast=5, ema_slow=10, ema_trend=20)
    snapshot = build_snapshot(make_candles(realistic_uptrend()), config, 5)
    assert advisor.review(snapshot, rule, False, {}).action is Action.HOLD


def test_parse_json_handles_code_fence():
    payload = _parse_json('```json\n{"action": "HOLD", "confidence": 0.5, "reason": "..."}\n```')
    assert payload["action"] == "HOLD"
