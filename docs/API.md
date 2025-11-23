# API Documentation

## REST API Endpoints

Base URL: `http://localhost:8000`

### Health Check

**GET** `/api/health`

Returns the health status of the server and UDP receiver.

**Response:**
```json
{
  "status": "healthy",
  "udp_receiver": {
    "running": true,
    "stats": {
      "packets_received": 15234,
      "packets_parsed": 15230,
      "parse_errors": 4,
      "uptime_seconds": 123.45,
      "packets_per_second": 123.5
    }
  },
  "websocket_clients": 2,
  "recording": false
}
```

### Session Data

**GET** `/api/session`

Returns current session information.

**Response:**
```json
{
  "session_uid": 1234567890,
  "session_time": 123.45,
  "session_type": "RACE",
  "track_id": "MONACO",
  "weather": "CLEAR",
  "track_temperature": 35,
  "air_temperature": 28,
  "total_laps": 78,
  "track_length": 3337,
  "session_time_left": 3600,
  "session_duration": 5400,
  "pit_speed_limit": 80,
  "safety_car_status": 0,
  "is_spectating": false,
  "num_marshal_zones": 12,
  "forecast_accuracy": 1
}
```

### Timing Data

**GET** `/api/timing`

Returns timing tower data for all cars.

**Response:**
```json
[
  {
    "position": 1,
    "car_index": 0,
    "driver_name": "HAMILTON",
    "team": "MERCEDES",
    "current_lap": 15,
    "last_lap_time_ms": 73456,
    "gap_to_leader": "Leader",
    "interval": "Leader",
    "pit_stops": 0,
    "penalties": 0
  },
  ...
]
```

### Participants

**GET** `/api/participants`

Returns information about all participants in the session.

**Response:**
```json
{
  "0": {
    "name": "HAMILTON",
    "team_id": "MERCEDES",
    "race_number": 44,
    "nationality": 1,
    "ai_controlled": false
  },
  ...
}
```

### Car Data

**GET** `/api/car/{car_index}`

Returns detailed data for a specific car.

**Parameters:**
- `car_index` (int): Car index (0-21)

**Response:**
```json
{
  "position": 1,
  "current_lap": 15,
  "speed": 305,
  "gear": 8,
  "rpm": 11500,
  "throttle": 1.0,
  "brake": 0.0,
  "steer": 0.12,
  "drs": "ACTIVE",
  "fuel_in_tank": 45.2,
  "fuel_remaining_laps": 20.3,
  "ers_store_energy": 3.2,
  "ers_deploy_mode": "OVERTAKE",
  "tyre_compound": "SOFT",
  "tyre_age_laps": 8,
  "tyres_surface_temp": [95, 98, 92, 94],
  "tyres_pressure": [22.5, 22.6, 21.8, 21.9],
  "tyres_wear": [12.3, 13.1, 10.2, 11.4],
  ...
}
```

### All Cars

**GET** `/api/cars`

Returns data for all cars.

**Response:**
```json
{
  "0": { ... },
  "1": { ... },
  ...
}
```

### Recording Control

**POST** `/api/recording/start`

Starts recording the current session.

**Response:**
```json
{
  "status": "recording_started"
}
```

**POST** `/api/recording/stop`

Stops recording and returns session data.

**Response:**
```json
{
  "status": "recording_stopped",
  "session": {
    "started_at": "2024-01-15T14:30:00",
    "ended_at": "2024-01-15T15:45:00",
    "packets": [ ... ]
  }
}
```

**GET** `/api/recording/status`

Returns current recording status.

**Response:**
```json
{
  "is_recording": true
}
```

## WebSocket API

Connect to: `ws://localhost:8000/ws`

### Connection

Upon connection, the server sends an initial state message:

```json
{
  "type": "initial_state",
  "data": {
    "session": { ... },
    "participants": { ... },
    "cars": { ... },
    "timing": [ ... ]
  }
}
```

### Message Types

#### Session Update
```json
{
  "type": "session",
  "data": { ... },
  "timestamp": "2024-01-15T14:30:00.123Z"
}
```

#### Participants Update
```json
{
  "type": "participants",
  "data": { ... },
  "timestamp": "2024-01-15T14:30:00.123Z"
}
```

#### Timing Update
```json
{
  "type": "timing",
  "data": [ ... ],
  "timestamp": "2024-01-15T14:30:00.123Z"
}
```

#### Player Telemetry
```json
{
  "type": "player_telemetry",
  "data": { ... },
  "timestamp": "2024-01-15T14:30:00.123Z"
}
```

#### Car Positions
```json
{
  "type": "car_positions",
  "data": [
    {
      "car_index": 0,
      "position": 1,
      "x": 123.45,
      "y": 10.5,
      "z": -234.67
    },
    ...
  ],
  "timestamp": "2024-01-15T14:30:00.123Z"
}
```

#### Ping/Pong
```json
{
  "type": "ping"
}
```

**Client response:**
```json
{
  "type": "pong"
}
```

### Client Messages

#### Ping
```json
{
  "type": "ping"
}
```

## Error Responses

All endpoints may return error responses:

**400 Bad Request:**
```json
{
  "detail": "Invalid car index"
}
```

**404 Not Found:**
```json
{
  "detail": "Car not found"
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Internal server error"
}
```

## Rate Limiting

Currently no rate limiting is implemented, but consider these best practices:

- WebSocket messages are sent at ~60Hz
- REST API endpoints should not be polled faster than once per second
- Use WebSocket for real-time data instead of polling REST endpoints

## CORS

CORS is enabled for the following origins:
- `http://localhost:3000`
- `http://localhost:5173`

To add more origins, modify `backend/app/config.py`.
