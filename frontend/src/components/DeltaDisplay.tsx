/**
 * Delta Timing Display Component
 */
import React from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const DeltaDisplay: React.FC = () => {
  const cars = useTelemetryStore((state) => state.cars);
  const playerCarIndex = useTelemetryStore((state) => state.playerCarIndex);
  const timing = useTelemetryStore((state) => state.timing);

  if (playerCarIndex === null) {
    return (
      <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4">Delta Timing</h2>
        <p className="text-gray-400 text-center py-8">Detecting player car...</p>
      </div>
    );
  }

  const car = cars[playerCarIndex];

  if (!car) {
    return null;
  }

  const deltaToLeader = car.delta_to_leader_ms || 0;
  const deltaToAhead = car.delta_to_car_ahead_ms || 0;

  // Calculate delta to car behind using timing data
  const playerPosition = car.position || 0;
  const carBehind = timing.find(t => t.position === playerPosition + 1);
  const carBehindData = carBehind ? cars[carBehind.car_index] : null;
  const deltaToBehind = carBehindData ? (carBehindData.delta_to_car_ahead_ms || 0) : 0;

  const formatDelta = (ms: number) => {
    const seconds = Math.abs(ms) / 1000;
    return seconds.toFixed(3);
  };

  const getDeltaColor = (ms: number) => {
    if (ms === 0) return '#888888';
    return ms > 0 ? '#00D656' : '#FF3838'; // Green if gaining, red if losing
  };

  const getDeltaIcon = (ms: number) => {
    if (Math.abs(ms) < 10) return <Minus className="w-4 h-4" />;
    return ms > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  return (
    <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
      <h2 className="text-lg font-bold text-white mb-4">Delta Timing</h2>

      <div className="space-y-4">
        {/* Delta to leader */}
        {car.position !== 1 && (
          <div>
            <div className="text-xs text-gray-400 mb-2">TO LEADER (P1)</div>
            <div className="bg-f1-darker rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ color: getDeltaColor(deltaToLeader) }}
                    transition={{ duration: 0.3 }}
                  >
                    {getDeltaIcon(deltaToLeader)}
                  </motion.div>
                  <motion.div
                    className="text-3xl font-mono font-bold"
                    animate={{ color: getDeltaColor(deltaToLeader) }}
                    transition={{ duration: 0.3 }}
                  >
                    {formatDelta(deltaToLeader)}
                  </motion.div>
                </div>
                <div className="text-sm text-gray-400">seconds</div>
              </div>

              {/* Visual bar */}
              <div className="mt-3 h-2 bg-f1-dark rounded-full overflow-hidden">
                <motion.div
                  className="h-full"
                  style={{ backgroundColor: getDeltaColor(deltaToLeader) }}
                  animate={{ width: `${Math.min(Math.abs(deltaToLeader) / 100, 1) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Delta to car ahead */}
        {car.position !== 1 && (
          <div>
            <div className="text-xs text-gray-400 mb-2">TO CAR AHEAD (P{(car.position || 1) - 1})</div>
            <div className="bg-f1-darker rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ color: getDeltaColor(deltaToAhead) }}
                    transition={{ duration: 0.3 }}
                  >
                    {getDeltaIcon(deltaToAhead)}
                  </motion.div>
                  <motion.div
                    className="text-2xl font-mono font-bold"
                    animate={{ color: getDeltaColor(deltaToAhead) }}
                    transition={{ duration: 0.3 }}
                  >
                    {formatDelta(deltaToAhead)}
                  </motion.div>
                </div>
                <div className="text-sm text-gray-400">seconds</div>
              </div>

              {/* Visual bar */}
              <div className="mt-3 h-2 bg-f1-dark rounded-full overflow-hidden">
                <motion.div
                  className="h-full"
                  style={{ backgroundColor: getDeltaColor(deltaToAhead) }}
                  animate={{ width: `${Math.min(Math.abs(deltaToAhead) / 30, 1) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Delta to car behind */}
        {timing.length > 0 && playerPosition < timing.length && (
          <div>
            <div className="text-xs text-gray-400 mb-2">CAR BEHIND (P{playerPosition + 1})</div>
            <div className="bg-f1-darker rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ color: deltaToBehind > 0 ? '#00D656' : '#FF3838' }}
                    transition={{ duration: 0.3 }}
                  >
                    {getDeltaIcon(-deltaToBehind)}
                  </motion.div>
                  <motion.div
                    className="text-xl font-mono font-bold"
                    animate={{ color: deltaToBehind > 0 ? '#00D656' : '#FF3838' }}
                    transition={{ duration: 0.3 }}
                  >
                    {deltaToBehind > 0 ? '+' : ''}{formatDelta(deltaToBehind)}
                  </motion.div>
                </div>
                <div className="text-sm text-gray-400">seconds</div>
              </div>
            </div>
          </div>
        )}

        {/* Leader indicator */}
        {car.position === 1 && (
          <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-700/30 rounded-lg p-6 text-center border-2 border-yellow-600">
            <div className="text-4xl font-bold text-yellow-400 mb-2">P1</div>
            <div className="text-sm text-yellow-200">YOU ARE THE LEADER</div>
          </div>
        )}
      </div>
    </div>
  );
};
