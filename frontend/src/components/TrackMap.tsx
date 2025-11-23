/**
 * Track Map Component - Real-time car positions
 */
import { useRef, useEffect } from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';

// Need to access cars for fallback rendering
import type { CarData } from '@/types/telemetry';

export const TrackMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const carPositions = useTelemetryStore((state) => state.car_positions);
  const cars = useTelemetryStore((state) => state.cars);
  const session = useTelemetryStore((state) => state.session);
  const playerCarIndex = useTelemetryStore((state) => state.playerCarIndex);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0D0D14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // If no motion data, use lap distance to create circular track representation
    const hasMotionData = carPositions.length > 0 && carPositions.some(p => p.x !== 0 || p.z !== 0);

    if (!hasMotionData) {
      // Fallback: Use lap distance for circular representation
      const cars = useTelemetryStore.getState().cars;
      const trackLength = session?.track_length || 5000;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 40;

      // Draw track outline
      ctx.strokeStyle = '#38383F';
      ctx.lineWidth = 40;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw start/finish line
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius - 20);
      ctx.lineTo(centerX, centerY - radius + 20);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw cars based on lap distance
      Object.entries(cars).forEach(([idx, car]) => {
        const lapDistance = car.lap_distance || 0;
        const angle = (lapDistance / trackLength) * Math.PI * 2 - Math.PI / 2; // Start at top
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        const carIdx = parseInt(idx);
        const isPlayerCar = playerCarIndex !== null && carIdx === playerCarIndex;

        // Car marker
        ctx.beginPath();
        ctx.arc(x, y, isPlayerCar ? 10 : 7, 0, Math.PI * 2);

        // Color based on position or if it's the player
        if (isPlayerCar) {
          ctx.fillStyle = '#E10600'; // Red for player car
        } else if (car.position === 1) {
          ctx.fillStyle = '#FFD700'; // Gold for leader
        } else if ((car.position || 0) <= 3) {
          ctx.fillStyle = '#00D656'; // Green for podium
        } else if ((car.position || 0) <= 10) {
          ctx.fillStyle = '#4A90E2'; // Blue for points
        } else {
          ctx.fillStyle = '#888888'; // Gray for others
        }

        ctx.fill();

        // Add a white border for player car
        if (isPlayerCar) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Position number
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((car.position || '?').toString(), x, y);
      });

      return;
    }

    // Original motion-based rendering
    if (carPositions.length === 0) return;

    // Find bounds of all car positions
    const xs = carPositions.map(p => p.x);
    const zs = carPositions.map(p => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    // Add padding
    const padding = 40;
    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;

    // Scale to fit canvas
    const scaleX = (canvas.width - padding * 2) / rangeX;
    const scaleZ = (canvas.height - padding * 2) / rangeZ;
    const scale = Math.min(scaleX, scaleZ);

    // Draw track outline (simplified circle/track shape)
    ctx.strokeStyle = '#38383F';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    carPositions.forEach((pos, index) => {
      const x = padding + (pos.x - minX) * scale;
      const y = padding + (pos.z - minZ) * scale;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
    ctx.setLineDash([]);

    // Draw cars
    carPositions.forEach((pos, index) => {
      const x = padding + (pos.x - minX) * scale;
      const y = padding + (pos.z - minZ) * scale;
      const isPlayerCar = playerCarIndex !== null && index === playerCarIndex;

      // Car marker
      ctx.beginPath();
      ctx.arc(x, y, isPlayerCar ? 8 : 6, 0, Math.PI * 2);

      // Color based on position or if it's the player
      if (isPlayerCar) {
        ctx.fillStyle = '#E10600'; // Red for player car
      } else if (pos.position === 1) {
        ctx.fillStyle = '#FFD700'; // Gold for leader
      } else if (pos.position <= 3) {
        ctx.fillStyle = '#00D656'; // Green for podium
      } else if (pos.position <= 10) {
        ctx.fillStyle = '#4A90E2'; // Blue for points
      } else {
        ctx.fillStyle = '#888888'; // Gray for others
      }

      ctx.fill();

      // Add a white border for player car
      if (isPlayerCar) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Position number
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pos.position.toString(), x, y);
    });

  }, [carPositions, playerCarIndex, cars, session]);

  return (
    <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Track Map</h2>
        {session && (
          <div className="text-xs text-gray-400">
            {session.track_id?.replace('_', ' ') || 'Unknown Track'}
          </div>
        )}
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-full rounded-lg border border-f1-gray"
        />

        {carPositions.length === 0 && Object.keys(cars).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-400">Waiting for telemetry data...</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex justify-around text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#E10600] border-2 border-white"></div>
          <span className="text-gray-400">You</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FFD700]"></div>
          <span className="text-gray-400">P1</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#00D656]"></div>
          <span className="text-gray-400">P2-3</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#4A90E2]"></div>
          <span className="text-gray-400">P4-10</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#888888]"></div>
          <span className="text-gray-400">P11+</span>
        </div>
      </div>
    </div>
  );
};
