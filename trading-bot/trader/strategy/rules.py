"""استراتژی قاعده‌محور: روند EMA + RSI + فیلتر نوسان و حجم.

قواعد به‌صورت قطعی و قابل تست نوشته شده‌اند؛ مدل هوش مصنوعی (اختیاری) اجازه
دارد تصمیم را «وتو» کند اما هرگز نمی‌تواند محدودیت‌های ریسک را دور بزند.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..indicators import atr_pct, ema, max_drawdown_pct, pct_change, rsi, volume_ratio
from ..models import Action, Candle, Decision


@dataclass
class Snapshot:
    """خلاصه‌ی عددی بازار که هم برای تصمیم و هم برای گزارش استفاده می‌شود."""

    price: float
    ema_fast: float | None
    ema_slow: float | None
    ema_trend: float | None
    rsi: float | None
    atr_pct: float | None
    volume_ratio: float
    change_1h_pct: float
    drawdown_pct: float
    candles: int
    last_ts: int

    def as_dict(self) -> dict[str, float | int | None]:
        return {
            "price": round(self.price, 8),
            "ema_fast": round(self.ema_fast, 8) if self.ema_fast else None,
            "ema_slow": round(self.ema_slow, 8) if self.ema_slow else None,
            "ema_trend": round(self.ema_trend, 8) if self.ema_trend else None,
            "rsi": round(self.rsi, 2) if self.rsi is not None else None,
            "atr_pct": round(self.atr_pct, 2) if self.atr_pct is not None else None,
            "volume_ratio": round(self.volume_ratio, 2),
            "change_1h_pct": round(self.change_1h_pct, 2),
            "drawdown_pct": round(self.drawdown_pct, 2),
            "candles": self.candles,
            "last_ts": self.last_ts,
        }


@dataclass
class RuleConfig:
    ema_fast: int = 20
    ema_slow: int = 50
    ema_trend: int = 200
    rsi_period: int = 14
    atr_period: int = 14
    rsi_buy_min: float = 45.0
    rsi_buy_max: float = 70.0
    rsi_exit: float = 78.0
    min_volume_ratio: float = 0.5
    max_atr_pct: float = 6.0
    stop_loss_pct: float = 2.0
    take_profit_pct: float = 4.0
    use_atr_stops: bool = True


def build_snapshot(candles: list[Candle], config: RuleConfig, resolution_minutes: int = 5) -> Snapshot:
    closes = [c.close for c in candles]
    highs = [c.high for c in candles]
    lows = [c.low for c in candles]
    volumes = [c.volume for c in candles]

    price = closes[-1]
    fast = ema(closes, config.ema_fast)
    slow = ema(closes, config.ema_slow)
    trend = ema(closes, config.ema_trend)

    hours_per_candle = max(resolution_minutes, 1) / 60.0
    change_window = max(1, int(round(1 / hours_per_candle)))
    change_1h = (
        pct_change(closes[-1], closes[-1 - change_window])
        if len(closes) > change_window
        else 0.0
    )
    recent = closes[-max(config.ema_slow, 20) :]

    return Snapshot(
        price=price,
        ema_fast=fast,
        ema_slow=slow,
        ema_trend=trend,
        rsi=rsi(closes, config.rsi_period),
        atr_pct=atr_pct(highs, lows, closes, config.atr_period),
        volume_ratio=volume_ratio(volumes),
        change_1h_pct=change_1h,
        drawdown_pct=max_drawdown_pct(recent),
        candles=len(candles),
        last_ts=candles[-1].ts,
    )


def decide(snapshot: Snapshot, config: RuleConfig) -> Decision:
    """تصمیم قاعده‌محور BUY/SELL/HOLD به همراه دلیل فارسی."""
    if snapshot.price <= 0:
        return Decision(Action.HOLD, 0.0, "قیمت معتبر در دسترس نیست.", source="rules")
    if snapshot.ema_slow is None or snapshot.rsi is None:
        return Decision(
            Action.HOLD,
            0.0,
            "داده‌ی کافی برای محاسبه‌ی اندیکاتورها موجود نیست.",
            source="rules",
        )

    # بازار بدون روند: قیمت و EMAها تقریباً روی هم افتاده‌اند
    if snapshot.ema_slow > 0:
        distance = abs(snapshot.price / snapshot.ema_slow - 1) * 100
        ema_gap = (
            abs(snapshot.ema_fast / snapshot.ema_slow - 1) * 100
            if snapshot.ema_fast
            else 0.0
        )
        if distance < 0.15 and ema_gap < 0.15:
            return Decision(
                Action.HOLD,
                0.3,
                "بازار بدون روند مشخص است (قیمت و میانگین‌ها روی هم افتاده‌اند).",
                source="rules",
            )

    reasons: list[str] = []
    bullish = 0
    bearish = 0

    above_fast = snapshot.price > snapshot.ema_fast if snapshot.ema_fast else False
    fast_above_slow = (
        snapshot.ema_fast > snapshot.ema_slow
        if snapshot.ema_fast and snapshot.ema_slow
        else False
    )
    above_trend = snapshot.price > snapshot.ema_trend if snapshot.ema_trend else True

    if above_fast:
        bullish += 1
        reasons.append("قیمت بالای EMA سریع")
    else:
        bearish += 1
        reasons.append("قیمت زیر EMA سریع")

    if fast_above_slow:
        bullish += 1
        reasons.append(f"EMA{config.ema_fast} بالای EMA{config.ema_slow}")
    else:
        bearish += 1
        reasons.append(f"EMA{config.ema_fast} زیر EMA{config.ema_slow}")

    if above_trend:
        bullish += 1
        reasons.append("قیمت در روند بلندمدت صعودی است")
    else:
        bearish += 1
        reasons.append("قیمت زیر میانگین بلندمدت")

    if snapshot.rsi >= config.rsi_exit:
        bearish += 1
        reasons.append(f"RSI اشباع خرید ({snapshot.rsi:.1f})")
    elif snapshot.rsi >= config.rsi_buy_min:
        bullish += 1
        reasons.append(f"RSI در ناحیه‌ی سالم ({snapshot.rsi:.1f})")
    elif snapshot.rsi < 35:
        reasons.append(f"RSI اشباع فروش ({snapshot.rsi:.1f}) — منتظر تأیید بازگشت")
    else:
        bearish += 0.5
        reasons.append(f"RSI ضعیف ({snapshot.rsi:.1f})")

    if snapshot.volume_ratio >= config.min_volume_ratio:
        bullish += 0.5
        reasons.append(f"حجم معاملات {snapshot.volume_ratio:.1f}× میانگین")
    else:
        reasons.append("حجم معاملات کم")

    # فیلتر نوسان: در بازار پرتلاطم ورود نمی‌کنیم
    if snapshot.atr_pct is not None and snapshot.atr_pct > config.max_atr_pct:
        return Decision(
            Action.HOLD,
            0.3,
            f"نوسان بازار بیش از حد مجاز است (ATR {snapshot.atr_pct:.2f}% > {config.max_atr_pct}%).",
            source="rules",
        )

    if snapshot.price <= 0 or (snapshot.ema_slow and snapshot.price < snapshot.ema_slow):
        ema_broken = True
    else:
        ema_broken = False

    stop_loss, take_profit = stop_target_levels(snapshot, config, Action.BUY)

    if bullish >= 3 and above_trend and config.rsi_buy_min <= (snapshot.rsi or 0) < config.rsi_exit:
        confidence = min(0.95, 0.45 + 0.1 * (bullish - 2))
        return Decision(
            Action.BUY,
            round(confidence, 2),
            "؛ ".join(reasons[:4]),
            source="rules",
            stop_loss_pct=stop_loss,
            take_profit_pct=take_profit,
        )

    if ema_broken or bearish >= 2.5 or (snapshot.rsi or 0) >= config.rsi_exit or (
        snapshot.rsi is not None and snapshot.rsi < 30
    ):
        confidence = min(0.95, 0.45 + 0.1 * (bearish - 1))
        return Decision(
            Action.SELL,
            round(max(confidence, 0.4), 2),
            "؛ ".join(reasons[:4]),
            source="rules",
            stop_loss_pct=stop_loss,
            take_profit_pct=take_profit,
        )

    return Decision(
        Action.HOLD,
        0.4,
        "؛ ".join(reasons[:4]) or "شرایط برای ورود/خروج قطعی نیست.",
        source="rules",
    )


def stop_target_levels(
    snapshot: Snapshot, config: RuleConfig, action: Action
) -> tuple[float, float]:
    """حد ضرر/سود percent؛ در بازار پرنوسان حد ضرر کمی بازتر می‌شود."""
    stop = config.stop_loss_pct
    target = config.take_profit_pct
    if config.use_atr_stops and snapshot.atr_pct:
        stop = min(max(stop, snapshot.atr_pct * 1.5), config.stop_loss_pct * 2.5)
        target = max(target, stop * 1.8)
    return round(stop, 2), round(target, 2)
