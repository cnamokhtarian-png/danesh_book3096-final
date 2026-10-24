"""تست‌های نسخه‌ی تک‌فایلی (danesh_bot.py) — همان منطق، بدون بسته‌بندی."""

import importlib.util
from pathlib import Path

import pytest

PATH = Path(__file__).resolve().parents[1] / "single-file" / "danesh_bot.py"


@pytest.fixture(scope="module")
def bot():
    spec = importlib.util.spec_from_file_location("danesh_bot_single", PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_indicators(bot):
    values = [float(100 + i) for i in range(40)]
    assert bot.ema(values, 10) > 130
    assert bot.ema([1.0, 2.0], 10) is None
    assert bot.rsi([100.0] * 30) == 50.0
    assert 0 <= bot.rsi(values) <= 100
    candles = bot.Synthetic().candles()
    assert bot.atr_pct(candles) > 0
    assert bot.volume_ratio(candles) >= 0


def test_split_symbol(bot):
    assert bot.split_symbol("BTCIRT") == ("BTC", "IRT")
    assert bot.split_symbol("btc/usdt") == ("BTC", "USDT")
    with pytest.raises(bot.BotError):
        bot.split_symbol("BTC")


def test_decide_uptrend_buys(bot):
    snap = bot.analyse(bot.Synthetic(uptrend=True).candles())
    action, confidence, reason = bot.decide(snap, bot.load_env())
    assert action == "BUY"
    assert 0 < confidence <= 1
    assert reason


def test_decide_downtrend_sells(bot):
    snap = bot.analyse(bot.Synthetic(uptrend=False).candles())
    action, _, _ = bot.decide(snap, bot.load_env())
    assert action == "SELL"


def test_decide_needs_data(bot):
    snap = {"price": 100.0, "ema_fast": None, "ema_slow": None, "ema_trend": None, "rsi": None, "atr": None, "volume": 0}
    assert bot.decide(snap, {})[0] == "HOLD"


def test_size_buy_caps_and_minimum(bot):
    env = {"MAX_POSITION_PCT": "5", "MIN_TRADE_QUOTE": "1000"}
    quantity, note = bot.size_buy(1_000_000, 1_000_000, 0, 10_000, env)
    assert quantity == pytest.approx(5.0)
    assert note
    quantity, note = bot.size_buy(10_000_000, 10_000_000, 0.2, 1_000_000, env)
    assert quantity == pytest.approx(0.3)  # ۵۰۰٬۰۰۰ − ۲۰۰٬۰۰۰ تومان فضای باقی‌مانده
    quantity, note = bot.size_buy(10_000_000, 10_000_000, 0.5, 1_000_000, env)
    assert quantity == 0 and "سقف" in note
    strict = {"MAX_POSITION_PCT": "5", "MIN_TRADE_QUOTE": "100000"}
    quantity, note = bot.size_buy(1_000_000, 1_000_000, 0, 10_000, strict)
    assert quantity == 0 and "حداقل" in note


def test_demo_runs_and_writes_no_state(bot, tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(bot, "STATE_PATH", str(tmp_path / "state.json"))
    monkeypatch.setattr(bot, "LOG_PATH", str(tmp_path / "bot.log"))
    code = bot.cmd_demo(bot.load_env())
    assert code == 0
    assert not (tmp_path / "state.json").exists()
    out = capsys.readouterr().out
    assert "خرید انجام شد" in out
    assert "حد ضرر" in out


def test_live_mode_blocked_without_confirm(bot, monkeypatch, capsys):
    monkeypatch.setattr(bot, "STATE_PATH", str(tmp_path_stub(bot)))
    env = {"MODE": "live", "CONFIRM": "", "NOBITEX_TOKEN": "", "SYMBOL": "BTCIRT"}
    code = bot.cmd_run(env, once=True)
    assert code == 2


def tmp_path_stub(bot):
    import tempfile

    return tempfile.mkdtemp()


def test_save_state_and_load(bot, tmp_path, monkeypatch):
    monkeypatch.setattr(bot, "STATE_PATH", str(tmp_path / "state.json"))
    env = {"START_CASH": "1234"}
    state = bot.load_state(env)
    assert state["cash"] == 1234.0
    state["holdings"] = 0.5
    bot.save_state(state)
    assert bot.load_state(env)["holdings"] == 0.5


def test_stop_switch_prevents_trading(bot, tmp_path, monkeypatch):
    monkeypatch.setattr(bot, "STATE_PATH", str(tmp_path / "state.json"))
    monkeypatch.setattr(bot, "STOP_PATH", str(tmp_path / "STOP"))
    (tmp_path / "STOP").write_text("stop", encoding="utf-8")
    state = bot.load_state({"START_CASH": "10000000"})
    assert bot.run_cycle(bot.load_env(), bot.Synthetic(), state) is False


def test_selftest_passes(bot):
    assert bot.cmd_selftest() == 0


# ---------------------------------------------------------------- منو و ویزارد
def _fresh(bot, monkeypatch, tmp_path):
    monkeypatch.setattr(bot, "ENV_PATH", str(tmp_path / "bot.env"))
    monkeypatch.setattr(bot, "STATE_PATH", str(tmp_path / "state.json"))
    monkeypatch.setattr(bot, "STOP_PATH", str(tmp_path / "STOP"))
    monkeypatch.setattr(bot, "LOG_PATH", str(tmp_path / "bot.log"))


def _feed(monkeypatch, answers):
    queue = list(answers)

    def fake_input(prompt=""):
        return queue.pop(0) if queue else ""

    monkeypatch.setattr("builtins.input", fake_input)


def test_menu_exits_on_6(bot, monkeypatch, tmp_path):
    _fresh(bot, monkeypatch, tmp_path)
    _feed(monkeypatch, ["6"])
    assert bot.menu() == 0


def test_menu_rejects_unknown_then_exits(bot, monkeypatch, tmp_path, capsys):
    _fresh(bot, monkeypatch, tmp_path)
    _feed(monkeypatch, ["9", "", "6"])
    assert bot.menu() == 0
    assert "1 تا 6" in capsys.readouterr().out


def test_menu_panic_creates_stop_file(bot, monkeypatch, tmp_path):
    _fresh(bot, monkeypatch, tmp_path)
    _feed(monkeypatch, ["5", "", "6"])
    assert bot.menu() == 0
    assert (tmp_path / "STOP").exists()


def test_start_live_cancel_changes_nothing(bot, monkeypatch, tmp_path):
    _fresh(bot, monkeypatch, tmp_path)
    _feed(monkeypatch, ["خیر"])
    assert bot.start_live() == 0
    assert not (tmp_path / "bot.env").exists()


def test_start_live_rejects_wrong_confirm_word(bot, monkeypatch, tmp_path):
    _fresh(bot, monkeypatch, tmp_path)
    monkeypatch.setattr(bot.Nobitex, "balances", lambda self: {"IRT": 5_000_000.0, "BTC": 0.0})
    _feed(monkeypatch, ["بله", "tok-123", "", "1", "نه"])
    assert bot.start_live() == 0
    assert not (tmp_path / "bot.env").exists()


def test_start_live_full_success(bot, monkeypatch, tmp_path):
    _fresh(bot, monkeypatch, tmp_path)
    monkeypatch.setattr(bot.Nobitex, "balances", lambda self: {"IRT": 5_000_000.0, "BTC": 0.0})
    monkeypatch.setattr(bot, "cmd_run", lambda env, once=False: 0)
    _feed(monkeypatch, ["بله", "tok-123456", "BTCIRT", "1", "تایید"])
    assert bot.start_live() == 0
    env = bot.load_env()
    assert env["MODE"] == "live"
    assert env["CONFIRM"] == bot.CONFIRM_PHRASE
    assert env["NOBITEX_TOKEN"] == "tok-123456"
    assert env["MAX_POSITION_PCT"] == "3"


def test_start_live_gives_up_after_three_bad_keys(bot, monkeypatch, tmp_path):
    _fresh(bot, monkeypatch, tmp_path)

    def boom(self):
        raise bot.BotError("کلید نامعتبر")

    monkeypatch.setattr(bot.Nobitex, "balances", boom)
    _feed(monkeypatch, ["بله", "bad1", "bad2", "bad3"])
    assert bot.start_live() == 2
    assert not (tmp_path / "bot.env").exists()


def test_start_paper_saves_paper_mode_and_clears_stop(bot, monkeypatch, tmp_path):
    _fresh(bot, monkeypatch, tmp_path)
    (tmp_path / "STOP").write_text("stop", encoding="utf-8")
    seen = {}

    def fake_run(env, once=False):
        seen["mode"] = env["MODE"]
        return 0

    monkeypatch.setattr(bot, "cmd_run", fake_run)
    assert bot.start_paper() == 0
    assert seen["mode"] == "paper"
    assert not (tmp_path / "STOP").exists()
    assert bot.load_env()["MODE"] == "paper"


def test_default_command_is_menu(bot, monkeypatch, tmp_path):
    _fresh(bot, monkeypatch, tmp_path)
    _feed(monkeypatch, ["6"])
    assert bot.main([]) == 0
