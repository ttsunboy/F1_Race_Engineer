"""Telemetry service - manages telemetry state and broadcasting"""
import asyncio
from typing import Dict, List, Set, Optional
from datetime import datetime
import json
from app.utils.enums import (
    SESSION_TYPES, TRACK_IDS, WEATHER, TEAMS, PIT_STATUS, SECTOR,
    DRIVER_STATUS, RESULT_STATUS, TYRE_COMPOUNDS, DRS_STATUS,
    DRS_ALLOWED, ERS_DEPLOY_MODE, FUEL_MIX, format_enum
)
from app.services.race_recap_service import RaceRecapService


def get_attr(obj, *names, default=None):
    """Get attribute from object, trying multiple names (for library compatibility)"""
    for name in names:
        val = getattr(obj, name, None)
        if val is not None:
            return val
    return default


class TelemetryService:
    """Manages telemetry data and broadcasts to connected clients"""

    def __init__(self):
        self.current_state = {
            "session": {},
            "cars": {},
            "timing": [],
            "participants": {},
            "player_car_index": None,
            "car_positions": [],
            "last_update": None,
            "lap_history": {},  # {car_index: [{lap: 1, time_ms: 90123, sectors: [30000, 30000, 30123]}, ...]}
            "best_sectors": {},  # {car_index: {s1: 30000, s2: 29500, s3: 30000}}
            "current_lap_sectors": {},  # {car_index: [s1_time, s2_time, s3_time]} - updates in real-time
            "starting_grid": {},  # {car_index: position}
            "race_strategy": {
                "tire_allocation": {"soft": 0, "medium": 0, "hard": 0, "inter": 0, "wet": 0},
                "planned_pit_stops": []
            }
        }
        self.websocket_clients: Set = set()
        self.recording_enabled = False
        self.recorded_packets = []
        self.session_start_time = None
        self.last_lap_numbers = {}  # Track last lap number for each car to detect lap completion
        self.sector_times_cache = {}  # Cache sector times before they reset: {car_index: {s1: X, s2: Y}}
        self.last_sectors = {}  # Track last sector to detect sector changes: {car_index: sector_num}
        self.race_recap_service = RaceRecapService()  # Race recap and history service
        self.last_positions = {}  # Track last position for each car to detect position changes

    def add_websocket_client(self, websocket):
        """Add a WebSocket client"""
        self.websocket_clients.add(websocket)

    def remove_websocket_client(self, websocket):
        """Remove a WebSocket client"""
        if websocket in self.websocket_clients:
            self.websocket_clients.remove(websocket)

    async def handle_packet(self, packet_type_id: int, packet):
        """Process received packet and update state"""
        try:
            # Packet type IDs: 0=Motion, 1=Session, 2=LapData, 4=Participants, 6=CarTelemetry, 7=CarStatus, 10=CarDamage
            if packet_type_id == 1:  # SESSION
                await self._handle_session_packet(packet)
            elif packet_type_id == 4:  # PARTICIPANTS
                await self._handle_participants_packet(packet)
            elif packet_type_id == 2:  # LAP_DATA
                await self._handle_lap_data_packet(packet)
            elif packet_type_id == 6:  # CAR_TELEMETRY
                await self._handle_telemetry_packet(packet)
            elif packet_type_id == 7:  # CAR_STATUS
                await self._handle_status_packet(packet)
            elif packet_type_id == 10:  # CAR_DAMAGE
                await self._handle_damage_packet(packet)
            elif packet_type_id == 0:  # MOTION
                await self._handle_motion_packet(packet)

            # Record packet if recording is enabled
            if self.recording_enabled:
                self.recorded_packets.append({
                    "timestamp": datetime.now().isoformat(),
                    "type": packet_type_id,
                    "data": self._serialize_packet(packet)
                })

        except Exception as e:
            print(f"Error handling packet: {e}")

    async def _handle_session_packet(self, packet):
        """Handle session data packet"""
        header = get_attr(packet, 'header', 'm_header')
        if not header:
            return

        session_type = format_enum(get_attr(packet, 'session_type', 'sessionType', 'm_sessionType'), SESSION_TYPES)

        self.current_state["session"] = {
            "session_uid": get_attr(header, 'session_uid', 'sessionUID', 'm_sessionUID', default=0),
            "session_time": get_attr(header, 'session_time', 'sessionTime', 'm_sessionTime', default=0),
            "session_type": session_type,
            "track_id": format_enum(get_attr(packet, 'track_id', 'trackId', 'm_trackId'), TRACK_IDS),
            "weather": format_enum(get_attr(packet, 'weather', 'm_weather'), WEATHER),
            "track_temperature": get_attr(packet, 'track_temperature', 'trackTemperature', 'm_trackTemperature', default=0),
            "air_temperature": get_attr(packet, 'air_temperature', 'airTemperature', 'm_airTemperature', default=0),
            "total_laps": get_attr(packet, 'total_laps', 'totalLaps', 'm_totalLaps', default=0),
            "track_length": get_attr(packet, 'track_length', 'trackLength', 'm_trackLength', default=0),
            "session_time_left": get_attr(packet, 'session_time_left', 'sessionTimeLeft', 'm_sessionTimeLeft', default=0),
            "session_duration": get_attr(packet, 'session_duration', 'sessionDuration', 'm_sessionDuration', default=0),
            "pit_speed_limit": get_attr(packet, 'pit_speed_limit', 'pitSpeedLimit', 'm_pitSpeedLimit', default=0),
            "safety_car_status": get_attr(packet, 'safety_car_status', 'safetyCarStatus', 'm_safetyCarStatus', default=0),
            "is_spectating": get_attr(packet, 'is_spectating', 'isSpectating', 'm_isSpectating', default=0),
            "num_marshal_zones": get_attr(packet, 'num_marshal_zones', 'numMarshalZones', 'm_numMarshalZones', default=0),
            "forecast_accuracy": get_attr(packet, 'forecast_accuracy', 'forecastAccuracy', 'm_forecastAccuracy', default=0)
        }

        # Start race tracking if this is a race session and not already started
        if "race" in session_type.lower() and not self.race_recap_service.race_started:
            self.race_recap_service.start_race_tracking(self.current_state["session"])
            print(f"🏁 Started tracking {session_type} at {self.current_state['session']['track_id']}")

        await self._broadcast_update("session", self.current_state["session"])

    async def _handle_participants_packet(self, packet):
        """Handle participants data packet"""
        num_active = get_attr(packet, 'num_active_cars', 'numActiveCars', 'm_numActiveCars', default=22)
        parts_list = get_attr(packet, 'participants', 'participants_data', 'm_participants', default=[])

        participants = {}
        player_index = None

        for idx in range(min(num_active, len(parts_list))):
            p = parts_list[idx]
            # Decode name from bytes if needed
            raw_name = get_attr(p, 'name', 'm_name', default='')
            name = raw_name if isinstance(raw_name, str) else raw_name.decode('utf-8', errors='ignore').rstrip('\x00')
            ai_controlled = get_attr(p, 'ai_controlled', 'aiControlled', 'm_aiControlled', default=1)

            participants[idx] = {
                "name": name,
                "team_id": format_enum(get_attr(p, 'team_id', 'teamId', 'm_teamId'), TEAMS),
                "race_number": get_attr(p, 'race_number', 'raceNumber', 'm_raceNumber', default=0),
                "nationality": get_attr(p, 'nationality', 'm_nationality', default=0),
                "ai_controlled": ai_controlled
            }

            # Find player car (ai_controlled == 0)
            if ai_controlled == 0:
                player_index = idx

        self.current_state["participants"] = participants

        # Update player car index if found
        if player_index is not None:
            self.current_state["player_car_index"] = player_index
            await self._broadcast_update("player_car_index", player_index)

        await self._broadcast_update("participants", participants)

    async def _handle_lap_data_packet(self, packet):
        """Handle lap data packet"""
        lap_data_list = get_attr(packet, 'lap_data', 'lapData', 'm_lapData', default=[])
        timing_data = []

        for idx, lap in enumerate(lap_data_list):
            if idx in self.current_state["participants"]:
                car_data = self.current_state["cars"].get(idx, {})

                car_position = get_attr(lap, 'car_position', 'carPosition', 'm_carPosition', default=0)
                current_lap_num = get_attr(lap, 'current_lap_num', 'currentLapNum', 'm_currentLapNum', default=0)
                current_lap_time_ms = get_attr(lap, 'current_lap_time_in_ms', 'currentLapTimeInMS', 'm_currentLapTimeInMS', default=0)
                last_lap_time_ms = get_attr(lap, 'last_lap_time_in_ms', 'lastLapTimeInMS', 'm_lastLapTimeInMS', default=0)
                sector1_time_ms = get_attr(lap, 'sector1_time_in_ms', 'sector1TimeInMS', 'm_sector1TimeInMS', default=0)
                sector2_time_ms = get_attr(lap, 'sector2_time_in_ms', 'sector2TimeInMS', 'm_sector2TimeInMS', default=0)
                lap_distance = get_attr(lap, 'lap_distance', 'lapDistance', 'm_lapDistance', default=0)
                total_distance = get_attr(lap, 'total_distance', 'totalDistance', 'm_totalDistance', default=0)
                delta_to_leader_ms = get_attr(lap, 'delta_to_race_leader_in_ms', 'deltaToRaceLeaderInMS', 'm_deltaToRaceLeaderInMS', default=0)
                delta_to_car_ahead_ms = get_attr(lap, 'delta_to_car_in_front_in_ms', 'deltaToCarInFrontInMS', 'm_deltaToCarInFrontInMS', default=0)
                pit_status = get_attr(lap, 'pit_status', 'pitStatus', 'm_pitStatus')
                num_pit_stops = get_attr(lap, 'num_pit_stops', 'numPitStops', 'm_numPitStops', default=0)
                sector = get_attr(lap, 'sector', 'm_sector')
                driver_status = get_attr(lap, 'driver_status', 'driverStatus', 'm_driverStatus')
                result_status = get_attr(lap, 'result_status', 'resultStatus', 'm_resultStatus')
                penalties = get_attr(lap, 'penalties', 'm_penalties', default=0)

                car_data.update({
                    "position": car_position,
                    "current_lap": current_lap_num,
                    "current_lap_time_ms": current_lap_time_ms,
                    "last_lap_time_ms": last_lap_time_ms,
                    "sector1_time_ms": sector1_time_ms,
                    "sector2_time_ms": sector2_time_ms,
                    "lap_distance": lap_distance,
                    "total_distance": total_distance,
                    "delta_to_leader_ms": delta_to_leader_ms,
                    "delta_to_car_ahead_ms": delta_to_car_ahead_ms,
                    "pit_status": format_enum(pit_status, PIT_STATUS),
                    "num_pit_stops": num_pit_stops,
                    "sector": format_enum(sector, SECTOR),
                    "driver_status": format_enum(driver_status, DRIVER_STATUS),
                    "result_status": format_enum(result_status, RESULT_STATUS),
                    "penalties": penalties
                })
                self.current_state["cars"][idx] = car_data

                # Initialize sector cache if needed
                if idx not in self.sector_times_cache:
                    self.sector_times_cache[idx] = {"s1": 0, "s2": 0}
                if idx not in self.last_sectors:
                    self.last_sectors[idx] = None

                # Detect sector changes and capture lap time at that moment
                # sector values: 0 = Sector 1, 1 = Sector 2, 2 = Sector 3
                current_sector = sector
                previous_sector = self.last_sectors[idx]

                # Initialize current lap sectors if needed
                if idx not in self.current_state["current_lap_sectors"]:
                    self.current_state["current_lap_sectors"][idx] = [0, 0, 0]

                if previous_sector is not None and current_sector != previous_sector:
                    # Sector changed!
                    if previous_sector == 0 and current_sector == 1:
                        # Just completed Sector 1, entering Sector 2
                        s1_time = current_lap_time_ms
                        self.sector_times_cache[idx]["s1"] = s1_time
                        self.current_state["current_lap_sectors"][idx][0] = s1_time

                        if idx == self.current_state.get("player_car_index"):
                            print(f"Sector 1 completed! Time: {s1_time}ms")
                            # Update best sector if this is better
                            if idx not in self.current_state["best_sectors"]:
                                self.current_state["best_sectors"][idx] = {"s1": None, "s2": None, "s3": None}
                            if self.current_state["best_sectors"][idx]["s1"] is None or s1_time < self.current_state["best_sectors"][idx]["s1"]:
                                self.current_state["best_sectors"][idx]["s1"] = s1_time
                            # Broadcast real-time update
                            await self._broadcast_update("current_lap_sectors", self.current_state["current_lap_sectors"][idx])
                            await self._broadcast_update("best_sectors", self.current_state["best_sectors"][idx])

                    elif previous_sector == 1 and current_sector == 2:
                        # Just completed Sector 2, entering Sector 3
                        cumulative_s2 = current_lap_time_ms
                        s1_time = self.sector_times_cache[idx]["s1"]
                        s2_time = cumulative_s2 - s1_time if s1_time > 0 else 0
                        self.sector_times_cache[idx]["s2"] = cumulative_s2
                        self.current_state["current_lap_sectors"][idx][1] = s2_time

                        if idx == self.current_state.get("player_car_index"):
                            print(f"Sector 2 completed! Individual time: {s2_time}ms, Cumulative: {cumulative_s2}ms")
                            # Update best sector if this is better
                            if idx not in self.current_state["best_sectors"]:
                                self.current_state["best_sectors"][idx] = {"s1": None, "s2": None, "s3": None}
                            if self.current_state["best_sectors"][idx]["s2"] is None or s2_time < self.current_state["best_sectors"][idx]["s2"]:
                                self.current_state["best_sectors"][idx]["s2"] = s2_time
                            # Broadcast real-time update
                            await self._broadcast_update("current_lap_sectors", self.current_state["current_lap_sectors"][idx])
                            await self._broadcast_update("best_sectors", self.current_state["best_sectors"][idx])

                # Update last sector
                self.last_sectors[idx] = current_sector

                # Track lap completion and update history
                if current_lap_num > 0:
                    last_lap = self.last_lap_numbers.get(idx, 0)

                    # Lap completed
                    if current_lap_num > last_lap and last_lap_time_ms > 0:
                        if idx not in self.current_state["lap_history"]:
                            self.current_state["lap_history"][idx] = []

                        # Get cached sector times (current values are reset to 0 when new lap starts)
                        cached_s1 = self.sector_times_cache.get(idx, {}).get("s1", 0)
                        cached_s2 = self.sector_times_cache.get(idx, {}).get("s2", 0)

                        # Calculate individual sector times
                        # F1 telemetry provides cumulative times:
                        # - sector1_time_ms = time to complete S1
                        # - sector2_time_ms = time to complete S1 + S2
                        # So individual times are:
                        # - S1 = sector1_time_ms
                        # - S2 = sector2_time_ms - sector1_time_ms
                        # - S3 = last_lap_time_ms - sector2_time_ms
                        s1_time = cached_s1 if cached_s1 > 0 else 0
                        s2_time = (cached_s2 - cached_s1) if (cached_s2 > 0 and cached_s1 > 0) else 0
                        s3_time = (last_lap_time_ms - cached_s2) if (cached_s2 > 0 and last_lap_time_ms > 0) else 0

                        # Update S3 in current lap sectors
                        self.current_state["current_lap_sectors"][idx][2] = s3_time

                        # Update best sector 3 if this is better
                        if idx not in self.current_state["best_sectors"]:
                            self.current_state["best_sectors"][idx] = {"s1": None, "s2": None, "s3": None}
                        if s3_time > 0:
                            if self.current_state["best_sectors"][idx]["s3"] is None or s3_time < self.current_state["best_sectors"][idx]["s3"]:
                                self.current_state["best_sectors"][idx]["s3"] = s3_time

                        # Debug logging
                        if idx == self.current_state.get("player_car_index"):
                            print(f"Lap {last_lap} completed!")
                            print(f"  Last lap time: {last_lap_time_ms}ms")
                            print(f"  Cached Sector1 cumulative: {cached_s1}ms")
                            print(f"  Cached Sector2 cumulative: {cached_s2}ms")
                            print(f"  Calculated S1: {s1_time}ms, S2: {s2_time}ms, S3: {s3_time}ms")
                            # Broadcast final sector update
                            await self._broadcast_update("current_lap_sectors", self.current_state["current_lap_sectors"][idx])
                            await self._broadcast_update("best_sectors", self.current_state["best_sectors"][idx])

                        # Reset cache and sector tracking for new lap
                        self.sector_times_cache[idx] = {"s1": 0, "s2": 0}
                        self.last_sectors[idx] = None
                        self.current_state["current_lap_sectors"][idx] = [0, 0, 0]

                        # Add lap to history
                        self.current_state["lap_history"][idx].append({
                            "lap": last_lap,
                            "time_ms": last_lap_time_ms,
                            "sectors": [s1_time, s2_time, s3_time],
                            "tire_compound": car_data.get("tyre_visual_compound", "Unknown"),
                            "tire_age": car_data.get("tyre_age_laps", 0)
                        })

                        # Update best sectors
                        if idx not in self.current_state["best_sectors"]:
                            self.current_state["best_sectors"][idx] = {"s1": None, "s2": None, "s3": None}

                        if s1_time > 0:
                            if self.current_state["best_sectors"][idx]["s1"] is None or s1_time < self.current_state["best_sectors"][idx]["s1"]:
                                self.current_state["best_sectors"][idx]["s1"] = s1_time
                        if s2_time > 0:
                            if self.current_state["best_sectors"][idx]["s2"] is None or s2_time < self.current_state["best_sectors"][idx]["s2"]:
                                self.current_state["best_sectors"][idx]["s2"] = s2_time
                        if s3_time > 0:
                            if self.current_state["best_sectors"][idx]["s3"] is None or s3_time < self.current_state["best_sectors"][idx]["s3"]:
                                self.current_state["best_sectors"][idx]["s3"] = s3_time

                    self.last_lap_numbers[idx] = current_lap_num

                # Track starting grid position (first lap, first sector)
                if current_lap_num == 1 and idx not in self.current_state["starting_grid"]:
                    self.current_state["starting_grid"][idx] = car_position
                    # Store starting grid for race recap
                    if self.race_recap_service.race_started:
                        self.race_recap_service.current_race_data["starting_grid"][idx] = car_position

                # Track position changes for race recap
                if self.race_recap_service.race_started and idx in self.current_state["participants"]:
                    last_pos = self.last_positions.get(idx)
                    if last_pos is not None and last_pos != car_position:
                        driver_name = self.current_state["participants"][idx]["name"]
                        self.race_recap_service.track_position_change(
                            current_lap_num, idx, last_pos, car_position, driver_name
                        )
                    self.last_positions[idx] = car_position

                    # Track lap leader (P1)
                    if car_position == 1:
                        driver_name = self.current_state["participants"][idx]["name"]
                        self.race_recap_service.track_lap_leader(current_lap_num, idx, driver_name)

                    # Track fastest laps
                    if last_lap_time_ms > 0:
                        driver_name = self.current_state["participants"][idx]["name"]
                        self.race_recap_service.track_fastest_lap(idx, driver_name, last_lap_time_ms, last_lap)

                # Detect race end - check if player finished
                if idx == self.current_state.get("player_car_index"):
                    result_status_val = get_attr(lap, 'result_status', 'resultStatus', 'm_resultStatus')
                    # Result status 3 = Finished, check if race is over
                    if result_status_val == 3 and self.race_recap_service.race_started and not self.race_recap_service.race_ended:
                        print("🏁 Race finished! Generating recap...")
                        await self._generate_and_save_race_recap()

                # Add to timing tower
                if idx in self.current_state["participants"]:
                    timing_data.append({
                        "position": car_position,
                        "car_index": idx,
                        "driver_name": self.current_state["participants"][idx]["name"],
                        "team": self.current_state["participants"][idx]["team_id"],
                        "current_lap": current_lap_num,
                        "last_lap_time_ms": last_lap_time_ms,
                        "gap_to_leader": self._format_time_delta(delta_to_leader_ms),
                        "interval": self._format_time_delta(delta_to_car_ahead_ms),
                        "pit_stops": num_pit_stops,
                        "penalties": penalties
                    })

        # Sort by position
        timing_data.sort(key=lambda x: x["position"])
        self.current_state["timing"] = timing_data
        await self._broadcast_update("timing", timing_data)

        # Broadcast player lap history and best sectors if updated
        if self.current_state.get("player_car_index") is not None:
            player_idx = self.current_state["player_car_index"]
            if player_idx in self.current_state["lap_history"]:
                await self._broadcast_update("lap_history", self.current_state["lap_history"][player_idx])
            if player_idx in self.current_state["best_sectors"]:
                await self._broadcast_update("best_sectors", self.current_state["best_sectors"][player_idx])
            if player_idx in self.current_state["starting_grid"]:
                await self._broadcast_update("starting_grid", {
                    "start_position": self.current_state["starting_grid"][player_idx],
                    "current_position": self.current_state["cars"].get(player_idx, {}).get("position", 0)
                })
            # Broadcast player car data (includes sector info)
            if player_idx in self.current_state["cars"]:
                await self._broadcast_update("player_telemetry", self.current_state["cars"][player_idx])

    async def _handle_telemetry_packet(self, packet):
        """Handle car telemetry packet"""
        telemetry_data_list = get_attr(packet, 'car_telemetry_data', 'carTelemetryData', 'm_carTelemetryData', default=[])

        for idx, telemetry in enumerate(telemetry_data_list):
            if idx in self.current_state["participants"]:
                car_data = self.current_state["cars"].get(idx, {})

                speed = get_attr(telemetry, 'speed', 'm_speed', default=0)
                gear = get_attr(telemetry, 'gear', 'm_gear', default=0)
                rpm = get_attr(telemetry, 'engine_rpm', 'engineRPM', 'm_engineRPM', default=0)
                throttle = get_attr(telemetry, 'throttle', 'm_throttle', default=0)
                brake = get_attr(telemetry, 'brake', 'm_brake', default=0)
                steer = get_attr(telemetry, 'steer', 'm_steer', default=0)
                clutch = get_attr(telemetry, 'clutch', 'm_clutch', default=0)
                drs = get_attr(telemetry, 'drs', 'm_drs')
                rev_lights_percent = get_attr(telemetry, 'rev_lights_percent', 'revLightsPercent', 'm_revLightsPercent', default=0)
                brakes_temp = get_attr(telemetry, 'brakes_temperature', 'brakesTemperature', 'm_brakesTemperature', default=[])
                tyres_surface_temp = get_attr(telemetry, 'tyres_surface_temperature', 'tyresSurfaceTemperature', 'm_tyresSurfaceTemperature', default=[])
                tyres_inner_temp = get_attr(telemetry, 'tyres_inner_temperature', 'tyresInnerTemperature', 'm_tyresInnerTemperature', default=[])
                engine_temp = get_attr(telemetry, 'engine_temperature', 'engineTemperature', 'm_engineTemperature', default=0)
                tyres_pressure = get_attr(telemetry, 'tyres_pressure', 'tyresPressure', 'm_tyresPressure', default=[])

                car_data.update({
                    "speed": speed,
                    "gear": gear,
                    "rpm": rpm,
                    "throttle": round(throttle, 3),
                    "brake": round(brake, 3),
                    "steer": round(steer, 3),
                    "clutch": clutch,
                    "drs": format_enum(drs, DRS_STATUS),
                    "rev_lights_percent": rev_lights_percent,
                    "brakes_temp": list(brakes_temp),
                    "tyres_surface_temp": list(tyres_surface_temp),
                    "tyres_inner_temp": list(tyres_inner_temp),
                    "engine_temp": engine_temp,
                    "tyres_pressure": [round(p, 2) for p in tyres_pressure]
                })
                self.current_state["cars"][idx] = car_data

        # Broadcast player car telemetry
        header = get_attr(packet, 'header', 'm_header')
        if header:
            player_idx = get_attr(header, 'player_car_index', 'playerCarIndex', 'm_playerCarIndex', default=0)
            if player_idx in self.current_state["cars"]:
                await self._broadcast_update("player_telemetry",
                                            self.current_state["cars"][player_idx])

    async def _handle_status_packet(self, packet):
        """Handle car status packet"""
        status_data_list = get_attr(packet, 'car_status_data', 'carStatusData', 'm_carStatusData', default=[])

        for idx, status in enumerate(status_data_list):
            if idx in self.current_state["participants"]:
                car_data = self.current_state["cars"].get(idx, {})

                fuel_in_tank = get_attr(status, 'fuel_in_tank', 'fuelInTank', 'm_fuelInTank', default=0)
                fuel_capacity = get_attr(status, 'fuel_capacity', 'fuelCapacity', 'm_fuelCapacity', default=0)
                fuel_remaining_laps = get_attr(status, 'fuel_remaining_laps', 'fuelRemainingLaps', 'm_fuelRemainingLaps', default=0)
                fuel_mix = get_attr(status, 'fuel_mix', 'fuelMix', 'm_fuelMix', default=0)
                front_brake_bias = get_attr(status, 'front_brake_bias', 'frontBrakeBias', 'm_frontBrakeBias', default=0)
                drs_allowed = get_attr(status, 'drs_allowed', 'drsAllowed', 'm_drsAllowed')
                tyre_compound = get_attr(status, 'actual_tyre_compound', 'actualTyreCompound', 'm_actualTyreCompound')
                tyre_visual_compound = get_attr(status, 'visual_tyre_compound', 'visualTyreCompound', 'm_visualTyreCompound')
                tyre_age_laps = get_attr(status, 'tyres_age_laps', 'tyresAgeLaps', 'm_tyresAgeLaps', default=0)
                ers_store_energy = get_attr(status, 'ers_store_energy', 'ersStoreEnergy', 'm_ersStoreEnergy', default=0)
                ers_deploy_mode = get_attr(status, 'ers_deploy_mode', 'ersDeployMode', 'm_ersDeployMode')
                ers_harvested_mguk = get_attr(status, 'ers_harvested_this_lap_mguk', 'ersHarvestedThisLapMGUK', 'm_ersHarvestedThisLapMGUK', default=0)
                ers_harvested_mguh = get_attr(status, 'ers_harvested_this_lap_mguh', 'ersHarvestedThisLapMGUH', 'm_ersHarvestedThisLapMGUH', default=0)
                ers_deployed = get_attr(status, 'ers_deployed_this_lap', 'ersDeployedThisLap', 'm_ersDeployedThisLap', default=0)
                max_rpm = get_attr(status, 'max_rpm', 'maxRPM', 'm_maxRPM', default=0)
                idle_rpm = get_attr(status, 'idle_rpm', 'idleRPM', 'm_idleRPM', default=0)

                car_data.update({
                    "fuel_in_tank": round(fuel_in_tank, 2),
                    "fuel_capacity": round(fuel_capacity, 2),
                    "fuel_remaining_laps": round(fuel_remaining_laps, 2),
                    "fuel_mix": fuel_mix,
                    "front_brake_bias": front_brake_bias,
                    "drs_allowed": format_enum(drs_allowed, DRS_ALLOWED),
                    "tyre_compound": format_enum(tyre_compound, TYRE_COMPOUNDS),
                    "tyre_visual_compound": format_enum(tyre_visual_compound, TYRE_COMPOUNDS),
                    "tyre_age_laps": tyre_age_laps,
                    # ERS values are in Joules, convert to Megajoules
                    "ers_store_energy": round(ers_store_energy / 1_000_000, 2),
                    "ers_deploy_mode": format_enum(ers_deploy_mode, ERS_DEPLOY_MODE),
                    "ers_harvested_mguk": round(ers_harvested_mguk / 1_000_000, 2),
                    "ers_harvested_mguh": round(ers_harvested_mguh / 1_000_000, 2),
                    "ers_deployed": round(ers_deployed / 1_000_000, 2),
                    "max_rpm": max_rpm,
                    "idle_rpm": idle_rpm
                })
                self.current_state["cars"][idx] = car_data

        # Broadcast all cars data after status update (includes tire compounds)
        await self._broadcast_update("cars", self.current_state["cars"])

    async def _handle_damage_packet(self, packet):
        """Handle car damage packet"""
        damage_data_list = get_attr(packet, 'car_damage_data', 'carDamageData', 'm_carDamageData', default=[])

        for idx, damage in enumerate(damage_data_list):
            if idx in self.current_state["participants"]:
                car_data = self.current_state["cars"].get(idx, {})

                tyres_wear = get_attr(damage, 'tyres_wear', 'tyresWear', 'm_tyresWear', default=[])
                tyres_damage = get_attr(damage, 'tyres_damage', 'tyresDamage', 'm_tyresDamage', default=[])
                brakes_damage = get_attr(damage, 'brakes_damage', 'brakesDamage', 'm_brakesDamage', default=[])
                front_left_wing_damage = get_attr(damage, 'front_left_wing_damage', 'frontLeftWingDamage', 'm_frontLeftWingDamage', default=0)
                front_right_wing_damage = get_attr(damage, 'front_right_wing_damage', 'frontRightWingDamage', 'm_frontRightWingDamage', default=0)
                rear_wing_damage = get_attr(damage, 'rear_wing_damage', 'rearWingDamage', 'm_rearWingDamage', default=0)
                floor_damage = get_attr(damage, 'floor_damage', 'floorDamage', 'm_floorDamage', default=0)
                diffuser_damage = get_attr(damage, 'diffuser_damage', 'diffuserDamage', 'm_diffuserDamage', default=0)
                engine_damage = get_attr(damage, 'engine_damage', 'engineDamage', 'm_engineDamage', default=0)
                gearbox_damage = get_attr(damage, 'gear_box_damage', 'gearBoxDamage', 'm_gearBoxDamage', default=0)

                car_data.update({
                    "tyres_wear": [round(w, 1) for w in tyres_wear],
                    "tyres_damage": list(tyres_damage),
                    "brakes_damage": list(brakes_damage),
                    "front_left_wing_damage": front_left_wing_damage,
                    "front_right_wing_damage": front_right_wing_damage,
                    "rear_wing_damage": rear_wing_damage,
                    "floor_damage": floor_damage,
                    "diffuser_damage": diffuser_damage,
                    "engine_damage": engine_damage,
                    "gearbox_damage": gearbox_damage
                })
                self.current_state["cars"][idx] = car_data

    async def _handle_motion_packet(self, packet):
        """Handle motion packet"""
        motion_data_list = get_attr(packet, 'car_motion_data', 'carMotionData', 'm_carMotionData', default=[])
        positions = []

        for idx, motion in enumerate(motion_data_list):
            if idx in self.current_state["participants"]:
                car_data = self.current_state["cars"].get(idx, {})

                world_pos_x = get_attr(motion, 'world_position_x', 'worldPositionX', 'm_worldPositionX', default=0)
                world_pos_y = get_attr(motion, 'world_position_y', 'worldPositionY', 'm_worldPositionY', default=0)
                world_pos_z = get_attr(motion, 'world_position_z', 'worldPositionZ', 'm_worldPositionZ', default=0)
                g_force_lat = get_attr(motion, 'g_force_lateral', 'gForceLateral', 'm_gForceLateral', default=0)
                g_force_long = get_attr(motion, 'g_force_longitudinal', 'gForceLongitudinal', 'm_gForceLongitudinal', default=0)
                g_force_vert = get_attr(motion, 'g_force_vertical', 'gForceVertical', 'm_gForceVertical', default=0)

                car_data.update({
                    "world_pos_x": round(world_pos_x, 2),
                    "world_pos_y": round(world_pos_y, 2),
                    "world_pos_z": round(world_pos_z, 2),
                    "g_force_lat": round(g_force_lat, 2),
                    "g_force_long": round(g_force_long, 2),
                    "g_force_vert": round(g_force_vert, 2)
                })
                self.current_state["cars"][idx] = car_data

                # Collect position for track map
                positions.append({
                    "car_index": idx,
                    "position": car_data.get("position", 0),
                    "x": car_data["world_pos_x"],
                    "y": car_data["world_pos_y"],
                    "z": car_data["world_pos_z"]
                })

        # Store and broadcast car positions for track map
        self.current_state["car_positions"] = positions
        await self._broadcast_update("car_positions", positions)

    async def _broadcast_update(self, update_type: str, data):
        """Broadcast update to all connected WebSocket clients"""
        if not self.websocket_clients:
            return

        message = json.dumps({
            "type": update_type,
            "data": data,
            "timestamp": datetime.now().isoformat()
        })

        # Send to all clients
        disconnected = set()
        for client in self.websocket_clients:
            try:
                await client.send_text(message)
            except Exception as e:
                print(f"Error sending to client: {e}")
                disconnected.add(client)

        # Remove disconnected clients
        self.websocket_clients -= disconnected

    def _format_time_delta(self, delta_ms: int) -> str:
        """Format time delta in milliseconds to string"""
        if delta_ms == 0:
            return "Leader"
        elif delta_ms < 0:
            return f"-{abs(delta_ms) / 1000:.3f}s"
        else:
            return f"+{delta_ms / 1000:.3f}s"

    def _serialize_packet(self, packet) -> dict:
        """Serialize packet to dict for recording"""
        # This is a simplified serialization
        # In production, you'd want a more comprehensive approach
        return {"serialized": True}

    def get_current_state(self) -> dict:
        """Get current telemetry state"""
        return self.current_state

    def start_recording(self):
        """Start recording session"""
        self.recording_enabled = True
        self.recorded_packets = []
        self.session_start_time = datetime.now()

    def stop_recording(self) -> dict:
        """Stop recording and return session data"""
        self.recording_enabled = False
        return {
            "started_at": self.session_start_time.isoformat(),
            "ended_at": datetime.now().isoformat(),
            "packets": self.recorded_packets
        }

    def is_recording(self) -> bool:
        """Check if currently recording"""
        return self.recording_enabled

    async def _generate_and_save_race_recap(self):
        """Generate and save race recap at end of race"""
        try:
            # Mark race as ended
            self.race_recap_service.race_ended = True

            # Collect final results from timing data
            final_results = []
            for timing_entry in self.current_state["timing"]:
                car_idx = timing_entry["car_index"]
                final_results.append({
                    "position": timing_entry["position"],
                    "car_index": car_idx,
                    "driver_name": timing_entry["driver_name"],
                    "team": timing_entry["team"],
                    "total_laps": timing_entry["current_lap"],
                    "penalties": timing_entry["penalties"],
                })

            # Generate recap
            recap = self.race_recap_service.generate_recap(
                self.current_state["session"],
                final_results,
                self.current_state["participants"],
                self.current_state["lap_history"]
            )

            # Save to file
            filepath = self.race_recap_service.save_recap(recap)
            print(f"✅ Race recap saved to: {filepath}")

            # Broadcast race recap to clients
            await self._broadcast_update("race_finished", {
                "recap_id": recap["id"],
                "recap_preview": {
                    "track": recap["session_info"]["track"],
                    "winner": recap["results"][0]["driver_name"] if recap["results"] else "Unknown",
                    "is_sprint": recap["is_sprint"],
                }
            })

        except Exception as e:
            print(f"Error generating race recap: {e}")
            import traceback
            traceback.print_exc()

    def get_all_races(self):
        """Get all saved race recaps"""
        return self.race_recap_service.get_all_races()

    def get_race_recap(self, race_id: str):
        """Get a specific race recap"""
        return self.race_recap_service.get_race_recap(race_id)

    def reset_race_session(self):
        """Reset race tracking for a new session"""
        self.race_recap_service.reset_session()
        self.last_positions = {}
        print("🔄 Race session reset - ready for new race")
