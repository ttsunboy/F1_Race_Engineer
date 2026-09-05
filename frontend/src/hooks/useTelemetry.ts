/**
 * Custom hook for telemetry WebSocket connection
 */
import { useEffect, useRef } from 'react';
import { telemetryWS } from '@/services/websocket';
import { useTelemetryStore } from '@/store/telemetryStore';

const TELEMETRY_FLUSH_INTERVAL_MS = 50;
const IMPORTANT_MESSAGE_TYPES = new Set([
  'initial_state',
  'session',
  'participants',
  'player_car_index',
  'session_reset',
  'lap_history',
  'best_sectors',
  'current_lap_sectors',
  'starting_grid',
  'race_strategy',
  'pit_loss',
  'race_finished',
  'event',
]);

export const useTelemetry = () => {
  const { handleWebSocketMessage, setConnected } = useTelemetryStore();
  type TelemetryMessage = Parameters<typeof handleWebSocketMessage>[0];
  const pendingImportantMessagesRef = useRef<TelemetryMessage[]>([]);
  const pendingLatestMessagesRef = useRef<Map<string, TelemetryMessage>>(new Map());
  const flushTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const isImportantMessage = (message: TelemetryMessage) => IMPORTANT_MESSAGE_TYPES.has(message.type);

    const flushMessages = () => {
      flushTimerRef.current = null;
      if (document.hidden) return;

      const importantMessages = pendingImportantMessagesRef.current;
      const latestMessages = Array.from(pendingLatestMessagesRef.current.values());
      pendingImportantMessagesRef.current = [];
      pendingLatestMessagesRef.current.clear();

      importantMessages.forEach(handleWebSocketMessage);
      latestMessages.forEach(handleWebSocketMessage);
    };

    const scheduleFlush = () => {
      if (flushTimerRef.current === null) {
        flushTimerRef.current = window.setTimeout(flushMessages, TELEMETRY_FLUSH_INTERVAL_MS);
      }
    };

    const handleMessage = (message: TelemetryMessage) => {
      if (document.hidden) {
        if (isImportantMessage(message)) {
          pendingImportantMessagesRef.current.push(message);
        } else {
          pendingLatestMessagesRef.current.set(message.type, message);
        }
        return;
      }

      if (isImportantMessage(message)) {
        handleWebSocketMessage(message);
      } else {
        pendingLatestMessagesRef.current.set(message.type, message);
        scheduleFlush();
      }
    };

    const flushPendingMessages = () => {
      if (!document.hidden) {
        flushMessages();
      }
    };

    // Connect to WebSocket
    telemetryWS.connect()
      .then(() => {
        setConnected(true);
      })
      .catch((error) => {
        console.error('Failed to connect to WebSocket:', error);
        setConnected(false);
      });

    // Add message handler
    telemetryWS.addMessageHandler(handleMessage);
    document.addEventListener('visibilitychange', flushPendingMessages);

    // Cleanup on unmount
    return () => {
      telemetryWS.removeMessageHandler(handleMessage);
      document.removeEventListener('visibilitychange', flushPendingMessages);
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
      }
      pendingImportantMessagesRef.current = [];
      pendingLatestMessagesRef.current.clear();
      telemetryWS.disconnect();
    };
  }, [handleWebSocketMessage, setConnected]);

  return {
    isConnected: telemetryWS.isConnected(),
  };
};
