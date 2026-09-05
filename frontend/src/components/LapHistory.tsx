/**
 * Lap History Component - Shows all completed laps with sector times
 */
import React from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { formatLapTime, getTyreCompoundColor } from '@/utils/formatting';
import { TrendingDown, TrendingUp, Trash2 } from 'lucide-react';

export const LapHistory: React.FC = () => {
  const lapHistory = useTelemetryStore((state) => state.lap_history);
  const bestSectors = useTelemetryStore((state) => state.best_sectors);
  const [clearing, setClearing] = React.useState(false);

  // 防御: 后端清空时可能广播非数组, 统一当空数组处理
  const history = Array.isArray(lapHistory) ? lapHistory : [];

  const clearLapHistory = async () => {
    try {
      setClearing(true);
      await fetch('/api/lap-history/clear', { method: 'POST' });
    } finally {
      setClearing(false);
    }
  };

  if (history.length === 0) {
    return (
      <div className="bg-f1-dark rounded-lg p-4 shadow-lg h-full min-h-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Lap History</h2>
          <button onClick={clearLapHistory} disabled={clearing} className="text-gray-400 hover:text-white disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-gray-400 text-center py-8">Complete your first lap to see history</p>
      </div>
    );
  }

  // Find best lap
  const bestLapTime = Math.min(...history.map(l => l.time_ms).filter(t => t > 0));

  // Get sector color (purple = personal best, green = good, yellow = ok, red = slow)
  const getSectorColor = (sectorTime: number, sectorIndex: number): string => {
    if (!bestSectors || sectorTime === 0) return '#888888';

    const bestTime = sectorIndex === 0 ? bestSectors.s1 : sectorIndex === 1 ? bestSectors.s2 : bestSectors.s3;
    if (!bestTime) return '#888888';

    if (sectorTime === bestTime) return '#A020F0'; // Purple - personal best
    if (sectorTime <= bestTime * 1.02) return '#00D656'; // Green - within 2%
    if (sectorTime <= bestTime * 1.05) return '#FFD700'; // Yellow - within 5%
    return '#FF3838'; // Red - slower
  };

  return (
    <div className="bg-f1-dark rounded-lg p-4 shadow-lg flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Lap History</h2>
        <button onClick={clearLapHistory} disabled={clearing} className="text-gray-400 hover:text-white disabled:opacity-50">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="space-y-2">
          {[...history].reverse().map((lap, idx) => {
            const isBestLap = lap.time_ms === bestLapTime && lap.time_ms > 0;
            const prevLap = idx < history.length - 1 ? history[history.length - idx - 2] : null;
            const timeDiff = prevLap && lap.time_ms > 0 && prevLap.time_ms > 0
              ? lap.time_ms - prevLap.time_ms
              : 0;

            return (
              <div
                key={lap.lap}
                className={`rounded-lg p-3 ${
                  isBestLap ? 'bg-purple-900/30 border border-purple-600' : 'bg-f1-darker'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`text-lg font-bold ${isBestLap ? 'text-purple-400' : 'text-white'}`}>
                      L{lap.lap}
                    </div>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: getTyreCompoundColor(lap.tire_compound),
                        color: getTyreCompoundColor(lap.tire_compound) === '#FFFFFF' ? '#000' : '#FFF',
                      }}
                    >
                      {lap.tire_age}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-mono font-bold ${isBestLap ? 'text-purple-400' : 'text-white'}`}>
                      {formatLapTime(lap.time_ms)}
                    </div>
                    {timeDiff !== 0 && (
                      <div className={`flex items-center gap-1 text-xs ${timeDiff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {timeDiff > 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                        {Math.abs(timeDiff / 1000).toFixed(3)}s
                      </div>
                    )}
                  </div>
                </div>

                {/* Sector times */}
                <div className="grid grid-cols-3 gap-2">
                  {lap.sectors.map((sectorTime, sIdx) => (
                    <div
                      key={sIdx}
                      className="text-center p-2 rounded"
                      style={{ backgroundColor: `${getSectorColor(sectorTime, sIdx)}22` }}
                    >
                      <div className="text-xs text-gray-400">S{sIdx + 1}</div>
                      <div
                        className="text-sm font-mono font-bold"
                        style={{ color: getSectorColor(sectorTime, sIdx) }}
                      >
                        {sectorTime > 0 ? (sectorTime / 1000).toFixed(3) : '--'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-f1-gray">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400 text-xs">BEST LAP</div>
            <div className="text-purple-400 font-mono font-bold">
              {formatLapTime(bestLapTime)}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">TOTAL LAPS</div>
            <div className="text-white font-bold">{history.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
