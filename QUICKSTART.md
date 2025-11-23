# Quick Start Guide

## ✅ Installation Complete!

Both backend and frontend are now set up and ready to use.

## 🚀 Starting the Application

### Option 1: Two Terminal Windows

**Terminal 1 - Start Backend:**
```bash
cd backend
source venv/bin/activate
python -m app.main
```
The backend will start on **http://localhost:8000**

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```
The dashboard will open at **http://localhost:3000**

### Option 2: Using the Start Script (macOS/Linux)
```bash
./start.sh
```
This will start both backend and frontend in tmux sessions.

## 🎮 Configure F1 24

Before using the dashboard, configure F1 24:

1. **Launch F1 24**
2. Go to **Settings** → **Telemetry Settings**
3. Configure:
   - **UDP Telemetry**: On
   - **UDP Broadcast Mode**: On
   - **UDP Port**: 20777
   - **UDP Send Rate**: 60Hz (recommended)
   - **UDP Format**: 2024

## 🏁 Using the Dashboard

1. **Start the application** (backend + frontend)
2. **Configure F1 24** (see above)
3. **Enter a session** in F1 24 (Practice, Qualifying, or Race)
4. **Open browser** at http://localhost:3000
5. **Watch the telemetry** flow in real-time!

## 📊 Dashboard Components

- **Session Info** - Track, weather, time remaining
- **Live Timing Tower** - All 22 drivers, positions, gaps, tire info
- **Driver Panel** - Speed/RPM gauges, gear, inputs
- **Tire Visualization** - Temperature, pressure, wear
- **Fuel & ERS** - Levels and consumption
- **Track Map** - Real-time car positions
- **Delta Timing** - Gaps to leader and car ahead

## 🔍 Testing Without F1 24

The dashboard will start and show "Waiting for telemetry data..." until F1 24 starts broadcasting.

You can check if the backend is running:
- Visit: http://localhost:8000/api/health
- Should return JSON with system status

## 🛠️ Troubleshooting

### Backend won't start
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend won't start
```bash
cd frontend
rm -rf node_modules
npm install
```

### No telemetry data
- ✅ Check F1 24 UDP settings (port 20777)
- ✅ Ensure you're in a session (not menus)
- ✅ Check backend logs for UDP receiver errors
- ✅ Verify firewall isn't blocking port 20777

### Port already in use
Edit `backend/app/config.py` to change the port:
```python
port: int = 8001  # Change from 8000
```

## 📖 More Information

- **Features**: See `docs/FEATURES.md`
- **API Docs**: See `docs/API.md`
- **Full Guide**: See `docs/GETTING_STARTED.md`

## 🎯 Next Steps

1. **Start both backend and frontend**
2. **Configure F1 24 UDP settings**
3. **Enter a race session**
4. **Enjoy your professional telemetry dashboard!**

---

**Need Help?**
- Check `docs/GETTING_STARTED.md` for detailed setup
- Review `docs/FEATURES.md` for all dashboard features
- See `docs/API.md` for API documentation
