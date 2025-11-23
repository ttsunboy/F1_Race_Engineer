# Getting Started with F1 24 Telemetry Dashboard

This guide will help you set up and run the F1 24 Telemetry Dashboard.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.11 or higher**
  ```bash
  python --version
  ```

- **Node.js 18+ and npm**
  ```bash
  node --version
  npm --version
  ```

- **F1 24 Game** with UDP telemetry enabled

## Installation Steps

### 1. Backend Setup

Navigate to the backend directory and set up a Python virtual environment:

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

**On macOS/Linux:**
```bash
source venv/bin/activate
```

**On Windows:**
```bash
venv\Scripts\activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

### 2. Frontend Setup

Navigate to the frontend directory and install Node.js dependencies:

```bash
cd ../frontend
npm install
```

### 3. Configure F1 24 Game Settings

In F1 24, configure the telemetry settings:

1. Go to **Settings** → **Telemetry Settings**
2. Set **UDP Telemetry** to **On**
3. Set **UDP Broadcast Mode** to **On**
4. Set **UDP Port** to **20777** (default)
5. Set **UDP Send Rate** to **60Hz** (recommended for real-time updates)
6. Set **UDP Format** to **2024**

## Running the Application

### Option 1: Run Backend and Frontend Separately

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python -m app.main
```

The backend will start on `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The dashboard will open at `http://localhost:3000`

### Option 2: Production Build

Build the frontend for production:

```bash
cd frontend
npm run build
```

Run the production server:

```bash
cd ../backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Then serve the frontend build from a web server or integrate it with the backend.

## Verifying the Setup

1. **Check Backend Health:**
   - Visit `http://localhost:8000/api/health`
   - You should see a JSON response with status information

2. **Check Frontend:**
   - Visit `http://localhost:3000`
   - You should see the dashboard interface

3. **Test Telemetry Connection:**
   - Start F1 24 and enter a session (Practice, Qualifying, or Race)
   - The dashboard should show a green "LIVE" indicator
   - Telemetry data should start appearing on the dashboard

## Troubleshooting

### Backend won't start
- Ensure Python 3.11+ is installed
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Verify the virtual environment is activated

### Frontend won't start
- Ensure Node.js 18+ is installed
- Delete `node_modules` and run `npm install` again
- Check for port conflicts (default: 3000)

### No telemetry data appearing
- Verify F1 24 UDP settings are correct (port 20777)
- Check that F1 24 is actually in a session (not in menus)
- Ensure no firewall is blocking UDP port 20777
- Check backend logs for UDP receiver errors

### WebSocket connection fails
- Ensure backend is running on port 8000
- Check browser console for connection errors
- Verify CORS settings in backend configuration

## Next Steps

- [Dashboard Features](FEATURES.md) - Learn about all dashboard components
- [Configuration Guide](CONFIGURATION.md) - Customize your setup
- [API Documentation](API.md) - Explore the backend API

## Common Issues

### "Module not found" errors in Python
```bash
pip install -r requirements.txt --force-reinstall
```

### Frontend build errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port already in use
Change the port in `backend/app/config.py` or `frontend/vite.config.ts`

## Support

For issues and questions:
- Check the [FAQ](FAQ.md)
- Review [Troubleshooting Guide](TROUBLESHOOTING.md)
- Open an issue on GitHub
