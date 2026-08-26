/**
 * Track Map Component - Real-time car positions on the real circuit outline.
 *
 * When a track SVG is available for the current session (see
 * utils/trackSvgMap.ts), the circuit outline is rendered as the background
 * and cars are placed along it using lap_distance / track_length mapped onto
 * the SVG path via SVGPathElement.getPointAtLength(). Otherwise it falls back
 * to the previous circle / world-coordinate scatter rendering.
 */
import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { resolveTrackSvg } from '@/utils/trackSvgMap';

interface CarDot {
  carIdx: number;
  x: number; // SVG user-space (0-500)
  y: number;
  position: number;
  isPlayer: boolean;
}

/**
 * Ensure the SVG has a viewBox + responsive width/height so it scales to fill,
 * and force the track styling. All 28 source SVGs draw the track as a single
 * `<path style="fill:none;stroke:#fff;stroke-width:20;...">`; the injected CSS
 * with !important overrides that regardless of notation (style attr or
 * properties), so any future file variant is covered too.
 */
function normalizeSvg(text: string): string {
  return text
    .replace(/<svg([^>]*)>/, (_m, attrs: string) => {
      let a = attrs;
      if (!/viewBox/.test(a)) {
        a += ' viewBox="0 0 500 500"';
      }
      a = a.replace(/\s+width="[^"]*"/, ' width="100%"').replace(/\s+height="[^"]*"/, ' height="100%"');
      return `<svg${a}>`;
    })
    // 赛道外观: 深灰 #3a3a44 (与 #0D0D14 底色区分), 描边压到 4 (原 20)
    .replace(/<\/svg>/, '<style>path{stroke:#3a3a44 !important;stroke-width:4 !important}</style></svg>');
}

function dotColor(isPlayer: boolean, position: number): string {
  if (isPlayer) return '#E10600';
  if (position === 1) return '#FFD700';
  if (position <= 3) return '#00D656';
  if (position <= 10) return '#4A90E2';
  return '#888888';
}

export const TrackMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const carPositions = useTelemetryStore((state) => state.car_positions);
  const cars = useTelemetryStore((state) => state.cars);
  const session = useTelemetryStore((state) => state.session);
  const playerCarIndex = useTelemetryStore((state) => state.playerCarIndex);

  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [carDots, setCarDots] = useState<CarDot[]>([]);

  // Resolve + fetch the track SVG whenever the session track changes.
  useEffect(() => {
    const file = resolveTrackSvg(session?.track_id);
    if (!file) {
      setSvgContent(null);
      setCarDots([]);
      return;
    }

    let cancelled = false;
    fetch(`/tracks/${file}.svg`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((text) => {
        if (!cancelled) setSvgContent(normalizeSvg(text));
      })
      .catch(() => {
        if (!cancelled) setSvgContent(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.track_id]);

  // Place cars along the SVG track path using lap_distance.
  useLayoutEffect(() => {
    if (!svgContent) return;
    const container = svgContainerRef.current;
    if (!container) return;
    const path = container.querySelector('path') as SVGPathElement | null;
    if (!path) return;

    const totalLength = path.getTotalLength();
    if (!totalLength) return;

    const trackLength = session?.track_length ?? 0;
    const dots: CarDot[] = [];

    Object.entries(cars).forEach(([idx, car]) => {
      const carIdx = parseInt(idx, 10);
      const lapDistance = car.lap_distance ?? 0;
      // Normalize lap progress to [0, 1) around the track.
      const denom = trackLength > 0 ? trackLength : 1;
      const progress = ((lapDistance % denom) + denom) % denom;
      const fraction = trackLength > 0 ? progress / denom : 0;
      const pt = path.getPointAtLength(fraction * totalLength);
      dots.push({
        carIdx,
        x: pt.x,
        y: pt.y,
        position: car.position ?? 0,
        isPlayer: playerCarIndex !== null && carIdx === playerCarIndex,
      });
    });

    setCarDots(dots);
  }, [svgContent, cars, session?.track_length, playerCarIndex]);

  // Fallback: draw on canvas when no track SVG is available.
  useEffect(() => {
    if (svgContent) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0D0D14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const hasMotionData = carPositions.length > 0 && carPositions.some((p) => p.x !== 0 || p.z !== 0);

    if (!hasMotionData) {
      // Fallback: circular track using lap distance
      const trackLength = session?.track_length || 5000;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 40;

      ctx.strokeStyle = '#38383F';
      ctx.lineWidth = 40;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius - 20);
      ctx.lineTo(centerX, centerY - radius + 20);
      ctx.stroke();
      ctx.setLineDash([]);

      Object.entries(cars).forEach(([idx, car]) => {
        const lapDistance = car.lap_distance || 0;
        const angle = (lapDistance / trackLength) * Math.PI * 2 - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        const carIdx = parseInt(idx, 10);
        const isPlayerCar = playerCarIndex !== null && carIdx === playerCarIndex;

        ctx.beginPath();
        ctx.arc(x, y, isPlayerCar ? 10 : 7, 0, Math.PI * 2);
        ctx.fillStyle = dotColor(isPlayerCar, car.position || 0);
        ctx.fill();

        if (isPlayerCar) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((car.position || '?').toString(), x, y);
      });

      return;
    }

    // Motion-based world-coordinate scatter
    if (carPositions.length === 0) return;

    const xs = carPositions.map((p) => p.x);
    const zs = carPositions.map((p) => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    const padding = 40;
    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;

    const scaleX = (canvas.width - padding * 2) / rangeX;
    const scaleZ = (canvas.height - padding * 2) / rangeZ;
    const scale = Math.min(scaleX, scaleZ);

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

    carPositions.forEach((pos, index) => {
      const x = padding + (pos.x - minX) * scale;
      const y = padding + (pos.z - minZ) * scale;
      const isPlayerCar = playerCarIndex !== null && index === playerCarIndex;

      ctx.beginPath();
      ctx.arc(x, y, isPlayerCar ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = dotColor(isPlayerCar, pos.position);
      ctx.fill();

      if (isPlayerCar) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pos.position.toString(), x, y);
    });
  }, [svgContent, carPositions, playerCarIndex, cars, session]);

  const trackLabel = session?.track_id
    ? session.track_id.replace(/_/g, ' ')
    : 'Unknown Track';

  return (
    <div className="bg-f1-dark rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Track Map</h2>
        <div className="text-xs text-gray-400">{trackLabel}</div>
      </div>

      <div className="relative">
        {svgContent ? (
          <div
            ref={svgContainerRef}
            className="relative aspect-square w-full rounded-lg border border-f1-gray overflow-hidden bg-[#0D0D14]"
          >
            <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: svgContent }} />
            {carDots.map((dot) => (
              <div
                key={dot.carIdx}
                title={`P${dot.position || '?'}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{
                  left: `${(dot.x / 500) * 100}%`,
                  top: `${(dot.y / 500) * 100}%`,
                  width: dot.isPlayer ? 24 : 16,
                  height: dot.isPlayer ? 24 : 16,
                  backgroundColor: dotColor(dot.isPlayer, dot.position),
                  border: dot.isPlayer ? '2.5px solid #FFFFFF' : '1.5px solid rgba(13,13,20,0.85)',
                  boxShadow: dot.isPlayer ? '0 0 12px 3px rgba(225,6,0,0.85)' : 'none',
                }}
              />
            ))}
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full rounded-lg border border-f1-gray"
          />
        )}

        {carPositions.length === 0 && Object.keys(cars).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-400">Waiting for telemetry data...</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex justify-around text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#E10600] border-2 border-white shadow-[0_0_8px_rgba(225,6,0,0.9)]"></div>
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
