import React from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { formatLapTime, getTyreCompoundColor, sectorColorName } from '@/utils/formatting';
import { motion } from 'framer-motion';
import { getDriverCode } from '@/utils/driverCodes';

export const TimingTower: React.FC = () => {
  const timing = useTelemetryStore((state) => state.timing);
  const cars = useTelemetryStore((state) => state.cars);
  const playerCarIndex = useTelemetryStore((state) => state.playerCarIndex);
  const participants = useTelemetryStore((state) => state.participants);
  const setHighlightedCarIndex = useTelemetryStore((state) => state.setHighlightedCarIndex);

  if (timing.length === 0) {
    return (
      <div className="bg-f1-dark rounded-lg p-4 shadow-lg h-full">
        <h2 className="text-xl font-bold text-white mb-4">Live Timing</h2>
        <p className="text-gray-400 text-center py-8">Waiting for telemetry data...</p>
      </div>
    );
  }

  return (
    <div className="bg-f1-dark rounded-lg p-4 shadow-lg flex h-full min-h-0 flex-col">
      <h2 className="text-xl font-bold text-white mb-3 flex items-center shrink-0">
        <span className="w-2 h-2 bg-race-green rounded-full mr-2 animate-pulse"></span>
        Live Timing
      </h2>

      <div className="flex-1 overflow-auto min-h-0">
        <div className="timing-table min-w-[640px]">
        {/* Header */}
        <div
          className="timing-grid timing-header gap-x-2 text-[10px] font-semibold text-gray-400 border-b border-f1-gray pb-1.5 mb-1.5 sticky top-0 bg-f1-dark z-10"
        >
          <div className="text-center">POS</div>
          <div className="truncate">CODE</div>
          <div className="truncate">TEAM</div>
          <div className="text-right">LAST</div>
          <div className="text-right">S1</div>
          <div className="text-right">S2</div>
          <div className="text-right">S3</div>
          <div className="text-right">GAP</div>
          <div className="text-right">INT</div>
          <div className="text-center">TYRE</div>
          <div className="text-center">PIT</div>
        </div>

        {/* Timing entries */}
        <div className="space-y-0.5">
          {timing.map((entry, index) => {
            const car = cars[entry.car_index];
            const tyreColor = getTyreCompoundColor(car?.tyre_visual_compound);
            const isPlayer = playerCarIndex !== null && entry.car_index === playerCarIndex;

            // --- Sector timing (F1-style: completed sectors locked, current one live) ---
            const s1Locked = (car?.sector1_time_ms ?? 0) > 0;
            const s2Locked = (car?.sector2_time_ms ?? 0) > 0;
            const curLap = (car?.current_lap_time_ms ?? 0) > 0 ? car.current_lap_time_ms! : 0;
            const sectorStr = car?.sector ?? '';
            const sectorIdx = sectorStr.includes('1') ? 0 : sectorStr.includes('2') ? 1 : sectorStr.includes('3') ? 2 : -1;

            // ms -> seconds string for display
            const fmt = (ms: number | null | undefined) =>
              ms != null && ms > 0 ? (ms / 1000).toFixed(3) : '-';

            // S1: locked if past line; otherwise live cumulative while in S1
            const s1Ms = s1Locked
              ? car!.sector1_time_ms!
              : sectorIdx === 0 && curLap > 0
              ? curLap
              : null;
            // S2 is already an individual sector time in the F1 telemetry packet.
            const s2Ms = s2Locked
              ? car!.sector2_time_ms!
              : sectorIdx === 1 && s1Locked && curLap > 0
              ? curLap - car!.sector1_time_ms!
              : null;
            // S3: live while in S3; subtract both completed individual sectors.
            const s3Ms =
              sectorIdx === 2 && s2Locked && curLap > 0
                ? curLap - car!.sector1_time_ms! - car!.sector2_time_ms!
                : null;

            const s1 = fmt(s1Ms);
            const s2 = fmt(s2Ms);
            const s3 = fmt(s3Ms);
            const currentS = sectorIdx;

            return (
              <motion.div
                key={entry.car_index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`timing-grid timing-row grid gap-x-2 py-1.5 px-1 rounded transition-colors ${
                  isPlayer
                    ? 'bg-race-red/15 ring-1 ring-race-red/40'
                    : 'hover:bg-f1-gray/50'
                }`}
                onMouseEnter={() => {
                  if (!isPlayer) setHighlightedCarIndex(entry.car_index);
                }}
                onMouseLeave={() => setHighlightedCarIndex(null)}
              >
                {/* Position */}
                <div className="flex items-center justify-center">
                  <span
                    className={`font-bold ${
                      entry.position === 1
                        ? 'text-yellow-400'
                        : entry.position <= 3
                        ? 'text-blue-400'
                        : entry.position <= 10
                        ? 'text-green-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {entry.position}
                  </span>
                </div>

                {/* Driver */}
                <div className="flex items-center min-w-0">
                  <span className="truncate font-mono font-medium uppercase text-white">{getDriverCode(participants[entry.car_index])}</span>
                </div>

                {/* Team */}
                <div className="flex items-center text-gray-400 text-[10px] min-w-0">
                  <span className="truncate">{entry.team.replace('_', ' ')}</span>
                </div>

                {/* Last Lap */}
                <div className="flex items-center justify-end font-mono text-[11px] pr-1">
                  <span className="text-white">{formatLapTime(entry.last_lap_time_ms)}</span>
                </div>

                {/* S1 */}
                <div className="flex items-center justify-end font-mono text-[10px]">
                  <span
                    className={`whitespace-nowrap ${currentS === 0 ? 'font-bold' : ''}`}
                    style={{ color: sectorColorName(entry.sector_colors?.s1) }}
                  >
                    {s1}
                  </span>
                </div>

                {/* S2 */}
                <div className="flex items-center justify-end font-mono text-[10px]">
                  <span
                    className={`whitespace-nowrap ${currentS === 1 ? 'font-bold' : ''}`}
                    style={{ color: sectorColorName(entry.sector_colors?.s2) }}
                  >
                    {s2}
                  </span>
                </div>

                {/* S3 */}
                <div className="flex items-center justify-end font-mono text-[10px]">
                  <span
                    className={`whitespace-nowrap ${currentS === 2 ? (isPlayer ? 'text-white font-bold' : 'text-yellow-400 font-bold') : 'text-gray-400'}`}
                  >
                    {s3}
                  </span>
                </div>

                {/* Gap to leader */}
                <div className="flex items-center justify-end font-mono text-[11px] min-w-0">
                  <span className="text-gray-300 whitespace-nowrap">{entry.gap_to_leader}</span>
                </div>

                {/* Interval (gap to car ahead) */}
                <div className="flex items-center justify-end font-mono text-[11px] min-w-0">
                  <span className="text-gray-400 whitespace-nowrap">{entry.interval}</span>
                </div>

                {/* Tyre */}
                <div className="flex items-center justify-center">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold relative"
                    style={{
                      backgroundColor: tyreColor,
                      color: tyreColor === '#FFFFFF' || tyreColor === '#FFD700' ? '#000' : '#FFF',
                    }}
                    title={`${car?.tyre_visual_compound || '?'} - ${car?.tyre_age_laps || 0} laps`}
                  >
                    {car?.tyre_age_laps ?? 0}
                  </div>
                </div>

                {/* Pit stops */}
                <div className="flex items-center justify-center text-gray-400 text-[11px]">
                  {entry.pit_stops > 0 ? entry.pit_stops : '-'}
                </div>
              </motion.div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
};
