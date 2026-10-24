import os
import stat

import pytest

import setup_wizard as wizard
from setup_wizard import PROFILES, build_env, blank_env, render_env, run_wizard, write_env
from trader.config import LIVE_CONFIRM_PHRASE, ConfigError, Settings


def test_blank_env_is_valid_for_both_exchanges():
    for exchange in ("nobitex", "wallex"):
        values = blank_env(exchange)
        settings = Settings.from_env(env=values, use_dotenv=False)
        assert settings.mode == "paper"
        assert settings.exchange == exchange
        assert settings.symbol == ("BTCIRT" if exchange == "nobitex" else "BTCUSDT")


def test_profiles_are_all_valid_and_differ():
    seen = set()
    for key, item in PROFILES.items():
        values = blank_env("nobitex", profile=item["name"])
        settings = Settings.from_env(env=values, use_dotenv=False)
        assert settings.max_trades_per_day >= 1
        seen.add((settings.max_position_pct, settings.max_trades_per_day))
    assert len(seen) == len(PROFILES)


def test_paper_mode_needs_no_token():
    values = build_env({"exchange": "nobitex", "mode": "paper", "profile": "conservative"})
    settings = Settings.from_env(env=values, use_dotenv=False)
    assert settings.mode == "paper"
    assert settings.nobitex_api_token == ""
    assert settings.max_position_pct == 3.0
    assert settings.take_profit_pct == 5.0


def test_live_mode_requires_token_and_phrase():
    with pytest.raises(ConfigError) as excinfo:
        build_env({"exchange": "nobitex", "mode": "live", "profile": "balanced"})
    assert "کلید API" in str(excinfo.value)

    with pytest.raises(ConfigError) as excinfo:
        build_env(
            {"exchange": "nobitex", "mode": "live", "profile": "balanced", "token": "tok-123456"}
        )
    assert LIVE_CONFIRM_PHRASE in str(excinfo.value)


def test_live_rejects_active_profile():
    with pytest.raises(ConfigError) as excinfo:
        build_env(
            {
                "exchange": "nobitex",
                "mode": "live",
                "profile": "active",
                "token": "tok-123456",
                "confirm": LIVE_CONFIRM_PHRASE,
            }
        )
    assert "پروفایل" in str(excinfo.value)


def test_live_valid_configuration():
    values = build_env(
        {
            "exchange": "wallex",
            "mode": "live",
            "profile": "conservative",
            "token": "wallex-key-123456",
            "confirm": LIVE_CONFIRM_PHRASE,
        }
    )
    settings = Settings.from_env(env=values, use_dotenv=False)
    assert settings.is_live
    assert settings.wallex_api_key == "wallex-key-123456"
    assert settings.symbol == "BTCUSDT"


def test_render_env_has_headers_and_all_keys():
    text = render_env(blank_env("nobitex"))
    assert text.startswith("#")
    assert "TRADING_MODE=paper" in text
    assert "NOBITEX_API_TOKEN=" in text


def test_write_env_sets_permissions_and_backup(tmp_path):
    env_path = tmp_path / ".env"
    write_env(env_path, build_env({"exchange": "nobitex", "mode": "paper"}))
    assert env_path.exists()
    if os.name == "posix":
        assert stat.S_IMODE(env_path.stat().st_mode) == 0o600

    backup = write_env(env_path, build_env({"exchange": "nobitex", "mode": "paper", "profile": "active"}))
    assert backup is not None and backup.exists()
    assert "MAX_POSITION_PCT=8" in env_path.read_text(encoding="utf-8")


def _scripted(inputs, choices, secret=""):
    inputs = list(inputs)
    choices = list(choices)

    def input_fn(prompt, default=""):
        return inputs.pop(0) if inputs else default

    def choice_fn(prompt, options, default):
        return choices.pop(0) if choices else default

    def secret_fn(prompt):
        return secret

    return input_fn, choice_fn, secret_fn


def test_run_wizard_paper_end_to_end(tmp_path, capsys):
    env_path = tmp_path / ".env"
    input_fn, choice_fn, secret_fn = _scripted(
        inputs=["BTCIRT", "5000000", "n"], choices=["1", "1", "1"]
    )
    code = run_wizard(
        input_fn=input_fn,
        secret_fn=secret_fn,
        choice_fn=choice_fn,
        out=lambda *a, **k: None,
        env_path=env_path,
        run_check=False,
    )
    assert code == 0
    settings = Settings.from_env(env_file=env_path, env={})
    assert settings.mode == "paper"
    assert settings.starting_cash_quote == 5_000_000
    assert settings.max_position_pct == 3.0


def test_run_wizard_live_end_to_end(tmp_path):
    env_path = tmp_path / ".env"
    input_fn, choice_fn, secret_fn = _scripted(
        inputs=["BTCIRT", "n", LIVE_CONFIRM_PHRASE], choices=["1", "2", "2"], secret="tok-abcdef123456"
    )
    code = run_wizard(
        input_fn=input_fn,
        secret_fn=secret_fn,
        choice_fn=choice_fn,
        out=lambda *a, **k: None,
        env_path=env_path,
        run_check=False,
    )
    assert code == 0
    settings = Settings.from_env(env_file=env_path, env={})
    assert settings.is_live
    assert settings.nobitex_api_token == "tok-abcdef123456"
    assert settings.max_position_pct == 5.0


def test_run_wizard_wrong_phrase_writes_nothing(tmp_path):
    env_path = tmp_path / ".env"
    input_fn, choice_fn, secret_fn = _scripted(
        inputs=["BTCIRT", "n", "yes"], choices=["1", "2", "2"], secret="tok-abcdef123456"
    )
    code = run_wizard(
        input_fn=input_fn,
        secret_fn=secret_fn,
        choice_fn=choice_fn,
        out=lambda *a, **k: None,
        env_path=env_path,
        run_check=False,
    )
    assert code == 2
    assert not env_path.exists()


def test_quick_mode_cli(tmp_path):
    env_path = tmp_path / ".env"
    code = wizard.main(
        ["--env-file", str(env_path), "--quick", "nobitex", "ETHIRT", "paper", "balanced"]
    )
    assert code == 0
    settings = Settings.from_env(env_file=env_path, env={})
    assert settings.symbol == "ETHIRT"
    assert settings.mode == "paper"
