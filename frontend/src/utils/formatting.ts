/**
 * Formatting utilities for telemetry data
 */

/**
 * Format milliseconds to lap time string (MM:SS.mmm)
 */
export const formatLapTime = (ms: number | undefined): string => {
  if (ms === undefined || ms === 0) return '-:--.---';

  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

/**
 * Format speed based on unit preference
 */
export const formatSpeed = (speed: number | undefined, unit: 'kmh' | 'mph' = 'kmh'): string => {
  if (speed === undefined) return '---';

  if (unit === 'mph') {
    return `${Math.round(speed * 0.621371)} mph`;
  }
  return `${speed} km/h`;
};

/**
 * Format temperature
 */
export const formatTemperature = (temp: number | undefined, unit: 'C' | 'F' = 'C'): string => {
  if (temp === undefined) return '--°';

  if (unit === 'F') {
    return `${Math.round((temp * 9 / 5) + 32)}°F`;
  }
  return `${temp}°C`;
};

/**
 * Format pressure
 */
export const formatPressure = (pressure: number | undefined): string => {
  if (pressure === undefined) return '--';
  return `${pressure.toFixed(1)} PSI`;
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number | undefined): string => {
  if (value === undefined) return '--%';
  return `${Math.round(value * 100)}%`;
};

/**
 * Format fuel
 */
export const formatFuel = (fuel: number | undefined): string => {
  if (fuel === undefined) return '--';
  return `${fuel.toFixed(1)} kg`;
};

/**
 * Format ERS energy
 */
export const formatERSEnergy = (energy: number | undefined): string => {
  if (energy === undefined) return '--';
  return `${energy.toFixed(1)} MJ`;
};

/**
 * Format tire compound name
 */
export const formatTyreCompound = (compound: string | undefined): string => {
  if (!compound) return '?';

  const upper = compound.toUpperCase();

  // Handle numeric compounds
  if (/^\d+$/.test(compound)) {
    const num = parseInt(compound);
    if (num === 0) return 'Soft';
    if (num === 1) return 'Medium';
    if (num === 2) return 'Hard';
    if (num === 7 || num === 3) return 'Inter';
    if (num === 8 || num === 4) return 'Wet';
    if (num === 16) return 'C5';
    if (num === 17) return 'C4';
    if (num === 18) return 'C3';
    if (num === 19) return 'C2';
    if (num === 20) return 'C1';
  }

  // Already formatted names
  if (upper.includes('SOFT')) return 'Soft';
  if (upper.includes('MEDIUM')) return 'Medium';
  if (upper.includes('HARD')) return 'Hard';
  if (upper.includes('INTER')) return 'Inter';
  if (upper.includes('WET')) return 'Wet';
  if (upper.match(/C[0-5]/)) return upper;

  return compound;
};

/**
 * Get short tire compound name (for display in small spaces)
 */
export const getTyreCompoundShort = (compound: string | undefined): string => {
  const formatted = formatTyreCompound(compound);

  switch (formatted) {
    case 'Soft':
      return 'S';
    case 'Medium':
      return 'M';
    case 'Hard':
      return 'H';
    case 'Inter':
      return 'I';
    case 'Wet':
      return 'W';
    default:
      return formatted.substring(0, 2);
  }
};

/**
 * Get color for tire compound
 */
export const getTyreCompoundColor = (compound: string | undefined): string => {
  if (!compound) return '#888888';

  const formatted = formatTyreCompound(compound).toUpperCase();

  if (formatted.includes('SOFT') || formatted === 'C5' || formatted === 'C4' || formatted === 'S') {
    return '#DC143C'; // Red
  }
  if (formatted.includes('MEDIUM') || formatted === 'C3' || formatted === 'M') {
    return '#FFD700'; // Yellow
  }
  if (formatted.includes('HARD') || formatted === 'C2' || formatted === 'C1' || formatted === 'H') {
    return '#FFFFFF'; // White
  }
  if (formatted.includes('INTER') || formatted === 'I') {
    return '#00D656'; // Green
  }
  if (formatted.includes('WET') || formatted === 'W') {
    return '#0066CC'; // Blue
  }

  return '#888888';
};

/**
 * Get color for DRS status
 */
export const getDRSColor = (drs: string | undefined, drsAllowed?: string): string => {
  if (drs?.toUpperCase() === 'ON' || drs?.toUpperCase() === 'ACTIVE') {
    return '#00D656'; // Green
  }
  if (drsAllowed?.toUpperCase() === 'ALLOWED') {
    return '#FFD700'; // Yellow
  }
  if (!drs) return '#888888';

  switch (drs.toUpperCase()) {
    case 'ON':
      return '#00D656'; // Green
    case 'OFF':
    case 'NOT_ALLOWED':
    case 'UNKNOWN':
      return '#888888'; // Gray
    default:
      return '#888888';
  }
};

/**
 * Get color for damage level (0-100)
 */
export const getDamageColor = (damage: number | undefined): string => {
  if (damage === undefined) return '#00D656';

  if (damage < 10) return '#00D656'; // Green
  if (damage < 30) return '#FFD700'; // Yellow
  if (damage < 70) return '#FF8C00'; // Orange
  return '#FF3838'; // Red
};

/**
 * Get color for temperature
 */
export const getTemperatureColor = (temp: number | undefined, optimal: { min: number; max: number }): string => {
  if (temp === undefined) return '#888888';

  if (temp < optimal.min - 20) return '#0066CC'; // Too cold (blue)
  if (temp < optimal.min) return '#00D656'; // Cold but ok (green)
  if (temp <= optimal.max) return '#00D656'; // Optimal (green)
  if (temp <= optimal.max + 20) return '#FFD700'; // Getting hot (yellow)
  if (temp <= optimal.max + 40) return '#FF8C00'; // Hot (orange)
  return '#FF3838'; // Too hot (red)
};
