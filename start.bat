@echo off
REM ============================================================
REM  F1 24 Telemetry Dashboard - Windows Start Script
REM  One-shot: checks deps -> installs if missing -> starts
REM  backend (:8000) + frontend (:3000) in background with logs.
REM  Browser opens automatically once both are healthy.
REM ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo =========================================
echo  F1 24 Telemetry Dashboard
echo =========================================
echo.

REM ---------- 0. Dependency checks ----------
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found in PATH. Install Python 3.10+ first.
    pause & exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found in PATH. Install Node 18+ first.
    pause & exit /b 1
)
for /f "delims=" %%v in ('python --version 2^>^&1') do echo [OK] %%v
for /f "delims=" %%v in ('node --version 2^>^&1') do echo [OK] Node %%v
echo.

REM ---------- 1. Port conflict check ----------
set PORTS=8000 3000
for %%p in (%PORTS%) do (
    netstat -ano | findstr /r /c:":%%p .*LISTENING" >nul 2>&1
    if not errorlevel 1 (
        echo [WARN] Port %%p already in use - another instance running?
        echo        Close the two F1-Backend / F1-Frontend cmd windows to stop.
    )
)
echo.

REM ---------- 2. Backend venv ----------
if not exist "backend\venv\Scripts\python.exe" (
    echo [SETUP] Creating Python venv...
    pushd backend
    python -m venv venv
    if errorlevel 1 ( echo [ERROR] venv creation failed & pause & exit /b 1 )
    echo [SETUP] Installing backend dependencies...
    venv\Scripts\python -m pip install --upgrade pip >nul 2>&1
    venv\Scripts\python -m pip install -r requirements.txt
    if errorlevel 1 ( echo [ERROR] pip install failed & pause & exit /b 1 )
    popd
) else (
    echo [OK] Backend venv found
)

REM ---------- 3. Frontend node_modules ----------
if not exist "frontend\node_modules" (
    echo [SETUP] Installing frontend dependencies ^(first run, may take a while^)...
    pushd frontend
    call npm install
    if errorlevel 1 ( echo [ERROR] npm install failed & pause & exit /b 1 )
    popd
) else (
    echo [OK] Frontend node_modules found
)
echo.

REM ---------- 4. Logs dir ----------
if not exist "logs" mkdir logs

REM ---------- 5. Start backend ----------
echo [START] Backend  ^(http://localhost:8000^)
start "F1-Backend" /min cmd /c "cd /d "%~dp0backend" && venv\Scripts\python.exe -m app.main >> "%~dp0logs\backend.log" 2>&1"

REM ---------- 6. Start frontend ----------
echo [START] Frontend ^(http://localhost:3000^)
start "F1-Frontend" /min cmd /c "cd /d "%~dp0frontend" && npm run dev >> "%~dp0logs\frontend.log" 2>&1"

REM ---------- 7. Wait for health, then open browser ----------
echo.
echo [WAIT] Waiting for services to come up...
set BACKEND_OK=0
set FRONTEND_OK=0

for /l %%i in (1,1,30) do (
    if not "!BACKEND_OK!"=="1" (
        powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -UseBasicParsing -TimeoutSec 2).StatusCode } catch { 0 }" | findstr "200" >nul 2>&1
        if not errorlevel 1 set BACKEND_OK=1
    )
    if not "!FRONTEND_OK!"=="1" (
        powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 2).StatusCode } catch { 0 }" | findstr "200" >nul 2>&1
        if not errorlevel 1 set FRONTEND_OK=1
    )
    if "!BACKEND_OK!"=="1" if "!FRONTEND_OK!"=="1" goto :up
    timeout /t 1 /nobreak >nul
)

:up
if "!BACKEND_OK!"=="1" ( echo [OK] Backend healthy ) else ( echo [WARN] Backend not responding yet - check logs\backend.log )
if "!FRONTEND_OK!"=="1" ( echo [OK] Frontend serving ) else ( echo [WARN] Frontend not responding yet - check logs\frontend.log )

echo.
echo =========================================
echo  Dashboard ready: http://localhost:3000
echo  Stop: close the two F1-Backend / F1-Frontend cmd windows
echo  Logs:           logs\backend.log / logs\frontend.log
echo =========================================

start "" http://localhost:3000
endlocal
