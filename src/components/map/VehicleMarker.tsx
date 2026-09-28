import { useRef } from 'react';
import { useJourney, DRIVING_STATES, AT_STATION_STATES } from '@/stores/journeyStore';
import { stationById } from '@/mock/stations';
import { vehicleById } from '@/mock/vehicles';
import { normAngle } from '@/lib/geo';

const DIMS = { sedan: [30, 14], suv: [31, 15.5], sport: [30, 13.4] } as const;

/** Top-down car that faces the direction of travel, with a soft glow. */
export function VehicleMarker({ z }: { z: number }) {
  const pos = useJourney((s) => s.vehiclePos);
  const heading = useJourney((s) => s.vehicleHeading);
  const vehicleId = useJourney((s) => s.vehicleId);
  const driving = useJourney((s) => DRIVING_STATES.includes(s.state) && !s.drive?.paused);
  const parkedAt = useJourney((s) => (AT_STATION_STATES.includes(s.state) ? (s.activeRoute?.stationId ?? null) : null));
  const station = parkedAt ? stationById(parkedAt) : null;
  // Parked: sit in the bay beside the charger pin instead of on the road.
  const at = station ? { x: station.position.x - 34 / z, y: station.position.y - 18 / z } : pos;
  const target = station ? 90 : heading;
  const shown = useRef(target);
  shown.current += normAngle(target - shown.current) * 0.22;

  const v = vehicleById(vehicleId);
  const [L, W] = DIMS[v.body];
  const light = /^#(E|F|D)/i.test(v.color);

  return (
    <g transform={`translate(${at.x} ${at.y}) scale(${1 / z})`} pointerEvents="none">
      <g transform={`rotate(${shown.current})`}>
        {/* soft electric glow — elongated, never a big circle */}
        <ellipse rx={L * 0.68} ry={W * 0.85} fill="var(--volt)" opacity={driving ? 0.42 : 0.28} filter="url(#cf-glow)" />
        {/* ground shadow */}
        <rect x={-L / 2 + 1.2} y={-W / 2 + 2} width={L} height={W} rx={W * 0.42} fill="#000" opacity={0.28} filter="url(#cf-glow)" />
        {/* mirrors */}
        <ellipse cx={L * 0.12} cy={-W / 2 - 0.6} rx={1.6} ry={1.1} fill={v.color} stroke="#fff" strokeWidth={0.6} />
        <ellipse cx={L * 0.12} cy={W / 2 + 0.6} rx={1.6} ry={1.1} fill={v.color} stroke="#fff" strokeWidth={0.6} />
        {/* body */}
        <rect x={-L / 2} y={-W / 2} width={L} height={W} rx={W * 0.42} fill={v.color} stroke={light ? '#9AA3AF' : '#fff'} strokeWidth={1.4} />
        {/* cabin glass */}
        <path
          d={`M${-L * 0.3} ${-W * 0.35} L${L * 0.2} ${-W * 0.39} Q${L * 0.3} 0 ${L * 0.2} ${W * 0.39} L${-L * 0.3} ${W * 0.35} Q${-L * 0.35} 0 ${-L * 0.3} ${-W * 0.35} Z`}
          fill="#0E1624"
          opacity={0.9}
        />
        {/* roof panel + reflection */}
        <rect x={-L * 0.19} y={-W * 0.27} width={L * 0.3} height={W * 0.54} rx={2.2} fill={v.color} opacity={0.94} />
        <path d={`M${L * 0.14} ${-W * 0.3} Q${L * 0.21} 0 ${L * 0.14} ${W * 0.3}`} stroke="#fff" strokeOpacity={0.35} strokeWidth={0.9} fill="none" />
        {/* lights */}
        <rect x={L / 2 - 2.6} y={-W * 0.36} width={1.8} height={W * 0.2} rx={0.8} fill="#FFF7D1" />
        <rect x={L / 2 - 2.6} y={W * 0.16} width={1.8} height={W * 0.2} rx={0.8} fill="#FFF7D1" />
        <rect x={-L / 2 + 0.7} y={-W * 0.34} width={1.5} height={W * 0.68} rx={0.7} fill="#F43F5E" opacity={0.9} />
      </g>
    </g>
  );
}
