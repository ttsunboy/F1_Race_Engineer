import type { ParticipantData } from '@/types/telemetry';

// F1 24 UDP driver IDs, verified against the game's UDP driver-ID appendix.
const DRIVER_CODES: Record<number, string> = {
  0: 'SAI',
  2: 'RIC',
  3: 'ALO',
  7: 'HAM',
  9: 'VER',
  10: 'HUL',
  11: 'MAG',
  14: 'PER',
  15: 'BOT',
  17: 'OCO',
  19: 'STR',
  50: 'RUS',
  54: 'NOR',
  58: 'LEC',
  59: 'GAS',
  62: 'ALB',
  80: 'ZHO',
  94: 'TSU',
  112: 'PIA',
  113: 'LAW',
  132: 'SAR',
  147: 'BEA',
};

export function getDriverCode(participant: ParticipantData | undefined): string {
  if (!participant || participant.driver_id === undefined) return 'UNK';
  return DRIVER_CODES[participant.driver_id] ?? 'UNK';
}
