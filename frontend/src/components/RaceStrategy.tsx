/**
 * Race Strategy Component - Tire allocation, pit planning, and position tracking
 */
import React, { useState } from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { Plus, Trash2, Flag, TrendingUp, TrendingDown } from 'lucide-react';

export const RaceStrategy: React.FC = () => {
  const raceStrategy = useTelemetryStore((state) => state.race_strategy);
  const updateRaceStrategy = useTelemetryStore((state) => state.updateRaceStrategy);
  const startingGrid = useTelemetryStore((state) => state.starting_grid);
  const [newPitStop, setNewPitStop] = useState({ lap: 0, tire_compound: 'MEDIUM', note: '' });

  const handleTireAllocationChange = (compound: string, value: number) => {
    updateRaceStrategy({
      tire_allocation: {
        ...raceStrategy.tire_allocation,
        [compound]: Math.max(0, value),
      },
    });
  };

  const addPitStop = () => {
    if (newPitStop.lap > 0) {
      updateRaceStrategy({
        planned_pit_stops: [
          ...raceStrategy.planned_pit_stops,
          { ...newPitStop },
        ].sort((a, b) => a.lap - b.lap),
      });
      setNewPitStop({ lap: 0, tire_compound: 'MEDIUM', note: '' });
    }
  };

  const removePitStop = (index: number) => {
    updateRaceStrategy({
      planned_pit_stops: raceStrategy.planned_pit_stops.filter((_, i) => i !== index),
    });
  };

  const getTireColor = (compound: string): string => {
    switch (compound.toLowerCase()) {
      case 'soft': return '#DC143C';
      case 'medium': return '#FFD700';
      case 'hard': return '#FFFFFF';
      case 'inter': return '#00D656';
      case 'wet': return '#0066CC';
      default: return '#888888';
    }
  };

  const positionChange = startingGrid
    ? startingGrid.start_position - startingGrid.current_position
    : 0;

  return (
    <div className="bg-f1-dark rounded-lg p-4 shadow-lg h-full flex flex-col">
      <h2 className="text-lg font-bold text-white mb-4">Race Strategy</h2>

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Starting Position */}
        {startingGrid && (
          <div className="bg-f1-darker rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">GRID POSITION</span>
              </div>
              <div className="text-2xl font-bold text-white">
                P{startingGrid.start_position}
              </div>
            </div>
            {startingGrid.current_position > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-f1-gray">
                <span className="text-xs text-gray-400">CURRENT</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">
                    P{startingGrid.current_position}
                  </span>
                  {positionChange !== 0 && (
                    <span
                      className={`flex items-center gap-1 text-sm font-bold ${
                        positionChange > 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {positionChange > 0 ? (
                        <>
                          <TrendingUp className="w-4 h-4" />
                          +{positionChange}
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-4 h-4" />
                          {positionChange}
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tire Allocation */}
        <div className="bg-f1-darker rounded-lg p-4">
          <h3 className="text-sm font-bold text-white mb-3">TIRE ALLOCATION</h3>
          <div className="space-y-2">
            {Object.entries(raceStrategy.tire_allocation).map(([compound, count]) => (
              <div key={compound} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getTireColor(compound) }}
                  />
                  <span className="text-sm text-gray-300 capitalize">{compound}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTireAllocationChange(compound, count - 1)}
                    className="w-6 h-6 bg-f1-gray rounded hover:bg-gray-600 text-white text-sm"
                  >
                    -
                  </button>
                  <span className="text-white font-bold w-8 text-center">{count}</span>
                  <button
                    onClick={() => handleTireAllocationChange(compound, count + 1)}
                    className="w-6 h-6 bg-f1-gray rounded hover:bg-gray-600 text-white text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Planned Pit Stops */}
        <div className="bg-f1-darker rounded-lg p-4">
          <h3 className="text-sm font-bold text-white mb-3">PLANNED PIT STOPS</h3>

          {/* Existing pit stops */}
          <div className="space-y-2 mb-3">
            {raceStrategy.planned_pit_stops.map((pit, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-f1-dark rounded p-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white font-mono">L{pit.lap}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getTireColor(pit.tire_compound) }}
                    />
                    <span className="text-sm text-gray-300">{pit.tire_compound}</span>
                  </div>
                  {pit.note && (
                    <span className="text-xs text-gray-400 italic">{pit.note}</span>
                  )}
                </div>
                <button
                  onClick={() => removePitStop(idx)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add pit stop */}
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Lap"
              value={newPitStop.lap || ''}
              onChange={(e) => setNewPitStop({ ...newPitStop, lap: parseInt(e.target.value) || 0 })}
              className="w-16 bg-f1-dark text-white px-2 py-1 rounded text-sm"
            />
            <select
              value={newPitStop.tire_compound}
              onChange={(e) => setNewPitStop({ ...newPitStop, tire_compound: e.target.value })}
              className="flex-1 bg-f1-dark text-white px-2 py-1 rounded text-sm"
            >
              <option value="SOFT">Soft</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
              <option value="INTER">Inter</option>
              <option value="WET">Wet</option>
            </select>
            <button
              onClick={addPitStop}
              className="bg-race-green text-white px-3 py-1 rounded hover:bg-green-600 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            placeholder="Note (optional)"
            value={newPitStop.note}
            onChange={(e) => setNewPitStop({ ...newPitStop, note: e.target.value })}
            className="w-full mt-2 bg-f1-dark text-white px-2 py-1 rounded text-sm"
          />
        </div>
      </div>
    </div>
  );
};
