@echo off
chcp 65001 >nul
cd /d "%~dp0"
python danesh_bot.py panic
pause
