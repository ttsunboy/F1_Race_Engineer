/**
 * Driver Detail Panel - Telemetry gauges and inputs for the player car
 */
import { useTelemetryStore } from '@/store/telemetryStore';
import { formatPercentage, getDRSColor } from '@/utils/formatting';
import { motion } from 'framer-motion';
import { Gauge } from './Gauge';

export const DriverPanel: React.FC = () => {
  const session = useTelemetryStore((state) => state.session);
  const cars = useTelemetryStore((state) => state.cars);
  const participants = useTelemetryStore((state) => state.participants);
  const playerCarIndex = useTelemetryStore((state) => state.playerCarIndex);
  const bestSectors = useTelemetryStore((state) => state.best_sectors);
  const lapHistory = useTelemetryStore((state) => state.lap_history);
  const currentLapSectors = useTelemetryStore((state) => state.current_lap_sectors);

  if (!session) {
    return (
      <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4">Driver Telemetry</h2>
        <p className="text-gray-400 text-center py-8">Waiting for session data...</p>
      </div>
    );
  }

  if (playerCarIndex === null) {
    return (
      <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4">Driver Telemetry</h2>
        <p className="text-gray-400 text-center py-8">Detecting player car...</p>
      </div>
    );
  }

  const playerCar = cars[playerCarIndex];
  const playerInfo = participants[playerCarIndex];

  if (!playerCar) {
    return (
      <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4">Driver Telemetry</h2>
        <p className="text-gray-400 text-center py-8">No player car data available</p>
      </div>
    );
  }

  const drsIsOn = ['ON', 'ACTIVE'].includes(playerCar.drs?.toUpperCase() || '');
  const drsIsAllowed = playerCar.drs_allowed?.toUpperCase() === 'ALLOWED';
  const drsLabel = drsIsOn ? 'ON' : drsIsAllowed ? 'ENABLED / OFF' : 'DISABLED';
  const drsColor = getDRSColor(playerCar.drs, playerCar.drs_allowed);

  // Format current lap time
  const formatCurrentLapTime = (ms: number | undefined): string => {
    if (ms === undefined || ms === 0) return '-:--.---';
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((totalSeconds % 1) * 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  // Use current lap sectors for live updates, fallback to last completed lap
  const displaySectors = currentLapSectors && currentLapSectors.some(s => s > 0)
    ? currentLapSectors
    : lapHistory.length > 0
      ? lapHistory[lapHistory.length - 1].sectors
      : [0, 0, 0];
  // Parse sector from string like "Sector 1" or raw number
  const parseSector = (sector: string | number | undefined): number => {
    if (!sector) return 0;
    if (typeof sector === 'number') return sector + 1; // Convert 0-indexed to 1-indexed
    const match = sector.match(/\d+/); // Extract number from "Sector 1"
    return match ? parseInt(match[0]) : 0;
  };
  const currentSector = parseSector(playerCar.sector);

  // Get sector color compared to personal best
  const getSectorColor = (sectorTime: number, sectorIndex: number): string => {
    if (!bestSectors || sectorTime === 0) return '#4a5568'; // Gray when no time

    const bestTime = sectorIndex === 0 ? bestSectors.s1 : sectorIndex === 1 ? bestSectors.s2 : bestSectors.s3;
    if (!bestTime) return '#4a5568';

    const delta = sectorTime - bestTime;
    const percentDiff = (delta / bestTime) * 100;

    if (Math.abs(delta) < 10) return '#A020F0'; // Purple - personal best (within 10ms)
    if (percentDiff <= 0.5) return '#00D656'; // Green - within 0.5%
    if (percentDiff <= 2) return '#FFD700'; // Yellow - within 2%
    return '#FF3838'; // Red - slower than 2%
  };

  // Get delta to best sector in milliseconds
  const getSectorDelta = (sectorTime: number, sectorIndex: number): number | null => {
    if (!bestSectors || sectorTime === 0) return null;
    const bestTime = sectorIndex === 0 ? bestSectors.s1 : sectorIndex === 1 ? bestSectors.s2 : bestSectors.s3;
    if (!bestTime) return null;
    return sectorTime - bestTime;
  };

  // Format delta with + or - sign
  const formatDelta = (deltaMs: number | null): string => {
    if (deltaMs === null) return '';
    const sign = deltaMs >= 0 ? '+' : '';
    return `${sign}${(deltaMs / 1000).toFixed(3)}`;
  };

  // Calculate live delta - compare current lap progress to best lap theoretical time
  const getLiveDelta = (): number | null => {
    if (!bestSectors || !playerCar.current_lap_time_ms) return null;

    const sector = currentSector;

    // Calculate theoretical best time up to current position
    let theoreticalTime = 0;

    if (sector === 1 && bestSectors.s1) {
      // In S1: compare to best S1 if we have it
      return null; // Can't compare yet, S1 not complete
    } else if (sector === 2) {
      // In S2: compare to best S1
      if (bestSectors.s1) {
        theoreticalTime = bestSectors.s1;
        if (currentLapSectors && currentLapSectors[0] > 0) {
          return currentLapSectors[0] - bestSectors.s1;
        }
      }
    } else if (sector === 3) {
      // In S3: compare to best S1 + S2
      if (bestSectors.s1 && bestSectors.s2) {
        theoreticalTime = bestSectors.s1 + bestSectors.s2;
        if (currentLapSectors && currentLapSectors[0] > 0 && currentLapSectors[1] > 0) {
          return (currentLapSectors[0] + currentLapSectors[1]) - theoreticalTime;
        }
      }
    }

    return null;
  };

  const liveDelta = getLiveDelta();

  return (
    <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">
          {playerInfo?.name || 'Driver'} - P{playerCar.position || '-'}
        </h2>
        <div className="text-xs text-gray-400">
          Lap {playerCar.current_lap || 0}
        </div>
      </div>

      {/* Current Lap Time and Sector */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="bg-f1-darker rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">CURRENT LAP</div>
          <div className="text-3xl font-mono font-bold text-race-green whitespace-nowrap">
            {formatCurrentLapTime(playerCar.current_lap_time_ms)}
          </div>
          {liveDelta !== null && (
            <div
              className="text-sm font-mono mt-1"
              style={{ color: liveDelta <= 0 ? '#00D656' : '#FF3838' }}
            >
              {formatDelta(liveDelta)}
            </div>
          )}
        </div>
        <div className="bg-f1-darker rounded-lg p-3 min-w-0">
          <div className="text-xs text-gray-400 mb-1">CURRENT SECTOR</div>
          <div className="text-lg font-bold text-white mb-2 whitespace-nowrap">
            S{currentSector}
          </div>
          {/* Show sector times with live deltas */}
          <div className="flex gap-2">
            {displaySectors.map((sectorTime, idx) => {
              const color = getSectorColor(sectorTime, idx);
              const delta = getSectorDelta(sectorTime, idx);
              const isCurrentSector = idx + 1 === currentSector;

              return (
                <div
                  key={idx}
                  className={`flex-1 text-center p-2 rounded transition-all ${
                    isCurrentSector ? 'ring-2 ring-white ring-opacity-50' : ''
                  }`}
                  style={{ backgroundColor: `${color}15`, borderLeft: `3px solid ${color}` }}
                >
                  <div className="text-xs text-gray-400 mb-1">S{idx + 1}</div>
                  <div
                    className="text-sm font-mono font-bold mb-0.5"
                    style={{ color }}
                  >
                    {sectorTime > 0 ? (sectorTime / 1000).toFixed(3) : '--'}
                  </div>
                  {delta !== null && sectorTime > 0 && (
                    <div
                      className="text-xs font-mono"
                      style={{ color: delta <= 0 ? '#00D656' : '#FF3838' }}
                    >
                      {formatDelta(delta)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Speed + Gear + RPM in one row, gear centered */}
        <div className="col-span-2 flex items-end justify-center gap-3">
          <Gauge
            value={playerCar.speed || 0}
            max={350}
            label="SPEED"
            unit="km/h"
            color="#00D656"
            size={112}
            valueClassName="text-3xl"
          />
          <motion.div
            key={playerCar.gear}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            className="flex h-[132px] min-w-[80px] flex-col items-center text-center"
          >
            <div className="bg-f1-darker rounded-lg w-20 h-20 flex items-center justify-center mt-4">
              <div className="text-4xl font-bold text-white leading-none">
                {playerCar.gear === -1 ? 'R' : playerCar.gear === 0 ? 'N' : playerCar.gear}
              </div>
            </div>
            <div className="mt-auto text-sm text-gray-400">GEAR</div>
          </motion.div>
          <Gauge
            value={playerCar.rpm || 0}
            max={playerCar.max_rpm || 15000}
            label="RPM"
            color="#FF3838"
            size={112}
            valueClassName="text-2xl"
          />
        </div>

        {/* Input Bars */}
        <div className="col-span-2 space-y-3">
          {/* Throttle */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>THROTTLE</span>
              <span>{formatPercentage(playerCar.throttle)}</span>
            </div>
            <div className="h-3 bg-f1-darker rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-race-green"
                initial={{ width: 0 }}
                animate={{ width: `${(playerCar.throttle || 0) * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          {/* Brake */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>BRAKE</span>
              <span>{formatPercentage(playerCar.brake)}</span>
            </div>
            <div className="h-3 bg-f1-darker rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-race-red"
                initial={{ width: 0 }}
                animate={{ width: `${(playerCar.brake || 0) * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          {/* Steering */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>STEERING</span>
              <span>{((playerCar.steer || 0) * 100).toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-f1-darker rounded-full overflow-hidden relative">
              <div className="absolute left-1/2 top-0 w-0.5 h-full bg-gray-600" />
              <motion.div
                className="h-full bg-blue-500 absolute"
                style={{
                  left: `${50 + (playerCar.steer || 0) * 50}%`,
                  width: `${Math.abs((playerCar.steer || 0) * 50)}%`,
                  transformOrigin: (playerCar.steer || 0) < 0 ? 'right' : 'left',
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
        </div>

        {/* DRS Status */}
        <div className="col-span-1">
          <div
            className="flex h-20 flex-col justify-center rounded-lg border-2 p-3 text-center"
            style={{
              backgroundColor: `${drsColor}22`,
              borderColor: drsIsAllowed ? '#00D656' : 'transparent',
            }}
          >
            <div className="text-xs text-gray-400 mb-1">DRS</div>
            <div className="text-sm font-bold" style={{ color: drsColor }}>
              {drsLabel}
            </div>
          </div>
        </div>

        {/* ERS Mode */}
        <div className="col-span-1">
          <div className="flex h-20 flex-col justify-center rounded-lg border-2 border-transparent bg-f1-darker p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">ERS MODE</div>
            <div className="text-sm font-bold text-yellow-400">
              {playerCar.ers_deploy_mode || 'NONE'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
