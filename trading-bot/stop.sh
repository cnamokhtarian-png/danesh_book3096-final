#!/usr/bin/env bash
# توقف اضطراری: ساخت فایل state/STOP
set -u
cd "$(dirname "$0")" || exit 1
mkdir -p state
echo "توقف اضطراری از سوی کاربر: $(date -u +%Y-%m-%dT%H:%M:%SZ)" > state/STOP
echo "⛔ ربات در چرخه بعدی هیچ سفارشی ثبت نمی‌کند."
echo "   برای ادامه: rm state/STOP  یا  python -m trader resume"
