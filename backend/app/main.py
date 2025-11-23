"""F1 24 Telemetry Dashboard - FastAPI Backend"""
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from .config import settings
from .udp.receiver import UDPTelemetryReceiver
from .services.telemetry_service import TelemetryService


# Global instances
telemetry_service = TelemetryService()
udp_receiver = UDPTelemetryReceiver(host=settings.udp_host, port=settings.udp_port)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for the application"""
    # Startup
    print("Starting F1 24 Telemetry Dashboard...")

    # Register packet handler
    udp_receiver.add_packet_callback(telemetry_service.handle_packet)

    # Start UDP receiver
    await udp_receiver.start()

    yield

    # Shutdown
    print("Shutting down...")
    await udp_receiver.stop()


# Create FastAPI app
app = FastAPI(
    title="F1 24 Telemetry Dashboard",
    description="Real-time F1 24 telemetry data API",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "F1 24 Telemetry Dashboard API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    receiver_stats = udp_receiver.get_stats()
    return {
        "status": "healthy",
        "udp_receiver": {
            "running": udp_receiver.running,
            "stats": receiver_stats
        },
        "websocket_clients": len(telemetry_service.websocket_clients),
        "recording": telemetry_service.is_recording()
    }


@app.get("/api/session")
async def get_session():
    """Get current session data"""
    state = telemetry_service.get_current_state()
    return state.get("session", {})


@app.get("/api/timing")
async def get_timing():
    """Get timing tower data"""
    state = telemetry_service.get_current_state()
    return state.get("timing", [])


@app.get("/api/participants")
async def get_participants():
    """Get participants data"""
    state = telemetry_service.get_current_state()
    return state.get("participants", {})


@app.get("/api/car/{car_index}")
async def get_car_data(car_index: int):
    """Get data for a specific car"""
    if car_index < 0 or car_index > 21:
        raise HTTPException(status_code=400, detail="Invalid car index")

    state = telemetry_service.get_current_state()
    cars = state.get("cars", {})

    if car_index not in cars:
        raise HTTPException(status_code=404, detail="Car not found")

    return cars[car_index]


@app.get("/api/cars")
async def get_all_cars():
    """Get data for all cars"""
    state = telemetry_service.get_current_state()
    return state.get("cars", {})


@app.post("/api/recording/start")
async def start_recording():
    """Start recording session"""
    if telemetry_service.is_recording():
        raise HTTPException(status_code=400, detail="Already recording")

    telemetry_service.start_recording()
    return {"status": "recording_started"}


@app.post("/api/recording/stop")
async def stop_recording():
    """Stop recording session"""
    if not telemetry_service.is_recording():
        raise HTTPException(status_code=400, detail="Not recording")

    session_data = telemetry_service.stop_recording()
    # In production, save to file here
    return {
        "status": "recording_stopped",
        "session": session_data
    }


@app.get("/api/recording/status")
async def recording_status():
    """Get recording status"""
    return {
        "is_recording": telemetry_service.is_recording()
    }


# Race History Endpoints

@app.get("/api/races")
async def get_all_races():
    """Get list of all saved race recaps"""
    try:
        races = telemetry_service.get_all_races()
        return {"races": races}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching races: {str(e)}")


@app.get("/api/races/{race_id}")
async def get_race_recap(race_id: str):
    """Get full recap for a specific race"""
    try:
        recap = telemetry_service.get_race_recap(race_id)
        if recap is None:
            raise HTTPException(status_code=404, detail="Race not found")
        return recap
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching race recap: {str(e)}")


@app.post("/api/session/reset")
async def reset_session():
    """Reset current race session tracking"""
    try:
        telemetry_service.reset_race_session()
        return {"status": "session_reset", "message": "Ready for new race"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting session: {str(e)}")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time telemetry updates"""
    await websocket.accept()
    telemetry_service.add_websocket_client(websocket)

    try:
        # Send initial state
        import json
        initial_state = telemetry_service.get_current_state()
        await websocket.send_text(json.dumps({
            "type": "initial_state",
            "data": initial_state
        }))

        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages from client (ping/pong, commands, etc.)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)

                # Handle client messages
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))

            except asyncio.TimeoutError:
                # Send keepalive ping
                await websocket.send_text(json.dumps({"type": "ping"}))

    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        telemetry_service.remove_websocket_client(websocket)


def main():
    """Run the application"""
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level="info"
    )


if __name__ == "__main__":
    main()
