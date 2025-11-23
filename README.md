# F1 24 Telemetry Dashboard

A full-featured, modern telemetry dashboard for F1 24 that captures and displays real-time UDP telemetry data with a professional race engineering interface.

## Features

### Real-Time Telemetry
- Live UDP data capture from F1 24
- Real-time position, lap, and delta timing
- Speed, gear, RPM, and input visualization
- DRS, ERS, battery, and fuel monitoring
- Comprehensive tire data (compound, temp, pressure, wear)
- Weather and track conditions
- Car damage and component health

### Dashboard Components
- **Live Timing Tower**: All drivers, positions, tire choices, and intervals
- **Track Map**: Real-time car positions with DRS zones and flags
- **Driver Detail Panel**: Animated gauges for RPM, speed, inputs, gear, DRS
- **Tire Heat Maps**: Temperature, pressure, and degradation visualization
- **Fuel & ERS Display**: Levels, consumption, and efficiency tracking
- **Delta Visualization**: Gain/loss over time with color indicators
- **Session Overview**: Lap times, sectors, weather, and pit strategy

### Recording & Playback
- Record complete telemetry sessions
- Replay mode with time scrubbing
- Compare multiple laps and sessions
- Export session data

### Customization
- Dark and light themes
- Adjustable units (speed, temperature, pressure)
- Toggle panel visibility
- Streamer overlay mode
- Configurable update rates

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
- **Frontend**: React 18+, TypeScript, Recharts, D3.js, Canvas API
- **Data Processing**: NumPy, Pandas (for session analysis)
- **Real-time Communication**: WebSocket
- **Styling**: Tailwind CSS, Framer Motion

## Quick Start

### Prerequisites
- Python 3.11 or higher
- Node.js 18+ and npm
- F1 24 game with UDP telemetry enabled

### Installation

1. **Clone the repository**
   ```bash
   cd F1_Telemetry
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   ```

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
   npm start
   ```
   The dashboard will open at `http://localhost:3000`

3. **Enable UDP telemetry in F1 24**
   - Go to Settings > Telemetry Settings
   - Set UDP Telemetry to "On"
   - Set UDP Broadcast Mode to "On"
   - Set UDP Port to `20777`
   - Set UDP Send Rate to "60Hz" (recommended)
   - Set UDP Format to "2024"

## Configuration

Edit `config/settings.json` to customize:
- UDP port and IP address
- Update rates and data smoothing
- Default theme and units
- Recording settings

## Project Structure

```
F1_Telemetry/
├── backend/              # Python FastAPI backend
│   ├── app/
│   │   ├── main.py      # FastAPI application entry
│   │   ├── udp/         # UDP receiver and parser
│   │   ├── models/      # Data models
│   │   ├── websocket/   # WebSocket handlers
│   │   └── recording/   # Session recording
│   ├── tests/
│   └── requirements.txt
├── frontend/            # React TypeScript frontend
│   ├── src/
│   │   ├── components/  # Dashboard components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── services/    # WebSocket and API services
│   │   └── types/       # TypeScript types
│   └── package.json
├── data/                # Recorded sessions and data
├── docs/                # Documentation
└── config/              # Configuration files
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
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## Deployment

### Docker
```bash
docker-compose up
```

### Desktop App (Electron)
```bash
cd frontend
npm run build
npm run electron-build
```

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- F1 24 UDP Specification by EA Sports / Codemasters
- Inspired by professional F1 race engineering tools
