/**
 * Maps F1 24 track_id -> julesr0y/f1-circuits-svg layout filename.
 * Track SVGs: julesr0y/f1-circuits-svg, CC-BY 4.0 (attribution embedded in each SVG).
 *
 * The backend (backend/app/utils/enums.py TRACK_IDS, surfaced via the
 * TrackID IntEnum) sends `session.track_id` as the enum *name* (e.g.
 * "SILVERSTONE", "SPA", "ABU_DHABI"). Layouts below are the current
 * F1 2024/2025/2026 layout per circuits.json.
 */

const TRACK_SVG_MAP: Record<string, string> = {
  MELBOURNE: 'melbourne-2',
  PAUL_RICARD: 'paul-ricard-3',
  SHANGHAI: 'shanghai-1',
  SAKHIR: 'bahrain-1',
  CATALUNYA: 'catalunya-6',
  MONACO: 'monaco-6',
  MONTREAL: 'montreal-6',
  SILVERSTONE: 'silverstone-8',
  HOCKENHEIM: 'hockenheimring-4',
  HUNGARORING: 'hungaroring-3',
  SPA: 'spa-francorchamps-4',
  MONZA: 'monza-7',
  SINGAPORE: 'marina-bay-4',
  SUZUKA: 'suzuka-2',
  ABU_DHABI: 'yas-marina-2',
  TEXAS: 'austin-1',
  BRAZIL: 'interlagos-2',
  AUSTRIA: 'spielberg-3',
  SOCHI: 'sochi-1',
  MEXICO: 'mexico-city-3',
  BAKU: 'baku-1',
  ZANDVOORT: 'zandvoort-5',
  IMOLA: 'imola-3',
  PORTIMAO: 'portimao-1',
  JEDDAH: 'jeddah-1',
  MIAMI: 'miami-1',
  LAS_VEGAS: 'las-vegas-1',
  LOSAIL: 'lusail-1',
};

// Numeric fallback (TrackID enum value -> name) in case the backend ever
// sends a raw number instead of the enum name.
const TRACK_NAME_BY_VALUE: Record<number, string> = {
  0: 'MELBOURNE', 1: 'PAUL_RICARD', 2: 'SHANGHAI', 3: 'SAKHIR',
  4: 'CATALUNYA', 5: 'MONACO', 6: 'MONTREAL', 7: 'SILVERSTONE',
  8: 'HOCKENHEIM', 9: 'HUNGARORING', 10: 'SPA', 11: 'MONZA',
  12: 'SINGAPORE', 13: 'SUZUKA', 14: 'ABU_DHABI', 15: 'TEXAS',
  16: 'BRAZIL', 17: 'AUSTRIA', 18: 'SOCHI', 19: 'MEXICO',
  20: 'BAKU', 21: 'SAKHIR_SHORT', 22: 'SILVERSTONE_SHORT',
  23: 'TEXAS_SHORT', 24: 'SUZUKA_SHORT', 25: 'HANOI', 26: 'ZANDVOORT',
  27: 'IMOLA', 28: 'PORTIMAO', 29: 'JEDDAH', 30: 'MIAMI',
  31: 'LAS_VEGAS', 32: 'LOSAIL',
};

/**
 * Resolve a track_id to a track SVG layout filename (without extension).
 * Returns null when no SVG is available (falls back to circle rendering).
 */
export function resolveTrackSvg(
  trackId: string | number | undefined | null,
): string | null {
  if (trackId === undefined || trackId === null || trackId === '') {
    return null;
  }

  let key: string | undefined;
  if (typeof trackId === 'number') {
    key = TRACK_NAME_BY_VALUE[trackId];
  } else {
    const trimmed = trackId.trim();
    if (/^\d+$/.test(trimmed)) {
      key = TRACK_NAME_BY_VALUE[parseInt(trimmed, 10)];
    } else {
      // Strip qualifiers like "Sakhir (Bahrain)" -> "SAKHIR"
      key = trimmed.toUpperCase().replace(/\s*\(.*\)\s*$/, '');
    }
  }

  if (!key) return null;
  return TRACK_SVG_MAP[key] ?? null;
}

