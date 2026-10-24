@echo off
chcp 65001 >nul
title ربات معامله‌گر
cd /d "%~dp0"

echo ==============================================
echo   ربات معامله‌گر - راه اندازی ساده
echo ==============================================

where py >nul 2>nul
if %errorlevel%==0 (
  set "PY=py -3"
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    set "PY=python"
  ) else (
    echo [X] Python نصب نیست. از python.org نسخه 3.10 یا بالاتر را نصب کنید
    echo     و هنگام نصب گزینه Add Python to PATH را تیک بزنید.
    pause
    exit /b 1
  )
)

if not exist .venv (
  echo * ساخت محیط پایتون ^(یک بار^)...
  %PY% -m venv .venv || (echo [X] ساخت محیط ممکن نشد & pause & exit /b 1)
)

call .venv\Scripts\activate.bat

echo * نصب وابستگی ها ^(یک بار^)...
python -m pip install --quiet --upgrade pip >nul 2>nul
python -m pip install --quiet -r requirements.txt || (echo [X] نصب وابستگی ها ممکن نشد ^(اینترنت؟^) & pause & exit /b 1)

if not exist .env (
  echo * اولین اجراست؛ چند سوال کوتاه می پرسیم...
  python setup_wizard.py || (pause & exit /b 1)
)

echo.
echo * بررسی وضعیت...
python -m trader check

echo.
echo * شروع اجرای ربات. برای توقف: Ctrl+C
echo   ^(توقف اضطراری از پنجره دیگر: python -m trader panic^)
echo.
python -m trader run

pause
