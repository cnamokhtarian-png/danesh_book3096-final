#!/usr/bin/env bash
# اجرای ساده‌ی ربات روی مک/لینوکس: کلیک/دستور start.sh
set -u
cd "$(dirname "$0")" || exit 1

echo "=============================================="
echo " ربات معامله‌گر — راه‌اندازی ساده"
echo "=============================================="

if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "❌ پایتون نصب نیست. از python.org نسخه 3.10 یا بالاتر را نصب کنید."
  exit 1
fi

if [ ! -d .venv ]; then
  echo "• ساخت محیط پایتون (یک‌بار)..."
  "$PY" -m venv .venv || { echo "❌ ساخت محیط ممکن نشد."; exit 1; }
fi

# shellcheck disable=SC1091
. .venv/bin/activate

echo "• نصب وابستگی‌ها (یک‌بار)..."
python -m pip install --quiet --upgrade pip >/dev/null 2>&1
python -m pip install --quiet -r requirements.txt || { echo "❌ نصب وابستگی‌ها ممکن نشد (اینترنت؟)"; exit 1; }

if [ ! -f .env ]; then
  echo "• اولین اجراست؛ چند سؤال کوتاه می‌پرسیم..."
  python setup_wizard.py || exit 1
fi

echo
echo "• بررسی وضعیت..."
python -m trader check || true

echo
echo "• شروع اجرای ربات. برای توقف: Ctrl+C"
echo "  (توقف اضطراری از پنجره دیگر: python -m trader panic)"
echo
exec python -m trader run
