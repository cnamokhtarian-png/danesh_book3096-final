"""اعلان‌ها: لاگ محلی همیشه، تلگرام در صورت تنظیم بودن."""

from __future__ import annotations

import logging

import requests

logger = logging.getLogger("trader.notify")


class TelegramNotifier:
    def __init__(
        self,
        bot_token: str = "",
        chat_id: str = "",
        timeout: int = 10,
        base_url: str = "https://api.telegram.org",
    ) -> None:
        self.bot_token = bot_token.strip()
        self.chat_id = str(chat_id).strip()
        self.timeout = timeout
        self.base_url = base_url.rstrip("/")
        self.enabled = bool(self.bot_token and self.chat_id)

    def send(self, text: str) -> bool:
        """ارسال پیام؛ شکست اعلان هرگز چرخه‌ی معامله را متوقف نمی‌کند."""
        if not self.enabled:
            return False
        url = f"{self.base_url}/bot{self.bot_token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": text[:3900],
            "disable_web_page_preview": True,
        }
        for attempt in range(2):
            try:
                response = requests.post(url, json=payload, timeout=self.timeout)
                if response.status_code == 200 and response.json().get("ok"):
                    return True
                logger.warning(
                    "تلگرام پیام را نپذیرفت (HTTP %s، تلاش %s).",
                    response.status_code,
                    attempt + 1,
                )
            except requests.RequestException as exc:
                logger.warning("ارسال تلگرام ناموفق بود (%s، تلاش %s).", type(exc).__name__, attempt + 1)
            except ValueError:
                logger.warning("پاسخ تلگرام JSON نبود.")
                break
        return False

    def get_me(self) -> bool:
        """آزمایش اعتبار توکن ربات تلگرام."""
        if not self.enabled:
            return False
        try:
            response = requests.get(f"{self.base_url}/bot{self.bot_token}/getMe", timeout=self.timeout)
            return response.status_code == 200 and bool(response.json().get("ok"))
        except (requests.RequestException, ValueError):
            return False


class Notifier:
    """گزارش هم‌زمان در لاگ و (در صورت فعال بودن) تلگرام."""

    def __init__(self, telegram: TelegramNotifier | None = None) -> None:
        self.telegram = telegram

    def notify(self, title: str, body: str = "", important: bool = False) -> None:
        icon = "🔴" if important else "•"
        message = f"{icon} {title}"
        if body:
            message += f"\n{body}"
        log_method = logger.warning if important else logger.info
        log_method(message)
        if self.telegram and self.telegram.enabled:
            self.telegram.send(message)
