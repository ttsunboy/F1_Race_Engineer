/**
 * Race History Component - Shows list of all completed races
 */
import React, { useEffect, useState } from 'react';
import { Trophy, Calendar, Flag, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface RaceSummary {
  id: string;
  timestamp: string;
  track: string;
  session_type: string;
  is_sprint: boolean;
  winner: string;
  total_laps: number;
}

interface RaceHistoryProps {
  onSelectRace: (raceId: string) => void;
}

export const RaceHistory: React.FC<RaceHistoryProps> = ({ onSelectRace }) => {
  const [races, setRaces] = useState<RaceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRaces();
  }, []);

  const loadRaces = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/races');
      const data = await response.json();
      setRaces(data.races || []);
    } catch (error) {
      console.error('Error loading races:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-f1-dark rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-4">Race History</h2>
        <p className="text-gray-400 text-center py-8">Loading races...</p>
      </div>
    );
  }

  if (races.length === 0) {
    return (
      <div className="bg-f1-dark rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-4">Race History</h2>
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No races completed yet</p>
          <p className="text-gray-500 text-sm mt-2">
            Complete a race in F1 24 to see it here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-f1-dark rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Race History</h2>
        <div className="text-sm text-gray-400">
          {races.length} {races.length === 1 ? 'race' : 'races'}
        </div>
      </div>

      <div className="space-y-3">
        {races.map((race) => (
          <motion.div
            key={race.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-f1-darker rounded-lg p-4 hover:bg-gray-800 transition-colors cursor-pointer group"
            onClick={() => onSelectRace(race.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Flag className="w-5 h-5 text-race-green" />
                  <h3 className="text-lg font-bold text-white">{race.track}</h3>
                  {race.is_sprint && (
                    <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded">
                      SPRINT
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(race.timestamp)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-white font-semibold">{race.winner}</span>
                  </div>
                  <div>
                    {race.total_laps} laps
                  </div>
                </div>
              </div>

              <ChevronRight className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
