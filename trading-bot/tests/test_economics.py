import pytest

from trader.config import ConfigError, Settings
from trader.economics import analyze, breakeven_win_rate, explain, round_trip_fee_pct


def test_round_trip_fee():
    assert round_trip_fee_pct(0.4) == pytest.approx(0.8)
    assert round_trip_fee_pct(-1) == 0.0


def test_breakeven_win_rate_formula():
    # TP=4، SL=2، کارمزد 0.4 → TP خالص 3.2 و SL خالص 2.8 → 46.7%
    assert breakeven_win_rate(4, 2, 0.4) == pytest.approx(2.8 / 6.0, rel=1e-6)


def test_breakeven_is_impossible_when_target_below_fees():
    assert breakeven_win_rate(0.5, 2, 0.4) == 1.0


def test_more_trades_means_more_fee_drag():
    few = analyze(4, 2, 0.4, max_trades_per_day=4)
    many = analyze(4, 2, 0.4, max_trades_per_day=20)
    assert many.daily_fee_drag_pct > few.daily_fee_drag_pct
    assert many.round_trip_fee_pct == few.round_trip_fee_pct


def test_analyze_dict_and_explain():
    econ = analyze(4, 2, 0.4, 8)
    payload = econ.as_dict()
    assert payload["net_take_profit_pct"] == pytest.approx(3.2)
    assert payload["net_stop_loss_pct"] == pytest.approx(2.8)
    lines = explain(econ)
    assert len(lines) == 3
    assert all(isinstance(line, str) and line for line in lines)


def test_config_rejects_target_smaller_than_fees():
    with pytest.raises(ConfigError) as excinfo:
        Settings.from_env(env={"TAKE_PROFIT_PCT": "0.5", "FEE_PCT": "0.4"}, use_dotenv=False)
    assert "کارمزد" in str(excinfo.value)
