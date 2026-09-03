"""F1 24 UDP packet parser - aligned with official 2024 spec (MacManley/f1-24-udp)

Every struct format string verified via struct.calcsize against the official
"Size: N bytes" annotations. Do NOT mix with F1 2021/2023 specs - field
layouts differ (e.g. LapData is 57 bytes/car in F1 24, not 37).
"""
import struct
from typing import Union
from .packets import *
from .packet_types import PacketType

# --- struct format strings (verified against official F1 24 spec) ---
CAR_MOTION_FMT = '<ffffffhhhhhhffffff'            # 60 bytes
MARSHAL_ZONE_FMT = '<fB'                          # 5 bytes
WEATHER_FORECAST_FMT = '<BBBbbbbB'                # 8 bytes
SESSION_HEAD_FMT = '<BbbBHBbBHHBBBBBB'            # 19 bytes (weather..numMarshalZones)
LAP_DATA_FMT = '<IIHBHBHBHBfffBBBBBBBBBBBBBBBHHBfB'  # 57 bytes
PARTICIPANT_FMT = '<BBBBBBB48sBBHB'               # 60 bytes
CAR_SETUP_FMT = '<BBBBffffBBBBBBBBBffffBf'        # 50 bytes
CAR_TELEMETRY_FMT = '<HfffBbHBBHHHHHBBBBBBBBHffffBBBB'  # 60 bytes
CAR_STATUS_FMT = '<BBBBBfffHHBBHBBBbfffBfffB'     # 55 bytes
FINAL_CLASSIFICATION_FMT = '<BBBBBBId' + 'B' * 27  # 45 bytes
LOBBY_INFO_FMT = '<BBBB48sBBBHB'                  # 58 bytes
CAR_DAMAGE_FMT = '<ffff' + 'B' * 26               # 42 bytes
LAP_HISTORY_FMT = '<IHBHBHBB'                     # 14 bytes
TYRE_STINT_FMT = '<BBB'                           # 3 bytes
TYRE_SET_FMT = '<BBBBBBBhB'                       # 10 bytes
TIME_TRIAL_FMT = '<BBIIIIBBBBBB'                  # 24 bytes

# --- defensive enum conversion: unknown values fall back to raw int ---
def _enum(cls, value):
    """Convert value to IntEnum cls, falling back to raw int for unknown values."""
    try:
        return cls(value)
    except (ValueError, TypeError):
        return value


class F1TelemetryParser:
    """Parser for F1 24 UDP telemetry packets"""

    # ---------- low-level helpers ----------

    @staticmethod
    def _read(data: bytes, offset: int, fmt: str):
        """Unpack fmt at offset, return (values, new_offset)."""
        size = struct.calcsize(fmt)
        values = struct.unpack_from(fmt, data, offset)
        return values, offset + size

    # ---------- header ----------

    @staticmethod
    def parse_header(data: bytes) -> PacketHeader:
        """Parse packet header (29 bytes)"""
        return PacketHeader.from_bytes(data[:29])

    # ---------- packet type 0: motion ----------

    @staticmethod
    def parse_motion_data(data: bytes, header: PacketHeader) -> PacketMotionData:
        """Parse motion data packet"""
        offset = 29
        car_motion_data = []

        for _ in range(22):
            values = struct.unpack_from(CAR_MOTION_FMT, data, offset)
            offset += 60
            car_motion_data.append(CarMotionData(
                world_position_x=values[0],
                world_position_y=values[1],
                world_position_z=values[2],
                world_velocity_x=values[3],
                world_velocity_y=values[4],
                world_velocity_z=values[5],
                world_forward_dir_x=values[6],
                world_forward_dir_y=values[7],
                world_forward_dir_z=values[8],
                world_right_dir_x=values[9],
                world_right_dir_y=values[10],
                world_right_dir_z=values[11],
                g_force_lateral=values[12],
                g_force_longitudinal=values[13],
                g_force_vertical=values[14],
                yaw=values[15],
                pitch=values[16],
                roll=values[17]
            ))

        return PacketMotionData(header=header, car_motion_data=car_motion_data)

    # ---------- packet type 1: session ----------

    @staticmethod
    def parse_session_data(data: bytes, header: PacketHeader) -> PacketSessionData:
        """Parse session data packet"""
        offset = 29

        v, offset = F1TelemetryParser._read(data, offset, SESSION_HEAD_FMT)
        weather = _enum(Weather, v[0])
        track_temperature = v[1]
        air_temperature = v[2]
        total_laps = v[3]
        track_length = v[4]
        session_type = _enum(SessionType, v[5])
        track_id = _enum(TrackID, v[6])
        formula = v[7]
        session_time_left = v[8]
        session_duration = v[9]
        pit_speed_limit = v[10]
        game_paused = bool(v[11])
        is_spectating = bool(v[12])
        spectator_car_index = v[13]
        sli_pro_native_support = bool(v[14])
        num_marshal_zones = v[15]

        # Marshal zones (max 21)
        marshal_zones = []
        for _ in range(21):
            if offset + 5 > len(data):
                break
            zone_values, offset = F1TelemetryParser._read(data, offset, MARSHAL_ZONE_FMT)
            if len(marshal_zones) < num_marshal_zones:
                marshal_zones.append(MarshalZone(
                    zone_start=zone_values[0],
                    zone_flag=_enum(FlagType, zone_values[1])
                ))

        # Safety car status, network game, forecast count, accuracy, AI difficulty
        v, offset = F1TelemetryParser._read(data, offset, '<BBBBB')
        safety_car_status = v[0]
        network_game = bool(v[1])
        num_weather_forecast_samples = v[2]
        forecast_accuracy = v[3]
        ai_difficulty = v[4]

        # Weather forecast samples (fixed 56 slots, only first N valid)
        weather_forecast_samples = []
        for _ in range(56):
            if offset + 8 > len(data):
                break
            fv, offset = F1TelemetryParser._read(data, offset, WEATHER_FORECAST_FMT)
            if len(weather_forecast_samples) < num_weather_forecast_samples:
                weather_forecast_samples.append(WeatherForecastSample(
                    session_type=_enum(SessionType, fv[0]),
                    time_offset=fv[1],
                    weather=_enum(Weather, fv[2]),
                    track_temperature=fv[3],
                    track_temperature_change=fv[4],
                    air_temperature=fv[5],
                    air_temperature_change=fv[6],
                    rain_percentage=fv[7]
                ))

        # Additional session info (33 bytes fixed region: 3xI + 25x B)
        tail = list(struct.unpack_from('<III', data, offset))
        offset += 12
        assist_bytes = list(struct.unpack_from('<' + 'B' * 21, data, offset))
        offset += 21

        # remaining session tail fields (F1 24 spec additions)
        season_link_identifier = tail[0]
        weekend_link_identifier = tail[1]
        session_link_identifier = tail[2]
        pit_stop_window_ideal_lap = assist_bytes[0]
        pit_stop_window_latest_lap = assist_bytes[1]
        pit_stop_rejoin_position = assist_bytes[2]
        steering_assist = bool(assist_bytes[3])
        braking_assist = assist_bytes[4]
        gearbox_assist = assist_bytes[5]
        pit_assist = bool(assist_bytes[6])
        pit_release_assist = bool(assist_bytes[7])
        ers_assist = bool(assist_bytes[8])
        drs_assist = bool(assist_bytes[9])
        dynamic_racing_line = assist_bytes[10]
        dynamic_racing_line_type = assist_bytes[11]
        game_mode = assist_bytes[12]
        rule_set = assist_bytes[13]
        time_of_day = struct.unpack_from('<I', data, offset)[0]
        offset += 4
        session_length = assist_bytes[14]
        speed_units_lead_player = assist_bytes[15]
        temperature_units_lead_player = assist_bytes[16]
        speed_units_secondary_player = assist_bytes[17]
        temperature_units_secondary_player = assist_bytes[18]
        num_safety_car_periods = assist_bytes[19]
        num_virtual_safety_car_periods = assist_bytes[20]
        # red flag periods byte follows after time_of_day in spec; read defensively
        num_red_flag_periods = struct.unpack_from('<B', data, offset)[0] if offset < len(data) else 0

        return PacketSessionData(
            header=header,
            weather=weather,
            track_temperature=track_temperature,
            air_temperature=air_temperature,
            total_laps=total_laps,
            track_length=track_length,
            session_type=session_type,
            track_id=track_id,
            formula=formula,
            session_time_left=session_time_left,
            session_duration=session_duration,
            pit_speed_limit=pit_speed_limit,
            game_paused=game_paused,
            is_spectating=is_spectating,
            spectator_car_index=spectator_car_index,
            sli_pro_native_support=sli_pro_native_support,
            num_marshal_zones=num_marshal_zones,
            marshal_zones=marshal_zones,
            safety_car_status=safety_car_status,
            network_game=network_game,
            num_weather_forecast_samples=num_weather_forecast_samples,
            weather_forecast_samples=weather_forecast_samples,
            forecast_accuracy=forecast_accuracy,
            ai_difficulty=ai_difficulty,
            season_link_identifier=season_link_identifier,
            weekend_link_identifier=weekend_link_identifier,
            session_link_identifier=session_link_identifier,
            pit_stop_window_ideal_lap=pit_stop_window_ideal_lap,
            pit_stop_window_latest_lap=pit_stop_window_latest_lap,
            pit_stop_rejoin_position=pit_stop_rejoin_position,
            steering_assist=steering_assist,
            braking_assist=braking_assist,
            gearbox_assist=gearbox_assist,
            pit_assist=pit_assist,
            pit_release_assist=pit_release_assist,
            ers_assist=ers_assist,
            drs_assist=drs_assist,
            dynamic_racing_line=dynamic_racing_line,
            dynamic_racing_line_type=dynamic_racing_line_type,
            game_mode=game_mode,
            rule_set=rule_set,
            time_of_day=time_of_day,
            session_length=session_length,
            speed_units_lead_player=speed_units_lead_player,
            temperature_units_lead_player=temperature_units_lead_player,
            speed_units_secondary_player=speed_units_secondary_player,
            temperature_units_secondary_player=temperature_units_secondary_player,
            num_safety_car_periods=num_safety_car_periods,
            num_virtual_safety_car_periods=num_virtual_safety_car_periods,
            num_red_flag_periods=num_red_flag_periods
        )

    # ---------- packet type 2: lap data ----------

    @staticmethod
    def parse_lap_data(data: bytes, header: PacketHeader) -> PacketLapData:
        """Parse lap data packet (57 bytes/car in F1 24)"""
        offset = 29
        lap_data = []

        for _ in range(22):
            values = struct.unpack_from(LAP_DATA_FMT, data, offset)
            offset += 57
            lap_data.append(LapData(
                last_lap_time_in_ms=values[0],
                current_lap_time_in_ms=values[1],
                sector1_time_in_ms=values[2],
                sector1_time_minutes=values[3],
                sector2_time_in_ms=values[4],
                sector2_time_minutes=values[5],
                delta_to_car_in_front_in_ms=values[6],
                delta_to_car_in_front_minutes=values[7],
                delta_to_race_leader_in_ms=values[8],
                delta_to_race_leader_minutes=values[9],
                lap_distance=values[10],
                total_distance=values[11],
                safety_car_delta=values[12],
                car_position=values[13],
                current_lap_num=values[14],
                pit_status=_enum(PitStatus, values[15]),
                num_pit_stops=values[16],
                sector=_enum(Sector, values[17]),
                current_lap_invalid=bool(values[18]),
                penalties=values[19],
                total_warnings=values[20],
                corner_cutting_warnings=values[21],
                num_unserved_drive_through_pens=values[22],
                num_unserved_stop_go_pens=values[23],
                grid_position=values[24],
                driver_status=_enum(DriverStatus, values[25]),
                result_status=_enum(ResultStatus, values[26]),
                pit_lane_timer_active=bool(values[27]),
                pit_lane_time_in_lane_in_ms=values[28],
                pit_stop_timer_in_ms=values[29],
                pit_stop_should_serve_pen=bool(values[30]),
                speed_trap_fastest_speed=values[31],
                speed_trap_fastest_lap=values[32]
            ))

        # Time trial info
        time_trial_pb_car_idx = 255
        time_trial_rival_car_idx = 255
        if offset + 2 <= len(data):
            tt = struct.unpack_from('<BB', data, offset)
            time_trial_pb_car_idx = tt[0]
            time_trial_rival_car_idx = tt[1]

        return PacketLapData(
            header=header,
            lap_data=lap_data,
            time_trial_pb_car_idx=time_trial_pb_car_idx,
            time_trial_rival_car_idx=time_trial_rival_car_idx
        )

    # ---------- packet type 3: event ----------

    @staticmethod
    def parse_event_data(data: bytes, header: PacketHeader) -> PacketEventData:
        """Parse event packet (event string code + details)"""
        offset = 29
        event_code_raw = struct.unpack_from('<4s', data, offset)[0]
        offset += 4
        event_string_code = event_code_raw.decode('utf-8', errors='ignore').rstrip('\x00')

        # Determine event details based on code
        event_details = None
        if event_string_code == 'SSTA':
            event_details = struct.unpack_from('<B', data, offset)[0]
        elif event_string_code == 'SEND':
            event_details = struct.unpack_from('<B', data, offset)[0]
        elif event_string_code == 'FTLP':
            v = struct.unpack_from('<Bf', data, offset)
            event_details = FastestLap(vehicle_idx=v[0], lap_time=v[1])
        elif event_string_code == 'RTMT':
            v = struct.unpack_from('<B', data, offset)
            event_details = Retirement(vehicle_idx=v[0])
        elif event_string_code == 'DRSE':
            v = struct.unpack_from('<B', data, offset)
            event_details = Retirement(vehicle_idx=v[0])  # reuse structure
        elif event_string_code == 'TMPT':
            v = struct.unpack_from('<B', data, offset)
            event_details = TeamMateInPits(vehicle_idx=v[0])
        elif event_string_code == 'CHQF':
            v = struct.unpack_from('<B', data, offset)
            event_details = RaceWinner(vehicle_idx=v[0])
        elif event_string_code == 'RCWN':
            v = struct.unpack_from('<B', data, offset)
            event_details = RaceWinner(vehicle_idx=v[0])
        elif event_string_code == 'PENA':
            v = struct.unpack_from('<BBBBbBBB', data, offset)
            event_details = Penalty(
                penalty_type=v[0],
                infringement_type=v[1],
                vehicle_idx=v[2],
                other_vehicle_idx=v[3],
                time=v[4],
                lap_num=v[5],
                places_gained=v[6]
            )
        elif event_string_code == 'SPTP':
            v = struct.unpack_from('<BfBBBf', data, offset)
            event_details = SpeedTrap(
                vehicle_idx=v[0],
                speed=v[1],
                is_overall_fastest_in_session=bool(v[2]),
                is_driver_fastest_in_session=bool(v[3]),
                fastest_vehicle_idx_in_session=v[4],
                fastest_speed_in_session=v[5]
            )
        elif event_string_code == 'STLG':
            v = struct.unpack_from('<B', data, offset)
            event_details = StartLights(num_lights=v[0])
        elif event_string_code == 'LGOT':
            event_details = struct.unpack_from('<B', data, offset)[0]
        elif event_string_code == 'DTSV':
            v = struct.unpack_from('<B', data, offset)
            event_details = DriveThroughPenaltyServed(vehicle_idx=v[0])
        elif event_string_code == 'SGSV':
            v = struct.unpack_from('<B', data, offset)
            event_details = StopGoPenaltyServed(vehicle_idx=v[0])
        elif event_string_code == 'FLBK':
            v = struct.unpack_from('<If', data, offset)
            event_details = Flashback(flashback_frame_identifier=v[0], flashback_session_time=v[1])
        elif event_string_code == 'BUTN':
            v = struct.unpack_from('<I', data, offset)
            event_details = Buttons(button_status=v[0])
        elif event_string_code == 'OVTK':
            v = struct.unpack_from('<BB', data, offset)
            event_details = Overtake(overtaking_vehicle_idx=v[0], being_overtaken_vehicle_idx=v[1])
        elif event_string_code == 'SVCB':
            v = struct.unpack_from('<BB', data, offset)
            event_details = Overtake(overtaking_vehicle_idx=v[0], being_overtaken_vehicle_idx=v[1])
        elif event_string_code == 'CSVC':
            v = struct.unpack_from('<B', data, offset)
            event_details = StartLights(num_lights=v[0])
        elif event_string_code == 'COLL':
            v = struct.unpack_from('<BB', data, offset)
            event_details = Overtake(overtaking_vehicle_idx=v[0], being_overtaken_vehicle_idx=v[1])
        elif event_string_code == 'NTPN':
            event_details = struct.unpack_from('<B', data, offset)[0]

        return PacketEventData(
            header=header,
            event_string_code=event_string_code,
            event_details=event_details
        )

    # ---------- packet type 4: participants ----------

    @staticmethod
    def parse_participants_data(data: bytes, header: PacketHeader) -> PacketParticipantsData:
        """Parse participants packet"""
        offset = 29

        num_active_cars = struct.unpack_from('<B', data, offset)[0]
        offset += 1

        participants = []
        for _ in range(22):
            values = struct.unpack_from(PARTICIPANT_FMT, data, offset)
            offset += 60
            participants.append(ParticipantData(
                ai_controlled=bool(values[0]),
                driver_id=values[1],
                network_id=values[2],
                team_id=_enum(TeamID, values[3]),
                my_team=bool(values[4]),
                race_number=values[5],
                nationality=values[6],
                name=values[7].decode('utf-8', errors='ignore').rstrip('\x00'),
                your_telemetry=bool(values[8]),
                show_online_names=bool(values[9]),
                tech_level=values[10],
                platform=values[11]
            ))

        return PacketParticipantsData(
            header=header,
            num_active_cars=num_active_cars,
            participants=participants
        )

    # ---------- packet type 5: car setups ----------

    @staticmethod
    def parse_car_setup_data(data: bytes, header: PacketHeader) -> PacketCarSetupData:
        """Parse car setup packet"""
        offset = 29
        car_setups = []

        for _ in range(22):
            values = struct.unpack_from(CAR_SETUP_FMT, data, offset)
            offset += 50
            car_setups.append(CarSetupData(
                front_wing=values[0],
                rear_wing=values[1],
                on_throttle=values[2],
                off_throttle=values[3],
                front_camber=values[4],
                rear_camber=values[5],
                front_toe=values[6],
                rear_toe=values[7],
                front_suspension=values[8],
                rear_suspension=values[9],
                front_anti_roll_bar=values[10],
                rear_anti_roll_bar=values[11],
                front_suspension_height=values[12],
                rear_suspension_height=values[13],
                brake_pressure=values[14],
                brake_bias=values[15],
                engine_braking=values[16],
                rear_left_tyre_pressure=values[17],
                rear_right_tyre_pressure=values[18],
                front_left_tyre_pressure=values[19],
                front_right_tyre_pressure=values[20],
                ballast=values[21],
                fuel_load=values[22]
            ))

        next_front_wing_value = 0.0
        if offset + 4 <= len(data):
            next_front_wing_value = struct.unpack_from('<f', data, offset)[0]

        return PacketCarSetupData(
            header=header,
            car_setups=car_setups,
            next_front_wing_value=next_front_wing_value
        )

    # ---------- packet type 6: car telemetry ----------

    @staticmethod
    def parse_car_telemetry_data(data: bytes, header: PacketHeader) -> PacketCarTelemetryData:
        """Parse car telemetry packet (60 bytes/car)"""
        offset = 29
        car_telemetry_data = []

        for _ in range(22):
            values = struct.unpack_from(CAR_TELEMETRY_FMT, data, offset)
            offset += 60
            car_telemetry_data.append(CarTelemetryData(
                speed=values[0],
                throttle=values[1],
                steer=values[2],
                brake=values[3],
                clutch=values[4],
                gear=values[5],
                engine_rpm=values[6],
                drs=_enum(DRSStatus, values[7]),
                rev_lights_percent=values[8],
                rev_lights_bit_value=values[9],
                brakes_temperature=[values[10], values[11], values[12], values[13]],
                tyres_surface_temperature=[values[14], values[15], values[16], values[17]],
                tyres_inner_temperature=[values[18], values[19], values[20], values[21]],
                engine_temperature=values[22],
                tyres_pressure=[values[23], values[24], values[25], values[26]],
                surface_type=[_enum(SurfaceType, values[27]), _enum(SurfaceType, values[28]),
                              _enum(SurfaceType, values[29]), _enum(SurfaceType, values[30])]
            ))

        # MFD panel info
        mfd_panel_index = 255
        mfd_panel_index_secondary_player = 255
        suggested_gear = 0
        if offset + 3 <= len(data):
            v = struct.unpack_from('<BBb', data, offset)
            mfd_panel_index = v[0]
            mfd_panel_index_secondary_player = v[1]
            suggested_gear = v[2]

        return PacketCarTelemetryData(
            header=header,
            car_telemetry_data=car_telemetry_data,
            mfd_panel_index=mfd_panel_index,
            mfd_panel_index_secondary_player=mfd_panel_index_secondary_player,
            suggested_gear=suggested_gear
        )

    # ---------- packet type 7: car status ----------

    @staticmethod
    def parse_car_status_data(data: bytes, header: PacketHeader) -> PacketCarStatusData:
        """Parse car status packet (55 bytes/car)"""
        offset = 29
        car_status_data = []

        for _ in range(22):
            values = struct.unpack_from(CAR_STATUS_FMT, data, offset)
            offset += 55
            car_status_data.append(CarStatusData(
                traction_control=values[0],
                anti_lock_brakes=bool(values[1]),
                fuel_mix=values[2],
                front_brake_bias=values[3],
                pit_limiter_status=bool(values[4]),
                fuel_in_tank=values[5],
                fuel_capacity=values[6],
                fuel_remaining_laps=values[7],
                max_rpm=values[8],
                idle_rpm=values[9],
                max_gears=values[10],
                drs_allowed=_enum(DRSStatus, values[11]),
                drs_activation_distance=values[12],
                actual_tyre_compound=_enum(ActualTyreCompound, values[13]),
                visual_tyre_compound=_enum(VisualTyreCompound, values[14]),
                tyres_age_laps=values[15],
                vehicle_fia_flags=values[16],
                engine_power_ice=values[17],
                engine_power_mguk=values[18],
                ers_store_energy=values[19],
                ers_deploy_mode=_enum(ERSDeployMode, values[20]),
                ers_harvested_this_lap_mguk=values[21],
                ers_harvested_this_lap_mguh=values[22],
                ers_deployed_this_lap=values[23],
                network_paused=bool(values[24])
            ))

        return PacketCarStatusData(header=header, car_status_data=car_status_data)

    # ---------- packet type 8: final classification ----------

    @staticmethod
    def parse_final_classification_data(data: bytes, header: PacketHeader) -> PacketFinalClassificationData:
        """Parse final classification packet"""
        offset = 29
        num_cars = struct.unpack_from('<B', data, offset)[0]
        offset += 1

        classification_data = []
        for _ in range(22):
            values = struct.unpack_from(FINAL_CLASSIFICATION_FMT, data, offset)
            offset += 45
            actual = list(values[6:14])
            visual = list(values[14:22])
            end_laps = list(values[22:30])
            classification_data.append(FinalClassificationData(
                position=values[0],
                num_laps=values[1],
                grid_position=values[2],
                points=values[3],
                num_pit_stops=values[4],
                result_status=_enum(ResultStatus, values[5]),
                best_lap_time_in_ms=values[6],
                total_race_time=values[7],
                penalties_time=values[8],
                num_penalties=values[9],
                num_tyre_stints=values[10],
                tyre_stints_actual=[_enum(ActualTyreCompound, x) for x in actual[:8]],
                tyre_stints_visual=[_enum(VisualTyreCompound, x) for x in visual[:8]],
                tyre_stints_end_laps=end_laps[:8]
            ))

        return PacketFinalClassificationData(
            header=header,
            num_cars=num_cars,
            classification_data=classification_data
        )

    # ---------- packet type 9: lobby info ----------

    @staticmethod
    def parse_lobby_info_data(data: bytes, header: PacketHeader) -> PacketLobbyInfoData:
        """Parse lobby info packet"""
        offset = 29
        num_players = struct.unpack_from('<B', data, offset)[0]
        offset += 1

        lobby_players = []
        for _ in range(22):
            values = struct.unpack_from(LOBBY_INFO_FMT, data, offset)
            offset += 58
            lobby_players.append(LobbyInfoData(
                ai_controlled=bool(values[0]),
                team_id=values[1],
                nationality=values[2],
                platform=values[3],
                name=values[4].decode('utf-8', errors='ignore').rstrip('\x00'),
                car_number=values[5],
                your_telemetry=bool(values[6]),
                show_online_names=bool(values[7]),
                f1world_tech_level=values[8],
                ready_status=values[9]
            ))

        return PacketLobbyInfoData(
            header=header,
            num_players=num_players,
            lobby_players=lobby_players
        )

    # ---------- packet type 10: car damage ----------

    @staticmethod
    def parse_car_damage_data(data: bytes, header: PacketHeader) -> PacketCarDamageData:
        """Parse car damage packet"""
        offset = 29
        car_damage_data = []

        for _ in range(22):
            values = struct.unpack_from(CAR_DAMAGE_FMT, data, offset)
            offset += 42
            car_damage_data.append(CarDamageData(
                tyres_wear=[values[0], values[1], values[2], values[3]],
                tyres_damage=[values[4], values[5], values[6], values[7]],
                brakes_damage=[values[8], values[9], values[10], values[11]],
                front_left_wing_damage=values[12],
                front_right_wing_damage=values[13],
                rear_wing_damage=values[14],
                floor_damage=values[15],
                diffuser_damage=values[16],
                sidepod_damage=values[17],
                drs_fault=bool(values[18]),
                ers_fault=bool(values[19]),
                gear_box_damage=values[20],
                engine_damage=values[21],
                engine_mguh_wear=values[22],
                engine_es_wear=values[23],
                engine_ce_wear=values[24],
                engine_ice_wear=values[25],
                engine_mguk_wear=values[26],
                engine_tc_wear=values[27],
                engine_blown=bool(values[28]),
                engine_seized=bool(values[29])
            ))

        return PacketCarDamageData(header=header, car_damage_data=car_damage_data)

    # ---------- packet type 11: session history ----------

    @staticmethod
    def parse_session_history_data(data: bytes, header: PacketHeader) -> PacketSessionHistoryData:
        """Parse session history packet"""
        offset = 29
        v = struct.unpack_from('<BBBBBBBB', data, offset)
        offset += 8
        car_idx = v[0]
        num_laps = v[1]
        num_tyre_stints = v[2]
        best_lap_time_lap_num = v[3]
        best_sector1_lap_num = v[4]
        best_sector2_lap_num = v[5]
        best_sector3_lap_num = v[6]
        # v[7] is driver error? unused

        lap_history_data = []
        for _ in range(100):
            if offset + 14 > len(data):
                break
            lv = struct.unpack_from(LAP_HISTORY_FMT, data, offset)
            offset += 14
            lap_history_data.append(LapHistoryData(
                lap_time_in_ms=lv[0],
                sector1_time_in_ms=lv[1],
                sector1_time_minutes=lv[2],
                sector2_time_in_ms=lv[3],
                sector2_time_minutes=lv[4],
                sector3_time_in_ms=lv[5],
                sector3_time_minutes=lv[6],
                lap_valid_bit_flags=lv[7]
            ))

        tyre_stints_history_data = []
        for _ in range(8):
            if offset + 3 > len(data):
                break
            tv = struct.unpack_from(TYRE_STINT_FMT, data, offset)
            offset += 3
            tyre_stints_history_data.append(TyreStintHistoryData(
                end_lap=tv[0],
                tyre_actual_compound=_enum(ActualTyreCompound, tv[1]),
                tyre_visual_compound=_enum(VisualTyreCompound, tv[2])
            ))

        return PacketSessionHistoryData(
            header=header,
            car_idx=car_idx,
            num_laps=num_laps,
            num_tyre_stints=num_tyre_stints,
            best_lap_time_lap_num=best_lap_time_lap_num,
            best_sector1_lap_num=best_sector1_lap_num,
            best_sector2_lap_num=best_sector2_lap_num,
            best_sector3_lap_num=best_sector3_lap_num,
            lap_history_data=lap_history_data,
            tyre_stints_history_data=tyre_stints_history_data
        )

    # ---------- packet type 12: tyre sets ----------

    @staticmethod
    def parse_tyre_sets_data(data: bytes, header: PacketHeader) -> PacketTyreSetsData:
        """Parse tyre sets packet"""
        offset = 29
        car_idx = struct.unpack_from('<B', data, offset)[0]
        offset += 1

        tyre_set_data = []
        for _ in range(20):
            values = struct.unpack_from(TYRE_SET_FMT, data, offset)
            offset += 10
            tyre_set_data.append(TyreSetData(
                actual_tyre_compound=_enum(ActualTyreCompound, values[0]),
                visual_tyre_compound=_enum(VisualTyreCompound, values[1]),
                wear=values[2],
                available=bool(values[3]),
                recommended_session=values[4],
                life_span=values[5],
                usable_life=values[6],
                lap_delta_time=values[7],
                fitted=bool(values[8])
            ))

        fitted_idx = struct.unpack_from('<B', data, offset)[0]

        return PacketTyreSetsData(
            header=header,
            car_idx=car_idx,
            tyre_set_data=tyre_set_data,
            fitted_idx=fitted_idx
        )

    # ---------- packet type 14: time trial ----------

    @staticmethod
    def parse_time_trial_data(data: bytes, header: PacketHeader) -> PacketTimeTrialData:
        """Parse time trial packet (3 data sets of 24 bytes each)"""
        offset = 29

        def parse_set() -> TimeTrialDataSet:
            nonlocal offset
            values = struct.unpack_from(TIME_TRIAL_FMT, data, offset)
            offset += 24
            return TimeTrialDataSet(
                car_idx=values[0],
                team_id=values[1],
                lap_time_in_ms=values[2],
                sector1_time_in_ms=values[3],
                sector2_time_in_ms=values[4],
                sector3_time_in_ms=values[5],
                traction_control=values[6],
                gearbox_assist=values[7],
                anti_lock_brakes=values[8],
                equal_car_performance=values[9],
                custom_setup=values[10],
                valid=values[11]
            )

        player_session_best = parse_set()
        personal_best = parse_set()
        rival = parse_set()

        return PacketTimeTrialData(
            header=header,
            player_session_best_data_set=player_session_best,
            personal_best_data_set=personal_best,
            rival_data_set=rival
        )

    # ---------- dispatcher ----------

    @staticmethod
    def parse_packet(data: bytes):
        """Parse any packet type"""
        if len(data) < 29:
            return None

        header = F1TelemetryParser.parse_header(data)

        try:
            ptype = header.packet_type
            if ptype == PacketType.MOTION:
                return F1TelemetryParser.parse_motion_data(data, header)
            elif ptype == PacketType.SESSION:
                return F1TelemetryParser.parse_session_data(data, header)
            elif ptype == PacketType.LAP_DATA:
                return F1TelemetryParser.parse_lap_data(data, header)
            elif ptype == PacketType.EVENT:
                return F1TelemetryParser.parse_event_data(data, header)
            elif ptype == PacketType.PARTICIPANTS:
                return F1TelemetryParser.parse_participants_data(data, header)
            elif ptype == PacketType.CAR_SETUPS:
                return F1TelemetryParser.parse_car_setup_data(data, header)
            elif ptype == PacketType.CAR_TELEMETRY:
                return F1TelemetryParser.parse_car_telemetry_data(data, header)
            elif ptype == PacketType.CAR_STATUS:
                return F1TelemetryParser.parse_car_status_data(data, header)
            elif ptype == PacketType.FINAL_CLASSIFICATION:
                return F1TelemetryParser.parse_final_classification_data(data, header)
            elif ptype == PacketType.LOBBY_INFO:
                return F1TelemetryParser.parse_lobby_info_data(data, header)
            elif ptype == PacketType.CAR_DAMAGE:
                return F1TelemetryParser.parse_car_damage_data(data, header)
            elif ptype == PacketType.SESSION_HISTORY:
                return F1TelemetryParser.parse_session_history_data(data, header)
            elif ptype == PacketType.TYRE_SETS:
                return F1TelemetryParser.parse_tyre_sets_data(data, header)
            elif ptype == PacketType.TIME_TRIAL:
                return F1TelemetryParser.parse_time_trial_data(data, header)
            else:
                # MOTION_EX (13) not fully implemented - falls through
                return None
        except Exception as e:
            from .lograte import log_limited
            packet_type = getattr(header, 'packet_type', '?')
            log_limited(f"parse_err_{packet_type}", f"Error parsing packet type {packet_type}: {e}")
            return None
