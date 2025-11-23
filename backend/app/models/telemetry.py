"""Telemetry data models for API responses"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class TelemetryState(BaseModel):
    """Current telemetry state for all cars"""
    session_uid: int
    session_time: float
    frame_id: int
    player_car_index: int

    # Session data
    session_type: Optional[str] = None
    track_id: Optional[str] = None
    weather: Optional[str] = None
    track_temperature: Optional[int] = None
    air_temperature: Optional[int] = None
    total_laps: Optional[int] = None
    session_time_left: Optional[int] = None

    # All cars data
    cars: Dict[int, Dict[str, Any]] = {}

    # Timing data
    timing_data: List[Dict[str, Any]] = []

    # Flags and safety car
    flags: List[Dict[str, Any]] = []
    safety_car_status: Optional[int] = None

    # Stats
    last_update: datetime = datetime.now()


class CarData(BaseModel):
    """Complete data for a single car"""
    car_index: int
    driver_name: Optional[str] = None
    team: Optional[str] = None
    position: Optional[int] = None

    # Lap data
    current_lap: Optional[int] = None
    lap_distance: Optional[float] = None
    current_lap_time_ms: Optional[int] = None
    last_lap_time_ms: Optional[int] = None
    sector1_time_ms: Optional[int] = None
    sector2_time_ms: Optional[int] = None
    delta_to_leader_ms: Optional[int] = None
    delta_to_car_ahead_ms: Optional[int] = None

    # Telemetry
    speed: Optional[int] = None
    gear: Optional[int] = None
    rpm: Optional[int] = None
    throttle: Optional[float] = None
    brake: Optional[float] = None
    steer: Optional[float] = None
    clutch: Optional[int] = None
    drs: Optional[str] = None

    # Status
    fuel_in_tank: Optional[float] = None
    fuel_remaining_laps: Optional[float] = None
    ers_store_energy: Optional[float] = None
    ers_deploy_mode: Optional[str] = None
    tyre_compound: Optional[str] = None
    tyre_age_laps: Optional[int] = None

    # Tyre data
    tyre_temps_inner: Optional[List[int]] = None
    tyre_temps_surface: Optional[List[int]] = None
    tyre_pressures: Optional[List[float]] = None
    tyre_wear: Optional[List[float]] = None
    tyre_damage: Optional[List[int]] = None

    # Damage
    front_wing_damage: Optional[int] = None
    rear_wing_damage: Optional[int] = None
    engine_damage: Optional[int] = None

    # Position data
    world_pos_x: Optional[float] = None
    world_pos_y: Optional[float] = None
    world_pos_z: Optional[float] = None


class SessionInfo(BaseModel):
    """Session information"""
    session_uid: int
    session_type: str
    track_id: str
    track_name: str
    weather: str
    track_temperature: int
    air_temperature: int
    total_laps: int
    track_length: int
    session_time_left: int
    session_duration: int
    pit_speed_limit: int
    safety_car_status: int
    is_spectating: bool
    num_marshal_zones: int
    forecast_accuracy: int


class TimingEntry(BaseModel):
    """Timing tower entry for a driver"""
    position: int
    car_index: int
    driver_name: str
    team: str
    current_lap: int
    last_lap_time_ms: int
    best_lap_time_ms: int
    sector1_time_ms: int
    sector2_time_ms: int
    sector3_time_ms: int
    gap_to_leader: str
    interval_to_ahead: str
    tyre_compound: str
    tyre_age: int
    pit_stops: int
    penalties: int
    position_gained: int


class DeltaData(BaseModel):
    """Delta timing data"""
    car_index: int
    current_delta_ms: int
    is_gaining: bool
    delta_history: List[int] = []  # Last N deltas for visualization


class RecordingInfo(BaseModel):
    """Recording session info"""
    recording_id: str
    session_uid: int
    started_at: datetime
    duration_seconds: float
    packet_count: int
    is_recording: bool
