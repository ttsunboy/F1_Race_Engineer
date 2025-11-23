@echo off
REM F1 24 Telemetry Dashboard - Setup Script for Windows
REM This script sets up both backend and frontend

echo =========================================
echo F1 24 Telemetry Dashboard Setup
echo =========================================
echo.

REM Check Python version
echo Checking Python version...
python --version
echo.

REM Check Node.js version
echo Checking Node.js version...
node --version
echo.

echo =========================================
echo Setting up Backend...
echo =========================================

REM Backend setup
cd backend

echo Creating Python virtual environment...
python -m venv venv

echo Activating virtual environment...
call venv\Scripts\activate

echo Installing Python dependencies...
pip install -r requirements.txt

echo Backend setup complete!

cd ..

echo.
echo =========================================
echo Setting up Frontend...
echo =========================================

REM Frontend setup
cd frontend

echo Installing Node.js dependencies...
call npm install

echo Frontend setup complete!

cd ..

echo.
echo =========================================
echo Setup Complete!
echo =========================================
echo.
echo To start the application:
echo.
echo 1. Start the backend (in one terminal):
echo    cd backend
echo    venv\Scripts\activate
echo    python -m app.main
echo.
echo 2. Start the frontend (in another terminal):
echo    cd frontend
echo    npm run dev
echo.
echo 3. Configure F1 24:
echo    - Go to Settings ^> Telemetry Settings
echo    - Enable UDP Telemetry on port 20777
echo    - Set Send Rate to 60Hz
echo.
echo 4. Open your browser:
echo    http://localhost:3000
echo.
echo For more information, see docs\GETTING_STARTED.md
echo =========================================

pause
