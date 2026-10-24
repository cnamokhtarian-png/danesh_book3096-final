#!/usr/bin/env python3
"""دستیار راه‌اندازی — برای کسی که با API و اصطلاحات فنی آشنا نیست.

با چند سؤال ساده، فایل `.env` را می‌سازد و بعد همه‌چیز آماده است.

    python setup_wizard.py

هیچ سؤال سختی پرسیده نمی‌شود: فقط نام صرافی، کلید API (که خودتان در پنل
صرافی ساخته‌اید) و میزان محافظه‌کاری. کلید روی همین رایانه در فایل `.env`
ذخیره می‌شود و جای دیگری نمی‌رود.
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from trader.config import LIVE_CONFIRM_PHRASE, ConfigError, Settings  # noqa: E402
from trader.economics import analyze, explain  # noqa: E402
from trader.guard import has_blocking_errors, preflight  # noqa: E402

SUPPORTED_EXCHANGES = {"1": "nobitex", "2": "wallex"}

# پروفایل‌ها: هرچه «فعال‌تر»، معامله بیشتر و حد ضرر تنگ‌تر — و ریسک بیشتر.
PROFILES: dict[str, dict] = {
    "1": {
        "name": "conservative",
        "label": "محافظه‌کار — پیشنهاد ما برای شروع (معامله‌ی کم، حد ضرر بازتر)",
        "values": {
            "CYCLE_SECONDS": "300",
            "CANDLE_RESOLUTION": "5",
            "MAX_POSITION_PCT": "3",
            "MAX_TOTAL_POSITION_PCT": "9",
            "MAX_DAILY_LOSS_PCT": "2",
            "MAX_TRADES_PER_DAY": "4",
            "COOLDOWN_MINUTES": "120",
            "STOP_LOSS_PCT": "2.5",
            "TAKE_PROFIT_PCT": "5",
            "MAX_SPREAD_PCT": "1.0",
        },
    },
    "2": {
        "name": "balanced",
        "label": "متعادل (معامله‌ی متوسط)",
        "values": {
            "CYCLE_SECONDS": "300",
            "CANDLE_RESOLUTION": "5",
            "MAX_POSITION_PCT": "5",
            "MAX_TOTAL_POSITION_PCT": "15",
            "MAX_DAILY_LOSS_PCT": "3",
            "MAX_TRADES_PER_DAY": "8",
            "COOLDOWN_MINUTES": "30",
            "STOP_LOSS_PCT": "2",
            "TAKE_PROFIT_PCT": "4",
            "MAX_SPREAD_PCT": "1.5",
        },
    },
    "3": {
        "name": "active",
        "label": "فعال — معامله‌ی زیاد (ریسک و کارمزد بالاتر؛ فقط برای تمرین)",
        "values": {
            "CYCLE_SECONDS": "120",
            "CANDLE_RESOLUTION": "1",
            "MAX_POSITION_PCT": "8",
            "MAX_TOTAL_POSITION_PCT": "20",
            "MAX_DAILY_LOSS_PCT": "4",
            "MAX_TRADES_PER_DAY": "20",
            "COOLDOWN_MINUTES": "10",
            "STOP_LOSS_PCT": "1.2",
            "TAKE_PROFIT_PCT": "2",
            "MAX_SPREAD_PCT": "1.2",
        },
    },
}

DEFAULT_SYMBOL = {"nobitex": "BTCIRT", "wallex": "BTCUSDT"}
CREDENTIAL_KEY = {"nobitex": "NOBITEX_API_TOKEN", "wallex": "WALLEX_API_KEY"}
SYMBOL_HINTS = {
    "nobitex": "BTCIRT (بیت‌کوین/تومان)، ETHIRT (اتریوم/تومان)، USDTIRT (تتر/تومان)",
    "wallex": "BTCUSDT، ETHUSDT، BTCIRT",
}


def blank_env(exchange: str, mode: str = "paper", symbol: str = "", profile: str = "balanced") -> dict[str, str]:
    """مقادیر پایه‌ی `.env` برای یک صرافی."""
    exchange = exchange.lower()
    if exchange not in DEFAULT_SYMBOL:
        raise ConfigError(f"صرافی پشتیبانی‌نشده: {exchange}")
    profile_values = PROFILES.get(profile_key(profile), PROFILES["2"])["values"]
    values = {
        "EXCHANGE": exchange,
        "TRADING_MODE": mode,
        "SYMBOL": symbol.strip().upper() or DEFAULT_SYMBOL[exchange],
        "NOBITEX_API_TOKEN": "",
        "WALLEX_API_KEY": "",
        "LIVE_TRADING_CONFIRM": "",
        "CANDLE_LOOKBACK": "240",
        "EMA_FAST": "20",
        "EMA_SLOW": "50",
        "EMA_TREND": "200",
        "RSI_PERIOD": "14",
        "ATR_PERIOD": "14",
        "MAX_SLIPPAGE_PCT": "0.5",
        "FEE_PCT": "0.4",
        "PAPER_SLIPPAGE_PCT": "0.05",
        "MIN_TRADE_QUOTE": "",
        "STARTING_CASH_QUOTE": "10000000",
        "ORDER_FILL_TIMEOUT": "30",
        "STATE_DIR": "state",
        "LOG_LEVEL": "INFO",
        "HTTP_TIMEOUT": "15",
        "USER_AGENT": "danesh-trader/0.1",
        "TIMEZONE": "Asia/Tehran",
        "LLM_ENABLED": "false",
        "AI_DECISION_MODE": "veto",
        "LLM_MODEL": "gpt-4o-mini",
        "LLM_BASE_URL": "https://api.openai.com/v1",
        "LLM_API_KEY": "",
        "AI_MIN_CONFIDENCE": "0.6",
        "LLM_TIMEOUT": "30",
        "TELEGRAM_BOT_TOKEN": "",
        "TELEGRAM_CHAT_ID": "",
    }
    values.update(profile_values)
    return values


def profile_key(profile: str) -> str:
    """نام یا شماره‌ی پروفایل را به کلید PROFILES تبدیل می‌کند."""
    text = str(profile).strip().lower()
    if text in PROFILES:
        return text
    for key, item in PROFILES.items():
        if item["name"] == text:
            return key
    raise ConfigError("پروفایل نامعتبر است؛ یکی از: 1 (محافظه‌کار)، 2 (متعادل)، 3 (فعال).")


def build_env(answers: dict) -> dict[str, str]:
    """از پاسخ‌های خام، مقادیر معتبر `.env` می‌سازد (خالص و قابل تست)."""
    exchange = str(answers.get("exchange", "nobitex")).strip().lower()
    mode = str(answers.get("mode", "paper")).strip().lower()
    token = str(answers.get("token", "") or "").strip()
    confirm = str(answers.get("confirm", "") or "").strip()
    profile = answers.get("profile", "balanced")
    symbol = str(answers.get("symbol", "") or "").strip()

    if exchange not in DEFAULT_SYMBOL:
        raise ConfigError(f"صرافی پشتیبانی‌نشده: {exchange}")
    if mode not in {"paper", "live"}:
        raise ConfigError("حالت باید paper (تمرینی) یا live (واقعی) باشد.")

    values = blank_env(exchange, mode, symbol, profile)
    values[CREDENTIAL_KEY[exchange]] = token
    values["STARTING_CASH_QUOTE"] = str(answers.get("starting_cash", "10000000") or "10000000")

    telegram_token = str(answers.get("telegram_token", "") or "").strip()
    telegram_chat = str(answers.get("telegram_chat", "") or "").strip()
    values["TELEGRAM_BOT_TOKEN"] = telegram_token
    values["TELEGRAM_CHAT_ID"] = telegram_chat

    if mode == "live":
        if not token:
            raise ConfigError(
                "برای معامله‌ی واقعی، کلید API لازم است. اگر کلید ندارید، حالت تمرینی (paper) را انتخاب کنید."
            )
        if confirm != LIVE_CONFIRM_PHRASE:
            raise ConfigError(
                f"برای فعال‌کردن معامله‌ی واقعی باید دقیقاً این عبارت را تایپ کنید: {LIVE_CONFIRM_PHRASE}"
            )
        values["LIVE_TRADING_CONFIRM"] = confirm
        if str(answers.get("profile")) in {"3", "active"}:
            raise ConfigError(
                "پروفایل «فعال» با پول واقعی مجاز نیست. برای معامله‌ی واقعی، پروفایل ۱ یا ۲ را انتخاب کنید."
            )

    Settings.from_env(env=values, use_dotenv=False)  # اعتبارسنجی نهایی
    return values


def render_env(values: dict[str, str]) -> str:
    lines = [
        "# ---- این فایل را ربات خوانده و کلیدها را از آن برمی‌دارد ----",
        "# هرگز این فایل را در تلگرام، ایمیل، گیت‌هاب یا اسکرین‌شات نفرستید.",
        f"# ساخته‌شده در {time.strftime('%Y-%m-%d %H:%M')}",
        "",
    ]
    for key, value in values.items():
        lines.append(f"{key}={value}")
    return "\n".join(lines) + "\n"


def write_env(path: Path, values: dict[str, str]) -> Path | None:
    """نوشتن `.env` با مجوز 600 و نسخه‌ی پشتیبان از فایل قبلی."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    backup = None
    if path.exists():
        backup = path.with_name(f"{path.name}.bak-{int(time.time())}")
        backup.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
        try:
            backup.chmod(0o600)
        except OSError:
            pass
    path.write_text(render_env(values), encoding="utf-8")
    try:
        path.chmod(0o600)
    except OSError:  # ویندوز مجوز یونیکسی ندارد
        pass
    return backup


# ------------------------------------------------------------------ پرسش‌ها
def _ask(prompt: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    try:
        answer = input(f"{prompt}{suffix}: ").strip()
    except EOFError:
        return default
    return answer or default


def _ask_secret(prompt: str) -> str:
    try:
        return getpass.getpass(f"{prompt}: ").strip()
    except (EOFError, KeyboardInterrupt):
        return ""


def _ask_choice(prompt: str, options: dict[str, str], default: str) -> str:
    print(f"\n{prompt}")
    for key, label in options.items():
        marker = " (پیش‌فرض)" if key == default else ""
        print(f"  {key}) {label}{marker}")
    while True:
        answer = _ask("شماره را وارد کنید", default)
        if answer in options:
            return answer
        print("  ⚠️ عدد درست را وارد کنید.")


def run_wizard(
    input_fn=_ask,
    secret_fn=_ask_secret,
    choice_fn=_ask_choice,
    out=print,
    env_path: Path | None = None,
    run_check: bool = True,
) -> int:
    """اجرای تعاملی؛ همه‌ی ورودی‌ها تزریق‌پذیرند تا قابل تست باشد."""
    env_path = env_path or (ROOT / ".env")
    out("\n" + "=" * 60)
    out("دستیار راه‌اندازی ربات معامله‌گر")
    out("=" * 60)
    out(
        "این برنامه چند سؤال ساده می‌پرسد و همه‌چیز را آماده می‌کند.\n"
        "اگر جایی را نمی‌دانید، فقط Enter بزنید تا مقدار پیش‌فرض انتخاب شود.\n"
    )
    out("یادآوری مهم: هدف این ربات «کم کردن ضرر و تصمیم منظم» است، نه تضمین سود.")
    out("پیشنهاد: چند روز اول در حالت تمرینی (بدون پول واقعی) اجرا شود.\n")

    exchange_choice = choice_fn(
        "۱) از کدام صرافی استفاده می‌کنید؟",
        {"1": "نوبیتکس", "2": "والکس"},
        "1",
    )
    exchange = SUPPORTED_EXCHANGES[exchange_choice]

    out(f"\n۲) اسم دارایی/جفت‌ارز را وارد کنید. نمونه‌ها: {SYMBOL_HINTS[exchange]}")
    symbol = input_fn("نماد", DEFAULT_SYMBOL[exchange])

    mode_choice = choice_fn(
        "۳) حالت اجرا؟",
        {
            "1": "تمرینی (paper) — بدون پول واقعی، پیشنهاد ما",
            "2": "واقعی (live) — با پول واقعی حساب شما",
        },
        "1",
    )
    mode = "paper" if mode_choice == "1" else "live"

    token = ""
    if mode == "live":
        out(
            "\n۴) کلید API را از پنل صرافی کپی و اینجا Paste کنید.\n"
            "   هنگام تایپ چیزی نمایش داده نمی‌شود؛ این طبیعی است.\n"
            "   (کلید فقط در فایل .env روی همین رایانه ذخیره می‌شود.)"
        )
        token = secret_fn("کلید API")
        if not token:
            out("⚠️ کلیدی وارد نشد؛ به حالت تمرینی برمی‌گردیم.")
            mode = "paper"
    else:
        out(
            "\n۴) حالت تمرینی انتخاب شد: نیازی به کلید API نیست و پول واقعی در خطر نیست.\n"
            "   اگر بعداً خواستید واقعی معامله کنید، همین دستیار را دوباره اجرا کنید\n"
            "   و در سؤال ۳ حالت ۲ (واقعی) را انتخاب کنید."
        )
        token = ""

    profile_choice = choice_fn(
        "۵) میزان محافظه‌کاری؟ (هرچه بالاتر، معامله بیشتر و ریسک بیشتر)",
        {key: item["label"] for key, item in PROFILES.items()},
        "1",
    )
    profile = PROFILES[profile_choice]["name"]

    starting_cash = "10000000"
    if mode == "paper":
        starting_cash = input_fn("۶) سرمایه‌ی فرضی برای تمرین (تومان)", "10000000")

    telegram_token = ""
    telegram_chat = ""
    answers_tg = input_fn("۷) می‌خواهید گزارش‌ها به تلگرام بیاید؟ (y/n)", "n").lower()
    if answers_tg in {"y", "yes", "بله"}:
        telegram_token = secret_fn("توکن ربات تلگرام")
        telegram_chat = input_fn("Chat ID شما (عدد)")

    confirm = ""
    if mode == "live":
        out("\n" + "!" * 60)
        out("هشدار: از این لحظه سفارش‌ها با پول واقعی ثبت می‌شوند.")
        out("فقط مبلغی را وارد کنید که از دست دادنش برایتان مسئله‌ساز نیست.")
        out("برای ادامه، این عبارت را دقیقاً تایپ کنید:")
        out(f"  {LIVE_CONFIRM_PHRASE}")
        out("!" * 60)
        confirm = input_fn("عبارت تأیید")

    try:
        values = build_env(
            {
                "exchange": exchange,
                "symbol": symbol,
                "mode": mode,
                "token": token,
                "profile": profile_choice,
                "starting_cash": starting_cash,
                "telegram_token": telegram_token,
                "telegram_chat": telegram_chat,
                "confirm": confirm,
            }
        )
    except ConfigError as exc:
        out(f"\n❌ {exc}\nهیچ فایلی تغییر نکرد. دوباره اجرا کنید و پاسخ‌ها را اصلاح کنید.")
        return 2

    backup = write_env(env_path, values)
    out(f"\n✅ تنظیمات ذخیره شد: {env_path}")
    if backup:
        out(f"   نسخه‌ی قبلی: {backup}")

    settings = Settings.from_env(env_file=env_path, env={})
    economics = analyze(
        settings.take_profit_pct,
        settings.stop_loss_pct,
        settings.fee_pct,
        settings.max_trades_per_day,
    )
    out("\n📊 حساب‌وکتاب این تنظیمات:")
    for line in explain(economics):
        out(f"   • {line}")

    if run_check:
        out("\n🔎 بررسی اتصال (هیچ سفارشی ثبت نمی‌شود)...")
        try:
            checks = preflight(settings)
        except Exception as exc:  # noqa: BLE001 - هر خطایی باید پیام ساده بدهد
            out(f"   بررسی انجام نشد: {type(exc).__name__} — بعداً `python -m trader check` را اجرا کنید.")
        else:
            for check in checks:
                icon = "✅" if check.ok else ("⚠️" if check.level != "error" else "❌")
                out(f"   {icon} {check.name}: {check.detail}")
            if has_blocking_errors(checks):
                out("\n⚠️ بعضی بررسی‌ها ناموفق بود؛ معمولاً به معنی مشکل اینترنت/کلید است.")

    out("\n" + "=" * 60)
    out("قدم‌های بعدی (این دستورها را در همین پوشه اجرا کنید):")
    out("  1) python -m trader check     ← بررسی نهایی")
    out("  2) python -m trader once      ← یک تصمیم/معامله‌ی آزمایشی")
    out(f"  3) python -m trader run       ← اجرای مداوم (هر {settings.cycle_seconds} ثانیه)")
    out("\nبرای توقف: Ctrl+C یا در ترمینال دیگر: python -m trader panic")
    out("=" * 60 + "\n")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="دستیار راه‌اندازی ربات (فارسی و ساده)")
    parser.add_argument("--env-file", default=None, help="مسیر فایل .env (پیش‌فرض: کنار همین اسکریپت)")
    parser.add_argument("--no-check", action="store_true", help="بررسی اتصال را انجام نده")
    parser.add_argument(
        "--quick",
        nargs=4,
        metavar=("EXCHANGE", "SYMBOL", "MODE", "PROFILE"),
        help="بدون پرسش: مثلاً --quick nobitex BTCIRT paper conservative",
    )
    parser.add_argument("--token", default="", help="کلید API (فقط برای حالت خودکار/آزمایش)")
    args = parser.parse_args(argv)

    env_path = Path(args.env_file) if args.env_file else ROOT / ".env"
    if args.quick:
        exchange, symbol, mode, profile = args.quick
        try:
            values = build_env(
                {
                    "exchange": exchange,
                    "symbol": symbol,
                    "mode": mode,
                    "token": args.token or os.environ.get(CREDENTIAL_KEY.get(exchange, ""), ""),
                    "profile": profile,
                    "starting_cash": "10000000",
                    "confirm": LIVE_CONFIRM_PHRASE if mode == "live" else "",
                }
            )
        except ConfigError as exc:
            print(f"❌ {exc}", file=sys.stderr)
            return 2
        backup = write_env(env_path, values)
        print(f"✅ تنظیمات نوشته شد: {env_path}" + (f" (پشتیبان: {backup})" if backup else ""))
        return 0

    try:
        return run_wizard(
            env_path=env_path,
            input_fn=_ask,
            secret_fn=_ask_secret,
            choice_fn=_ask_choice,
            run_check=not args.no_check,
        )
    except KeyboardInterrupt:
        print("\nلغو شد؛ هیچ فایلی تغییر نکرد.")
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
