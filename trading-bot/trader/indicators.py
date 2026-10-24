"""اندیکاتورهای تکنیکال خالص (بدون وابستگی بیرونی) — قابل تست."""

from __future__ import annotations

from collections.abc import Sequence


def sma(values: Sequence[float], period: int) -> float | None:
    if period <= 0 or len(values) < period:
        return None
    window = values[-period:]
    return sum(window) / period


def ema_series(values: Sequence[float], period: int) -> list[float]:
    """سری EMA با seed گرفتن از SMA دوره‌ی اول."""
    if period <= 0 or len(values) < period:
        return []
    multiplier = 2.0 / (period + 1.0)
    seed = sum(values[:period]) / period
    series = [seed]
    for value in values[period:]:
        series.append((value - series[-1]) * multiplier + series[-1])
    return series


def ema(values: Sequence[float], period: int) -> float | None:
    series = ema_series(values, period)
    return series[-1] if series else None


def rsi(values: Sequence[float], period: int = 14) -> float | None:
    """RSI وایلدر. در صورت نبود نوسان، ۵۰ برمی‌گرداند (نه ۱۰۰)."""
    if period <= 0 or len(values) <= period:
        return None

    deltas = [values[i] - values[i - 1] for i in range(1, len(values))]
    gains = [max(delta, 0.0) for delta in deltas]
    losses = [max(-delta, 0.0) for delta in deltas]

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    for index in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[index]) / period
        avg_loss = (avg_loss * (period - 1) + losses[index]) / period

    if avg_gain == 0 and avg_loss == 0:
        return 50.0
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def true_ranges(
    highs: Sequence[float], lows: Sequence[float], closes: Sequence[float]
) -> list[float]:
    if not (len(highs) == len(lows) == len(closes)) or len(closes) < 2:
        return []
    ranges: list[float] = []
    for index in range(1, len(closes)):
        high_low = highs[index] - lows[index]
        high_close = abs(highs[index] - closes[index - 1])
        low_close = abs(lows[index] - closes[index - 1])
        ranges.append(max(high_low, high_close, low_close))
    return ranges


def atr(
    highs: Sequence[float],
    lows: Sequence[float],
    closes: Sequence[float],
    period: int = 14,
) -> float | None:
    """ATR وایلدر."""
    ranges = true_ranges(highs, lows, closes)
    if period <= 0 or len(ranges) < period:
        return None
    value = sum(ranges[:period]) / period
    for item in ranges[period:]:
        value = (value * (period - 1) + item) / period
    return value


def atr_pct(
    highs: Sequence[float],
    lows: Sequence[float],
    closes: Sequence[float],
    period: int = 14,
) -> float | None:
    value = atr(highs, lows, closes, period)
    if value is None or not closes or closes[-1] <= 0:
        return None
    return value / closes[-1] * 100.0


def pct_change(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0
    return (current - previous) / previous * 100.0


def max_drawdown_pct(values: Sequence[float]) -> float:
    """بیشترین افت سرمایه (درصد، مثبت)."""
    peak = float("-inf")
    worst = 0.0
    for value in values:
        peak = max(peak, value)
        if peak > 0:
            drawdown = (peak - value) / peak * 100.0
            worst = max(worst, drawdown)
    return worst


def volume_ratio(volumes: Sequence[float], period: int = 20) -> float:
    """نسبت حجم کندل آخر به میانگین حجم دوره."""
    if len(volumes) < 2 or period <= 0:
        return 0.0
    window = volumes[-period - 1 : -1] if len(volumes) > period else volumes[:-1]
    if not window:
        return 0.0
    average = sum(window) / len(window)
    if average <= 0:
        return 0.0
    return volumes[-1] / average
