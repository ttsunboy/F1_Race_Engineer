/**
 * Fuel and ERS Management Component
 */
import React from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { formatFuel, formatERSEnergy } from '@/utils/formatting';
import { Battery, Fuel } from 'lucide-react';
import { motion } from 'framer-motion';

export const FuelERS: React.FC = () => {
  const cars = useTelemetryStore((state) => state.cars);
  const session = useTelemetryStore((state) => state.session);
  const playerCarIndex = useTelemetryStore((state) => state.playerCarIndex);

  if (playerCarIndex === null) {
    return (
      <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4">Fuel & ERS</h2>
        <p className="text-gray-400 text-center py-8">Detecting player car...</p>
      </div>
    );
  }

  const car = cars[playerCarIndex];

  if (!car) {
    return (
      <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4">Fuel & ERS</h2>
        <p className="text-gray-400 text-center py-8">No data available</p>
      </div>
    );
  }

  const fuelPercent = ((car.fuel_in_tank || 0) / (car.fuel_capacity || 100)) * 100;
  const ersPercent = ((car.ers_store_energy || 0) / 4.0) * 100; // Max ERS is 4 MJ
  const fuelLapsRemaining = car.fuel_remaining_laps || 0;
  const lapsToGo = (session?.total_laps || 0) - (car.current_lap || 0);

  const fuelStatus = fuelLapsRemaining >= lapsToGo ? 'good' : fuelLapsRemaining >= lapsToGo - 2 ? 'warning' : 'critical';

  return (
    <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
      <h2 className="text-lg font-bold text-white mb-4">Fuel & ERS</h2>

      <div className="space-y-6">
        {/* Fuel */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">Fuel</span>
            </div>
            <span className="text-xs text-gray-400">{formatFuel(car.fuel_in_tank)}</span>
          </div>

          {/* Fuel bar */}
          <div className="h-6 bg-f1-darker rounded-lg overflow-hidden relative">
            <motion.div
              className={`h-full ${
                fuelStatus === 'good' ? 'bg-green-500' :
                fuelStatus === 'warning' ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${fuelPercent}%` }}
              transition={{ duration: 0.5 }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
              {fuelPercent.toFixed(0)}%
            </div>
          </div>

          {/* Fuel info */}
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-gray-400">
              {fuelLapsRemaining.toFixed(1)} laps remaining
            </span>
            <span className={`font-semibold ${
              fuelStatus === 'good' ? 'text-green-400' :
              fuelStatus === 'warning' ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {lapsToGo > 0 ? `${lapsToGo} to go` : 'Finished'}
            </span>
          </div>
        </div>

        {/* ERS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Battery className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold text-white">ERS Store</span>
            </div>
            <span className="text-xs text-gray-400">{formatERSEnergy(car.ers_store_energy)}</span>
          </div>

          {/* ERS bar */}
          <div className="h-6 bg-f1-darker rounded-lg overflow-hidden relative">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${ersPercent}%` }}
              transition={{ duration: 0.3 }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
              {ersPercent.toFixed(0)}%
            </div>
          </div>

          {/* ERS mode */}
          <div className="mt-2 p-2 bg-f1-darker rounded text-center">
            <div className="text-xs text-gray-400 mb-1">Deploy Mode</div>
            <div className="text-sm font-bold text-yellow-400">
              {car.ers_deploy_mode || 'NONE'}
            </div>
          </div>
        </div>

        {/* ERS Harvest/Deploy Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-f1-darker rounded p-2 text-center">
            <div className="text-gray-400 mb-1">MGU-K</div>
            <div className="text-green-400 font-mono">
              +{(car.ers_harvested_mguk || 0).toFixed(1)}
            </div>
          </div>
          <div className="bg-f1-darker rounded p-2 text-center">
            <div className="text-gray-400 mb-1">MGU-H</div>
            <div className="text-green-400 font-mono">
              +{(car.ers_harvested_mguh || 0).toFixed(1)}
            </div>
          </div>
          <div className="bg-f1-darker rounded p-2 text-center">
            <div className="text-gray-400 mb-1">Deployed</div>
            <div className="text-purple-400 font-mono">
              -{(car.ers_deployed || 0).toFixed(1)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
