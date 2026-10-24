@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist state mkdir state
echo توقف اضطراری از سوی کاربر > state\STOP
echo.
echo [OK] ربات در چرخه بعدی هیچ سفارشی ثبت نمی کند.
echo برای ادامه: del state\STOP  یا  python -m trader resume
pause
