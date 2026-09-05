@echo off
REM ============================================================
REM  F1 24 Telemetry Dashboard - Setup Script for Windows
REM  One-shot setup: auto-installs missing Python/Node.js via
REM  winget, then installs backend + frontend dependencies.
REM  Usage: double-click setup.bat, or run from cmd.
REM ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo =========================================
echo  F1 24 Telemetry Dashboard - Setup
echo =========================================
echo.

REM ---------- 0. Check winget ----------
where winget >nul 2>&1
if errorlevel 1 (
    echo [ERROR] winget not found. This PC needs Windows 10/11 with App Installer.
    echo         Please install Python 3.10+ and Node.js 18+ manually, then re-run.
    pause & exit /b 1
)

REM ---------- 1. Python check / install ----------
set PYTHON_CMD=
where python >nul 2>&1 && set PYTHON_CMD=python
if not defined PYTHON_CMD (
    where py >nul 2>&1 && set PYTHON_CMD=py
)

if defined PYTHON_CMD (
    for /f "delims=" %%v in ('%PYTHON_CMD% --version 2^>^&1') do set PYVER=%%v
    echo [OK] Found !PYVER!
) else (
    echo [SETUP] Python not found. Installing Python 3.12 via winget...
    winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements --silent
    if errorlevel 1 (
        echo [ERROR] Python install failed. Install manually from https://www.python.org/downloads/
        echo        IMPORTANT: tick "Add python.exe to PATH" during install!
        pause & exit /b 1
    )
    echo [OK] Python 3.12 installed. Refreshing PATH...
    rem Refresh PATH in this session (winget installs to per-user PATH)
    for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USER_PATH=%%b"
    if defined USER_PATH set "PATH=!USER_PATH!;!PATH!"
    set PYTHON_CMD=python
    %PYTHON_CMD% --version
)

REM ---------- 2. Node.js check / install ----------
set NODE_CMD=
where node >nul 2>&1 && set NODE_CMD=node

if defined NODE_CMD (
    for /f "delims=" %%v in ('node --version 2^>^&1') do set NODEV=%%v
    echo [OK] Found Node !NODEV!
) else (
    echo [SETUP] Node.js not found. Installing Node.js LTS via winget...
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements --silent
    if errorlevel 1 (
        echo [ERROR] Node.js install failed. Install manually from https://nodejs.org/
        pause & exit /b 1
    )
    echo [OK] Node.js LTS installed. Refreshing PATH...
    for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USER_PATH=%%b"
    if defined USER_PATH set "PATH=!USER_PATH!;!PATH!"
    set NODE_CMD=node
    node --version
)

REM ---------- 3. Backend deps ----------
echo.
echo =========================================
echo  Setting up Backend...
echo =========================================
cd /d "%~dp0backend"

if not exist "venv\Scripts\python.exe" (
    echo Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 ( echo [ERROR] venv creation failed & pause & exit /b 1 )
)

echo Installing Python dependencies...
venv\Scripts\python -m pip install --upgrade pip >nul 2>&1
venv\Scripts\python -m pip install -r requirements.txt
if errorlevel 1 ( echo [ERROR] pip install failed. Check network. & pause & exit /b 1 )
echo [OK] Backend dependencies installed.

REM ---------- 4. Frontend deps ----------
echo.
echo =========================================
echo  Setting up Frontend...
echo =========================================
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo Installing Node.js dependencies ^(this can take a few minutes^)...
    call npm install
    if errorlevel 1 ( echo [ERROR] npm install failed. Check network. & pause & exit /b 1 )
) else (
    echo [OK] node_modules already exists. Running npm install to sync...
    call npm install
    if errorlevel 1 ( echo [ERROR] npm install failed & pause & exit /b 1 )
)
echo [OK] Frontend dependencies installed.

REM ---------- 4b. esbuild self-heal ----------
REM Some npm registries/mirrors ship @esbuild/<platform> without the binary,
REM which breaks vite ("esbuild.exe not found" / EPERM). Detect and fix it.
echo Checking esbuild binary...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0frontend\fix_esbuild.ps1"
if errorlevel 1 ( echo [WARN] esbuild auto-fix failed - build may fail. & pause & exit /b 1 )
if errorlevel 1 ( echo [WARN] esbuild auto-fix failed - build may fail. & pause & exit /b 1 )

REM ---------- 4c. Frontend build ----------
echo.
echo Building frontend production bundle...
call npm run build
if errorlevel 1 ( echo [ERROR] Frontend build failed. Check error above. & pause & exit /b 1 )
echo [OK] Frontend build complete. ^(dist/^)

REM ---------- 5. Done ----------
cd /d "%~dp0"
echo.
echo =========================================
echo  Setup Complete!
echo =========================================
echo.
echo  Start the dashboard with:  start.bat
echo  Dashboard:                 http://localhost:3000
echo.
echo  F1 24 config: Settings -^> Telemetry Settings
echo    UDP Telemetry: On  ^|  Port: 20777  ^|  Format: 2024  ^|  Send Rate: 60Hz
echo.
echo  NOTE: If Python/Node were just installed, CLOSE this window and
echo        reopen before running start.bat, so PATH picks them up.
echo =========================================

pause
endlocal
