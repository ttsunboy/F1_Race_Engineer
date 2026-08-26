/**
 * Session Information Component - 赛况 (绿旗/SC/VSC) + 天气与预报
 */
import React from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { formatTemperature } from '@/utils/formatting';
import { Cloud, CloudRain, Sun, Flag, Shield, AlertTriangle } from 'lucide-react';

// 天气图标: 后端 weather 值含空格 ("Light Rain"), 归一化后再匹配
const getWeatherIcon = (weather: string | undefined, size = 'w-5 h-5') => {
  if (!weather) return <Cloud className={`${size} text-gray-400`} />;
  switch (weather.toUpperCase().replace(/ /g, '_')) {
    case 'CLEAR':
      return <Sun className={`${size} text-yellow-400`} />;
    case 'LIGHT_RAIN':
    case 'HEAVY_RAIN':
    case 'STORM':
      return <CloudRain className={`${size} text-blue-400`} />;
    default:
      return <Cloud className={`${size} text-gray-400`} />;
  }
};

// safety_car_status: 0=绿旗 1=SC 2=VSC 3=编队圈
const STATUS_META: Record<number, { label: string; cls: string; icon: React.ReactNode; pulse: boolean }> = {
  0: {
    label: '绿旗 GREEN',
    cls: 'border-green-700/60 bg-green-900/30 text-green-300',
    icon: <Flag className="w-4 h-4" />,
    pulse: false,
  },
  1: {
    label: 'SAFETY CAR',
    cls: 'border-yellow-500 bg-yellow-500/15 text-yellow-300',
    icon: <Shield className="w-4 h-4" />,
    pulse: true,
  },
  2: {
    label: 'VSC 虚拟安全车',
    cls: 'border-orange-500 bg-orange-500/15 text-orange-300',
    icon: <AlertTriangle className="w-4 h-4" />,
    pulse: true,
  },
  3: {
    label: '编队圈',
    cls: 'border-gray-500 bg-gray-700/30 text-gray-300',
    icon: <Flag className="w-4 h-4" />,
    pulse: false,
  },
};

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

  const status = STATUS_META[session.safety_car_status] ?? STATUS_META[0];

  // 预报样本: 第一个 time_offset=0 是当前时刻, 取后面 5 个 (每 3 分钟一个)
  const forecast = (session.weather_forecast_samples ?? [])
    .filter((f) => f.time_offset > 0)
    .slice(0, 5);

  return (
    <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Session</h2>
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-race-green' : 'bg-red-500'}`}></div>
      </div>

      <div className="space-y-3">
        {/* 实时赛况指示 (需求 A): SC/VSC 高亮 */}
        <div
          className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 ${status.cls} ${
            status.pulse ? 'animate-pulse' : ''
          }`}
        >
          {status.icon}
          <span className="text-sm font-bold tracking-wide">{status.label}</span>
        </div>

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

        {/* 天气面板: 四行, 每行一个 div, 标题在上、内容横排在下 */}
        <div className="bg-f1-darker rounded-lg p-3 space-y-3">
          {/* 天气 */}
          <div className="bg-f1-dark rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">Weather</div>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
              <div className="flex items-center gap-1.5">
                {getWeatherIcon(session.weather)}
                <span className="text-sm text-white">
                  {session.weather?.replace('_', ' ') || 'Unknown'}
                </span>
              </div>
              {forecast.map((f) => (
                <div key={f.time_offset} className="flex items-center gap-1"
                     title={`${f.weather}${f.rain_percentage > 0 ? ` · 降雨 ${f.rain_percentage}%` : ''}`}>
                  <span className="text-gray-600">-</span>
                  {getWeatherIcon(f.weather, 'w-4 h-4')}
                  <span className="text-[9px] text-gray-500">+{Math.round(f.time_offset / 60)}min</span>
                </div>
              ))}
            </div>
          </div>

          {/* 赛道温度 */}
          <div className="bg-f1-dark rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">Track Temp</div>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
              <span className="text-sm text-white font-mono">
                {formatTemperature(session.track_temperature || 0)}
              </span>
              {forecast.map((f) => (
                <span key={f.time_offset} className="text-xs font-mono text-gray-300">
                  - {formatTemperature(f.track_temperature)}
                  <span className="text-[9px] text-gray-500"> +{Math.round(f.time_offset / 60)}min</span>
                </span>
              ))}
            </div>
          </div>

          {/* 空气温度 */}
          <div className="bg-f1-dark rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">Air Temp</div>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
              <span className="text-sm text-white font-mono">
                {formatTemperature(session.air_temperature || 0)}
              </span>
              {forecast.map((f) => (
                <span key={f.time_offset} className="text-xs font-mono text-gray-300">
                  - {formatTemperature(f.air_temperature)}
                  <span className="text-[9px] text-gray-500"> +{Math.round(f.time_offset / 60)}min</span>
                </span>
              ))}
            </div>
          </div>

          {/* 总圈数 */}
          <div className="bg-f1-dark rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">Total Laps</div>
            <span className="text-sm text-white font-mono">{session.total_laps || 0}</span>
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
