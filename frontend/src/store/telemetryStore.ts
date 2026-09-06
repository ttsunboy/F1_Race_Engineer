/**
 * Zustand store for telemetry state management
 */
import { create } from 'zustand';
import {
  TelemetryState,
  SessionData,
  ParticipantData,
  CarData,
  TimingData,
  CarPosition,
  WebSocketMessage,
  RaceStrategy,
  RaceEventData,
} from '@/types/telemetry';

interface TelemetryStore extends TelemetryState {
  // Actions
  playerCarIndex: number | null;
  setPlayerCarIndex: (index: number) => void;
  setSession: (session: SessionData) => void;
  setParticipants: (participants: Record<number, ParticipantData>) => void;
  updateCar: (carIndex: number, data: Partial<CarData>) => void;
  setTiming: (timing: TimingData[]) => void;
  setCarPositions: (positions: CarPosition[]) => void;
  setConnected: (connected: boolean) => void;
  handleWebSocketMessage: (message: WebSocketMessage) => void;
  updateRaceStrategy: (strategy: Partial<RaceStrategy>) => void;
  addRaceEvent: (event: RaceEventData) => void;
  clearRaceEvents: () => void;
  setHighlightedCarIndex: (index: number | null) => void;
  reset: () => void;
}

const initialState: TelemetryState = {
  session: null,
  participants: {},
  cars: {},
  timing: [],
  car_positions: [],
  lap_history: [],
  best_sectors: null,
  current_lap_sectors: null,
  starting_grid: null,
  race_strategy: {
    tire_allocation: { soft: 0, medium: 0, hard: 0, inter: 0, wet: 0 },
    planned_pit_stops: []
  },
  pit_loss: null,
  race_events: [],
  connected: false,
  last_update: null,
  highlighted_car_index: null,
};

export const useTelemetryStore = create<TelemetryStore>((set, get) => ({
  ...initialState,
  playerCarIndex: null,

  setPlayerCarIndex: (index) =>
    set((state) => state.playerCarIndex === index ? state : { playerCarIndex: index }),

  setSession: (session) =>
    set({
      session,
      last_update: new Date().toISOString(),
    }),

  setParticipants: (participants) =>
    set({
      participants,
      last_update: new Date().toISOString(),
    }),

  updateCar: (carIndex, data) =>
    set((state) => ({
      cars: {
        ...state.cars,
        [carIndex]: {
          ...state.cars[carIndex],
          ...data,
        },
      },
      last_update: new Date().toISOString(),
    })),

  setTiming: (timing) =>
    set({
      timing,
      last_update: new Date().toISOString(),
    }),

  setCarPositions: (positions) =>
    set({
      car_positions: positions,
      last_update: new Date().toISOString(),
    }),

  setConnected: (connected) =>
    set({ connected }),

  handleWebSocketMessage: (message) => {
    const { type, data } = message;

    switch (type) {
      case 'initial_state':
        // Player index: prefer explicit, fall back to detecting non-AI participant
        const rawIdx = data.player_car_index;
        const detectedIdx = Object.entries(data.participants || {}).find(
          ([_, p]: [string, any]) => p.ai_controlled === 0
        )?.[0];
        const pIdx = rawIdx !== undefined && rawIdx !== null
          ? String(rawIdx)
          : (detectedIdx !== undefined ? detectedIdx : undefined);
        set({
          session: data.session || null,
          participants: data.participants || {},
          cars: data.cars || {},
          timing: data.timing || [],
          playerCarIndex: pIdx !== undefined ? parseInt(pIdx) : null,
          // Per-player history/sectors live in dicts keyed by car index
          lap_history: pIdx !== undefined && data.lap_history?.[pIdx] ? data.lap_history[pIdx] : [],
          best_sectors: pIdx !== undefined && data.best_sectors?.[pIdx] ? data.best_sectors[pIdx] : null,
          current_lap_sectors: pIdx !== undefined && data.current_lap_sectors?.[pIdx]
            ? data.current_lap_sectors[pIdx]
            : null,
          starting_grid: pIdx !== undefined && data.starting_grid?.[pIdx] !== undefined
            ? {
                start_position: data.starting_grid[pIdx],
                current_position: data.cars?.[pIdx]?.position ?? 0,
              }
            : null,
          race_strategy: data.race_strategy || initialState.race_strategy,
          connected: true,
          last_update: new Date().toISOString(),
        });
        break;

      case 'session':
        get().setSession(data);
        break;

      case 'participants':
        get().setParticipants(data);
        // Auto-detect player from participants
        const playerIdx = Object.entries(data).find(
          ([_, p]: [string, any]) => p.ai_controlled === 0
        )?.[0];
        if (playerIdx !== undefined) {
          get().setPlayerCarIndex(parseInt(playerIdx));
        }
        break;

      case 'player_car_index':
        if (typeof data === 'number') {
          get().setPlayerCarIndex(data);
        }
        break;

      case 'timing':
        get().setTiming(data);
        break;

      case 'cars':
        // Update all cars data (includes tire compounds, fuel, etc.)
        set({
          cars: data,
          last_update: new Date().toISOString(),
        });
        break;

      case 'player_telemetry':
        // Update player car data
        if (data && typeof data === 'object') {
          // Find player car index from participants (ai_controlled === 0)
          const participants = get().participants;
          const playerIndex = Object.entries(participants).find(
            ([_, p]) => p.ai_controlled === false
          )?.[0];

          if (playerIndex !== undefined) {
            const idx = parseInt(playerIndex);
            get().setPlayerCarIndex(idx);
            get().updateCar(idx, data);
          }
        }
        break;

      case 'car_positions':
        get().setCarPositions(data);
        break;

      case 'lap_history':
        set({
          lap_history: data,
          last_update: new Date().toISOString(),
        });
        break;

      case 'best_sectors':
        set({
          best_sectors: data,
          last_update: new Date().toISOString(),
        });
        break;

      case 'starting_grid':
        set({
          starting_grid: data,
          last_update: new Date().toISOString(),
        });
        break;

      case 'race_strategy':
        set((state) => ({
          race_strategy: {
            ...state.race_strategy,
            ...data,
            tire_allocation: {
              ...state.race_strategy.tire_allocation,
              ...(data?.tire_allocation || {}),
            },
          },
          last_update: new Date().toISOString(),
        }));
        break;

      case 'pit_loss':
        set({
          pit_loss: data,
          last_update: new Date().toISOString(),
        });
        break;

      case 'session_reset':
        // New session started (session_uid changed) - clear ALL session-scoped state.
        // Otherwise stale P1/weather/tyres/timing from the previous session can linger
        // on screen until replacement packets happen to arrive.
        set({
          session: null,
          cars: {},
          timing: [],
          participants: {},
          playerCarIndex: null,
          car_positions: [],
          lap_history: [],
          best_sectors: null,
          current_lap_sectors: null,
          starting_grid: null,
          pit_loss: null,
          race_events: [],
          last_update: new Date().toISOString(),
        });
        break;

      case 'current_lap_sectors':
        set({
          current_lap_sectors: data,
          last_update: new Date().toISOString(),
        });
        break;

      case 'race_finished':
        // Race finished - notify the app
        console.log('Race finished!', data);
        // Dispatch custom event for App.tsx to listen to
        window.dispatchEvent(new CustomEvent('race_finished', { detail: data }));
        break;

      case 'event':
        if (data && typeof data.code === 'string') {
          get().addRaceEvent(data as RaceEventData);
        }
        break;

      case 'ping':
        // Respond to ping if needed
        break;

      default:
        console.log('Unknown message type:', type);
    }
  },

  updateRaceStrategy: (strategy: Partial<TelemetryState['race_strategy']>) => {
    set((state) => ({
      race_strategy: {
        ...state.race_strategy,
        ...strategy,
        tire_allocation: {
          ...state.race_strategy.tire_allocation,
          ...(strategy.tire_allocation || {}),
        },
      },
    }));
  },

  addRaceEvent: (event) =>
    set((state) => ({ race_events: [event, ...state.race_events].slice(0, 100) })),

  clearRaceEvents: () => set({ race_events: [] }),

  setHighlightedCarIndex: (index) => set({ highlighted_car_index: index }),

  reset: () => set(initialState),
}));
