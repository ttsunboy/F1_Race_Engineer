/**
 * Tire Data Component - Temperature, pressure, and wear visualization
 */
import { useTelemetryStore } from '@/store/telemetryStore';
import { formatTemperature, formatPressure, getTemperatureColor, getTyreCompoundColor } from '@/utils/formatting';

const OPTIMAL_TEMP = { min: 80, max: 110 }; // surface temp working range
const OPTIMAL_CORE_TEMP = { min: 95, max: 120 }; // inner/core temp working range

interface TyreProps {
  position: 'FL' | 'FR' | 'RL' | 'RR';
  surfaceTemp?: number;
  innerTemp?: number;
  pressure?: number;
  wear?: number;
  damage?: number;
}

const Tyre: React.FC<TyreProps> = ({ position, surfaceTemp, innerTemp, pressure, wear, damage }) => {
  const tempColor = getTemperatureColor(surfaceTemp, OPTIMAL_TEMP);
  const coreColor = getTemperatureColor(innerTemp, OPTIMAL_CORE_TEMP);
  const wearPercent = (wear || 0);
  const damagePercent = damage || 0;

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-gray-400 mb-2">{position}</div>

      {/* Tire visual */}
      <div className="relative w-14 h-[84px]">
        {/* Outer tire */}
        <div
          className="absolute inset-0 rounded-lg border-[3px]"
          style={{
            borderColor: tempColor,
            backgroundColor: `${coreColor}33`,
          }}
        >
          {/* Temperature readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pb-2 text-center">
            <div className="text-sm font-mono font-bold text-white leading-tight">
              {formatTemperature(innerTemp)}
            </div>
          </div>

          {/* Wear indicator */}
          <div className="absolute bottom-0 left-0 right-0 bg-f1-darker rounded-b">
            <div
              className="h-1 bg-yellow-500"
              style={{ width: `${wearPercent}%` }}
            />
          </div>

          {/* Damage indicator */}
          {damagePercent > 0 && (
            <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1 rounded-bl">
              {damagePercent}%
            </div>
          )}
        </div>
      </div>

      {/* Data */}
      <div className="mt-2 text-sm text-center space-y-1">
        <div className="text-white font-mono text-base">{formatTemperature(surfaceTemp)}</div>
        <div className="text-gray-400 font-mono text-xs">{formatPressure(pressure)}</div>
        <div className="text-gray-500 text-xs">{wearPercent.toFixed(0)}% wear</div>
      </div>
    </div>
  );
};

export const TyreData: React.FC = () => {
  const cars = useTelemetryStore((state) => state.cars);
  const playerCarIndex = useTelemetryStore((state) => state.playerCarIndex);

  if (playerCarIndex === null) {
    return (
      <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4">Tire Data</h2>
        <p className="text-gray-400 text-center py-8">Detecting player car...</p>
      </div>
    );
  }

  const car = cars[playerCarIndex];

  if (!car) {
    return (
      <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4">Tire Data</h2>
        <p className="text-gray-400 text-center py-8">No tire data available</p>
      </div>
    );
  }

  const tyreColor = getTyreCompoundColor(car.tyre_visual_compound);

  return (
    <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Tire Data</h2>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-bold text-white">
              {car.tyre_visual_compound || 'N/A'}
            </div>
            <div className="text-xs text-gray-400">
              {car.tyre_age_laps || 0} laps old
            </div>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
            style={{
              backgroundColor: tyreColor,
              color: tyreColor === '#FFFFFF' ? '#000' : '#FFF',
            }}
          >
            {car.tyre_age_laps || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Front tires */}
        <div className="flex justify-center">
          <Tyre
            position="FL"
            surfaceTemp={car.tyres_surface_temp?.[2]}
            innerTemp={car.tyres_inner_temp?.[2]}
            pressure={car.tyres_pressure?.[2]}
            wear={car.tyres_wear?.[2]}
            damage={car.tyres_damage?.[2]}
          />
        </div>
        <div className="flex justify-center">
          <Tyre
            position="FR"
            surfaceTemp={car.tyres_surface_temp?.[3]}
            innerTemp={car.tyres_inner_temp?.[3]}
            pressure={car.tyres_pressure?.[3]}
            wear={car.tyres_wear?.[3]}
            damage={car.tyres_damage?.[3]}
          />
        </div>

        {/* Rear tires */}
        <div className="flex justify-center">
          <Tyre
            position="RL"
            surfaceTemp={car.tyres_surface_temp?.[0]}
            innerTemp={car.tyres_inner_temp?.[0]}
            pressure={car.tyres_pressure?.[0]}
            wear={car.tyres_wear?.[0]}
            damage={car.tyres_damage?.[0]}
          />
        </div>
        <div className="flex justify-center">
          <Tyre
            position="RR"
            surfaceTemp={car.tyres_surface_temp?.[1]}
            innerTemp={car.tyres_inner_temp?.[1]}
            pressure={car.tyres_pressure?.[1]}
            wear={car.tyres_wear?.[1]}
            damage={car.tyres_damage?.[1]}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-f1-gray">
        <div className="flex justify-around text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#0066CC]"></div>
            <span className="text-gray-400">Cold</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00D656]"></div>
            <span className="text-gray-400">Optimal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF3838]"></div>
            <span className="text-gray-400">Hot</span>
          </div>
        </div>
      </div>
    </div>
  );
};
