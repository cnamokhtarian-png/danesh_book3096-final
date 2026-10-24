"""مشاور هوش مصنوعی (اختیاری) روی API سازگار با OpenAI.

دو حالت:

* ``veto`` (پیش‌فرض و امن): مدل فقط می‌تواند تصمیم قاعده‌محور را تأیید یا وتو کند.
* ``independent``: مدل خودش BUY/SELL/HOLD پیشنهاد می‌دهد؛ با این حال لایه‌ی ریسک
  و حد ضرر/سود همیشه اعمال می‌شوند و اندازه‌ی سفارش را مدل تعیین نمی‌کند.

اگر پاسخ مدل نامعتبر باشد، خطا برگردانده نمی‌شود؛ به تصمیم قاعده‌محور برمی‌گردیم
تا یک قطعی API هرگز معامله را به حالت تصادفی نبرد.
"""

from __future__ import annotations

import json
import logging

import requests

from ..models import Action, Decision
from .rules import Snapshot

logger = logging.getLogger("trader.ai")

SYSTEM_PROMPT = """تو یک تحلیل‌گر محافظه‌کار بازار کریپتو هستی و به یک ربات معامله کمک می‌کنی.
وظیفه‌ی تو فقط تحلیل داده‌ی داده‌شده است؛ تو به اینترنت دسترسی نداری و نباید قیمت حدس بزنی.
قواعد سخت:
1) خروجی را فقط به صورت یک JSON خالص و بدون متن اضافه بده.
2) اگر داده کافی یا روشن نیست، HOLD بده. ضرر نکردن مهم‌تر از سود از دست رفته است.
3) هیچ‌گاه توصیه به برداشت وجه، تغییر کلید API یا معامله با اهرم نکن.
4) دلیل را کوتاه، فارسی و حداکثر دو جمله بنویس.
قالب خروجی: {"action":"BUY|SELL|HOLD","confidence":0.0,"reason":"..."}"""


class AiAdvisor:
    def __init__(
        self,
        enabled: bool,
        api_key: str = "",
        model: str = "gpt-4o-mini",
        base_url: str = "https://api.openai.com/v1",
        timeout: int = 30,
        min_confidence: float = 0.6,
        mode: str = "veto",
    ) -> None:
        self.enabled = bool(enabled and api_key)
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.min_confidence = min_confidence
        self.mode = mode if mode in {"veto", "independent"} else "veto"

    # ------------------------------------------------------------------ API
    def _chat(self, user_payload: dict) -> dict | None:
        if not self.enabled:
            return None
        body = {
            "model": self.model,
            "temperature": 0.1,
            "max_tokens": 220,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
            ],
        }
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
                timeout=self.timeout,
            )
            response.raise_for_status()
            payload = response.json()
            content = payload["choices"][0]["message"]["content"]
            return _parse_json(content)
        except (requests.RequestException, KeyError, IndexError, ValueError) as exc:
            logger.warning("پاسخ مدل هوش مصنوعی قابل استفاده نبود: %s", type(exc).__name__)
            return None

    # ------------------------------------------------------------- رابط‌ها
    def review(
        self,
        snapshot: Snapshot,
        rule_decision: Decision,
        position_open: bool,
        risk_context: dict,
    ) -> Decision:
        """حالت veto: تأیید/وتوی تصمیم قاعده‌محور."""
        if not self.enabled or self.mode != "veto":
            return rule_decision
        if rule_decision.action is Action.HOLD:
            return rule_decision

        payload = {
            "task": "confirm_or_veto",
            "symbol": risk_context.get("symbol"),
            "timeframe_minutes": risk_context.get("timeframe_minutes"),
            "market": snapshot.as_dict(),
            "proposed_action": rule_decision.action.value,
            "proposed_reason": rule_decision.reason,
            "position_open": position_open,
            "portfolio": risk_context,
        }
        answer = self._chat(payload)
        if not answer:
            return rule_decision

        action = str(answer.get("action", "")).upper()
        try:
            confidence = float(answer.get("confidence", 0))
        except (TypeError, ValueError):
            confidence = 0.0
        reason = str(answer.get("reason", "")).strip()[:300]

        if action == "HOLD" or confidence < self.min_confidence:
            return Decision(
                Action.HOLD,
                0.0,
                f"هوش مصنوعی تصمیم را وتو کرد: {reason or 'اطمینان کافی نبود'}",
                source="ai-veto",
            )
        if action == rule_decision.action.value:
            return Decision(
                rule_decision.action,
                round(confidence, 2),
                f"{rule_decision.reason} | تأیید AI: {reason or 'بدون توضیح'}",
                source="ai-confirmed",
                stop_loss_pct=rule_decision.stop_loss_pct,
                take_profit_pct=rule_decision.take_profit_pct,
            )
        # پاسخ مبهم/متناقض → محافظه‌کارانه HOLD
        return Decision(
            Action.HOLD,
            0.0,
            "پاسخ مدل با تصمیم قاعده‌محور هم‌راستا نبود؛ برای احتیاط معامله انجام نشد.",
            source="ai-veto",
        )

    def propose(self, snapshot: Snapshot, position_open: bool, risk_context: dict) -> Decision | None:
        """حالت independent: پیشنهاد مستقل مدل."""
        if not self.enabled or self.mode != "independent":
            return None
        payload = {
            "task": "propose",
            "symbol": risk_context.get("symbol"),
            "timeframe_minutes": risk_context.get("timeframe_minutes"),
            "market": snapshot.as_dict(),
            "position_open": position_open,
            "portfolio": risk_context,
            "rules": [
                "فقط با داده‌ی همین پیام تصمیم بگیر.",
                "اگر موقعیت باز است و نشانه‌ی برگشت روند می‌بینی SELL بده.",
                "اگر مطمئن نیستی HOLD بده.",
            ],
        }
        answer = self._chat(payload)
        if not answer:
            return None
        action_raw = str(answer.get("action", "")).upper()
        if action_raw not in {"BUY", "SELL", "HOLD"}:
            return None
        try:
            confidence = float(answer.get("confidence", 0))
        except (TypeError, ValueError):
            confidence = 0.0
        reason = str(answer.get("reason", "")).strip()[:300] or "بدون توضیح"
        action = Action(action_raw)
        if action is not Action.HOLD and confidence < self.min_confidence:
            return Decision(Action.HOLD, 0.0, f"اطمینان AI کافی نبود ({confidence:.2f}): {reason}", source="ai")
        return Decision(action, round(confidence, 2), f"پیشنهاد AI: {reason}", source="ai")


def _parse_json(content: str) -> dict:
    text = content.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("JSON در پاسخ مدل پیدا نشد")
    data = json.loads(text[start : end + 1])
    if not isinstance(data, dict):
        raise ValueError("پاسخ مدل شیء JSON نبود")
    return data
