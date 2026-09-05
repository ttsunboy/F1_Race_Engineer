"""F1 24 UDP packet data structures"""
import struct
from dataclasses import dataclass
from typing import List, Any
from .packet_types import *


@dataclass
class PacketHeader:
    """Header for all UDP packets"""
    packet_format: int  # 2024
    game_year: int  # Game year - last two digits (24)
    game_major_version: int
    game_minor_version: int
    packet_version: int
    packet_type: PacketType
    session_uid: int
    session_time: float
    frame_identifier: int
    overall_frame_identifier: int
    player_car_index: int
    secondary_player_car_index: int

    @staticmethod
    def from_bytes(data: bytes):
        """Parse header from bytes"""
        values = struct.unpack('<HBBBBBQfIIBB', data[:29])
        return PacketHeader(
            packet_format=values[0],
            game_year=values[1],
            game_major_version=values[2],
            game_minor_version=values[3],
            packet_version=values[4],
            packet_type=PacketType(values[5]),
            session_uid=values[6],
            session_time=values[7],
            frame_identifier=values[8],
            overall_frame_identifier=values[9],
            player_car_index=values[10],
            secondary_player_car_index=values[11]
        )


@dataclass
class CarMotionData:
    """Motion data for a single car"""
    world_position_x: float
    world_position_y: float
    world_position_z: float
    world_velocity_x: float
    world_velocity_y: float
    world_velocity_z: float
    world_forward_dir_x: int
    world_forward_dir_y: int
    world_forward_dir_z: int
    world_right_dir_x: int
    world_right_dir_y: int
    world_right_dir_z: int
    g_force_lateral: float
    g_force_longitudinal: float
    g_force_vertical: float
    yaw: float
    pitch: float
    roll: float


@dataclass
class PacketMotionData:
    """Motion packet - position, velocity, rotation for all cars"""
    header: PacketHeader
    car_motion_data: List[CarMotionData]  # 22 cars


@dataclass
class MarshalZone:
    """Marshal zone information"""
    zone_start: float
    zone_flag: FlagType


@dataclass
class WeatherForecastSample:
    """Weather forecast for a time sample"""
    session_type: SessionType
    time_offset: int
    weather: Weather
    track_temperature: int
    track_temperature_change: int
    air_temperature: int
    air_temperature_change: int
    rain_percentage: int


@dataclass
class PacketSessionData:
    """Session data packet"""
    header: PacketHeader
    weather: Weather
    track_temperature: int
    air_temperature: int
    total_laps: int
    track_length: int
    session_type: SessionType
    track_id: TrackID
    formula: int
    session_time_left: int
    session_duration: int
    pit_speed_limit: int
    game_paused: bool
    is_spectating: bool
    spectator_car_index: int
    sli_pro_native_support: bool
    num_marshal_zones: int
    marshal_zones: List[MarshalZone]
    safety_car_status: int
    network_game: bool
    num_weather_forecast_samples: int
    weather_forecast_samples: List[WeatherForecastSample]
    forecast_accuracy: int
    ai_difficulty: int
    season_link_identifier: int
    weekend_link_identifier: int
    session_link_identifier: int
    pit_stop_window_ideal_lap: int
    pit_stop_window_latest_lap: int
    pit_stop_rejoin_position: int
    steering_assist: bool
    braking_assist: int
    gearbox_assist: int
    pit_assist: bool
    pit_release_assist: bool
    ers_assist: bool
    drs_assist: bool
    dynamic_racing_line: int
    dynamic_racing_line_type: int
    game_mode: int
    rule_set: int
    time_of_day: int
    session_length: int
    speed_units_lead_player: int
    temperature_units_lead_player: int
    speed_units_secondary_player: int
    temperature_units_secondary_player: int
    num_safety_car_periods: int
    num_virtual_safety_car_periods: int
    num_red_flag_periods: int


@dataclass
class LapData:
    """Lap data for a single car"""
    last_lap_time_in_ms: int
    current_lap_time_in_ms: int
    sector1_time_in_ms: int
    sector1_time_minutes: int
    sector2_time_in_ms: int
    sector2_time_minutes: int
    delta_to_car_in_front_in_ms: int
    delta_to_car_in_front_minutes: int
    delta_to_race_leader_in_ms: int
    delta_to_race_leader_minutes: int
    lap_distance: float
    total_distance: float
    safety_car_delta: float
    car_position: int
    current_lap_num: int
    pit_status: PitStatus
    num_pit_stops: int
    sector: Sector
    current_lap_invalid: bool
    penalties: int
    total_warnings: int
    corner_cutting_warnings: int
    num_unserved_drive_through_pens: int
    num_unserved_stop_go_pens: int
    grid_position: int
    driver_status: DriverStatus
    result_status: ResultStatus
    pit_lane_timer_active: bool
    pit_lane_time_in_lane_in_ms: int
    pit_stop_timer_in_ms: int
    pit_stop_should_serve_pen: bool
    speed_trap_fastest_speed: float
    speed_trap_fastest_lap: int


@dataclass
class PacketLapData:
    """Lap data packet"""
    header: PacketHeader
    lap_data: List[LapData]  # 22 cars
    time_trial_pb_car_idx: int
    time_trial_rival_car_idx: int


@dataclass
class FastestLap:
    """Fastest lap event data"""
    vehicle_idx: int
    lap_time: float


@dataclass
class Retirement:
    """Retirement event data"""
    vehicle_idx: int


@dataclass
class TeamMateInPits:
    """Team mate in pits event data"""
    vehicle_idx: int


@dataclass
class RaceWinner:
    """Race winner event data"""
    vehicle_idx: int


@dataclass
class Penalty:
    """Penalty event data"""
    penalty_type: int
    infringement_type: int
    vehicle_idx: int
    other_vehicle_idx: int
    time: int
    lap_num: int
    places_gained: int


@dataclass
class SpeedTrap:
    """Speed trap event data"""
    vehicle_idx: int
    speed: float
    is_overall_fastest_in_session: bool
    is_driver_fastest_in_session: bool
    fastest_vehicle_idx_in_session: int
    fastest_speed_in_session: float


@dataclass
class StartLights:
    """Start lights event data"""
    num_lights: int


@dataclass
class DriveThroughPenaltyServed:
    """Drive through penalty served event data"""
    vehicle_idx: int


@dataclass
class StopGoPenaltyServed:
    """Stop go penalty served event data"""
    vehicle_idx: int


@dataclass
class SafetyCarEvent:
    """Safety car event data"""
    safety_car_type: int
    event_type: int


@dataclass
class Flashback:
    """Flashback event data"""
    flashback_frame_identifier: int
    flashback_session_time: float


@dataclass
class Buttons:
    """Button flags event data"""
    button_status: int


@dataclass
class Overtake:
    """Overtake event data"""
    overtaking_vehicle_idx: int
    being_overtaken_vehicle_idx: int


@dataclass
class PacketEventData:
    """Event packet - contains various event types"""
    header: PacketHeader
    event_string_code: str  # 4 character event code
    event_details: any  # Union of event data types


@dataclass
class ParticipantData:
    """Data for a single participant"""
    ai_controlled: bool
    driver_id: int
    network_id: int
    team_id: TeamID
    my_team: bool
    race_number: int
    nationality: int
    name: str  # 48 chars
    your_telemetry: bool
    show_online_names: bool
    tech_level: int
    platform: int


@dataclass
class PacketParticipantsData:
    """Participants packet - driver info"""
    header: PacketHeader
    num_active_cars: int
    participants: List[ParticipantData]  # 22 cars


@dataclass
class CarTelemetryData:
    """Telemetry data for a single car"""
    speed: int
    throttle: float
    steer: float
    brake: float
    clutch: int
    gear: int
    engine_rpm: int
    drs: DRSStatus
    rev_lights_percent: int
    rev_lights_bit_value: int
    brakes_temperature: List[int]  # 4 wheels
    tyres_surface_temperature: List[int]  # 4 wheels
    tyres_inner_temperature: List[int]  # 4 wheels
    engine_temperature: int
    tyres_pressure: List[float]  # 4 wheels
    surface_type: List[SurfaceType]  # 4 wheels


@dataclass
class PacketCarTelemetryData:
    """Car telemetry packet - speed, throttle, brake, etc."""
    header: PacketHeader
    car_telemetry_data: List[CarTelemetryData]  # 22 cars
    mfd_panel_index: int
    mfd_panel_index_secondary_player: int
    suggested_gear: int


@dataclass
class CarStatusData:
    """Status data for a single car"""
    traction_control: int
    anti_lock_brakes: bool
    fuel_mix: int
    front_brake_bias: int
    pit_limiter_status: bool
    fuel_in_tank: float
    fuel_capacity: float
    fuel_remaining_laps: float
    max_rpm: int
    idle_rpm: int
    max_gears: int
    drs_allowed: DRSStatus
    drs_activation_distance: int
    actual_tyre_compound: ActualTyreCompound
    visual_tyre_compound: VisualTyreCompound
    tyres_age_laps: int
    vehicle_fia_flags: int
    engine_power_ice: float
    engine_power_mguk: float
    ers_store_energy: float
    ers_deploy_mode: ERSDeployMode
    ers_harvested_this_lap_mguk: float
    ers_harvested_this_lap_mguh: float
    ers_deployed_this_lap: float
    network_paused: bool


@dataclass
class PacketCarStatusData:
    """Car status packet - fuel, ERS, DRS, tires, damage"""
    header: PacketHeader
    car_status_data: List[CarStatusData]  # 22 cars


@dataclass
class FinalClassificationData:
    """Final classification data for a single car"""
    position: int
    num_laps: int
    grid_position: int
    points: int
    num_pit_stops: int
    result_status: ResultStatus
    best_lap_time_in_ms: int
    total_race_time: float
    penalties_time: int
    num_penalties: int
    num_tyre_stints: int
    tyre_stints_actual: List[ActualTyreCompound]  # 8 stints
    tyre_stints_visual: List[VisualTyreCompound]  # 8 stints
    tyre_stints_end_laps: List[int]  # 8 stints


@dataclass
class PacketFinalClassificationData:
    """Final classification packet"""
    header: PacketHeader
    num_cars: int
    classification_data: List[FinalClassificationData]  # 22 cars


@dataclass
class CarDamageData:
    """Damage data for a single car"""
    tyres_wear: List[float]  # 4 wheels
    tyres_damage: List[int]  # 4 wheels
    brakes_damage: List[int]  # 4 wheels
    front_left_wing_damage: int
    front_right_wing_damage: int
    rear_wing_damage: int
    floor_damage: int
    diffuser_damage: int
    sidepod_damage: int
    drs_fault: bool
    ers_fault: bool
    gear_box_damage: int
    engine_damage: int
    engine_mguh_wear: int
    engine_es_wear: int
    engine_ce_wear: int
    engine_ice_wear: int
    engine_mguk_wear: int
    engine_tc_wear: int
    engine_blown: bool
    engine_seized: bool


@dataclass
class PacketCarDamageData:
    """Car damage packet"""
    header: PacketHeader
    car_damage_data: List[CarDamageData]  # 22 cars


@dataclass
class LapHistoryData:
    """Lap history data"""
    lap_time_in_ms: int
    sector1_time_in_ms: int
    sector1_time_minutes: int
    sector2_time_in_ms: int
    sector2_time_minutes: int
    sector3_time_in_ms: int
    sector3_time_minutes: int
    lap_valid_bit_flags: int


@dataclass
class TyreStintHistoryData:
    """Tyre stint history data"""
    end_lap: int
    tyre_actual_compound: ActualTyreCompound
    tyre_visual_compound: VisualTyreCompound


@dataclass
class PacketSessionHistoryData:
    """Session history packet - lap history"""
    header: PacketHeader
    car_idx: int
    num_laps: int
    num_tyre_stints: int
    best_lap_time_lap_num: int
    best_sector1_lap_num: int
    best_sector2_lap_num: int
    best_sector3_lap_num: int
    lap_history_data: List[LapHistoryData]  # 100 laps
    tyre_stints_history_data: List[TyreStintHistoryData]  # 8 stints


@dataclass
class TyreSetData:
    """Tyre set data"""
    actual_tyre_compound: ActualTyreCompound
    visual_tyre_compound: VisualTyreCompound
    wear: int
    available: bool
    recommended_session: int
    life_span: int
    usable_life: int
    lap_delta_time: int
    fitted: bool


@dataclass
class PacketTyreSetsData:
    """Tyre sets packet"""
    header: PacketHeader
    car_idx: int
    tyre_set_data: List[TyreSetData]  # 20 sets
    fitted_idx: int

@dataclass
class CarSetupData:
    """Car setup data for a single car"""
    front_wing: int
    rear_wing: int
    on_throttle: int
    off_throttle: int
    front_camber: float
    rear_camber: float
    front_toe: float
    rear_toe: float
    front_suspension: int
    rear_suspension: int
    front_anti_roll_bar: int
    rear_anti_roll_bar: int
    front_suspension_height: int
    rear_suspension_height: int
    brake_pressure: int
    brake_bias: int
    engine_braking: int
    rear_left_tyre_pressure: float
    rear_right_tyre_pressure: float
    front_left_tyre_pressure: float
    front_right_tyre_pressure: float
    ballast: int
    fuel_load: float

@dataclass
class PacketCarSetupData:
    """Car setup packet"""
    header: PacketHeader
    car_setups: List[CarSetupData]  # 22 cars
    next_front_wing_value: float

@dataclass
class LobbyInfoData:
    """Lobby info for a single player"""
    ai_controlled: bool
    team_id: int
    nationality: int
    platform: int
    name: str  # 48 chars
    car_number: int
    your_telemetry: bool
    show_online_names: bool
    f1world_tech_level: int
    ready_status: int

@dataclass
class PacketLobbyInfoData:
    """Lobby info packet"""
    header: PacketHeader
    num_players: int
    lobby_players: List[LobbyInfoData]  # 22 players

@dataclass
class TimeTrialDataSet:
    """Time trial data set"""
    car_idx: int
    team_id: int
    lap_time_in_ms: int
    sector1_time_in_ms: int
    sector2_time_in_ms: int
    sector3_time_in_ms: int
    traction_control: int
    gearbox_assist: int
    anti_lock_brakes: int
    equal_car_performance: int
    custom_setup: int
    valid: int

@dataclass
class PacketTimeTrialData:
    """Time trial packet"""
    header: PacketHeader
    player_session_best_data_set: TimeTrialDataSet
    personal_best_data_set: TimeTrialDataSet
    rival_data_set: TimeTrialDataSet
