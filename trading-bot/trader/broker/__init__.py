"""کارگزاران صرافی."""

from __future__ import annotations

from ..config import Settings
from .base import AuthError, BaseClient, ExchangeError, to_float

__all__ = [
    "AuthError",
    "BaseClient",
    "ExchangeError",
    "build_broker",
    "to_float",
]


def build_live_client(settings: Settings) -> BaseClient:
    """کلاینت صرافی واقعی (فقط سفارش‌های محدود؛ برداشت هرگز)."""
    if settings.exchange == "nobitex":
        from .nobitex import NobitexClient

        return NobitexClient(
            token=settings.nobitex_api_token,
            symbol=settings.symbol,
            timeout=settings.http_timeout,
            user_agent=settings.user_agent,
        )
    if settings.exchange == "wallex":
        from .wallex import WallexClient

        return WallexClient(
            api_key=settings.wallex_api_key,
            symbol=settings.symbol,
            timeout=settings.http_timeout,
            user_agent=settings.user_agent,
        )
    raise ExchangeError(f"صرافی پشتیبانی‌نشده: {settings.exchange}")


def build_broker(settings: Settings, cash: float, holdings: float):
    """در حالت paper یک پوشش کاغذی روی بازار واقعی می‌سازد، در حالت live کلاینت واقعی."""
    live = build_live_client(settings)
    if not settings.is_live:
        from .paper import PaperBroker

        return PaperBroker(
            market=live,
            quote_asset=settings.quote_asset,
            cash=cash,
            holdings=holdings,
            slippage_pct=settings.paper_slippage_pct,
            fee_pct=settings.fee_pct,
        )
    return live
