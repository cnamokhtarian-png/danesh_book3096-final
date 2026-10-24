"""حساب‌وکتابِ اقتصادی معامله: کارمزد، سود خالص و نرخ برد لازم.

این ماژول به زبان ساده نشان می‌دهد «چند معامله در روز» چقدر هزینه دارد و برای
سودده بودن، ربات باید چند درصد معامله‌ها را ببرد. هیچ پیش‌بینی سودی نمی‌کند؛
فقط واقعیتِ ریاضی کارمزد را نشان می‌دهد.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Economics:
    fee_pct_per_side: float
    round_trip_fee_pct: float
    take_profit_pct: float
    stop_loss_pct: float
    net_take_profit_pct: float
    net_stop_loss_pct: float
    breakeven_win_rate: float
    daily_fee_drag_pct: float  # هزینه‌ی تقریبی اگر سقف معاملات روز پر شود

    def as_dict(self) -> dict[str, float]:
        return {
            "fee_pct_per_side": round(self.fee_pct_per_side, 3),
            "round_trip_fee_pct": round(self.round_trip_fee_pct, 3),
            "take_profit_pct": round(self.take_profit_pct, 3),
            "stop_loss_pct": round(self.stop_loss_pct, 3),
            "net_take_profit_pct": round(self.net_take_profit_pct, 3),
            "net_stop_loss_pct": round(self.net_stop_loss_pct, 3),
            "breakeven_win_rate": round(self.breakeven_win_rate, 4),
            "daily_fee_drag_pct": round(self.daily_fee_drag_pct, 3),
        }


def round_trip_fee_pct(fee_pct_per_side: float) -> float:
    """مجموع کارمزد خرید و فروش (درصد)."""
    return max(0.0, fee_pct_per_side) * 2.0


def breakeven_win_rate(
    take_profit_pct: float, stop_loss_pct: float, fee_pct_per_side: float
) -> float:
    """حداقل نرخ برد لازم تا انتظار ریاضی صفر شود.

    ``p × TP_net = (1 − p) × SL_net``  ⇒  ``p = SL_net / (TP_net + SL_net)``
    """
    fees = round_trip_fee_pct(fee_pct_per_side)
    tp_net = take_profit_pct - fees
    sl_net = stop_loss_pct + fees
    if tp_net <= 0:
        return 1.0
    return max(0.0, min(1.0, sl_net / (tp_net + sl_net)))


def analyze(
    take_profit_pct: float,
    stop_loss_pct: float,
    fee_pct_per_side: float,
    max_trades_per_day: int,
) -> Economics:
    fees = round_trip_fee_pct(fee_pct_per_side)
    return Economics(
        fee_pct_per_side=fee_pct_per_side,
        round_trip_fee_pct=fees,
        take_profit_pct=take_profit_pct,
        stop_loss_pct=stop_loss_pct,
        net_take_profit_pct=take_profit_pct - fees,
        net_stop_loss_pct=stop_loss_pct + fees,
        breakeven_win_rate=breakeven_win_rate(take_profit_pct, stop_loss_pct, fee_pct_per_side),
        # اگر سقف معاملات روز پر شود (هر معامله = یک خرید و یک فروش)
        daily_fee_drag_pct=fees * max(0, max_trades_per_day),
    )


def explain(economics: Economics) -> list[str]:
    """توضیح فارسی و خوانا برای چاپ در ترمینال/گزارش."""
    win_rate = economics.breakeven_win_rate * 100
    return [
        f"کارمزد هر طرف {economics.fee_pct_per_side:.2f}% → هر خرید+فروش "
        f"{economics.round_trip_fee_pct:.2f}% هزینه دارد.",
        f"حد سود {economics.take_profit_pct:.2f}% به سود خالص "
        f"{economics.net_take_profit_pct:.2f}% تبدیل می‌شود و حد ضرر "
        f"{economics.stop_loss_pct:.2f}% به زیان خالص {economics.net_stop_loss_pct:.2f}%.",
        f"برای سربه‌سر شدن، حداقل حدود {win_rate:.0f}% معامله‌ها باید برنده باشند؛ "
        "برای سود واقعی باید بیشتر از این باشد.",
    ]
