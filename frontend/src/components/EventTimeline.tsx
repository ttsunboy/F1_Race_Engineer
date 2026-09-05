import React from 'react';
import { AlertOctagon, AlertTriangle, Flag, Gauge, Shield, Timer, Trash2 } from 'lucide-react';
import { useTelemetryStore } from '@/store/telemetryStore';
import type { RaceEventData } from '@/types/telemetry';

interface RaceEvent {
  id: string;
  label: string;
  detail: string;
  color: string;
  icon: React.ReactNode;
  raceSeconds: number;
}

const MAX_EVENTS = 100;

const formatRaceTime = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`;
};

const eventIcon = (type: string): React.ReactNode => {
  if (type === 'flag') return <Flag className="h-3.5 w-3.5" />;
  if (type === 'safety') return <Shield className="h-3.5 w-3.5" />;
  if (type === 'drs') return <Gauge className="h-3.5 w-3.5" />;
  if (type === 'fastest') return <Timer className="h-3.5 w-3.5" />;
  if (type === 'retirement') return <AlertOctagon className="h-3.5 w-3.5" />;
  return <AlertTriangle className="h-3.5 w-3.5" />;
};

const eventColor = (type: string): string => {
  if (type === 'flag') return '#FFD700';
  if (type === 'safety') return '#FF9F1C';
  if (type === 'drs') return '#00D656';
  if (type === 'fastest') return '#A020F0';
  if (type === 'retirement') return '#FF3838';
  return '#FFB000';
};

const detailNumber = (details: RaceEventData['details'], key: string): number | null => {
  if (!details || typeof details !== 'object') return null;
  const value = details[key];
  return typeof value === 'number' ? value : null;
};

const detailBoolean = (details: RaceEventData['details'], key: string): boolean => {
  if (!details || typeof details !== 'object') return false;
  return details[key] === true || details[key] === 1;
};

const eventToDisplay = (
  event: RaceEventData,
  participants: Record<number, { name: string }>,
): Omit<RaceEvent, 'id'> | null => {
  const details = event.details;
  const vehicleIndex = detailNumber(details, 'vehicle_idx');
  const vehicleName = vehicleIndex !== null
    ? participants[vehicleIndex]?.name || `Car ${vehicleIndex + 1}`
    : '';
  const code = event.code;

  if (code === 'FTLP') {
    const lapTime = detailNumber(details, 'lap_time');
    return { label: 'FASTEST LAP', detail: `${vehicleName}${lapTime ? ` · ${(lapTime).toFixed(3)}s` : ''}`, color: eventColor('fastest'), icon: eventIcon('fastest'), raceSeconds: event.session_time };
  }
  if (code === 'RTMT') return { label: 'RETIREMENT', detail: vehicleName, color: eventColor('retirement'), icon: eventIcon('retirement'), raceSeconds: event.session_time };
  if (code === 'DRSE' || code === 'DRSD') return { label: code === 'DRSE' ? 'DRS ENABLED' : 'DRS DISABLED', detail: 'Race control', color: eventColor('drs'), icon: eventIcon('drs'), raceSeconds: event.session_time };
  if (code === 'RDFL') return { label: 'RED FLAG', detail: 'Race control', color: '#FF3838', icon: eventIcon('flag'), raceSeconds: event.session_time };
  if (code === 'YFLG') {
    const enabled = detailBoolean(details, 'enabled');
    const zoneIndex = detailNumber(details, 'zone_index');
    return { label: enabled ? 'YELLOW FLAG' : 'YELLOW FLAG CLEARED', detail: zoneIndex !== null ? `Marshal zone ${zoneIndex + 1}` : 'Marshal zone', color: eventColor('flag'), icon: eventIcon('flag'), raceSeconds: event.session_time };
  }
  if (code === 'SCAR') {
    const safetyCarType = detailNumber(details, 'safety_car_type');
    const eventType = detailNumber(details, 'event_type');
    const name = safetyCarType === 2 ? 'VIRTUAL SAFETY CAR' : safetyCarType === 3 ? 'FORMATION LAP' : 'SAFETY CAR';
    const action = eventType === 0 ? 'DEPLOYED' : eventType === 1 ? 'RETURNING' : eventType === 2 ? 'RETURNED' : 'RACE RESUMED';
    return { label: `${name} ${action}`, detail: 'Race control', color: eventColor('safety'), icon: eventIcon('safety'), raceSeconds: event.session_time };
  }
  if (code === 'PENA') {
    const penaltyType = detailNumber(details, 'penalty_type');
    const penaltyNames = ['DRIVE THROUGH', 'STOP GO', 'GRID', 'REMINDER', 'TIME', 'WARNING', 'DISQUALIFIED', 'FORMATION LAP', 'PARKED TOO LONG', 'TYRE REGULATIONS'];
    const penaltyName = penaltyType !== null && penaltyType < penaltyNames.length ? penaltyNames[penaltyType] : 'PENALTY';
    return { label: `${penaltyName} PENALTY`, detail: vehicleName, color: eventColor('penalty'), icon: eventIcon('penalty'), raceSeconds: event.session_time };
  }
  if (code === 'DTSV' || code === 'SGSV') return { label: code === 'DTSV' ? 'DRIVE THROUGH SERVED' : 'STOP GO SERVED', detail: vehicleName, color: eventColor('penalty'), icon: eventIcon('penalty'), raceSeconds: event.session_time };
  if (code === 'CHQF') return { label: 'CHEQUERED FLAG', detail: 'Race control', color: eventColor('flag'), icon: eventIcon('flag'), raceSeconds: event.session_time };
  return null;
};

export const EventTimeline: React.FC = () => {
  const participants = useTelemetryStore((state) => state.participants);
  const raceEvents = useTelemetryStore((state) => state.race_events);
  const clearRaceEvents = useTelemetryStore((state) => state.clearRaceEvents);
  const events: RaceEvent[] = raceEvents
    .map((event, index) => {
      const display = eventToDisplay(event, participants);
      return display ? { ...display, id: `${event.session_time}-${index}-${event.code}` } : null;
    })
    .filter((event): event is RaceEvent => event !== null)
    .slice(0, MAX_EVENTS);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-f1-dark p-4 shadow-lg">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h2 className="text-lg font-bold text-white">Race Events</h2>
        <button
          type="button"
          onClick={clearRaceEvents}
          disabled={events.length === 0}
          className="text-gray-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          title="Clear race events"
          aria-label="Clear race events"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pr-1">
          {events.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Waiting for race events...</p>
          ) : (
            <div className="relative space-y-2 pl-1">
              <div className="absolute bottom-0 left-[3.75rem] top-0 w-px bg-f1-gray" />
              {events.map((event) => (
                <div key={event.id} className="relative grid grid-cols-[3.25rem_1rem_minmax(0,1fr)] items-start gap-2 rounded bg-f1-darker/80 p-2">
                  <span className="pt-0.5 text-right font-mono text-[10px] text-gray-500">
                    {formatRaceTime(event.raceSeconds)}
                  </span>
                  <div
                    className="relative z-10 mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-f1-dark"
                    style={{ backgroundColor: event.color, color: '#0D0D14' }}
                  >
                    {event.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold" style={{ color: event.color }}>{event.label}</span>
                    <div className="truncate text-[10px] text-gray-400">{event.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-1 h-10 bg-gradient-to-t from-f1-dark to-transparent" />
      </div>
    </section>
  );
};
