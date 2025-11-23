/**
 * Race Recap Component - Shows detailed race recap with results, story, and statistics
 */
import React, { useEffect, useState } from 'react';
import { Trophy, Award, TrendingUp, X, Calendar, MapPin, Cloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatLapTime } from '@/utils/formatting';

interface RaceResult {
  position: number;
  driver_name: string;
  team: string;
  points: number;
  fastest_lap: boolean;
  total_laps: number;
  best_lap: number;
  positions_gained: number;
}

interface RaceRecap {
  id: string;
  timestamp: string;
  session_info: {
    track: string;
    session_type: string;
    total_laps: number;
    weather: string;
    track_temp: number;
    air_temp: number;
  };
  is_sprint: boolean;
  results: RaceResult[];
  fastest_lap: {
    driver: string;
    time: number;
  } | null;
  race_story: string[];
  statistics: {
    total_overtakes: number;
    lead_changes: number;
    total_laps: number;
  };
}

interface RaceRecapProps {
  raceId: string;
  onClose: () => void;
}

export const RaceRecap: React.FC<RaceRecapProps> = ({ raceId, onClose }) => {
  const [recap, setRecap] = useState<RaceRecap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecap();
  }, [raceId]);

  const loadRecap = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/races/${raceId}`);
      const data = await response.json();
      setRecap(data);
    } catch (error) {
      console.error('Error loading race recap:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
        <div className="bg-f1-dark rounded-lg p-8">
          <p className="text-white">Loading race recap...</p>
        </div>
      </div>
    );
  }

  if (!recap) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
        <div className="bg-f1-dark rounded-lg p-8">
          <p className="text-white">Race not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-race-red text-white rounded hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-yellow-400';
    if (position === 2) return 'text-gray-300';
    if (position === 3) return 'text-orange-400';
    return 'text-white';
  };

  const getPodiumEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return '';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-f1-dark rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-f1-dark border-b border-gray-700 p-6 flex items-center justify-between z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <h1 className="text-3xl font-bold text-white">Race Recap</h1>
                {recap.is_sprint && (
                  <span className="px-3 py-1 bg-purple-600 text-white text-sm font-bold rounded">
                    SPRINT
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {recap.session_info.track}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(recap.timestamp)}
                </div>
                <div className="flex items-center gap-1">
                  <Cloud className="w-4 h-4" />
                  {recap.session_info.weather}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Race Story */}
            {recap.race_story && recap.race_story.length > 0 && (
              <div className="bg-f1-darker rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-race-green" />
                  Race Story
                </h2>
                <div className="space-y-2">
                  {recap.race_story.map((line, idx) => (
                    <p key={idx} className="text-gray-300 text-sm">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-f1-darker rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-race-green">
                  {recap.statistics.total_overtakes}
                </div>
                <div className="text-sm text-gray-400">Overtakes</div>
              </div>
              <div className="bg-f1-darker rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {recap.statistics.lead_changes}
                </div>
                <div className="text-sm text-gray-400">Lead Changes</div>
              </div>
              <div className="bg-f1-darker rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {recap.statistics.total_laps}
                </div>
                <div className="text-sm text-gray-400">Total Laps</div>
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-f1-darker rounded-lg overflow-hidden">
              <div className="p-4 bg-gray-800 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Final Results
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-800 text-gray-400 text-sm">
                      <th className="px-4 py-3 text-left">Pos</th>
                      <th className="px-4 py-3 text-left">Driver</th>
                      <th className="px-4 py-3 text-left">Team</th>
                      <th className="px-4 py-3 text-center">Points</th>
                      <th className="px-4 py-3 text-center">Best Lap</th>
                      <th className="px-4 py-3 text-center">Gained</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recap.results.map((result) => (
                      <tr
                        key={result.position}
                        className="border-t border-gray-700 hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className={`font-bold text-lg ${getPositionColor(result.position)}`}>
                            {getPodiumEmoji(result.position)} {result.position}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{result.driver_name}</span>
                            {result.fastest_lap && (
                              <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded">
                                FL
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-400">{result.team}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-white font-bold">{result.points}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-400 font-mono text-sm">
                          {result.best_lap > 0 ? formatLapTime(result.best_lap) : '--'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {result.positions_gained !== 0 && (
                            <div className="flex items-center justify-center gap-1">
                              <TrendingUp
                                className={`w-4 h-4 ${result.positions_gained > 0 ? 'text-green-500 rotate-0' : 'text-red-500 rotate-180'}`}
                              />
                              <span className={result.positions_gained > 0 ? 'text-green-500' : 'text-red-500'}>
                                {Math.abs(result.positions_gained)}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fastest Lap */}
            {recap.fastest_lap && (
              <div className="bg-purple-900 bg-opacity-30 border border-purple-600 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-purple-400" />
                    <div>
                      <div className="text-sm text-gray-400">Fastest Lap</div>
                      <div className="text-lg font-bold text-white">{recap.fastest_lap.driver}</div>
                    </div>
                  </div>
                  <div className="text-2xl font-mono font-bold text-purple-400">
                    {formatLapTime(recap.fastest_lap.time)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
