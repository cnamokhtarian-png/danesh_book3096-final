@echo off
rem =====================================================================
rem  Crypto Bot - one click starter (Windows)
rem  Just double-click this file. Nothing else is needed.
rem  NOTE: keep this file and danesh_bot.py in the same folder.
rem =====================================================================
chcp 65001 >nul
setlocal enableextensions
title Crypto Bot
cd /d "%~dp0"

set "BOT=danesh_bot.py"
set "REPO=https://github.com/cnamokhtarian-png/danesh_book3096-final"
set "BR=arena/81744ac9-danesh-book3096-final"
set "URL1=https://raw.githubusercontent.com/cnamokhtarian-png/danesh_book3096-final/%BR%/trading-bot/single-file/danesh_bot.py"
set "URL2=%REPO%/raw/%BR%/trading-bot/single-file/danesh_bot.py"

echo ==========================================================
echo    Crypto Bot  -  starting, please wait a few seconds
echo ==========================================================
echo.

set "PYCMD="
call :findpython
if not defined PYCMD goto tryinstall
goto checkbot

rem ---------------------------------------------------------- python found
:tryinstall
echo Python is not installed. Trying automatic installation...
where winget >nul 2>nul
if errorlevel 1 goto nopython
winget install -e --id Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
call :findpython
if not defined PYCMD goto nopython

rem ---------------------------------------------------------- bot file
:checkbot
if exist "%BOT%" goto runbot
echo First run: downloading the bot (needs internet, one time only)...
where curl >nul 2>nul
if errorlevel 1 goto psdl
curl -L --fail --silent --show-error -o "%BOT%" "%URL1%"
if exist "%BOT%" goto runbot
curl -L --fail --silent --show-error -o "%BOT%" "%URL2%"
if exist "%BOT%" goto runbot

:psdl
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%URL1%' -OutFile '%BOT%' } catch { }"
if exist "%BOT%" goto runbot
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%URL2%' -OutFile '%BOT%' } catch { }"
if exist "%BOT%" goto runbot
goto nodownload

rem ---------------------------------------------------------- run
:runbot
echo.
%PYCMD% "%BOT%" menu
set "RC=%ERRORLEVEL%"
echo.
echo ----------------------------------------------------------
echo Closed (code %RC%). To start again: double-click START.bat
pause
exit /b 0

rem ---------------------------------------------------------- no python
:nopython
echo.
echo  Python is not installed on this computer.
echo.
echo   1. The download page will open now.
echo   2. Install Python 3.12 and TICK  "Add Python to PATH"
echo   3. Then double-click START.bat again.
echo.
start "" "https://www.python.org/downloads/"
pause
exit /b 1

rem ---------------------------------------------------------- no download
:nodownload
echo.
echo  Could not download the bot file.
echo  Check your internet, or use a VPN, then try again.
echo.
echo  A browser page will open now. If you can download the file there,
echo  save it as  danesh_bot.py  in this same folder, then run START.bat again.
echo.
start "" "%REPO%/blob/%BR%/trading-bot/single-file/danesh_bot.py"
pause
exit /b 1

rem ---------------------------------------------------------- helpers
:findpython
py -3 -c "import sys" >nul 2>nul
if not errorlevel 1 set "PYCMD=py -3"
if defined PYCMD goto :eof
python -c "import sys" >nul 2>nul
if not errorlevel 1 set "PYCMD=python"
if defined PYCMD goto :eof
python3 -c "import sys" >nul 2>nul
if not errorlevel 1 set "PYCMD=python3"
if defined PYCMD goto :eof
for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python3*") do call :usepydir "%%D"
goto :eof

:usepydir
if not exist "%~1\python.exe" goto :eof
set "PATH=%~1;%PATH%"
set "PYCMD=python"
goto :eof
