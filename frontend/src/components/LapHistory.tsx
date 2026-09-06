/**
 * Lap History Component - Shows all completed laps with sector times
 */
import React from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { formatLapTime, getTyreCompoundColor, sectorColorName } from '@/utils/formatting';
import { Pin, PinOff, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';

export const LapHistory: React.FC = () => {
  const lapHistory = useTelemetryStore((state) => state.lap_history);
  const [clearing, setClearing] = React.useState(false);
  const [pinnedLapNumber, setPinnedLapNumber] = React.useState<number | null>(null);

  // 防御: 后端清空时可能广播非数组, 统一当空数组处理
  const history = Array.isArray(lapHistory) ? lapHistory : [];

  React.useEffect(() => {
    if (pinnedLapNumber !== null && !history.some((lap) => lap.lap === pinnedLapNumber)) {
      setPinnedLapNumber(null);
    }
  }, [history, pinnedLapNumber]);

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

  // Find best lap and best valid time for each sector from the displayed history.
  const validLapTimes = history.map(l => l.time_ms).filter(t => t > 0);
  const bestLapTime = validLapTimes.length > 0 ? Math.min(...validLapTimes) : 0;
  const bestHistorySectors = [0, 1, 2].map((sectorIndex) => {
    const sectorTimes = history
      .map((lap) => lap.sectors[sectorIndex])
      .filter((time) => time > 0);
    return sectorTimes.length > 0 ? Math.min(...sectorTimes) : 0;
  });

  // Get sector color name (purple = personal best, green = good, yellow = ok, red = slow)
  const getSectorColorName = (sectorTime: number, sectorIndex: number): string => {
    if (sectorTime === 0) return 'gray';

    const bestTime = bestHistorySectors[sectorIndex];
    if (!bestTime) return 'gray';

    if (sectorTime === bestTime) return 'purple'; // Personal best
    if (sectorTime <= bestTime * 1.02) return 'green'; // within 2%
    if (sectorTime <= bestTime * 1.05) return 'yellow'; // within 5%
    return 'red'; // slower
  };

  // Actual CSS color from the shared name mapping (kept consistent with Timing Tower)
  const sectorColor = (sectorTime: number, sectorIndex: number): string =>
    sectorColorName(getSectorColorName(sectorTime, sectorIndex));

  const pinnedLap = pinnedLapNumber === null
    ? null
    : history.find((lap) => lap.lap === pinnedLapNumber) ?? null;

  const renderLap = (lap: (typeof history)[number], isReference = false) => {
    const isBestLap = lap.time_ms === bestLapTime && lap.time_ms > 0;
    const lapIndex = history.findIndex((historyLap) => historyLap.lap === lap.lap);
    const previousLap = lapIndex > 0 ? history[lapIndex - 1] : null;
    const timeDiff = previousLap && lap.time_ms > 0 && previousLap.time_ms > 0
      ? lap.time_ms - previousLap.time_ms
      : 0;

    return (
      <div
        key={`${isReference ? 'reference-' : ''}${lap.lap}`}
        className={`rounded-lg p-3 ${
          isReference
            ? 'border border-yellow-500 bg-yellow-900/20'
            : isBestLap ? 'bg-purple-900/30 border border-purple-600' : 'bg-f1-darker'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`text-lg font-bold ${isReference ? 'text-yellow-400' : isBestLap ? 'text-purple-400' : 'text-white'}`}>
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
            {isReference && <span className="text-xs font-semibold text-yellow-400">REFERENCE</span>}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className={`text-lg font-mono font-bold ${isReference ? 'text-yellow-400' : isBestLap ? 'text-purple-400' : 'text-white'}`}>
                {formatLapTime(lap.time_ms)}
              </div>
              {timeDiff !== 0 && (
                <div className={`flex items-center gap-1 text-xs ${timeDiff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {timeDiff > 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {Math.abs(timeDiff / 1000).toFixed(3)}s
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPinnedLapNumber(isReference ? null : lap.lap)}
              className="p-1 text-gray-400 hover:text-yellow-400"
              title={isReference ? 'Remove reference lap' : 'Pin as reference lap'}
              aria-label={isReference ? 'Remove reference lap' : 'Pin as reference lap'}
            >
              {isReference ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {lap.sectors.map((sectorTime, sIdx) => (
            <div
              key={sIdx}
              className="text-center p-2 rounded"
              style={{ backgroundColor: `${sectorColor(sectorTime, sIdx)}22` }}
            >
              <div className="text-xs text-gray-400">S{sIdx + 1}</div>
              <div
                className="text-sm font-mono font-bold"
                style={{ color: sectorColor(sectorTime, sIdx) }}
              >
                {sectorTime > 0 ? (sectorTime / 1000).toFixed(3) : '--'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-f1-dark rounded-lg p-4 shadow-lg flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Lap History</h2>
        <button onClick={clearLapHistory} disabled={clearing} className="text-gray-400 hover:text-white disabled:opacity-50">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="space-y-2">
          {pinnedLap && renderLap(pinnedLap, true)}
          {[...history].reverse().map((lap) => renderLap(lap))}
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
