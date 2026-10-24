"""لایه‌ی انتزاعی صرافی + ابزارهای مشترک HTTP و تجزیه‌ی اعداد فارسی."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import requests

from ..models import Candle, OrderRequest, OrderResult, Ticker


class ExchangeError(RuntimeError):
    """خطای صرافی با پیام قابل نمایش."""


class AuthError(ExchangeError):
    """کلید API نامعتبر است یا دسترسی لازم (Trade) را ندارد."""


def to_float(value: Any, default: float = 0.0) -> float:
    """تبدیل امن به عدد.

    - ارقام و جداکننده‌های فارسی/عربی را نرمال می‌کند (۱۲۳٬۴۵۶٫۷)
    - رشته‌های درصدی و واحدهای ریالی را می‌پذیرد («1,234.5 IRR»)
    """
    if value is None:
        return default
    if isinstance(value, (int, float)):
        result = float(value)
        return result if result == result else default  # NaN guard
    text = str(value).strip()
    if not text:
        return default
    translation = str.maketrans(
        {
            "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
            "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
            "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
            "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
            "٫": ".", "٬": ",", "،": ",", "٪": "", "﹪": "", " ": "", "\u200c": "",
        }
    )
    cleaned = text.translate(translation).replace(",", "")
    for token in ("%", "IRR", "IRT", "RLS", "TMN", "تومان", "ریال"):
        cleaned = cleaned.replace(token, "")
    try:
        return float(cleaned)
    except ValueError:
        return default


def rial_to_toman(value: float) -> float:
    return value / 10.0


def toman_to_rial(value: float) -> float:
    return value * 10.0


class BaseClient(ABC):
    """رابط مشترک همه‌ی صرافی‌ها.

    همه‌ی قیمت‌ها در خروجی این کلاس به ارز مظنه‌ی بازار برمی‌گردند؛ برای
    بازارهای ریالی، مقدار به تومان (نه ریال) نرمال می‌شود تا تصمیم‌گیری و
    گزارش خوانا بماند.
    """

    name = "base"
    quote_label = "IRT"

    def __init__(self, timeout: int = 15, user_agent: str = "danesh-trader/0.1") -> None:
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": user_agent, "Accept": "application/json"})
        self._quote_scale = 1.0  # ضریب تبدیل قیمت خام صرافی به قیمت نرمال‌شده

    # --------------------------------------------------------------- HTTP
    def _request(self, method: str, url: str, **kwargs: Any) -> Any:
        kwargs.setdefault("timeout", self.timeout)
        try:
            response = self.session.request(method, url, **kwargs)
        except requests.Timeout as exc:
            raise ExchangeError(f"پاسخ {self.name} در زمان مقرر نرسید ({self.timeout}s).") from exc
        except requests.RequestException as exc:
            raise ExchangeError(f"خطای شبکه در تماس با {self.name}: {exc}") from exc

        if response.status_code in (401, 403):
            raise AuthError(
                f"{self.name} دسترسی را رد کرد (HTTP {response.status_code}). "
                "کلید API را بررسی کنید و مطمئن شوید مجوز Trade فعال است."
            )
        if response.status_code == 429:
            raise ExchangeError(f"{self.name}: محدودیت نرخ درخواست (HTTP 429). کمی صبر کنید.")
        if response.status_code >= 500:
            raise ExchangeError(f"{self.name}: خطای سرور (HTTP {response.status_code}).")
        if response.status_code >= 400:
            raise ExchangeError(
                f"{self.name}: درخواست رد شد (HTTP {response.status_code}): {response.text[:300]}"
            )
        try:
            return response.json()
        except ValueError as exc:
            raise ExchangeError(f"{self.name}: پاسخ JSON نبود: {response.text[:200]}") from exc

    # ---------------------------------------------------------- رابط عمومی
    @abstractmethod
    def fetch_ticker(self) -> Ticker: ...

    @abstractmethod
    def fetch_candles(self, resolution: str, limit: int) -> list[Candle]: ...

    @abstractmethod
    def fetch_free_balances(self) -> dict[str, float]: ...

    @abstractmethod
    def place_order(self, request: OrderRequest) -> OrderResult: ...

    def cancel_order(self, client_id: str) -> bool:
        return False

    # -------------------------------------------------------------- کمکی
    def _normalize_price(self, raw_price: float) -> float:
        return raw_price * self._quote_scale

    def _denormalize_price(self, price: float) -> float:
        return price / self._quote_scale

    def _balance(self, balances: dict[str, float], asset: str) -> float:
        return balances.get(asset.upper(), 0.0)


def pick(mapping: Any, *keys: str, default: Any = None) -> Any:
    """اولین کلید موجود در یک dict تودرتو را برمی‌گرداند."""
    if not isinstance(mapping, dict):
        return default
    for key in keys:
        if key in mapping and mapping[key] is not None:
            return mapping[key]
    return default
