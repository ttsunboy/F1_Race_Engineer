/**
 * Session Information Component
 */
import React from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { formatTemperature } from '@/utils/formatting';
import { Cloud, CloudRain, Sun } from 'lucide-react';

export const SessionInfo: React.FC = () => {
  const session = useTelemetryStore((state) => state.session);
  const connected = useTelemetryStore((state) => state.connected);

  if (!session) {
    return (
      <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4">Session</h2>
        <div className="text-center py-4">
          <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${connected ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
          <p className="text-gray-400 text-sm">
            {connected ? 'Waiting for session...' : 'Disconnected'}
          </p>
        </div>
      </div>
    );
  }

  const sessionDuration = session.session_duration || 0;
  const timeLeft = session.session_time_left || 0;
  const elapsedTime = sessionDuration - timeLeft;
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;

  const getWeatherIcon = (weather: string | undefined) => {
    if (!weather) return <Cloud className="w-5 h-5 text-gray-400" />;

    switch (weather.toUpperCase()) {
      case 'CLEAR':
        return <Sun className="w-5 h-5 text-yellow-400" />;
      case 'LIGHT_RAIN':
      case 'HEAVY_RAIN':
      case 'STORM':
        return <CloudRain className="w-5 h-5 text-blue-400" />;
      default:
        return <Cloud className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Session</h2>
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-race-green' : 'bg-red-500'}`}></div>
      </div>

      <div className="space-y-3">
        {/* Session type and track */}
        <div>
          <div className="text-2xl font-bold text-white">
            {session.session_type?.replace('_', ' ') || 'Unknown Session'}
          </div>
          <div className="text-sm text-gray-400">
            {session.track_id?.replace('_', ' ') || 'Unknown Track'}
          </div>
        </div>

        {/* Elapsed time */}
        <div className="bg-f1-darker rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">ELAPSED TIME</div>
          <div className="text-2xl font-mono font-bold text-white">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>

        {/* Weather and temperature */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-f1-darker rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {getWeatherIcon(session.weather)}
              <span className="text-xs text-gray-400">Weather</span>
            </div>
            <div className="text-sm text-white">
              {session.weather?.replace('_', ' ') || 'Unknown'}
            </div>
          </div>

          <div className="bg-f1-darker rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">Track Temp</div>
            <div className="text-sm text-white font-mono">
              {formatTemperature(session.track_temperature || 0)}
            </div>
          </div>

          <div className="bg-f1-darker rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">Air Temp</div>
            <div className="text-sm text-white font-mono">
              {formatTemperature(session.air_temperature || 0)}
            </div>
          </div>

          <div className="bg-f1-darker rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">Total Laps</div>
            <div className="text-sm text-white font-mono">
              {session.total_laps || 0}
            </div>
          </div>
        </div>

        {/* Pit speed limit */}
        <div className="text-xs text-center text-gray-400 pt-2 border-t border-f1-gray">
          Pit Speed Limit: <span className="text-white font-mono">{session.pit_speed_limit || 0} km/h</span>
        </div>
      </div>
    </div>
  );
};
