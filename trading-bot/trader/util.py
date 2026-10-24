"""ابزارهای کمکی: لاگ امن، اثر انگشت کلید، قفل فایل، قالب‌بندی عدد."""

from __future__ import annotations

import hashlib
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


def fingerprint(secret: str | None) -> str:
    """اثر انگشت کوتاه و بی‌خطر از یک کلید (برای مطابقت چشمی، نه بازیابی)."""
    if not secret:
        return "—"
    digest = hashlib.sha256(secret.encode("utf-8")).hexdigest()[:8]
    return f"sha256:{digest}"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def today_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def fmt_number(value: float | int | None, digits: int = 2) -> str:
    if value is None:
        return "—"
    if isinstance(value, int):
        return f"{value:,}"
    if abs(value) >= 1000:
        return f"{value:,.{digits}f}"
    return f"{value:,.{max(digits, 4)}f}".rstrip("0").rstrip(".")


def fmt_pct(value: float | None, digits: int = 2) -> str:
    if value is None:
        return "—"
    sign = "+" if value > 0 else ""
    return f"{sign}{value:.{digits}f}%"


class SecretRedactor(logging.Filter):
    """هر کلیدی که در تنظیمات آمده باشد را از لاگ حذف می‌کند."""

    def __init__(self, secrets: list[str]) -> None:
        super().__init__()
        self.secrets = [s for s in secrets if s]

    def add_secret(self, secret: str | None) -> None:
        if secret and secret not in self.secrets:
            self.secrets.append(secret)

    def redact(self, text: str) -> str:
        for secret in self.secrets:
            if secret in text:
                text = text.replace(secret, "***REDACTED***")
        return text

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            message = record.getMessage()
        except Exception:  # pragma: no cover - پیام‌های عجیب
            return True
        redacted = self.redact(message)
        if redacted != message:
            record.msg = redacted
            record.args = ()
        if record.exc_info and record.exc_text:
            record.exc_text = self.redact(record.exc_text)
        return True


REDACTOR = SecretRedactor([])


def setup_logging(level: str = "INFO", log_path: Path | None = None) -> logging.Logger:
    logger = logging.getLogger("trader")
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    logger.handlers.clear()
    logger.propagate = False

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-7s | %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )

    stream = logging.StreamHandler(sys.stdout)
    stream.setFormatter(formatter)
    stream.addFilter(REDACTOR)
    logger.addHandler(stream)

    if log_path is not None:
        try:
            log_path.parent.mkdir(parents=True, exist_ok=True)
            file_handler = logging.FileHandler(log_path, encoding="utf-8")
            file_handler.setFormatter(formatter)
            file_handler.addFilter(REDACTOR)
            logger.addHandler(file_handler)
        except OSError:
            logger.warning("نوشتن فایل لاگ ممکن نشد: %s", log_path)

    return logger


def register_secrets(secrets: list[str]) -> None:
    for secret in secrets:
        REDACTOR.add_secret(secret)


class FileLock:
    """قفل ساده مبتنی بر فایل تا دو نمونه از ربات هم‌زمان اجرا نشوند."""

    def __init__(self, path: Path, stale_after_seconds: int = 900) -> None:
        self.path = Path(path)
        self.stale_after_seconds = stale_after_seconds
        self.acquired = False

    def __enter__(self) -> "FileLock":
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if self.path.exists():
            try:
                age = time.time() - self.path.stat().st_mtime
            except OSError:
                age = 0
            if age > self.stale_after_seconds:
                self.path.unlink(missing_ok=True)
            else:
                raise RuntimeError(
                    f"یک نمونه‌ی دیگر از ربات در حال اجراست (قفل: {self.path}). "
                    "اگر مطمئنید اجرا نشده، فایل قفل را پاک کنید."
                )
        self.path.write_text(str(os.getpid()), encoding="utf-8")
        self.acquired = True
        return self

    def __exit__(self, *_: object) -> None:
        if self.acquired:
            self.path.unlink(missing_ok=True)


def sleep_until(deadline: float, chunk: float = 5.0) -> None:
    """خواب تکه‌تکه تا یک زمان مشخص (برای واکنش سریع‌تر به Ctrl+C)."""
    while True:
        remaining = deadline - time.time()
        if remaining <= 0:
            return
        time.sleep(min(chunk, remaining))
