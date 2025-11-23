"""F1 24 UDP packet parser"""
import struct
from typing import Union
from .packets import *
from .packet_types import PacketType


class F1TelemetryParser:
    """Parser for F1 24 UDP telemetry packets"""

    @staticmethod
    def parse_header(data: bytes) -> PacketHeader:
        """Parse packet header"""
        return PacketHeader.from_bytes(data[:29])

    @staticmethod
    def parse_motion_data(data: bytes, header: PacketHeader) -> PacketMotionData:
        """Parse motion data packet"""
        offset = 29
        car_motion_data = []

        for _ in range(22):
            values = struct.unpack('<ffffffhhhhhhffffff', data[offset:offset + 60])
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
            offset += 60

        return PacketMotionData(header=header, car_motion_data=car_motion_data)

    @staticmethod
    def parse_session_data(data: bytes, header: PacketHeader) -> PacketSessionData:
        """Parse session data packet"""
        offset = 29

        # Basic session info
        values = struct.unpack('<BBBBHBBBHHBBBBBBBBfBBBBBBBBBBBBBBIIIBBBBBBBBBBHBBBBBBB',
                              data[offset:offset + 98])

        weather = Weather(values[0])
        track_temperature = values[1]
        air_temperature = values[2]
        total_laps = values[3]
        track_length = values[4]
        session_type = SessionType(values[5])
        track_id = TrackID(values[6])
        formula = values[7]
        session_time_left = values[8]
        session_duration = values[9]
        pit_speed_limit = values[10]
        game_paused = bool(values[11])
        is_spectating = bool(values[12])
        spectator_car_index = values[13]
        sli_pro_native_support = bool(values[14])
        num_marshal_zones = values[15]

        offset += 98

        # Marshal zones
        marshal_zones = []
        for _ in range(21):  # Max 21 marshal zones
            zone_values = struct.unpack('<fB', data[offset:offset + 5])
            if len(marshal_zones) < num_marshal_zones:
                marshal_zones.append(MarshalZone(
                    zone_start=zone_values[0],
                    zone_flag=FlagType(zone_values[1])
                ))
            offset += 5

        # Safety car and weather forecast
        values2 = struct.unpack('<BBBBB', data[offset:offset + 5])
        safety_car_status = values2[0]
        network_game = bool(values2[1])
        num_weather_forecast_samples = values2[2]
        forecast_accuracy = values2[3]
        ai_difficulty = values2[4]
        offset += 5

        # Weather forecast samples
        weather_forecast_samples = []
        for _ in range(56):  # Max 56 samples
            forecast_values = struct.unpack('<BBBbBbB', data[offset:offset + 8])
            if len(weather_forecast_samples) < num_weather_forecast_samples:
                weather_forecast_samples.append(WeatherForecastSample(
                    session_type=SessionType(forecast_values[0]),
                    time_offset=forecast_values[1],
                    weather=Weather(forecast_values[2]),
                    track_temperature=forecast_values[3],
                    track_temperature_change=forecast_values[4],
                    air_temperature=forecast_values[5],
                    air_temperature_change=forecast_values[6],
                    rain_percentage=forecast_values[7]
                ))
            offset += 8

        # Additional session info
        values3 = struct.unpack('<IIIBBBBBBBBBBBBHBBBBBB', data[offset:offset + 33])

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
            season_link_identifier=values3[0],
            weekend_link_identifier=values3[1],
            session_link_identifier=values3[2],
            pit_stop_window_ideal_lap=values3[3],
            pit_stop_window_latest_lap=values3[4],
            pit_stop_rejoin_position=values3[5],
            steering_assist=bool(values3[6]),
            braking_assist=values3[7],
            gearbox_assist=values3[8],
            pit_assist=bool(values3[9]),
            pit_release_assist=bool(values3[10]),
            ers_assist=bool(values3[11]),
            drs_assist=bool(values3[12]),
            dynamic_racing_line=values3[13],
            dynamic_racing_line_type=values3[14],
            game_mode=values3[15],
            rule_set=values3[16],
            time_of_day=values3[17],
            session_length=values3[18],
            speed_units_lead_player=values3[19],
            temperature_units_lead_player=values3[20],
            speed_units_secondary_player=values3[21],
            temperature_units_secondary_player=values3[22],
            num_safety_car_periods=values[values[23] if len(values) > 23 else 0],
            num_virtual_safety_car_periods=values[values[24] if len(values) > 24 else 0],
            num_red_flag_periods=values[values[25] if len(values) > 25 else 0]
        )

    @staticmethod
    def parse_lap_data(data: bytes, header: PacketHeader) -> PacketLapData:
        """Parse lap data packet"""
        offset = 29
        lap_data = []

        for _ in range(22):
            values = struct.unpack('<IIHBHBHHfffBBBBBBBBBBBBBBHHB', data[offset:offset + 53])
            lap_data.append(LapData(
                last_lap_time_in_ms=values[0],
                current_lap_time_in_ms=values[1],
                sector1_time_in_ms=values[2],
                sector1_time_minutes=values[3],
                sector2_time_in_ms=values[4],
                sector2_time_minutes=values[5],
                delta_to_car_in_front_in_ms=values[6],
                delta_to_race_leader_in_ms=values[7],
                lap_distance=values[8],
                total_distance=values[9],
                safety_car_delta=values[10],
                car_position=values[11],
                current_lap_num=values[12],
                pit_status=PitStatus(values[13]),
                num_pit_stops=values[14],
                sector=Sector(values[15]),
                current_lap_invalid=bool(values[16]),
                penalties=values[17],
                total_warnings=values[18],
                corner_cutting_warnings=values[19],
                num_unserved_drive_through_pens=values[20],
                num_unserved_stop_go_pens=values[21],
                grid_position=values[22],
                driver_status=DriverStatus(values[23]),
                result_status=ResultStatus(values[24]),
                pit_lane_timer_active=bool(values[25]),
                pit_lane_time_in_lane_in_ms=values[26],
                pit_stop_timer_in_ms=values[27],
                pit_stop_should_serve_pen=bool(values[28])
            ))
            offset += 53

        # Time trial info
        values = struct.unpack('<BB', data[offset:offset + 2])

        return PacketLapData(
            header=header,
            lap_data=lap_data,
            time_trial_pb_car_idx=values[0],
            time_trial_rival_car_idx=values[1]
        )

    @staticmethod
    def parse_car_telemetry_data(data: bytes, header: PacketHeader) -> PacketCarTelemetryData:
        """Parse car telemetry packet"""
        offset = 29
        car_telemetry_data = []

        for _ in range(22):
            values = struct.unpack('<HfffBbHBBHHHHHHHHHffffBBBB', data[offset:offset + 60])

            car_telemetry_data.append(CarTelemetryData(
                speed=values[0],
                throttle=values[1],
                steer=values[2],
                brake=values[3],
                clutch=values[4],
                gear=values[5],
                engine_rpm=values[6],
                drs=DRSStatus(values[7]),
                rev_lights_percent=values[8],
                rev_lights_bit_value=values[9],
                brakes_temperature=[values[10], values[11], values[12], values[13]],
                tyres_surface_temperature=[values[14], values[15], values[16], values[17]],
                tyres_inner_temperature=[values[18], values[19], values[20], values[21]],
                engine_temperature=values[22],
                tyres_pressure=[values[23], values[24], values[25], values[26]],
                surface_type=[SurfaceType(values[27]), SurfaceType(values[28]),
                            SurfaceType(values[29]), SurfaceType(values[30])]
            ))
            offset += 60

        # MFD panel info
        values = struct.unpack('<BBb', data[offset:offset + 3])

        return PacketCarTelemetryData(
            header=header,
            car_telemetry_data=car_telemetry_data,
            mfd_panel_index=values[0],
            mfd_panel_index_secondary_player=values[1],
            suggested_gear=values[2]
        )

    @staticmethod
    def parse_car_status_data(data: bytes, header: PacketHeader) -> PacketCarStatusData:
        """Parse car status packet"""
        offset = 29
        car_status_data = []

        for _ in range(22):
            values = struct.unpack('<BBBBBfffHHBBHBBBBffffBfffB', data[offset:offset + 58])

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
                drs_allowed=DRSStatus(values[11]),
                drs_activation_distance=values[12],
                actual_tyre_compound=ActualTyreCompound(values[13]),
                visual_tyre_compound=VisualTyreCompound(values[14]),
                tyres_age_laps=values[15],
                vehicle_fia_flags=values[16],
                engine_power_ice=values[17],
                engine_power_mguk=values[18],
                ers_store_energy=values[19],
                ers_deploy_mode=ERSDeployMode(values[20]),
                ers_harvested_this_lap_mguk=values[21],
                ers_harvested_this_lap_mguh=values[22],
                ers_deployed_this_lap=values[23],
                network_paused=bool(values[24])
            ))
            offset += 58

        return PacketCarStatusData(header=header, car_status_data=car_status_data)

    @staticmethod
    def parse_car_damage_data(data: bytes, header: PacketHeader) -> PacketCarDamageData:
        """Parse car damage packet"""
        offset = 29
        car_damage_data = []

        for _ in range(22):
            values = struct.unpack('<ffffBBBBBBBBBBBBBBBBBBBBBB', data[offset:offset + 42])

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
            offset += 42

        return PacketCarDamageData(header=header, car_damage_data=car_damage_data)

    @staticmethod
    def parse_participants_data(data: bytes, header: PacketHeader) -> PacketParticipantsData:
        """Parse participants packet"""
        offset = 29

        num_active_cars = struct.unpack('<B', data[offset:offset + 1])[0]
        offset += 1

        participants = []
        for _ in range(22):
            values = struct.unpack('<BBBBBBBBB48sBBBB', data[offset:offset + 56])

            participants.append(ParticipantData(
                ai_controlled=bool(values[0]),
                driver_id=values[1],
                network_id=values[2],
                team_id=TeamID(values[3]),
                my_team=bool(values[4]),
                race_number=values[5],
                nationality=values[6],
                name=values[7].decode('utf-8', errors='ignore').rstrip('\x00'),
                your_telemetry=bool(values[8]),
                show_online_names=bool(values[9]),
                tech_level=values[10],
                platform=values[11]
            ))
            offset += 56

        return PacketParticipantsData(
            header=header,
            num_active_cars=num_active_cars,
            participants=participants
        )

    @staticmethod
    def parse_packet(data: bytes) -> Union[PacketMotionData, PacketSessionData, PacketLapData,
                                           PacketCarTelemetryData, PacketCarStatusData,
                                           PacketCarDamageData, PacketParticipantsData, None]:
        """Parse any packet type"""
        if len(data) < 29:
            return None

        header = F1TelemetryParser.parse_header(data)

        try:
            if header.packet_type == PacketType.MOTION:
                return F1TelemetryParser.parse_motion_data(data, header)
            elif header.packet_type == PacketType.SESSION:
                return F1TelemetryParser.parse_session_data(data, header)
            elif header.packet_type == PacketType.LAP_DATA:
                return F1TelemetryParser.parse_lap_data(data, header)
            elif header.packet_type == PacketType.CAR_TELEMETRY:
                return F1TelemetryParser.parse_car_telemetry_data(data, header)
            elif header.packet_type == PacketType.CAR_STATUS:
                return F1TelemetryParser.parse_car_status_data(data, header)
            elif header.packet_type == PacketType.CAR_DAMAGE:
                return F1TelemetryParser.parse_car_damage_data(data, header)
            elif header.packet_type == PacketType.PARTICIPANTS:
                return F1TelemetryParser.parse_participants_data(data, header)
            else:
                # Other packet types not yet implemented
                return None
        except Exception as e:
            print(f"Error parsing packet type {header.packet_type}: {e}")
            return None
