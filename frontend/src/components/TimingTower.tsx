/**
 * Timing Tower Component - Live timing and standings
 */
import React from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { formatLapTime, getTyreCompoundColor, getTyreCompoundShort } from '@/utils/formatting';
import { motion } from 'framer-motion';

export const TimingTower: React.FC = () => {
  const timing = useTelemetryStore((state) => state.timing);
  const cars = useTelemetryStore((state) => state.cars);

  if (timing.length === 0) {
    return (
      <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">Live Timing</h2>
        <p className="text-gray-400 text-center py-8">Waiting for telemetry data...</p>
      </div>
    );
  }

  return (
    <div className="bg-f1-dark rounded-lg p-4 shadow-lg h-full overflow-hidden flex flex-col">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center">
        <span className="w-2 h-2 bg-race-green rounded-full mr-2 animate-pulse"></span>
        Live Timing
      </h2>

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="grid gap-1 text-xs font-semibold text-gray-400 border-b border-f1-gray pb-2 mb-2 sticky top-0 bg-f1-dark" style={{ gridTemplateColumns: '35px 100px 85px 75px 65px 60px 40px 30px' }}>
          <div className="text-center">POS</div>
          <div className="truncate">DRIVER</div>
          <div className="truncate">TEAM</div>
          <div className="text-right">LAST LAP</div>
          <div className="text-right">GAP</div>
          <div className="text-right">INT</div>
          <div className="text-center">TYRE</div>
          <div className="text-center">PIT</div>
        </div>

        {/* Timing entries */}
        <div className="space-y-1">
          {timing.map((entry, index) => {
            const car = cars[entry.car_index];
            const tyreColor = getTyreCompoundColor(car?.tyre_visual_compound);

            return (
              <motion.div
                key={entry.car_index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`grid gap-1 text-sm py-2 px-2 rounded transition-colors ${
                  entry.position === 1 ? 'bg-yellow-900/30' : 'hover:bg-f1-gray/50'
                }`}
                style={{ gridTemplateColumns: '35px 100px 85px 75px 65px 60px 40px 30px' }}
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
                  <span className="text-white font-medium truncate">{entry.driver_name}</span>
                </div>

                {/* Team */}
                <div className="flex items-center text-gray-400 text-xs min-w-0">
                  <span className="truncate">{entry.team.replace('_', ' ')}</span>
                </div>

                {/* Last Lap */}
                <div className="flex items-center justify-end font-mono text-xs">
                  <span className="text-white">
                    {formatLapTime(entry.last_lap_time_ms)}
                  </span>
                </div>

                {/* Gap to leader */}
                <div className="flex items-center justify-end font-mono text-xs">
                  <span className="text-gray-300">{entry.gap_to_leader}</span>
                </div>

                {/* Interval (gap to car ahead) */}
                <div className="flex items-center justify-end font-mono text-xs">
                  <span className="text-gray-400">{entry.interval}</span>
                </div>

                {/* Tyre */}
                <div className="flex items-center justify-center">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold relative"
                    style={{
                      backgroundColor: tyreColor,
                      color: tyreColor === '#FFFFFF' ? '#000' : '#FFF',
                    }}
                    title={`${car?.tyre_visual_compound || '?'} - ${car?.tyre_age_laps || 0} laps`}
                  >
                    {getTyreCompoundShort(car?.tyre_visual_compound)}
                  </div>
                </div>

                {/* Pit stops */}
                <div className="flex items-center justify-center text-gray-400 text-xs">
                  {entry.pit_stops}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
