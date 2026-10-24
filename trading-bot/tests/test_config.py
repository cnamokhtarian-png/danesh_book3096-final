import pytest

from trader.broker.base import to_float
from trader.config import (
    LIVE_CONFIRM_PHRASE,
    ConfigError,
    Settings,
    parse_dotenv,
    split_symbol,
)
from trader.util import SecretRedactor, fingerprint


def test_split_symbol_variants():
    assert split_symbol("BTCIRT") == ("BTC", "IRT")
    assert split_symbol("btc/usdt") == ("BTC", "USDT")
    assert split_symbol("ETH-RLS") == ("ETH", "RLS")
    with pytest.raises(ConfigError):
        split_symbol("BTC")


def test_parse_dotenv_handles_quotes_comments_and_export():
    text = """
    # comment
    EXCHANGE=nobitex
    export SYMBOL="BTCIRT"
    PASSWORD='a=b#c'
    BARE=value # inline comment
    EMPTY=
    """
    values = parse_dotenv(text)
    assert values["EXCHANGE"] == "nobitex"
    assert values["SYMBOL"] == "BTCIRT"
    assert values["PASSWORD"] == "a=b#c"
    assert values["BARE"] == "value"
    assert values["EMPTY"] == ""


def test_defaults_are_paper_and_safe():
    settings = Settings.from_env(env={}, use_dotenv=False)
    assert settings.mode == "paper"
    assert settings.is_live is False
    assert settings.symbol == "BTCIRT"
    assert settings.quote_is_rial is True
    assert settings.min_trade_quote_effective == 100_000.0
    settings.validate()


def test_live_mode_requires_confirmation_and_credentials():
    with pytest.raises(ConfigError) as excinfo:
        Settings.from_env(env={"TRADING_MODE": "live"}, use_dotenv=False)
    message = str(excinfo.value)
    assert LIVE_CONFIRM_PHRASE in message
    assert "NOBITEX_API_TOKEN" in message

    settings = Settings.from_env(
        env={
            "TRADING_MODE": "live",
            "LIVE_TRADING_CONFIRM": LIVE_CONFIRM_PHRASE,
            "NOBITEX_API_TOKEN": "abcdef1234567890",
        },
        use_dotenv=False,
    )
    settings.validate()
    assert settings.is_live


def test_live_mode_confirmed_without_credentials_still_fails():
    with pytest.raises(ConfigError):
        Settings.from_env(
            env={"TRADING_MODE": "live", "LIVE_TRADING_CONFIRM": LIVE_CONFIRM_PHRASE},
            use_dotenv=False,
        )


def test_unknown_exchange_and_bad_numbers_rejected():
    with pytest.raises(ConfigError):
        Settings.from_env(env={"EXCHANGE": "binance"}, use_dotenv=False)
    with pytest.raises(ConfigError):
        Settings.from_env(env={"MAX_POSITION_PCT": "abc"}, use_dotenv=False)
    with pytest.raises(ConfigError):
        Settings.from_env(env={"MAX_POSITION_PCT": "0"}, use_dotenv=False)


def test_resolution_and_symbol_defaults_for_wallex():
    settings = Settings.from_env(env={"EXCHANGE": "wallex"}, use_dotenv=False)
    assert settings.symbol == "BTCUSDT"
    assert settings.quote_is_rial is False


def test_llm_enabled_without_key_is_error():
    with pytest.raises(ConfigError):
        Settings.from_env(env={"LLM_ENABLED": "true"}, use_dotenv=False)


def test_telegram_requires_both_parts():
    with pytest.raises(ConfigError):
        Settings.from_env(env={"TELEGRAM_BOT_TOKEN": "123:abc"}, use_dotenv=False)


def test_describe_never_leaks_secret():
    settings = Settings.from_env(
        env={"NOBITEX_API_TOKEN": "supersecrettoken123"}, use_dotenv=False
    )
    described = settings.describe()
    joined = " ".join(f"{k}={v}" for k, v in described.items())
    assert "supersecrettoken123" not in joined
    assert described["credentials"] == "set"
    assert described["credential_fingerprint"].startswith("sha256:")


def test_secret_redactor_scrubs_logs():
    redactor = SecretRedactor(["abc123456"])
    assert redactor.redact("token=abc123456") == "token=***REDACTED***"
    assert fingerprint("abc123456") != fingerprint("abc1234567")
    assert fingerprint("") == "—"


def test_to_float_accepts_persian_digits_and_units():
    assert to_float("۱۲۳٬۴۵۶٫۷") == 123456.7
    assert to_float("1,234.5 IRR") == 1234.5
    assert to_float("٪12.5%") == 12.5
    assert to_float(None, default=-1) == -1
    assert to_float("not-a-number", default=7) == 7
    assert to_float(float("nan"), default=3) == 3
