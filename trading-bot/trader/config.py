"""تنظیمات معامله‌گر و نگهبان‌های ایمنی.

همه‌ی تنظیمات از متغیرهای محیطی (یا فایل `.env`) خوانده می‌شوند. هیچ کلید یا
رمزگذاری در کد نوشته نمی‌شود. حالت پیش‌فرض «paper» (کاغذی) است و برای فعال
کردن معامله‌ی واقعی باید هم `TRADING_MODE=live` باشد و هم عبارت تأیید ایمنی
دقیقاً در `LIVE_TRADING_CONFIRM` قرار گرفته باشد.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Mapping

from .economics import round_trip_fee_pct

LIVE_CONFIRM_PHRASE = "I-UNDERSTAND-THE-RISK"
SUPPORTED_EXCHANGES = ("nobitex", "wallex")
SUPPORTED_MODES = ("paper", "live")
RIAL_QUOTES = {"IRT", "RLS", "TMN"}
QUOTE_SUFFIXES = ("USDT", "USDC", "IRT", "RLS", "TMN")


class ConfigError(ValueError):
    """تنظیمات ناقص یا ناایمن."""


def parse_dotenv(text: str) -> dict[str, str]:
    """تجزیه‌ی ساده‌ی فایل `.env` بدون وابستگی بیرونی."""
    values: dict[str, str] = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        else:
            value = value.split(" #", 1)[0].strip()
        if key:
            values[key] = value
    return values


def split_symbol(symbol: str) -> tuple[str, str]:
    """نماد را به (ارز پایه، ارز مظنه) تبدیل می‌کند: ``BTCIRT`` → ``("BTC", "IRT")``."""
    cleaned = symbol.strip().upper().replace("/", "").replace("-", "").replace("_", "")
    for quote in QUOTE_SUFFIXES:
        if cleaned.endswith(quote) and len(cleaned) > len(quote):
            return cleaned[: -len(quote)], quote
    raise ConfigError(
        f"نماد «{symbol}» پشتیبانی نمی‌شود. نمونه‌های درست: BTCIRT، BTCUSDT، ETHIRT."
    )


@dataclass
class Settings:
    # --- اتصال ---
    exchange: str = "nobitex"
    mode: str = "paper"
    symbol: str = "BTCIRT"
    nobitex_api_token: str = ""
    wallex_api_key: str = ""

    # --- موتور تصمیم ---
    cycle_seconds: int = 300
    candle_resolution: str = "5"
    candle_lookback: int = 240
    ema_fast: int = 20
    ema_slow: int = 50
    ema_trend: int = 200
    rsi_period: int = 14
    atr_period: int = 14

    # --- ریسک ---
    max_position_pct: float = 5.0
    max_total_position_pct: float = 15.0
    max_daily_loss_pct: float = 3.0
    max_trades_per_day: int = 8
    cooldown_minutes: int = 30
    stop_loss_pct: float = 2.0
    take_profit_pct: float = 4.0
    max_spread_pct: float = 1.5
    max_slippage_pct: float = 0.5
    fee_pct: float = 0.4
    paper_slippage_pct: float = 0.05
    min_trade_quote: float | None = None
    starting_cash_quote: float | None = None
    order_fill_timeout: int = 30

    # --- زیرساخت ---
    state_dir: Path = Path("state")
    http_timeout: int = 15
    user_agent: str = "danesh-trader/0.1"
    timezone: str = "Asia/Tehran"
    log_level: str = "INFO"
    live_confirm: str = ""

    # --- هوش مصنوعی (اختیاری) ---
    llm_enabled: bool = False
    llm_model: str = "gpt-4o-mini"
    llm_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = ""
    llm_timeout: int = 30
    llm_min_confidence: float = 0.6
    ai_decision_mode: str = "veto"

    # --- تلگرام (اختیاری) ---
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    def __post_init__(self) -> None:
        self.state_dir = Path(self.state_dir).expanduser()
        self.symbol = self.symbol.strip().upper()
        self.exchange = self.exchange.strip().lower()
        self.mode = self.mode.strip().lower()

    # ------------------------------------------------------------------ مسیرها
    @property
    def db_path(self) -> Path:
        return self.state_dir / "trader.sqlite3"

    @property
    def kill_switch_path(self) -> Path:
        return self.state_dir / "STOP"

    @property
    def log_path(self) -> Path:
        return self.state_dir / "trader.log"

    def ensure_dirs(self) -> None:
        self.state_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------ دارایی‌ها
    @property
    def pair(self) -> tuple[str, str]:
        return split_symbol(self.symbol)

    @property
    def base_asset(self) -> str:
        return self.pair[0]

    @property
    def quote_asset(self) -> str:
        return self.pair[1]

    @property
    def quote_is_rial(self) -> bool:
        return self.quote_asset in RIAL_QUOTES

    @property
    def min_trade_quote_effective(self) -> float:
        if self.min_trade_quote is not None:
            return float(self.min_trade_quote)
        # حداقل تقریبی سفارش: ۱۰۰ هزار تومان برای بازار ریالی و ۵ دلار برای USDT
        return 100_000.0 if self.quote_is_rial else 5.0

    @property
    def starting_cash_quote_effective(self) -> float:
        if self.starting_cash_quote is not None:
            return float(self.starting_cash_quote)
        return 10_000_000.0 if self.quote_is_rial else 500.0

    # ------------------------------------------------------------ وضعیت‌ها
    @property
    def is_live(self) -> bool:
        return self.mode == "live"

    @property
    def credentials_present(self) -> bool:
        if self.exchange == "nobitex":
            return bool(self.nobitex_api_token.strip())
        if self.exchange == "wallex":
            return bool(self.wallex_api_key.strip())
        return False

    @property
    def telegram_enabled(self) -> bool:
        return bool(self.telegram_bot_token.strip() and self.telegram_chat_id.strip())

    @property
    def llm_available(self) -> bool:
        return bool(self.llm_enabled and self.llm_api_key.strip())

    def secret_values(self) -> list[str]:
        """مقادیری که هرگز نباید در لاگ یا خروجی چاپ شوند."""
        return [
            value
            for value in (
                self.nobitex_api_token,
                self.wallex_api_key,
                self.llm_api_key,
                self.telegram_bot_token,
            )
            if value and len(value) >= 8
        ]

    # ------------------------------------------------------------- اعتبارسنجی
    def validate(self) -> None:
        errors: list[str] = []

        if self.exchange not in SUPPORTED_EXCHANGES:
            errors.append(
                f"EXCHANGE باید یکی از {', '.join(SUPPORTED_EXCHANGES)} باشد (مقدار فعلی: {self.exchange!r})."
            )
        try:
            split_symbol(self.symbol)
        except ConfigError as exc:
            errors.append(str(exc))

        if self.mode not in SUPPORTED_MODES:
            errors.append("TRADING_MODE باید paper یا live باشد.")

        if not 0 < self.max_position_pct <= 100:
            errors.append("MAX_POSITION_PCT باید بین ۰ و ۱۰۰ باشد.")
        if not 0 < self.max_total_position_pct <= 100:
            errors.append("MAX_TOTAL_POSITION_PCT باید بین ۰ و ۱۰۰ باشد.")
        if self.max_total_position_pct < self.max_position_pct:
            errors.append("MAX_TOTAL_POSITION_PCT نباید کمتر از MAX_POSITION_PCT باشد.")
        if not 0 < self.max_daily_loss_pct < 100:
            errors.append("MAX_DAILY_LOSS_PCT باید بین ۰ و ۱۰۰ باشد.")
        if self.max_trades_per_day < 1:
            errors.append("MAX_TRADES_PER_DAY باید دست‌کم ۱ باشد.")
        if self.cycle_seconds < 30:
            errors.append("CYCLE_SECONDS نباید کمتر از ۳۰ ثانیه باشد.")
        if self.candle_lookback < self.ema_trend + 10:
            errors.append(
                "CANDLE_LOOKBACK باید دست‌کم EMA_TREND + ۱۰ باشد تا اندیکاتورها معتبر بمانند."
            )
        if not 0 < self.stop_loss_pct < 100:
            errors.append("STOP_LOSS_PCT باید بین ۰ و ۱۰۰ باشد.")
        if not 0 < self.take_profit_pct < 1000:
            errors.append("TAKE_PROFIT_PCT باید بزرگ‌تر از صفر باشد.")
        elif self.take_profit_pct <= round_trip_fee_pct(self.fee_pct):
            errors.append(
                "TAKE_PROFIT_PCT باید از کارمزد رفت‌وبرگشت "
                f"({round_trip_fee_pct(self.fee_pct):.2f}%) بیشتر باشد؛ در غیر این صورت "
                "حتی معامله‌ی برنده هم ضرر می‌دهد."
            )
        if not 0 <= self.max_spread_pct < 100:
            errors.append("MAX_SPREAD_PCT باید بین ۰ و ۱۰۰ باشد.")
        if not 0 <= self.fee_pct < 10:
            errors.append("FEE_PCT باید بین ۰ و ۱۰ باشد.")
        if self.min_trade_quote is not None and self.min_trade_quote <= 0:
            errors.append("MIN_TRADE_QUOTE باید مثبت باشد.")
        if self.starting_cash_quote is not None and self.starting_cash_quote <= 0:
            errors.append("STARTING_CASH_QUOTE باید مثبت باشد.")
        if self.llm_enabled and not self.llm_api_key.strip():
            errors.append("LLM_ENABLED=true است اما LLM_API_KEY (یا OPENAI_API_KEY) خالی است.")
        if not 0 < self.llm_min_confidence <= 1:
            errors.append("AI_MIN_CONFIDENCE باید بین ۰ و ۱ باشد.")
        if self.ai_decision_mode not in ("veto", "independent"):
            errors.append("AI_DECISION_MODE باید veto یا independent باشد.")
        if bool(self.telegram_bot_token.strip()) != bool(self.telegram_chat_id.strip()):
            errors.append("TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID باید با هم تنظیم شوند.")

        if self.mode == "live":
            if self.live_confirm != LIVE_CONFIRM_PHRASE:
                errors.append(
                    "برای حالت live باید LIVE_TRADING_CONFIRM دقیقاً برابر "
                    f"«{LIVE_CONFIRM_PHRASE}» باشد. تا آن زمان معامله‌ی واقعی انجام نمی‌شود."
                )
            if not self.credentials_present:
                credential_name = "NOBITEX_API_TOKEN" if self.exchange == "nobitex" else "WALLEX_API_KEY"
                errors.append(f"حالت live بدون کلید API ممکن نیست: {credential_name} خالی است.")

        if errors:
            raise ConfigError("تنظیمات نامعتبر است:\n- " + "\n- ".join(errors))

    # ------------------------------------------------------------------ سازنده
    @classmethod
    def from_env(
        cls,
        env: Mapping[str, str] | None = None,
        env_file: str | Path | None = None,
        use_dotenv: bool = True,
    ) -> "Settings":
        values: dict[str, str] = {}
        if use_dotenv:
            path = Path(env_file) if env_file is not None else Path.cwd() / ".env"
            if path.exists():
                values.update(parse_dotenv(path.read_text(encoding="utf-8")))
        source = dict(os.environ) if env is None else dict(env)
        if use_dotenv:
            values.update(source)
        else:
            values = source

        def raw(name: str, default: str = "") -> str:
            value = values.get(name)
            if value is None or str(value).strip() == "":
                return default
            return str(value).strip()

        def number(name: str, default, caster):
            value = raw(name, "")
            if value == "":
                return default
            try:
                return caster(value)
            except ValueError as exc:
                raise ConfigError(f"مقدار {name} عددی نیست: {value!r}") from exc

        def optional_number(name: str, caster):
            value = raw(name, "")
            if value == "":
                return None
            try:
                return caster(value)
            except ValueError as exc:
                raise ConfigError(f"مقدار {name} عددی نیست: {value!r}") from exc

        def boolean(name: str, default: bool = False) -> bool:
            value = raw(name, "")
            if value == "":
                return default
            return value.lower() in {"1", "true", "yes", "on", "y"}

        exchange = raw("EXCHANGE", "nobitex").lower()
        default_symbol = "BTCIRT" if exchange == "nobitex" else "BTCUSDT"

        settings = cls(
            exchange=exchange,
            mode=raw("TRADING_MODE", "paper").lower(),
            symbol=raw("SYMBOL", default_symbol),
            nobitex_api_token=raw("NOBITEX_API_TOKEN"),
            wallex_api_key=raw("WALLEX_API_KEY"),
            cycle_seconds=number("CYCLE_SECONDS", 300, int),
            candle_resolution=raw("CANDLE_RESOLUTION", "5"),
            candle_lookback=number("CANDLE_LOOKBACK", 240, int),
            ema_fast=number("EMA_FAST", 20, int),
            ema_slow=number("EMA_SLOW", 50, int),
            ema_trend=number("EMA_TREND", 200, int),
            rsi_period=number("RSI_PERIOD", 14, int),
            atr_period=number("ATR_PERIOD", 14, int),
            max_position_pct=number("MAX_POSITION_PCT", 5.0, float),
            max_total_position_pct=number("MAX_TOTAL_POSITION_PCT", 15.0, float),
            max_daily_loss_pct=number("MAX_DAILY_LOSS_PCT", 3.0, float),
            max_trades_per_day=number("MAX_TRADES_PER_DAY", 8, int),
            cooldown_minutes=number("COOLDOWN_MINUTES", 30, int),
            stop_loss_pct=number("STOP_LOSS_PCT", 2.0, float),
            take_profit_pct=number("TAKE_PROFIT_PCT", 4.0, float),
            max_spread_pct=number("MAX_SPREAD_PCT", 1.5, float),
            max_slippage_pct=number("MAX_SLIPPAGE_PCT", 0.5, float),
            fee_pct=number("FEE_PCT", 0.4, float),
            paper_slippage_pct=number("PAPER_SLIPPAGE_PCT", 0.05, float),
            min_trade_quote=optional_number("MIN_TRADE_QUOTE", float),
            starting_cash_quote=optional_number("STARTING_CASH_QUOTE", float),
            order_fill_timeout=number("ORDER_FILL_TIMEOUT", 30, int),
            state_dir=Path(raw("STATE_DIR", "state")),
            http_timeout=number("HTTP_TIMEOUT", 15, int),
            user_agent=raw("USER_AGENT", "danesh-trader/0.1"),
            timezone=raw("TIMEZONE", "Asia/Tehran"),
            log_level=raw("LOG_LEVEL", "INFO").upper(),
            live_confirm=raw("LIVE_TRADING_CONFIRM"),
            llm_enabled=boolean("LLM_ENABLED", False),
            llm_model=raw("LLM_MODEL", "gpt-4o-mini"),
            llm_base_url=raw("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/"),
            llm_api_key=raw("LLM_API_KEY") or raw("OPENAI_API_KEY"),
            llm_timeout=number("LLM_TIMEOUT", 30, int),
            llm_min_confidence=number("AI_MIN_CONFIDENCE", 0.6, float),
            ai_decision_mode=raw("AI_DECISION_MODE", "veto").lower(),
            telegram_bot_token=raw("TELEGRAM_BOT_TOKEN"),
            telegram_chat_id=raw("TELEGRAM_CHAT_ID"),
        )
        settings.validate()
        return settings

    def describe(self) -> dict[str, str]:
        """خلاصه‌ی امن تنظیمات برای دستور `check` (بدون افشای کلید)."""
        from .util import fingerprint

        return {
            "exchange": self.exchange,
            "mode": self.mode,
            "symbol": self.symbol,
            "cycle_seconds": str(self.cycle_seconds),
            "resolution": f"{self.candle_resolution}m",
            "max_position_pct": f"{self.max_position_pct}%",
            "max_daily_loss_pct": f"{self.max_daily_loss_pct}%",
            "stop_loss_pct": f"{self.stop_loss_pct}%",
            "take_profit_pct": f"{self.take_profit_pct}%",
            "credentials": "set" if self.credentials_present else "missing",
            "credential_fingerprint": fingerprint(
                self.nobitex_api_token or self.wallex_api_key
            ),
            "llm_enabled": str(self.llm_available),
            "ai_mode": self.ai_decision_mode,
            "telegram": "on" if self.telegram_enabled else "off",
            "state_dir": str(self.state_dir),
            "kill_switch": "ACTIVE" if self.kill_switch_path.exists() else "off",
        }
