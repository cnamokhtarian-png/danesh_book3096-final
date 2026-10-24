from trader.indicators import (
    atr,
    atr_pct,
    ema,
    ema_series,
    max_drawdown_pct,
    pct_change,
    rsi,
    sma,
    volume_ratio,
)


def test_sma_basic():
    assert sma([1, 2, 3, 4], 2) == 3.5
    assert sma([1, 2], 5) is None


def test_ema_series_length_and_values():
    values = [float(i) for i in range(1, 51)]
    series = ema_series(values, 10)
    assert len(series) == len(values) - 9
    assert series[-1] > series[0]
    assert ema(values, 10) == series[-1]
    assert ema([1.0, 2.0], 5) is None


def test_rsi_flat_market_is_neutral():
    assert rsi([100.0] * 30, 14) == 50.0


def test_rsi_all_up_is_hundred():
    closes = [100 + i for i in range(30)]
    assert rsi([float(c) for c in closes], 14) == 100.0


def test_rsi_bounds_and_none():
    closes = [100, 101, 99, 102, 98, 103, 97, 104, 96, 105, 95, 106, 94, 107, 93, 108]
    value = rsi([float(c) for c in closes], 14)
    assert value is not None and 0 <= value <= 100
    assert rsi([1.0, 2.0], 14) is None


def test_atr_positive_and_pct():
    highs = [10, 11, 12, 11, 13, 14, 13, 15, 16, 15, 17, 18, 17, 19, 20, 21]
    lows = [9, 10, 11, 10, 12, 13, 12, 14, 15, 14, 16, 17, 16, 18, 19, 20]
    closes = [9.5, 10.5, 11.5, 10.5, 12.5, 13.5, 12.5, 14.5, 15.5, 14.5, 16.5, 17.5, 16.5, 18.5, 19.5, 20.5]
    value = atr(highs, lows, closes, 14)
    assert value is not None and value > 0
    pct = atr_pct(highs, lows, closes, 14)
    assert pct is not None and 0 < pct < 100
    assert atr(highs, lows, closes, 100) is None


def test_pct_change_and_drawdown():
    assert pct_change(110, 100) == 10.0
    assert pct_change(100, 0) == 0.0
    assert max_drawdown_pct([100, 120, 90, 130]) == 25.0
    assert max_drawdown_pct([100, 110, 120]) == 0.0


def test_volume_ratio():
    volumes = [10.0] * 20 + [20.0]
    assert volume_ratio(volumes, 20) == 2.0
    assert volume_ratio([], 20) == 0.0
    assert volume_ratio([0.0, 0.0, 5.0], 2) == 0.0
