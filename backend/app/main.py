"""F1 24 Telemetry Dashboard - FastAPI Backend"""
import asyncio
import json
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from .config import settings
from .udp.receiver import UDPTelemetryReceiver
from .services.telemetry_service import TelemetryService

telemetry_service = TelemetryService()
udp_receiver = UDPTelemetryReceiver(host=settings.udp_host, port=settings.udp_port)
CONFIG_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.udp_config.json')


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for the application"""
    print("Starting F1 24 Telemetry Dashboard...")

    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                conf = json.load(f)
            udp_receiver.set_config(conf.get('udp_host', '') or '', conf.get('udp_port', settings.udp_port))
            telemetry_service.set_track_override(conf.get('track_override', ''))
        except Exception as e:
            print(f"Error loading persisted config: {e}")

    udp_receiver.add_packet_callback(telemetry_service.handle_packet)
    await udp_receiver.start()
    yield
    print("Shutting down...")
    await udp_receiver.stop()


app = FastAPI(
    title="F1 24 Telemetry Dashboard",
    description="Real-time F1 24 telemetry data API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UDPConfigRequest(BaseModel):
    """Request body for updating UDP listener configuration"""
    udp_host: str = ""
    udp_port: int = Field(default=20777, ge=1, le=65535)


class TrackOverrideRequest(BaseModel):
    track_override: str = ""


@app.get("/")
async def root():
    return {"name": "F1 24 Telemetry Dashboard API", "version": "1.0.0", "status": "running"}


@app.get("/api/health")
async def health_check():
    receiver_stats = udp_receiver.get_stats()
    return {
        "status": "healthy",
        "udp_receiver": {"running": udp_receiver.running},
        "packet_stats": receiver_stats,
        "websocket_clients": len(telemetry_service.websocket_clients),
        "recording": telemetry_service.is_recording(),
    }


@app.get("/api/config/udp")
async def get_udp_config():
    return {
        "udp_host": udp_receiver.host or "0.0.0.0",
        "udp_port": udp_receiver.port,
        "running": udp_receiver.running,
    }


@app.post("/api/config/udp")
async def set_udp_config(config: UDPConfigRequest):
    new_host = config.udp_host.strip() if config.udp_host else ""
    new_host = new_host if new_host else "0.0.0.0"
    new_port = config.udp_port
    old_host = udp_receiver.host
    old_port = udp_receiver.port

    try:
        await udp_receiver.stop()
        udp_receiver.set_config(new_host, new_port)
        await udp_receiver.start()

        conf = {}
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    conf = json.load(f)
            except Exception:
                pass
        conf['udp_host'] = new_host if new_host != "0.0.0.0" else ""
        conf['udp_port'] = config.udp_port
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(conf, f)
    except Exception as e:
        try:
            udp_receiver.set_config(old_host, old_port)
            await udp_receiver.start()
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=f"Failed to apply UDP config: {str(e)}")

    return {
        "status": "ok",
        "udp_host": udp_receiver.host or "0.0.0.0",
        "udp_port": udp_receiver.port,
        "running": udp_receiver.running,
    }


@app.get("/api/config/track")
async def get_track_config():
    from .utils.enums import TRACK_IDS
    tracks = sorted([name for name in TRACK_IDS.values()])
    return {
        "track_override": telemetry_service.get_track_override(),
        "supported_tracks": tracks,
    }


@app.post("/api/config/track")
async def update_track_config(config: TrackOverrideRequest):
    try:
        telemetry_service.set_track_override(config.track_override.strip())
        conf = {}
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    conf = json.load(f)
            except Exception:
                pass
        conf['track_override'] = telemetry_service.get_track_override()
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(conf, f)
        return {"status": "success", "track_override": telemetry_service.get_track_override()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/pitloss")
async def get_pit_loss():
    state = telemetry_service.get_current_state()
    return state.get("pit_loss") or {
        "track_id": None,
        "condition": "green",
        "losses": None,
        "prediction": None,
    }


@app.get("/api/session")
async def get_session():
    return telemetry_service.get_current_state().get("session", {})


@app.get("/api/timing")
async def get_timing():
    return telemetry_service.get_current_state().get("timing", [])


@app.get("/api/participants")
async def get_participants():
    return telemetry_service.get_current_state().get("participants", {})


@app.get("/api/car/{car_index}")
async def get_car_data(car_index: int):
    if car_index < 0 or car_index > 21:
        raise HTTPException(status_code=400, detail="Invalid car index")
    cars = telemetry_service.get_current_state().get("cars", {})
    if car_index not in cars:
        raise HTTPException(status_code=404, detail="Car not found")
    return cars[car_index]


@app.get("/api/cars")
async def get_all_cars():
    return telemetry_service.get_current_state().get("cars", {})


@app.post("/api/recording/start")
async def start_recording():
    if telemetry_service.is_recording():
        raise HTTPException(status_code=400, detail="Already recording")
    telemetry_service.start_recording()
    return {"status": "recording_started"}


@app.post("/api/recording/stop")
async def stop_recording():
    if not telemetry_service.is_recording():
        raise HTTPException(status_code=400, detail="Not recording")
    session_data = telemetry_service.stop_recording()
    return {"status": "recording_stopped", "session": session_data}


@app.get("/api/recording/status")
async def recording_status():
    return {"is_recording": telemetry_service.is_recording()}


@app.get("/api/races")
async def get_all_races():
    try:
        return {"races": telemetry_service.get_all_races()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching races: {str(e)}")


@app.get("/api/races/{race_id}")
async def get_race_recap(race_id: str):
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
    try:
        telemetry_service.reset_race_session()
        return {"status": "session_reset", "message": "Ready for new race"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting session: {str(e)}")


@app.post("/api/lap-history/clear")
async def clear_lap_history():
    await telemetry_service.clear_lap_history()
    return {"status": "success"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    telemetry_service.add_websocket_client(websocket)
    try:
        initial_state = telemetry_service.get_current_state()
        await websocket.send_text(json.dumps({"type": "initial_state", "data": initial_state}))
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        telemetry_service.remove_websocket_client(websocket)


def main():
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=False, log_level="info")


if __name__ == "__main__":
    main()



