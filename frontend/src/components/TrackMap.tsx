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
import { getDriverCode } from '@/utils/driverCodes';
import { Minus, Plus, RotateCcw } from 'lucide-react';

interface CarDot {
  carIdx: number;
  x: number; // SVG user-space (0-500)
  y: number;
  position: number;
  isPlayer: boolean;
  driverCode: string;
  team: string;
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
      if (/\sclass="/.test(a)) {
        a = a.replace(/class="([^"]*)"/, 'class="$1 track-art"');
      } else {
        a += ' class="track-art"';
      }
      a = a.replace(/\s+width="[^"]*"/, ' width="100%"').replace(/\s+height="[^"]*"/, ' height="100%"');
      return `<svg${a}>`;
    })
    // 赛道外观: 深灰 #3a3a44 (与 #0D0D14 底色区分), 描边压到 4 (原 20)
    .replace(/<\/svg>/, `<style>svg.track-art > path{stroke:#3a3a44 !important;stroke-width:4 !important}</style></svg>`);
}

function findPathFraction(path: SVGPathElement, targetX: number, targetY: number): number {
  const totalLength = path.getTotalLength();
  let closestFraction = 0;
  let closestDistance = Infinity;

  // The detailed Yas Marina SVG places its start/finish marker at this point.
  for (let step = 0; step <= 1000; step += 1) {
    const fraction = step / 1000;
    const point = path.getPointAtLength(fraction * totalLength);
    const distance = (point.x - targetX) ** 2 + (point.y - targetY) ** 2;
    if (distance < closestDistance) {
      closestDistance = distance;
      closestFraction = fraction;
    }
  }

  return closestFraction;
}

const SILVERSTONE_START_FRACTION = 0.936;

const TEAM_COLORS: Record<string, string> = {
  'Red Bull Racing': '#3671C6',
  Ferrari: '#E8002D',
  Mercedes: '#27F4D2',
  McLaren: '#FF8000',
  'Aston Martin': '#229971',
  Alpine: '#0093CC',
  Williams: '#64C4FF',
  RB: '#6692FF',
  Sauber: '#52E252',
  Haas: '#B6BABD',
};

function dotColor(team: string | undefined): string {
  return TEAM_COLORS[team || ''] || '#888888';
}

export const TrackMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const carPositions = useTelemetryStore((state) => state.car_positions);
  const cars = useTelemetryStore((state) => state.cars);
  const session = useTelemetryStore((state) => state.session);
  const playerCarIndex = useTelemetryStore((state) => state.playerCarIndex);
  const participants = useTelemetryStore((state) => state.participants);
  const highlightedCarIndex = useTelemetryStore((state) => state.highlighted_car_index);

  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [carDots, setCarDots] = useState<CarDot[]>([]);
  const [hoveredCarIdx, setHoveredCarIdx] = useState<number | null>(null);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const abuDhabiStartFractionRef = useRef<number | null>(null);

  // Resolve + fetch the track SVG whenever the session track changes.
  useEffect(() => {
    abuDhabiStartFractionRef.current = null;
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

    const trackSvg = resolveTrackSvg(session?.track_id);
    const trackLength = session?.track_length ?? 0;
    const isYasMarina = trackSvg === 'yas-marina-2';
    if (isYasMarina && abuDhabiStartFractionRef.current === null) {
      abuDhabiStartFractionRef.current = findPathFraction(path, 228, 280);
    }
    const startFraction = isYasMarina
      ? (abuDhabiStartFractionRef.current ?? 0)
      : trackSvg === 'silverstone-8' ? SILVERSTONE_START_FRACTION : 0;
    const dots: CarDot[] = [];

    Object.entries(cars).forEach(([idx, car]) => {
      const carIdx = parseInt(idx, 10);
      const lapDistance = car.lap_distance ?? 0;
      // Normalize lap progress to [0, 1) around the track.
      const denom = trackLength > 0 ? trackLength : 1;
      const progress = ((lapDistance % denom) + denom) % denom;
      const lapFraction = trackLength > 0 ? progress / denom : 0;
      const fraction = (startFraction + lapFraction) % 1;
      const pt = path.getPointAtLength(fraction * totalLength);

      dots.push({
        carIdx,
        x: pt.x,
        y: pt.y,
        position: car.position ?? 0,
        isPlayer: playerCarIndex !== null && carIdx === playerCarIndex,
        driverCode: getDriverCode(participants[carIdx]),
        team: participants[carIdx]?.team_id,
      });
    });

    setCarDots(dots);
  }, [svgContent, cars, participants, session?.track_length, playerCarIndex]);

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
        ctx.fillStyle = dotColor(participants[carIdx]?.team_id);
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
      ctx.fillStyle = dotColor(participants[pos.car_index]?.team_id);
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

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mapZoom <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: mapOffset.x,
      offsetY: mapOffset.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setMapOffset({
      x: dragRef.current.offsetX + event.clientX - dragRef.current.x,
      y: dragRef.current.offsetY + event.clientY - dragRef.current.y,
    });
  };

  const resetMapView = () => {
    setMapZoom(1);
    setMapOffset({ x: 0, y: 0 });
  };

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
            className="relative mx-auto aspect-square w-full max-w-[380px] cursor-grab overflow-hidden rounded-lg border border-f1-gray bg-[#0D0D14] active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={() => { dragRef.current = null; }}
            onPointerCancel={() => { dragRef.current = null; }}
          >
            <div
              className="absolute inset-0 z-0"
              style={{ transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapZoom})`, transformOrigin: 'center' }}
            >
              <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: svgContent }} />
              {carDots.map((dot) => (
                <div
                  key={dot.carIdx}
                  className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full ${
                    dot.isPlayer ? 'z-20' : dot.carIdx === hoveredCarIdx ? 'z-30' : 'z-10'
                  }`}
                  onMouseEnter={() => setHoveredCarIdx(dot.carIdx)}
                  onMouseLeave={() => setHoveredCarIdx(null)}
                  style={{
                    left: `${(dot.x / 500) * 100}%`,
                    top: `${(dot.y / 500) * 100}%`,
                    width: dot.isPlayer ? 24 : dot.carIdx === highlightedCarIndex ? 24 : 16,
                    height: dot.isPlayer ? 24 : dot.carIdx === highlightedCarIndex ? 24 : 16,
                    backgroundColor: dotColor(dot.team),
                    border: dot.isPlayer ? '2.5px solid #FFFFFF' : '1.5px solid rgba(13,13,20,0.85)',
                    boxShadow: dot.isPlayer
                      ? '0 0 12px 3px rgba(225,6,0,0.85)'
                      : dot.carIdx === highlightedCarIndex
                      ? '0 0 12px 3px rgba(255,215,0,0.8)'
                      : 'none',
                  }}
                >
                  {hoveredCarIdx === dot.carIdx && (
                    <div
                      className={`pointer-events-none absolute z-40 whitespace-nowrap rounded border border-white/15 bg-f1-dark/95 px-2 py-1 font-mono text-xs font-bold text-race-green ${
                        dot.x < 70
                          ? 'left-0'
                          : dot.x > 430
                          ? 'right-0'
                          : 'left-1/2 -translate-x-1/2'
                      } ${
                        dot.y < 75
                          ? 'top-full mt-1'
                          : 'bottom-full mb-1'
                      }`}
                    >
                      {dot.driverCode} · P{dot.position || '?'}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div
              className="absolute right-2 top-2 z-20 flex gap-1 rounded bg-f1-dark/90 p-1"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerMove={(event) => event.stopPropagation()}
            >
              <button type="button" onClick={() => setMapZoom((value) => Math.min(3, value + 0.25))} className="p-1 text-gray-300 hover:text-white" title="Zoom in" aria-label="Zoom in"><Plus className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => setMapZoom((value) => Math.max(1, value - 0.25))} className="p-1 text-gray-300 hover:text-white" title="Zoom out" aria-label="Zoom out"><Minus className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={resetMapView} className="p-1 text-gray-300 hover:text-white" title="Reset map view" aria-label="Reset map view"><RotateCcw className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full max-w-[380px] mx-auto rounded-lg border border-f1-gray"
          />
        )}

        {carPositions.length === 0 && Object.keys(cars).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-400">Waiting for telemetry data...</p>
          </div>
        )}
      </div>

    </div>
  );
};
