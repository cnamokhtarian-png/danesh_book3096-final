@echo off
chcp 65001 >nul
title ربات معامله‌گر
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo [X] Python نصب نيست. از python.org نسخه 3.10+ را نصب کنيد
  echo     و هنگام نصب گزينه Add Python to PATH را تيک بزنيد.
  pause
  exit /b 1
)
if not exist bot.env (
  python danesh_bot.py init
  echo.
  echo فايل bot.env ساخته شد. براي معامله واقعي آن را با Notepad ويرايش کنيد.
  echo در حالت پيش‌فرض «تمريني» است و پول واقعي در خطر نيست.
  echo.
  pause
)
python danesh_bot.py run
pause
