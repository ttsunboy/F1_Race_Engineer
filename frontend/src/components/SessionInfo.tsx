/**
 * Session Information Component - 赛况 (绿旗/SC/VSC) + 天气与预报
 */
import React, { useState } from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { formatTemperature, formatLapTime } from '@/utils/formatting';
import {
  BsSunFill, BsCloudSunFill, BsCloudsFill, BsCloudDrizzleFill,
  BsCloudRainHeavyFill, BsCloudLightningRainFill,
  BsMoonStarsFill, BsCloudMoonFill,
  BsFlag, BsShield, BsFillExclamationTriangleFill,
  BsChevronLeft, BsChevronRight,
} from 'react-icons/bs';

// 天气图标 (Bootstrap Icons, 用 filled 实心版):
//   0 Clear = bi-sun-fill (夜间: bi-moon-stars-fill)
//   1 Light Cloud = bi-cloud-sun-fill (夜间: bi-cloud-moon-fill)
//   2 Overcast = bi-clouds-fill
//   3 Light Rain = bi-cloud-drizzle-fill
//   4 Heavy Rain = bi-cloud-rain-heavy-fill
//   5 Storm = bi-cloud-lightning-rain-fill
// 后端 weather 值是带空格的字符串, 归一化后匹配; nightIcon 用于夜间晴天/少云
const WEATHER_META: Record<string, { icon: React.ReactNode; nightIcon?: React.ReactNode; color: string; label: string }> = {
  CLEAR: { icon: <BsSunFill />, nightIcon: <BsMoonStarsFill />, color: 'text-yellow-400', label: 'Clear 晴' },
  LIGHT_CLOUD: { icon: <BsCloudSunFill />, nightIcon: <BsCloudMoonFill />, color: 'text-gray-300', label: 'Light Cloud 少云' },
  OVERCAST: { icon: <BsCloudsFill />, color: 'text-gray-400', label: 'Overcast 阴天' },
  LIGHT_RAIN: { icon: <BsCloudDrizzleFill />, color: 'text-blue-300', label: 'Light Rain 小雨' },
  HEAVY_RAIN: { icon: <BsCloudRainHeavyFill />, color: 'text-blue-400', label: 'Heavy Rain 大雨' },
  STORM: { icon: <BsCloudLightningRainFill />, color: 'text-purple-400', label: 'Storm 雷暴' },
};

// 夜间判断: time_of_day 是当天经过的毫秒数, 约 19:00-06:00 视为夜赛
const isNightTime = (timeOfDay: number | undefined): boolean => {
  if (!timeOfDay || timeOfDay <= 0) return false;
  const hour = (timeOfDay / 3600000) % 24;
  return hour >= 19 || hour < 6;
};

const getWeatherMeta = (weather: string | undefined, night = false) => {
  if (!weather) return WEATHER_META.OVERCAST;
  const meta = WEATHER_META[weather.toUpperCase().replace(/ /g, '_')] ?? WEATHER_META.OVERCAST;
  // 夜间: 晴天/少云换成月亮图标
  if (night && meta.nightIcon) {
    return { ...meta, icon: meta.nightIcon };
  }
  return meta;
};

const formatForecastOffset = (offset: number): string => {
  if (!Number.isFinite(offset)) return '?';
  return Number.isInteger(offset) ? String(offset) : offset.toFixed(1);
};

// safety_car_status: 0=绿旗 1=SC 2=VSC 3=编队圈
const STATUS_META: Record<number, { label: string; cls: string; icon: React.ReactNode; pulse: boolean }> = {
  0: {
    label: 'GREEN FLAG',
    cls: 'border-green-700/60 bg-green-900/30 text-green-300',
    icon: <BsFlag className="w-4 h-4" />,
    pulse: false,
  },
  1: {
    label: 'SAFETY CAR',
    cls: 'border-yellow-500 bg-yellow-500/15 text-yellow-300',
    icon: <BsShield className="w-4 h-4" />,
    pulse: true,
  },
  2: {
    label: 'VIRTUAL SAFETY CAR',
    cls: 'border-orange-500 bg-orange-500/15 text-orange-300',
    icon: <BsFillExclamationTriangleFill className="w-4 h-4" />,
    pulse: true,
  },
  3: {
    label: 'FORMATION LAP',
    cls: 'border-gray-500 bg-gray-700/30 text-gray-300',
    icon: <BsFlag className="w-4 h-4" />,
    pulse: false,
  },
};

export const SessionInfo: React.FC = () => {
  const session = useTelemetryStore((state) => state.session);
  const connected = useTelemetryStore((state) => state.connected);

  // 每张卡片一次显示一个样本，左右箭头切换预报时段。
  const [weatherIdx, setWeatherIdx] = useState(0);
  const [trackTempIdx, setTrackTempIdx] = useState(0);
  const [airTempIdx, setAirTempIdx] = useState(0);

  const sessionDuration = session?.session_duration || 0;
  const timeLeft = session?.session_time_left || 0;
  const canShowElapsed = sessionDuration > 0 && timeLeft >= 0 && timeLeft <= sessionDuration;
  const elapsedTime = canShowElapsed ? Math.max(0, sessionDuration - timeLeft) : 0;
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;

  const status = STATUS_META[session?.safety_car_status ?? 0] ?? STATUS_META[0];

  const currentSessionType = session?.session_type || '';
  const currentSessionTypeId = session?.session_type_id;
  const forecastSamples = session?.weather_forecast_samples ?? [];

  // Real F1 24 packets can contain forecast rows for MULTIPLE session types
  // (e.g. current P3 plus future Q1/Q2/Q3/Race). We only want to show the
  // forecast for the CURRENT session here, and we should never render offset=0
  // as a fake "+0min" forecast card.
  const sameSessionForecast = forecastSamples.filter((sample) => {
    if (!sample || !Number.isFinite(sample.time_offset)) return false;
    if ((sample.time_offset ?? 0) <= 0) return false;

    if (sample.session_type_id !== undefined && currentSessionTypeId !== undefined) {
      return sample.session_type_id === currentSessionTypeId;
    }
    if (sample.session_type && currentSessionType) {
      return sample.session_type === currentSessionType;
    }
    return false;
  });

  // Dedupe inside the SAME session by time offset only.
  const samples = Object.values(
    sameSessionForecast.reduce((acc, f) => {
      acc[f.time_offset] = f;
      return acc;
    }, {} as Record<number, (typeof sameSessionForecast)[number]>)
  ).sort((a, b) => a.time_offset - b.time_offset);

  const currentWeather = session?.weather || '';
  const currentTrackTemp = session?.track_temperature || 0;
  const currentAirTemp = session?.air_temperature || 0;
  const currentRain = forecastSamples.find((sample) => {
    if (!sample) return false;
    if (sample.session_type_id !== undefined && currentSessionTypeId !== undefined) {
      return sample.session_type_id === currentSessionTypeId && sample.time_offset === 0;
    }
    if (sample.session_type && currentSessionType) {
      return sample.session_type === currentSessionType && sample.time_offset === 0;
    }
    return false;
  })?.rain_percentage ?? 0;

  // Compress each forecast dimension independently.
  const weatherSamples = samples.filter((sample, index) => {
    const previous = index === 0
      ? { weather: currentWeather, rain_percentage: currentRain }
      : samples[index - 1];
    return sample.weather !== previous.weather
      || sample.rain_percentage !== previous.rain_percentage;
  });
  const trackSamplesOnly = samples.filter((sample, index) => {
    const previousTrack = index === 0 ? currentTrackTemp : samples[index - 1].track_temperature;
    return sample.track_temperature !== previousTrack;
  });
  const airSamplesOnly = samples.filter((sample, index) => {
    const previousAir = index === 0 ? currentAirTemp : samples[index - 1].air_temperature;
    return sample.air_temperature !== previousAir;
  });

  const hasWeatherChange = weatherSamples.length > 0;
  const hasTrackTempChange = trackSamplesOnly.length > 0;
  const hasAirTempChange = airSamplesOnly.length > 0;
  const hasForecastChanges = hasWeatherChange || hasTrackTempChange || hasAirTempChange;

  const windowStart = (idx: number, total: number) => (total ? Math.min(idx, total - 1) : 0);
  const windowSamples = <T,>(items: T[], start: number) => items.slice(start, start + 1);

  const makeNav = (idx: number, setIdx: (n: number) => void, total: number) => {
    const maxStart = Math.max(0, total - 1);
    return {
      canPrev: total > 1 && idx > 0,
      canNext: total > 1 && idx < maxStart,
      prev: () => setIdx(Math.max(0, idx - 1)),
      next: () => setIdx(Math.min(maxStart, idx + 1)),
    };
  };
  const weatherNav = makeNav(weatherIdx, setWeatherIdx, weatherSamples.length);
  const trackNav = makeNav(trackTempIdx, setTrackTempIdx, trackSamplesOnly.length);
  const airNav = makeNav(airTempIdx, setAirTempIdx, airSamplesOnly.length);

  React.useEffect(() => {
    const maxWeather = Math.max(0, weatherSamples.length - 1);
    const maxTrack = Math.max(0, trackSamplesOnly.length - 1);
    const maxAir = Math.max(0, airSamplesOnly.length - 1);
    if (weatherIdx > maxWeather) setWeatherIdx(maxWeather);
    if (trackTempIdx > maxTrack) setTrackTempIdx(maxTrack);
    if (airTempIdx > maxAir) setAirTempIdx(maxAir);
  }, [weatherSamples.length, trackSamplesOnly.length, airSamplesOnly.length, weatherIdx, trackTempIdx, airTempIdx]);

  const wStart = windowStart(weatherIdx, weatherSamples.length);
  const tStart = windowStart(trackTempIdx, trackSamplesOnly.length);
  const aStart = windowStart(airTempIdx, airSamplesOnly.length);
  const wSamples = windowSamples(weatherSamples, wStart);
  const tSamples = windowSamples(trackSamplesOnly, tStart);
  const aSamples = windowSamples(airSamplesOnly, aStart);

  const isNight = isNightTime(session?.time_of_day);
  const curWeather = getWeatherMeta(session?.weather, isNight);

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

        {/* Elapsed time and race status */}
        <div className="flex items-stretch gap-2">
          <div className="min-w-0 flex-1 rounded-lg bg-f1-darker p-3">
            <div className="text-xs text-gray-400 mb-1">{canShowElapsed ? 'ELAPSED TIME' : 'SESSION TIME'}</div>
            <div className="text-2xl font-mono font-bold text-white">
              {canShowElapsed ? `${minutes}:${seconds.toString().padStart(2, '0')}` : formatLapTime((session.session_time || 0) * 1000)}
            </div>
          </div>
          <div
            className={`flex min-w-[112px] flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center ${status.cls} ${
              status.pulse ? 'animate-pulse' : ''
            }`}
          >
            {status.icon}
            <span className="text-[10px] font-bold leading-tight tracking-wide">{status.label}</span>
          </div>
        </div>

        {/* 预报: 只显示“当前 session”的 future sample (time_offset > 0) */}
        {hasForecastChanges && <div className="space-y-2">
          {/* Weather 卡片 */}
          {hasWeatherChange && <div className="bg-f1-darker rounded-lg p-2.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide w-16 shrink-0">Weather</div>
            <div
              title={curWeather.label}
              className="flex flex-col items-center justify-center w-10 h-14 shrink-0 py-1 min-w-0"
            >
              <span className={`text-2xl ${curWeather.color} leading-none`}>{curWeather.icon}</span>
            </div>
            <button
              onClick={weatherNav.prev}
              disabled={!weatherNav.canPrev}
              className="shrink-0 w-6 h-6 mx-1 flex items-center justify-center rounded bg-f1-dark text-gray-500 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <BsChevronLeft className="w-3 h-3" />
            </button>
            <div className="flex-1 flex items-center justify-center gap-2 overflow-hidden min-w-0">
              {weatherSamples.length === 0 ? (
                <span className="text-[10px] text-gray-600">No forecast</span>
              ) : (
                wSamples.map((f) => {
                  const meta = getWeatherMeta(f.weather, isNight);
                  const rain = f.rain_percentage ?? 0;
                  return (
                    <div
                      key={f.time_offset}
                      className="flex flex-col items-center justify-between w-10 h-14 shrink-0 py-1 min-w-0"
                      title={`${meta.label}${rain > 0 ? ` · 降雨 ${rain}%` : ''} · +${formatForecastOffset(f.time_offset)}min`}
                    >
                      <span className={`text-2xl ${meta.color} leading-none`}>{meta.icon}</span>
                      <span className={`text-[10px] leading-none ${rain > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                        {rain > 0 ? `${rain}%` : '·'}
                      </span>
                      <span className="text-[10px] text-gray-300 leading-none whitespace-nowrap">+{formatForecastOffset(f.time_offset)}min</span>
                    </div>
                  );
                })
              )}
            </div>
            <button
              onClick={weatherNav.next}
              disabled={!weatherNav.canNext}
              className="shrink-0 w-6 h-6 mx-1 flex items-center justify-center rounded bg-f1-dark text-gray-500 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <BsChevronRight className="w-3 h-3" />
            </button>
          </div>
          </div>}

          {/* Track Temp 卡片 */}
          {hasTrackTempChange && <div className="bg-f1-darker rounded-lg p-2.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide w-16 shrink-0">Track</div>
            <div className="flex flex-col items-center justify-center w-11 h-14 shrink-0 py-1">
              <span className="text-xl font-bold text-white leading-none whitespace-nowrap">{formatTemperature(currentTrackTemp)}</span>
            </div>
            <button
              onClick={trackNav.prev}
              disabled={!trackNav.canPrev}
              className="shrink-0 w-6 h-6 mx-1 flex items-center justify-center rounded bg-f1-dark text-gray-500 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <BsChevronLeft className="w-3 h-3" />
            </button>
            <div className="flex-1 flex items-center justify-center gap-2 overflow-hidden min-w-0">
              {trackSamplesOnly.length === 0 ? (
                <span className="text-[10px] text-gray-600">No forecast</span>
              ) : (
                tSamples.map((f) => (
                  <div key={f.time_offset} className="flex flex-col items-center justify-center w-10 h-14 shrink-0 py-1 min-w-0">
                    <span className="text-xl font-bold text-white leading-none whitespace-nowrap">{formatTemperature(f.track_temperature)}</span>
                    <span className="text-[10px] text-gray-300 leading-none whitespace-nowrap">+{formatForecastOffset(f.time_offset)}min</span>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={trackNav.next}
              disabled={!trackNav.canNext}
              className="shrink-0 w-6 h-6 mx-1 flex items-center justify-center rounded bg-f1-dark text-gray-500 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <BsChevronRight className="w-3 h-3" />
            </button>
          </div>
          </div>}

          {/* Air Temp 卡片 */}
          {hasAirTempChange && <div className="bg-f1-darker rounded-lg p-2.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide w-16 shrink-0">Air</div>
            <div className="flex flex-col items-center justify-center w-11 h-14 shrink-0 py-1">
              <span className="text-xl font-bold text-white leading-none whitespace-nowrap">{formatTemperature(currentAirTemp)}</span>
            </div>
            <button
              onClick={airNav.prev}
              disabled={!airNav.canPrev}
              className="shrink-0 w-6 h-6 mx-1 flex items-center justify-center rounded bg-f1-dark text-gray-500 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <BsChevronLeft className="w-3 h-3" />
            </button>
            <div className="flex-1 flex items-center justify-center gap-2 overflow-hidden min-w-0">
              {airSamplesOnly.length === 0 ? (
                <span className="text-[10px] text-gray-600">No forecast</span>
              ) : (
                aSamples.map((f) => (
                  <div key={f.time_offset} className="flex flex-col items-center justify-center w-10 h-14 shrink-0 py-1 min-w-0">
                    <span className="text-xl font-bold text-white leading-none whitespace-nowrap">{formatTemperature(f.air_temperature)}</span>
                    <span className="text-[10px] text-gray-300 leading-none whitespace-nowrap">+{formatForecastOffset(f.time_offset)}min</span>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={airNav.next}
              disabled={!airNav.canNext}
              className="shrink-0 w-6 h-6 mx-1 flex items-center justify-center rounded bg-f1-dark text-gray-500 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <BsChevronRight className="w-3 h-3" />
            </button>
          </div>
          </div>}
        </div>
        }

        {/* Pit speed limit */}
        <div className="text-xs text-center text-gray-400 pt-2 border-t border-f1-gray">
          Pit Speed Limit: <span className="text-white font-mono">{session.pit_speed_limit || 0} km/h</span>
        </div>
      </div>
    </div>
  );
};
