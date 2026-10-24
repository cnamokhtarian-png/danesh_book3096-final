"""بررسی‌های پیش از پرواز (preflight) — بدون ثبت هیچ سفارشی."""

from __future__ import annotations

from dataclasses import dataclass

from .broker import AuthError, ExchangeError, build_live_client
from .config import Settings
from .notify.telegram import TelegramNotifier


@dataclass
class Check:
    name: str
    ok: bool
    detail: str
    level: str = "error"  # error | warn | info


def preflight(settings: Settings) -> list[Check]:
    checks: list[Check] = []

    checks.append(
        Check(
            "تنظیمات",
            True,
            f"حالت {settings.mode} | {settings.exchange} | {settings.symbol} | "
            f"حداکثر موقعیت {settings.max_position_pct}%",
        )
    )

    client = None
    try:
        client = build_live_client(settings)
        ticker = client.fetch_ticker()
        checks.append(
            Check(
                "قیمت لحظه‌ای",
                ticker.last > 0,
                f"آخرین قیمت: {ticker.last:,.2f} {settings.quote_asset} | "
                f"اسپرد: {ticker.spread_pct:.2f}%",
            )
        )
        if ticker.spread_pct > settings.max_spread_pct:
            checks.append(
                Check(
                    "اسپرد بازار",
                    False,
                    f"اسپرد {ticker.spread_pct:.2f}% از سقف {settings.max_spread_pct}% بیشتر است؛ "
                    "در این وضعیت ربات خرید نمی‌کند.",
                    level="warn",
                )
            )
    except AuthError as exc:
        checks.append(Check("اتصال به صرافی", False, str(exc)))
    except ExchangeError as exc:
        checks.append(Check("اتصال به صرافی", False, str(exc)))

    try:
        if client is None:
            raise ExchangeError("کلاینت ساخته نشد.")
        candles = client.fetch_candles(settings.candle_resolution, settings.candle_lookback)
        enough = len(candles) >= settings.ema_slow + 5
        checks.append(
            Check(
                "داده‌ی کندل",
                enough,
                f"{len(candles)} کندل {settings.candle_resolution} دقیقه‌ای دریافت شد "
                f"(حداقل لازم برای EMA{settings.ema_slow}: {settings.ema_slow + 5}).",
                level="error" if not enough else "info",
            )
        )
        trend_ready = len(candles) >= settings.ema_trend + 5
        if not trend_ready:
            checks.append(
                Check(
                    "فیلتر روند بلندمدت",
                    True,
                    f"برای EMA{settings.ema_trend} داده کافی نیست؛ فیلتر روند غیرفعال می‌شود.",
                    level="warn",
                )
            )
    except ExchangeError as exc:
        checks.append(Check("داده‌ی کندل", False, str(exc)))

    if settings.is_live:
        try:
            if client is None:
                raise ExchangeError("کلاینت ساخته نشد.")
            balances = client.fetch_free_balances()
            quote = balances.get(settings.quote_asset, 0.0)
            base = balances.get(settings.base_asset, 0.0)
            checks.append(
                Check(
                    "دسترسی خواندن حساب",
                    True,
                    f"موجودی آزاد: {quote:,.0f} {settings.quote_asset} و {base:.8f} {settings.base_asset}",
                )
            )
            if quote <= 0:
                checks.append(
                    Check(
                        "موجودی نقدی",
                        False,
                        f"موجودی {settings.quote_asset} صفر است؛ خرید ممکن نیست.",
                        level="warn",
                    )
                )
        except AuthError as exc:
            checks.append(Check("دسترسی خواندن حساب", False, str(exc)))
        except ExchangeError as exc:
            checks.append(Check("دسترسی خواندن حساب", False, str(exc)))
        checks.append(
            Check(
                "مجوز برداشت",
                True,
                "این مورد از طریق API قابل بررسی نیست: در پنل صرافی مطمئن شوید کلید فقط "
                "Read + Trade دارد و Withdrawal خاموش است.",
                level="warn",
            )
        )
    else:
        checks.append(
            Check(
                "حالت کاغذی",
                True,
                "معامله‌ی واقعی انجام نمی‌شود؛ سفارش‌ها فقط شبیه‌سازی می‌شوند.",
                level="info",
            )
        )

    if settings.telegram_enabled:
        notifier = TelegramNotifier(settings.telegram_bot_token, settings.telegram_chat_id)
        ok = notifier.get_me()
        checks.append(
            Check(
                "ربات تلگرام",
                ok,
                "توکن ربات معتبر است." if ok else "توکن ربات تلگرام معتبر نیست یا شبکه بسته است.",
                level="info" if ok else "warn",
            )
        )
    else:
        checks.append(Check("ربات تلگرام", True, "تنظیم نشده؛ گزارش‌ها فقط در لاگ می‌آیند.", level="info"))

    if settings.llm_enabled:
        checks.append(
            Check(
                "هوش مصنوعی",
                settings.llm_available,
                f"مدل {settings.llm_model} در حالت {settings.ai_decision_mode}.",
                level="info" if settings.llm_available else "error",
            )
        )

    if settings.kill_switch_path.exists():
        checks.append(
            Check(
                "سوئیچ توقف",
                False,
                f"فایل {settings.kill_switch_path} وجود دارد؛ ربات معامله نمی‌کند.",
                level="warn",
            )
        )

    return checks


def has_blocking_errors(checks: list[Check]) -> bool:
    return any(not check.ok and check.level == "error" for check in checks)
