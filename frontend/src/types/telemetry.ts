/**
 * TypeScript type definitions for F1 24 telemetry data
 */

export interface SessionData {
  session_uid: number;
  session_time: number;
  session_type: string;
  track_id: string;
  weather: string;
  track_temperature: number;
  air_temperature: number;
  total_laps: number;
  track_length: number;
  session_time_left: number;
  session_duration: number;
  pit_speed_limit: number;
  safety_car_status: number;
  is_spectating: boolean;
  num_marshal_zones: number;
  forecast_accuracy: number;
}

export interface ParticipantData {
  name: string;
  team_id: string;
  race_number: number;
  nationality: number;
  ai_controlled: boolean;
}

export interface CarData {
  // Position and lap data
  position?: number;
  current_lap?: number;
  current_lap_time_ms?: number;
  last_lap_time_ms?: number;
  sector1_time_ms?: number;
  sector2_time_ms?: number;
  lap_distance?: number;
  total_distance?: number;
  delta_to_leader_ms?: number;
  delta_to_car_ahead_ms?: number;
  pit_status?: string;
  num_pit_stops?: number;
  sector?: string;
  driver_status?: string;
  result_status?: string;
  penalties?: number;

  // Telemetry
  speed?: number;
  gear?: number;
  rpm?: number;
  throttle?: number;
  brake?: number;
  steer?: number;
  clutch?: number;
  drs?: string;
  rev_lights_percent?: number;
  brakes_temp?: number[];
  tyres_surface_temp?: number[];
  tyres_inner_temp?: number[];
  engine_temp?: number;
  tyres_pressure?: number[];

  // Status
  fuel_in_tank?: number;
  fuel_capacity?: number;
  fuel_remaining_laps?: number;
  fuel_mix?: number;
  front_brake_bias?: number;
  drs_allowed?: string;
  tyre_compound?: string;
  tyre_visual_compound?: string;
  tyre_age_laps?: number;
  ers_store_energy?: number;
  ers_deploy_mode?: string;
  ers_harvested_mguk?: number;
  ers_harvested_mguh?: number;
  ers_deployed?: number;
  max_rpm?: number;
  idle_rpm?: number;

  // Damage
  tyres_wear?: number[];
  tyres_damage?: number[];
  brakes_damage?: number[];
  front_left_wing_damage?: number;
  front_right_wing_damage?: number;
  rear_wing_damage?: number;
  floor_damage?: number;
  diffuser_damage?: number;
  engine_damage?: number;
  gearbox_damage?: number;

  // Position
  world_pos_x?: number;
  world_pos_y?: number;
  world_pos_z?: number;
  g_force_lat?: number;
  g_force_long?: number;
  g_force_vert?: number;
}

export interface TimingData {
  position: number;
  car_index: number;
  driver_name: string;
  team: string;
  current_lap: number;
  last_lap_time_ms: number;
  gap_to_leader: string;
  interval: string;
  pit_stops: number;
  penalties: number;
}

export interface CarPosition {
  car_index: number;
  position: number;
  x: number;
  y: number;
  z: number;
}

export interface LapHistoryEntry {
  lap: number;
  time_ms: number;
  sectors: [number, number, number];  // [S1, S2, S3]
  tire_compound: string;
  tire_age: number;
}

export interface BestSectors {
  s1: number | null;
  s2: number | null;
  s3: number | null;
}

export interface StartingGrid {
  start_position: number;
  current_position: number;
}

export interface RaceStrategy {
  tire_allocation: {
    soft: number;
    medium: number;
    hard: number;
    inter: number;
    wet: number;
  };
  planned_pit_stops: Array<{
    lap: number;
    tire_compound: string;
    note?: string;
  }>;
}

export interface TelemetryState {
  session: SessionData | null;
  participants: Record<number, ParticipantData>;
  cars: Record<number, CarData>;
  timing: TimingData[];
  car_positions: CarPosition[];
  lap_history: LapHistoryEntry[];
  best_sectors: BestSectors | null;
  current_lap_sectors: [number, number, number] | null;  // Real-time sector times for current lap
  starting_grid: StartingGrid | null;
  race_strategy: RaceStrategy;
  connected: boolean;
  last_update: string | null;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

export type TyreCompound = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'INTER' | 'WET' | 'SOFT' | 'MEDIUM' | 'HARD';

export type DRSStatus = 'NOT_ALLOWED' | 'ALLOWED' | 'UNKNOWN' | 'ACTIVE';

export type ERSDeployMode = 'NONE' | 'MEDIUM' | 'HOTLAP' | 'OVERTAKE';
