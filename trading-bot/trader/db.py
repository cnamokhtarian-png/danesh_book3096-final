"""ذخیره‌سازی محلی (SQLite) برای وضعیت، معاملات و تصمیم‌ها.

هیچ کلید یا رمزی در دیتابیس ذخیره نمی‌شود؛ فقط رویدادهای معاملاتی.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from .util import today_utc, utc_now_iso

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    cash_quote REAL NOT NULL,
    holdings REAL NOT NULL,
    position_avg_price REAL NOT NULL DEFAULT 0,
    start_of_day_equity REAL NOT NULL DEFAULT 0,
    day TEXT NOT NULL DEFAULT '',
    trades_today INTEGER NOT NULL DEFAULT 0,
    last_trade_ts REAL,
    peak_equity REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    price REAL NOT NULL,
    action TEXT NOT NULL,
    confidence REAL NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT NOT NULL,
    snapshot TEXT
);

CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    client_id TEXT UNIQUE NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    mode TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    quote_value REAL NOT NULL,
    fee_quote REAL NOT NULL,
    status TEXT NOT NULL,
    note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS equity (
    ts TEXT NOT NULL,
    equity REAL NOT NULL,
    price REAL NOT NULL,
    cash REAL NOT NULL,
    holdings REAL NOT NULL
);
"""


class Store:
    def __init__(self, path: Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(self.path), timeout=15)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA synchronous=NORMAL")
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    # ---------------------------------------------------------------- وضعیت
    def load_state(self, default_cash: float) -> dict[str, Any]:
        row = self.conn.execute("SELECT * FROM state WHERE id = 1").fetchone()
        if row is None:
            now = utc_now_iso()
            self.conn.execute(
                "INSERT INTO state (id, cash_quote, holdings, position_avg_price, "
                "start_of_day_equity, day, trades_today, last_trade_ts, peak_equity, updated_at) "
                "VALUES (1, ?, 0, 0, ?, ?, 0, NULL, ?, ?)",
                (default_cash, default_cash, today_utc(), default_cash, now),
            )
            self.conn.commit()
            row = self.conn.execute("SELECT * FROM state WHERE id = 1").fetchone()
        return dict(row)

    def save_state(
        self,
        *,
        cash_quote: float,
        holdings: float,
        position_avg_price: float,
        start_of_day_equity: float,
        day: str,
        trades_today: int,
        last_trade_ts: float | None,
        peak_equity: float,
    ) -> None:
        self.conn.execute(
            "UPDATE state SET cash_quote=?, holdings=?, position_avg_price=?, "
            "start_of_day_equity=?, day=?, trades_today=?, last_trade_ts=?, "
            "peak_equity=?, updated_at=? WHERE id=1",
            (
                cash_quote,
                holdings,
                position_avg_price,
                start_of_day_equity,
                day,
                trades_today,
                last_trade_ts,
                peak_equity,
                utc_now_iso(),
            ),
        )
        self.conn.commit()

    # ------------------------------------------------------------- تصمیم‌ها
    def log_decision(
        self,
        *,
        price: float,
        action: str,
        confidence: float,
        source: str,
        status: str,
        reason: str,
        snapshot: dict | None = None,
    ) -> None:
        self.conn.execute(
            "INSERT INTO decisions (ts, price, action, confidence, source, status, reason, snapshot) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                utc_now_iso(),
                price,
                action,
                confidence,
                source,
                status,
                reason,
                json.dumps(snapshot, ensure_ascii=False) if snapshot else None,
            ),
        )
        self.conn.commit()

    # -------------------------------------------------------------- معاملات
    def log_trade(
        self,
        *,
        client_id: str,
        symbol: str,
        side: str,
        mode: str,
        quantity: float,
        price: float,
        fee_quote: float,
        status: str,
        note: str = "",
    ) -> None:
        self.conn.execute(
            "INSERT OR IGNORE INTO trades (ts, client_id, symbol, side, mode, quantity, price, "
            "quote_value, fee_quote, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                utc_now_iso(),
                client_id,
                symbol,
                side,
                mode,
                quantity,
                price,
                quantity * price,
                fee_quote,
                status,
                note,
            ),
        )
        self.conn.commit()

    def has_client_id(self, client_id: str) -> bool:
        row = self.conn.execute(
            "SELECT 1 FROM trades WHERE client_id = ? LIMIT 1", (client_id,)
        ).fetchone()
        return row is not None

    # --------------------------------------------------------------- سرمایه
    def snapshot_equity(self, equity: float, price: float, cash: float, holdings: float) -> None:
        self.conn.execute(
            "INSERT INTO equity (ts, equity, price, cash, holdings) VALUES (?, ?, ?, ?, ?)",
            (utc_now_iso(), equity, price, cash, holdings),
        )
        self.conn.commit()

    def recent_trades(self, limit: int = 20) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT * FROM trades ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in rows]

    def recent_decisions(self, limit: int = 10) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT * FROM decisions ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in rows]

    def equity_history(self, limit: int = 500) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT * FROM equity ORDER BY rowid DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in reversed(rows)]

    def close(self) -> None:
        self.conn.close()
