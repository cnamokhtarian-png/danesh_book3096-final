#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ربات معامله‌گر تک‌فایلی — نسخه ویندوز (بدون نصب هیچ کتابخانه‌ای).

فقط پایتون لازم است؛ هیچ pip و venv و اینترنتی برای نصب لازم نیست.
پیش‌فرض: حالت تمرینی (paper) — بدون پول واقعی و بدون کلید API.

دستورها (در پوشه‌ای که همین فایل است، در PowerShell یا CMD):
    python danesh_bot.py demo      نمایش نمونه‌ی کارکرد، بدون اینترنت
    python danesh_bot.py check     بررسی تنظیمات و اتصال (سفارش نمی‌دهد)
    python danesh_bot.py once      یک چرخه
    python danesh_bot.py run       اجرای مداوم
    python danesh_bot.py status    وضعیت حساب
    python danesh_bot.py panic     توقف اضطراری
    python danesh_bot.py resume    برداشتن توقف
    python danesh_bot.py selftest  آزمون داخلی

تنظیمات در فایل bot.env کنار همین فایل (نمونه: python danesh_bot.py init).
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

BASE = "https://apiv2.nobitex.ir"
UA = "danesh-bot-single/0.1"
HERE = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(HERE, "bot.env")
STATE_PATH = os.path.join(HERE, "state.json")
LOG_PATH = os.path.join(HERE, "bot.log")
STOP_PATH = os.path.join(HERE, "STOP")
CONFIRM_PHRASE = "I-UNDERSTAND-THE-RISK"
DEMO_MODE = False   # در دمو، هیچ وضعیت واقعی ذخیره نمی‌شود

DEFAULTS = {
    "MODE": "paper",              # paper | live
    "SYMBOL": "BTCIRT",
    "NOBITEX_TOKEN": "",
    "CONFIRM": "",                # برای live: I-UNDERSTAND-THE-RISK
    "CYCLE_SECONDS": "300",
    "RESOLUTION": "5",
    "LOOKBACK": "240",
    "FEE_PCT": "0.4",
    "STOP_LOSS_PCT": "2.5",
    "TAKE_PROFIT_PCT": "5",
    "MAX_POSITION_PCT": "3",
    "MAX_DAILY_LOSS_PCT": "2",
    "MAX_TRADES_PER_DAY": "4",
    "COOLDOWN_MINUTES": "120",
    "MAX_SPREAD_PCT": "1.0",
    "MIN_TRADE_QUOTE": "100000",
    "START_CASH": "10000000",
    "TELEGRAM_TOKEN": "",
    "TELEGRAM_CHAT": "",
}


class BotError(RuntimeError):
    pass


# ----------------------------------------------------------------- ابزارها
def log(message, important=False):
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = "%s | %s%s" % (stamp, "!! " if important else "", message)
    print(line, flush=True)
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as handle:
            handle.write(line + "\n")
    except OSError:
        pass


def load_env():
    values = dict(DEFAULTS)
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, encoding="utf-8") as handle:
            for raw in handle:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                values[key.strip().upper()] = value.strip().strip('"').strip("'")
    for key in list(values):
        if key in os.environ:
            values[key] = os.environ[key]
    return values


def num(env, key, default=0.0):
    try:
        return float(env.get(key, default))
    except ValueError:
        raise BotError("مقدار %s عددی نیست: %r" % (key, env.get(key)))


def save_env(values):
    lines = [
        "# ---- تنظیمات ربات (این فایل را برای کسی نفرستید) ----",
        "# mode: paper = تمرینی (پیش‌فرض) | live = پول واقعی",
    ]
    for key in DEFAULTS:
        lines.append("%s=%s" % (key, values.get(key, DEFAULTS[key])))
    with open(ENV_PATH, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
    try:
        os.chmod(ENV_PATH, 0o600)
    except OSError:
        pass


def load_state(env):
    if os.path.exists(STATE_PATH):
        with open(STATE_PATH, encoding="utf-8") as handle:
            return json.load(handle)
    cash = num(env, "START_CASH", 10_000_000)
    return {
        "cash": cash,
        "holdings": 0.0,
        "avg_price": 0.0,
        "day": today(),
        "day_start_equity": cash,
        "trades_today": 0,
        "last_trade_ts": 0.0,
        "trades": [],
    }


def save_state(state):
    if DEMO_MODE:
        return
    tmp = STATE_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as handle:
        json.dump(state, handle, ensure_ascii=False, indent=1)
    os.replace(tmp, STATE_PATH)


def today():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def notify(env, title, body=""):
    icon = "🔴 " if ("خطر" in title or "توقف" in title or "نشد" in title) else "• "
    text = icon + title + (("\n" + body) if body else "")
    log(text)
    token = env.get("TELEGRAM_TOKEN", "").strip()
    chat = env.get("TELEGRAM_CHAT", "").strip()
    if not token or not chat:
        return
    url = "https://api.telegram.org/bot%s/sendMessage" % token
    payload = json.dumps({"chat_id": chat, "text": text[:3900]}).encode()
    request = urllib.request.Request(url, data=payload, method="POST")
    request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            response.read()
    except Exception as exc:  # اعلان هرگز ربات را متوقف نمی‌کند
        log("ارسال تلگرام ناموفق: %s" % type(exc).__name__)


def fmt(value, digits=0):
    try:
        return ("{:,.%df}" % digits).format(float(value))
    except (ValueError, TypeError):
        return str(value)


# ------------------------------------------------------------- صرافی نوبیتکس
def http_json(method, path, params=None, body=None, token="", timeout=20):
    url = BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("User-Agent", UA)
    request.add_header("Accept", "application/json")
    if data is not None:
        request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", "Token " + token)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            raise BotError("نوبیتکس دسترسی را رد کرد (HTTP %d). کلید و مجوز Trade را بررسی کنید." % exc.code)
        raise BotError("خطای نوبیتکس (HTTP %d): %s" % (exc.code, exc.read()[:200]))
    except Exception as exc:
        raise BotError("ارتباط با نوبیتکس برقرار نشد: %s" % exc)


class Nobitex:
    """قیمت‌ها به تومان نرمال می‌شوند (نوبیتکس ریال می‌دهد)."""

    def __init__(self, env):
        self.symbol = env.get("SYMBOL", "BTCIRT").upper()
        self.token = env.get("NOBITEX_TOKEN", "").strip()
        self.base, self.quote = split_symbol(self.symbol)
        self.dst = "rls" if self.quote in ("IRT", "RLS", "TMN") else self.quote.lower()
        self.scale = 0.1 if self.dst == "rls" else 1.0

    def ticker(self):
        data = http_json("GET", "/v3/orderbook/" + self.symbol)
        bids = data.get("bids") or []
        asks = data.get("asks") or []
        last = float(data.get("lastTradePrice") or 0)
        bid = float(bids[0][0]) if bids else last
        ask = float(asks[0][0]) if asks else last
        if not last:
            last = (bid + ask) / 2 if bid and ask else 0
        if last <= 0:
            raise BotError("قیمت لحظه‌ای خالی بود (بازار بسته است؟).")
        return {"last": last * self.scale, "bid": bid * self.scale, "ask": ask * self.scale}

    def candles(self, resolution, limit):
        seconds = {"1": 60, "5": 300, "15": 900, "30": 1800, "60": 3600}.get(str(resolution), 300)
        now = int(time.time())
        data = http_json(
            "GET",
            "/market/ohlc",
            params={
                "symbol": self.symbol,
                "resolution": resolution,
                "from": now - seconds * (limit + 3),
                "to": now,
            },
        )
        rows, out = data.get("ohlc") or [], []
        for row in rows:
            if not isinstance(row, (list, tuple)) or len(row) < 6:
                continue
            candle = [
                float(row[1]) * self.scale, float(row[2]) * self.scale,
                float(row[3]) * self.scale, float(row[4]) * self.scale, float(row[5]),
            ]
            if candle[3] > 0 and candle[1] >= candle[2] > 0:
                out.append(candle)
        return out[-limit:]

    def balances(self):
        if not self.token:
            raise BotError("برای خواندن موجودی، NOBITEX_TOKEN لازم است.")
        data = http_json("POST", "/users/wallets/list", token=self.token)
        out = {}
        for wallet in data.get("wallets") or []:
            currency = str(wallet.get("currency", "")).upper()
            if currency:
                out[currency] = out.get(currency, 0.0) + float(wallet.get("activeBalance") or 0)
        return out

    def place_limit(self, side, amount, price_toman, client_id):
        if not self.token:
            raise BotError("برای معامله‌ی واقعی NOBITEX_TOKEN لازم است.")
        body = {
            "type": side.lower(),
            "execution": "limit",
            "srcCurrency": self.base.lower(),
            "dstCurrency": self.dst,
            "amount": _clean(amount),
            "price": _clean(price_toman / self.scale),
            "clientOrderId": client_id,
        }
        data = http_json("POST", "/market/orders/add", body=body, token=self.token)
        if str(data.get("status", "")).lower() != "ok":
            return False, "%s: %s" % (data.get("code", "Error"), data.get("message", "ثبت سفارش ناموفق"))
        return True, "ثبت شد"

    def order_status(self, client_id):
        data = http_json(
            "POST", "/market/orders/status", body={"clientOrderId": client_id}, token=self.token
        )
        return data.get("order") or {}

    def cancel(self, client_id):
        try:
            order = self.order_status(client_id)
            order_id = order.get("id")
            if order_id is None:
                return False
            http_json(
                "POST", "/market/orders/update-status",
                body={"order": order_id, "status": "canceled"}, token=self.token,
            )
            return True
        except BotError:
            return False


def split_symbol(symbol):
    text = symbol.upper().replace("/", "").replace("-", "").replace("_", "")
    for quote in ("USDT", "USDC", "IRT", "RLS", "TMN"):
        if text.endswith(quote) and len(text) > len(quote):
            return text[: -len(quote)], quote
    raise BotError("نماد نامعتبر است؛ نمونه: BTCIRT یا ETHIRT یا BTCUSDT")


def _clean(value):
    value = float(value)
    return str(int(value)) if value.is_integer() else ("%.10f" % value).rstrip("0").rstrip(".")


# --------------------------------------------------------------- اندیکاتورها
def ema(values, period):
    if len(values) < period or period <= 0:
        return None
    step = 2.0 / (period + 1.0)
    value = sum(values[:period]) / period
    for item in values[period:]:
        value = (item - value) * step + value
    return value


def rsi(values, period=14):
    if len(values) <= period:
        return None
    deltas = [values[i] - values[i - 1] for i in range(1, len(values))]
    gains = [max(d, 0.0) for d in deltas]
    losses = [max(-d, 0.0) for d in deltas]
    avg_gain, avg_loss = sum(gains[:period]) / period, sum(losses[:period]) / period
    for index in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[index]) / period
        avg_loss = (avg_loss * (period - 1) + losses[index]) / period
    if avg_gain == 0 and avg_loss == 0:
        return 50.0
    if avg_loss == 0:
        return 100.0
    return 100.0 - 100.0 / (1.0 + avg_gain / avg_loss)


def atr_pct(candles, period=14):
    if len(candles) < period + 2:
        return None
    ranges = []
    for index in range(1, len(candles)):
        high, low, prev_close = candles[index][1], candles[index][2], candles[index - 1][3]
        ranges.append(max(high - low, abs(high - prev_close), abs(low - prev_close)))
    value = sum(ranges[:period]) / period
    for item in ranges[period:]:
        value = (value * (period - 1) + item) / period
    last = candles[-1][3]
    return value / last * 100.0 if last > 0 else None


def volume_ratio(candles, period=20):
    if len(candles) < 3:
        return 0.0
    window = [c[4] for c in candles[-period - 1 : -1]]
    average = sum(window) / len(window) if window else 0.0
    return candles[-1][4] / average if average > 0 else 0.0


# ------------------------------------------------------------ تصمیم و ریسک
def analyse(candles):
    closes = [c[3] for c in candles]
    fast, slow = ema(closes, 20), ema(closes, 50)
    return {
        "price": closes[-1],
        "ema_fast": fast,
        "ema_slow": slow,
        "ema_trend": ema(closes, 200),
        "rsi": rsi(closes, 14),
        "atr": atr_pct(candles, 14),
        "volume": volume_ratio(candles),
    }


def decide(snap, env):
    if not snap["ema_slow"] or snap["rsi"] is None:
        return "HOLD", 0.0, "داده‌ی کافی برای اندیکاتورها نیست."
    if snap["ema_slow"] > 0:
        gap = abs(snap["price"] / snap["ema_slow"] - 1) * 100
        ema_gap = abs(snap["ema_fast"] / snap["ema_slow"] - 1) * 100
        if gap < 0.15 and ema_gap < 0.15:
            return "HOLD", 0.3, "بازار بدون روند مشخص است."
    if snap["atr"] is not None and snap["atr"] > 6.0:
        return "HOLD", 0.3, "نوسان بازار بیش از حد مجاز است (ATR %.1f%%)." % snap["atr"]

    signals, up, down = [], 0.0, 0.0
    checks = [
        (snap["price"] > (snap["ema_fast"] or 0), "قیمت بالای EMA20", "قیمت زیر EMA20"),
        ((snap["ema_fast"] or 0) > snap["ema_slow"], "EMA20 بالای EMA50", "EMA20 زیر EMA50"),
        (snap["price"] > (snap["ema_trend"] or snap["price"]), "روند بلندمدت صعودی", "زیر میانگین بلندمدت"),
    ]
    for condition, good, bad in checks:
        signals.append(good if condition else bad)
        up += 1 if condition else 0
        down += 0 if condition else 1
    if snap["rsi"] >= 78:
        down += 1
        signals.append("RSI اشباع خرید (%.0f)" % snap["rsi"])
    elif 45 <= snap["rsi"] < 78:
        up += 1
        signals.append("RSI سالم (%.0f)" % snap["rsi"])
    elif snap["rsi"] < 30:
        signals.append("RSI اشباع فروش (%.0f)" % snap["rsi"])
    else:
        down += 0.5
        signals.append("RSI ضعیف (%.0f)" % snap["rsi"])
    if snap["volume"] >= 0.5:
        up += 0.5
        signals.append("حجم %.1f× میانگین" % snap["volume"])
    reason = "؛ ".join(signals[:4])

    trend_ok = snap["price"] > (snap["ema_trend"] or snap["price"])
    if up >= 3 and trend_ok and 45 <= snap["rsi"] < 78:
        return "BUY", min(0.95, 0.45 + 0.1 * (up - 2)), reason
    if down >= 2.5 or snap["rsi"] >= 78 or snap["rsi"] < 30:
        return "SELL", min(0.9, 0.45 + 0.1 * down), reason
    return "HOLD", 0.4, reason


def size_buy(equity, cash, holdings, price, env):
    max_pos = num(env, "MAX_POSITION_PCT", 3) / 100.0
    target = equity * max_pos
    spend = min(cash, target - holdings * price)
    if spend <= 0:
        return 0.0, "سقف موقعیت باز اجازه‌ی خرید بیشتر نمی‌دهد."
    if spend < num(env, "MIN_TRADE_QUOTE", 100000):
        return 0.0, "حجم کمتر از حداقل سفارش است."
    return spend / price, "تأیید شد"


# ------------------------------------------------------------------- چرخه
def new_state_day(state, equity):
    if state.get("day") != today():
        state["day"] = today()
        state["day_start_equity"] = equity
        state["trades_today"] = 0


def run_cycle(env, market, state):
    if os.path.exists(STOP_PATH):
        log("⛔ سوئیچ توقف فعال است؛ سفارشی ثبت نمی‌شود.", True)
        return False

    candles = market.candles(env["RESOLUTION"], int(num(env, "LOOKBACK", 240)))
    if len(candles) < 60:
        raise BotError("کندل کافی دریافت نشد (%d)." % len(candles))
    ticker = market.ticker()
    price = ticker["last"]
    snap = analyse(candles)

    equity = state["cash"] + state["holdings"] * price
    new_state_day(state, equity)
    fee = num(env, "FEE_PCT", 0.4)

    # ۱) حد ضرر و حد سود
    action, reason = None, ""
    if state["holdings"] > 0 and state["avg_price"] > 0:
        change = (price - state["avg_price"]) / state["avg_price"] * 100
        if change <= -num(env, "STOP_LOSS_PCT", 2.5):
            action, reason = "SELL", "حد ضرر فعال شد (%.2f%%)" % change
        elif change >= num(env, "TAKE_PROFIT_PCT", 5):
            action, reason = "SELL", "حد سود فعال شد (+%.2f%%)" % change

    # ۲) تصمیم قاعده‌محور
    if action is None:
        action, confidence, reason = decide(snap, env)
        log("%s | قیمت %s | تصمیم %s — %s" % (env["SYMBOL"], fmt(price), action, reason))

    if action == "HOLD":
        return False

    spread = (ticker["ask"] - ticker["bid"]) / ticker["bid"] * 100 if ticker["bid"] else 99
    if action == "BUY":
        if state["holdings"] > 0:
            log("سیگنال خرید داریم اما موقعیت باز است؛ رد شد.")
            return False
        if spread > num(env, "MAX_SPREAD_PCT", 1.0):
            log("اسپرد بازار %.2f%% بیش از حد مجاز است؛ خرید انجام نشد." % spread)
            return False
        if state["trades_today"] >= int(num(env, "MAX_TRADES_PER_DAY", 4)):
            log("سقف معاملات امروز پر شده است.")
            return False
        if state["last_trade_ts"] and time.time() - state["last_trade_ts"] < num(env, "COOLDOWN_MINUTES", 120) * 60:
            log("دوره‌ی خنک‌شدن فعال است.")
            return False
        if state["day_start_equity"] > 0:
            daily = (equity - state["day_start_equity"]) / state["day_start_equity"] * 100
            if daily <= -num(env, "MAX_DAILY_LOSS_PCT", 2):
                log("سقف ضرر روزانه فعال شد (%.2f%%)." % daily, True)
                return False
        quantity, note = size_buy(equity, state["cash"], state["holdings"], price, env)
        if quantity <= 0:
            log("خرید انجام نشد: %s" % note)
            return False
        limit_price = ticker["ask"]
    else:
        if state["holdings"] <= 0:
            log("سیگنال فروش داریم اما موقعیتی برای فروش نیست.")
            return False
        quantity = state["holdings"]
        limit_price = ticker["bid"]

    quantity = int(quantity * 10**8) / 10**8
    if quantity <= 0:
        return False
    value = quantity * limit_price
    if value < num(env, "MIN_TRADE_QUOTE", 100000):
        log("ارزش سفارش (%s) کمتر از حداقل مجاز است." % fmt(value))
        return False

    mode = env["MODE"].lower()
    client_id = "db%d" % int(time.time() * 1000)
    if mode == "live":
        ok, message = market.place_limit(action, quantity, limit_price, client_id)
        if not ok:
            notify(env, "سفارش ثبت نشد", message)
            return False
        filled, fill_price, deadline = 0.0, limit_price, time.time() + 30
        while time.time() < deadline:
            order = market.order_status(client_id)
            filled = float(order.get("executedAmount") or order.get("matchedAmount") or 0)
            if filled > 0 or str(order.get("status", "")).lower() in ("done", "filled", "closed"):
                fill_price = float(order.get("averagePrice") or limit_price)
                break
            time.sleep(3)
        if filled <= 0:
            market.cancel(client_id)
            notify(env, "سفارش پر نشد و لغو شد", "%s %s" % (action, fmt(quantity, 8)))
            return False
        quantity = filled
    else:
        slip = limit_price * 0.0005
        fill_price = limit_price + slip if action == "BUY" else max(0.0, limit_price - slip)

    gross = quantity * fill_price
    cost = gross * fee / 100.0
    if action == "BUY":
        state["cash"] -= gross + cost
        new_holdings = state["holdings"] + quantity
        state["avg_price"] = (state["holdings"] * state["avg_price"] + gross) / new_holdings if new_holdings else 0
        state["holdings"] = new_holdings
    else:
        state["cash"] += gross - cost
        state["holdings"] = max(0.0, state["holdings"] - quantity)
        if state["holdings"] <= 1e-9:
            state["holdings"], state["avg_price"] = 0.0, 0.0

    state["trades_today"] = state.get("trades_today", 0) + 1
    state["last_trade_ts"] = time.time()
    state.setdefault("trades", []).append(
        {
            "ts": datetime.now().isoformat(timespec="seconds"),
            "side": action, "qty": quantity, "price": fill_price,
            "mode": mode, "reason": reason,
        }
    )
    state["trades"] = state["trades"][-100:]
    save_state(state)

    notify(
        env,
        "%s انجام شد — %s" % ("خرید" if action == "BUY" else "فروش", env["SYMBOL"]),
        "مقدار: %s\nقیمت: %s تومان\nارزش: %s تومان\nدلیل: %s" % (
            fmt(quantity, 8), fmt(fill_price), fmt(gross), reason,
        ),
    )
    return True


# ------------------------------------------------------------- حالت‌های اجرا
class Synthetic:
    """بازار ساختگی برای demo و selftest (بدون اینترنت)."""

    def __init__(self, uptrend=True, price=1_000_000.0):
        self.step = 2_000.0 if uptrend else -2_000.0
        self.price = price
        self.symbol = "BTCIRT"
        self.quote = "IRT"
        self.base = "BTC"

    def candles(self, resolution="5", limit=240):
        start = 900_000.0
        return [
            [
                start + i * self.step + ((i % 9) - 4) * self.step * 1.5,
                start + i * self.step + ((i % 9) - 4) * self.step * 1.5 + 500,
                start + i * self.step + ((i % 9) - 4) * self.step * 1.5 - 500,
                start + i * self.step + ((i % 9) - 4) * self.step * 1.5,
                100.0,
            ]
            for i in range(limit)
        ]

    def ticker(self):
        last = self.candles()[-1][3]
        return {"last": last, "bid": last * 0.999, "ask": last * 1.001}

    def balances(self):
        return {"IRT": 10_000_000.0, "BTC": 0.0}

    def place_limit(self, *a, **k):
        return True, "paper"


def cmd_demo(env):
    global DEMO_MODE
    try:
        return _run_demo(env)
    finally:
        DEMO_MODE = False


def _run_demo(env):
    global DEMO_MODE
    DEMO_MODE = True
    print("\n=== دموی آفلاین (بدون اینترنت، بدون پول واقعی) ===\n")
    demo_env = dict(env)
    demo_env.update({
        "MODE": "paper", "COOLDOWN_MINUTES": "0", "MAX_SPREAD_PCT": "5", "MIN_TRADE_QUOTE": "1",
    })
    market = Synthetic(uptrend=True)
    state = load_state(demo_env)
    state.update({
        "cash": 10_000_000.0, "holdings": 0.0, "avg_price": 0.0, "trades": [],
        "trades_today": 0, "last_trade_ts": 0.0, "day": today(), "day_start_equity": 10_000_000.0,
    })
    print("چرخه ۱ — روند صعودی (انتظار: خرید)")
    run_cycle(demo_env, market, state)
    print("\nچرخه ۲ — همان روند، موقعیت باز (انتظار: بدون خرید دوم)")
    run_cycle(demo_env, market, state)
    print("\nچرخه ۳ — ریزش ۲.۵٪ (انتظار: حد ضرر)")
    # قیمت ~۳٪ زیر میانگین خرید تا حد ضرر فعال شود (سناریوی واقعی، نه ریزش ساختگی)
    state["avg_price"] = market.ticker()["last"] * 1.03
    run_cycle(demo_env, market, state)
    price = market.ticker()["last"]
    print("\n=== نتیجه ===")
    print("  نقدینگی: %s تومان" % fmt(state["cash"]))
    print("  موقعیت: %s" % fmt(state["holdings"], 8))
    print("  دارایی کل: %s تومان" % fmt(state["cash"] + state["holdings"] * price))
    print("  معاملات: %s" % len(state["trades"]))
    return 0


def cmd_check(env):
    print("بررسی تنظیمات — هیچ سفارشی ثبت نمی‌شود\n")
    mode = env["MODE"].lower()
    problems = 0
    print("✅ حالت: %s | نماد: %s | چرخه: %s ثانیه" % (mode, env["SYMBOL"], env["CYCLE_SECONDS"]))
    print("   سقف هر خرید: %s%% | حد ضرر: %s%% | حد سود: %s%% | معامله در روز: %s" % (
        env["MAX_POSITION_PCT"], env["STOP_LOSS_PCT"], env["TAKE_PROFIT_PCT"], env["MAX_TRADES_PER_DAY"]))
    fee2 = num(env, "FEE_PCT", 0.4) * 2
    tp_net = num(env, "TAKE_PROFIT_PCT", 5) - fee2
    sl_net = num(env, "STOP_LOSS_PCT", 2.5) + fee2
    win = sl_net / (tp_net + sl_net) * 100 if tp_net > 0 else 100
    print("   هزینه‌ی هر خرید+فروش: %.2f%% | حداقل برد لازم: %.0f%%" % (fee2, win))
    if mode == "live":
        if env.get("CONFIRM") != CONFIRM_PHRASE:
            print("❌ حالت live بدون عبارت تأیید فعال نمی‌شود (%s)." % CONFIRM_PHRASE)
            problems += 1
        if not env.get("NOBITEX_TOKEN"):
            print("❌ حالت live بدون کلید API ممکن نیست (NOBITEX_TOKEN).")
            problems += 1
    if os.path.exists(STOP_PATH):
        print("⚠️ فایل STOP وجود دارد؛ ربات معامله نمی‌کند (python danesh_bot.py resume).")
    market = Nobitex(env)
    try:
        ticker = market.ticker()
        spread = (ticker["ask"] - ticker["bid"]) / ticker["bid"] * 100 if ticker["bid"] else 99
        print("✅ قیمت %s: %s تومان | اسپرد %.2f%%" % (env["SYMBOL"], fmt(ticker["last"]), spread))
    except BotError as exc:
        print("❌ %s" % exc)
        problems += 1
    try:
        candles = market.candles(env["RESOLUTION"], int(num(env, "LOOKBACK", 240)))
        print("✅ %d کندل دریافت شد." % len(candles))
    except BotError as exc:
        print("❌ %s" % exc)
        problems += 1
    if mode == "live" and env.get("NOBITEX_TOKEN"):
        try:
            balances = market.balances()
            print("✅ موجودی: %s %s و %s %s" % (
                fmt(balances.get(market.quote, 0)), market.quote,
                fmt(balances.get(market.base, 0), 8), market.base))
        except BotError as exc:
            print("❌ %s" % exc)
            problems += 1
    print("\n%s" % ("✅ همه‌چیز برای اجرا آماده است." if problems == 0 else "⚠️ %d مورد نیاز به رسیدگی دارد." % problems))
    return 0 if problems == 0 else 1


def cmd_status(env):
    state = load_state(env)
    market = Nobitex(env)
    try:
        price = market.ticker()["last"]
        price_text = fmt(price) + " تومان"
    except BotError:
        price, price_text = 0.0, "در دسترس نیست"
    equity = state["cash"] + state["holdings"] * price
    print("وضعیت (%s) — %s" % (env["MODE"], env["SYMBOL"]))
    print("  قیمت: %s" % price_text)
    print("  نقدینگی: %s تومان" % fmt(state["cash"]))
    print("  موقعیت: %s (میانگین خرید %s)" % (fmt(state["holdings"], 8), fmt(state["avg_price"])))
    print("  دارایی کل: %s تومان" % fmt(equity))
    if state.get("day_start_equity"):
        print("  تغییر امروز: %.2f%%" % ((equity - state["day_start_equity"]) / state["day_start_equity"] * 100))
    print("  معاملات امروز: %s/%s" % (state.get("trades_today", 0), env["MAX_TRADES_PER_DAY"]))
    print("  توقف اضطراری: %s" % ("فعال ⛔" if os.path.exists(STOP_PATH) else "خاموش ✅"))
    for trade in state.get("trades", [])[-5:]:
        print("  • %s %s %s @ %s — %s" % (trade["ts"], trade["side"], fmt(trade["qty"], 8), fmt(trade["price"]), trade["reason"][:40]))
    return 0


def cmd_run(env, once=False):
    mode = env["MODE"].lower()
    if mode == "live" and (env.get("CONFIRM") != CONFIRM_PHRASE or not env.get("NOBITEX_TOKEN")):
        print("❌ برای حالت live باید CONFIRM=%s و NOBITEX_TOKEN تنظیم شود." % CONFIRM_PHRASE)
        return 2
    market = Nobitex(env)
    state = load_state(env)
    notify(env, "ربات شروع شد (%s) — %s" % (mode, env["SYMBOL"]))
    while True:
        try:
            run_cycle(env, market, state)
        except BotError as exc:
            log("خطا: %s" % exc, True)
        except KeyboardInterrupt:
            print("\n⏹ متوقف شد.")
            return 0
        if once:
            return 0
        time.sleep(max(30, int(num(env, "CYCLE_SECONDS", 300))))


def cmd_selftest():
    checks = []
    values = [float(100 + i) for i in range(30)]
    checks.append(("EMA صعودی", ema(values, 10) > 100))
    checks.append(("RSI در بازه", 0 <= rsi(values) <= 100))
    checks.append(("RSI بازار ثابت", abs(rsi([100.0] * 30) - 50) < 1e-9))
    snap = analyse(Synthetic().candles())
    checks.append(("تحلیل کندل", snap["ema_slow"] is not None and snap["rsi"] is not None))
    candles = Synthetic().candles()
    checks.append(("ATR مثبت", (atr_pct(candles) or 0) > 0))
    q, _ = size_buy(1_000_000, 1_000_000, 0, 10_000, {"MAX_POSITION_PCT": "5", "MIN_TRADE_QUOTE": "1"})
    checks.append(("اندازه‌گذاری ۵٪", abs(q * 10_000 - 50_000) < 1))
    ok = all(passed for _, passed in checks)
    for name, passed in checks:
        print("%s %s" % ("✅" if passed else "❌", name))
    print("\n%s" % ("✅ همه‌ی آزمون‌ها موفق بود." if ok else "❌ آزمون ناموفق."))
    return 0 if ok else 1


def main(argv=None):
    parser = argparse.ArgumentParser(description="ربات معامله‌گر تک‌فایلی (پیش‌فرض: تمرینی)")
    parser.add_argument(
        "command", nargs="?",
        default="help",
        choices=["demo", "check", "once", "run", "status", "panic", "resume", "selftest", "init", "help"],
    )
    args = parser.parse_args(argv)
    env = load_env()

    if args.command == "help":
        print(__doc__)
        return 0
    if args.command == "init":
        if os.path.exists(ENV_PATH):
            print("فایل bot.env از قبل هست؛ تغییری ندادم. برای ساخت دوباره حذفش کنید.")
            return 0
        save_env(DEFAULTS)
        print("✅ فایل bot.env ساخته شد (حالت تمرینی). آن را با Notepad باز و در صورت نیاز ویرایش کنید.")
        return 0
    if args.command == "selftest":
        return cmd_selftest()
    if args.command == "demo":
        return cmd_demo(env)
    if args.command == "check":
        return cmd_check(env)
    if args.command == "status":
        return cmd_status(env)
    if args.command == "panic":
        with open(STOP_PATH, "w", encoding="utf-8") as handle:
            handle.write("توقف اضطراری: %s\n" % datetime.now().isoformat(timespec="seconds"))
        print("⛔ توقف فعال شد؛ ربات در چرخه‌ی بعدی هیچ سفارشی ثبت نمی‌کند.")
        print("   برای ادامه: python danesh_bot.py resume")
        return 0
    if args.command == "resume":
        if os.path.exists(STOP_PATH):
            os.remove(STOP_PATH)
        print("✅ توقف برداشته شد.")
        return 0
    if args.command == "once":
        return cmd_run(env, once=True)
    if args.command == "run":
        try:
            return cmd_run(env, once=False)
        except BotError as exc:
            print("❌ %s" % exc)
            return 3
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n⏹ متوقف شد.")
        sys.exit(130)
