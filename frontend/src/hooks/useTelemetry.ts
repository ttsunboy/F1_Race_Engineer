/**
 * Custom hook for telemetry WebSocket connection
 */
import { useEffect } from 'react';
import { telemetryWS } from '@/services/websocket';
import { useTelemetryStore } from '@/store/telemetryStore';

export const useTelemetry = () => {
  const { handleWebSocketMessage, setConnected } = useTelemetryStore();

  useEffect(() => {
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
    telemetryWS.addMessageHandler(handleWebSocketMessage);

    // Cleanup on unmount
    return () => {
      telemetryWS.removeMessageHandler(handleWebSocketMessage);
      telemetryWS.disconnect();
    };
  }, [handleWebSocketMessage, setConnected]);

  return {
    isConnected: telemetryWS.isConnected(),
  };
};
