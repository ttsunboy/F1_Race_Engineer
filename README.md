# F1 24 Telemetry Dashboard

A full-featured, modern telemetry dashboard for F1 24 that captures and displays real-time UDP telemetry data with a professional race engineering interface.

## Features

### Real-Time Telemetry
- Live UDP data capture from F1 24 (2024 format, port 20777 by default)
- Real-time position, lap, and delta timing
- Speed, gear, RPM, and input visualization
- DRS, ERS, battery, and fuel monitoring
- Comprehensive tire data (compound, temp, pressure, wear)
- Weather and track conditions (current + forecast timeline)
- Car damage and component health
- Safety car / VSC status indicator

### Dashboard Components
- **Live Timing Tower**: All drivers, positions, live sector times, tire choices, gaps and intervals
- **Track Map**: Real circuit layouts with live car positions, team colors, player highlighted
- **Driver Detail Panel**: Animated gauges for RPM, speed, inputs, gear, DRS
- **Tire Heat Maps**: Temperature, pressure, and degradation visualization
- **Fuel & ERS Display**: Levels, consumption, and efficiency tracking
- **Delta Visualization**: Gain/loss vs leader and teammate
- **Session Overview**: Lap times, sectors, weather, and pit strategy
- **Pit Stop Prediction**: Estimated loss time per condition (green/SC/VSC) and predicted position drop
- **Lap History**: Per-lap times and sector records, persists across restarts
- **Race Recap / History**: Saved race results after each session

### Configuration
- UDP listener host/port configurable from the settings dialog and REST API
- Track override for F1 World mode (which sends zeroed session metadata)
- Pit loss time table per circuit (green/SC/VSC)

## Architecture

```
┌─────────────────┐      UDP      ┌──────────────────┐
│   F1 24 Game    │───────────────▶│  Python Backend  │
└─────────────────┘   Port 20777   │  (FastAPI)       │
                                    │  - UDP Receiver  │
                                    │  - Data Parser   │
                                    │  - WebSocket     │
                                    │  - Recording     │
                                    └────────┬─────────┘
                                             │ WebSocket
                                             ▼
                                    ┌──────────────────┐
                                    │  React Frontend  │
                                    │  - Dashboard     │
                                    │  - Visualizations│
                                    │  - Replay UI     │
                                    └──────────────────┘
```

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, WebSockets, asyncio
- **Frontend**: React 18+, TypeScript, Vite, Tailwind CSS
- **Data Processing**: NumPy, Pandas (session analysis)
- **Visualization**: Canvas API + inline SVG, Framer Motion
- **Real-time Communication**: WebSocket

## Quick Start

### Prerequisites
- Python 3.11 or higher
- Node.js 18+ and npm
- F1 24 game with UDP telemetry enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ttsunboy/F1_Race_Engineer.git
   cd F1_Race_Engineer
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Set up the frontend**
   Or use the provided scripts: `./setup.sh` (Linux/macOS) or `setup.bat` (Windows).

### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   source venv/bin/activate
   python -m app.main
   ```
   The backend will start on `http://localhost:8000`

2. **Start the frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   The dashboard will open at `http://localhost:3000` (proxies API to :8000)

3. **Enable UDP telemetry in F1 24**
   - Go to Settings > Telemetry Settings
   - Set UDP Telemetry to "On"
   - Set UDP Broadcast Mode to "On"
   - Set UDP Port to `20777`
   - Set UDP Send Rate to "60Hz" (recommended)
   - Set UDP Format to "2024"

## Configuration

The UDP listener can be reconfigured at runtime from the **Settings** dialog in the app or via:
- `GET/POST /api/config/udp` — UDP host/port (host empty = `0.0.0.0`)
- `GET/POST /api/config/track` — track override for F1 World mode
- `GET /api/pitloss` — pit loss table

Config (UDP host/port + track override) is persisted to `backend/.udp_config.json`.

## Project Structure

```
F1_Race_Engineer/
├── backend/              # Python FastAPI backend
│   ├── app/
│   │   ├── main.py      # FastAPI application entry + REST/WS endpoints
│   │   ├── udp/         # UDP receiver and F1 24 parser
│   │   ├── services/    # telemetry / pit loss / race recap
│   │   ├── utils/       # F1 24 enums (tracks, session types, ...)
│   │   └── config.py    # Settings
│   ├── test_parser.py   # Parser regression tests
│   └── requirements.txt
├── frontend/            # React TypeScript frontend
│   ├── src/
│   │   ├── components/  # Dashboard components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── services/    # WebSocket client
│   │   ├── store/       # Zustand telemetry store
│   │   ├── types/       # TypeScript types
│   │   └── utils/       # formatting, track SVG map
│   └── package.json
└── setup.sh / setup.bat / start.sh
```

## Development

### Backend Development
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Testing
```bash
# Backend parser tests
cd backend
python3 test_parser.py

# Frontend build / type check
cd frontend
npm run build
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- F1 24 UDP Specification by EA Sports / Codemasters
- Circuit outlines: [julesr0y/f1-circuits-svg](https://github.com/julesr0y/f1-circuits-svg) (CC-BY 4.0)
- Pit lane loss data: F1 official Strategy Guide articles (2024)
