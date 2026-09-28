import { motion } from 'framer-motion';
import { useJourney, AWAY_STATES, DRIVING_STATES } from '@/stores/journeyStore';
import { METERS_PER_UNIT, slicePolyline, toPath } from '@/lib/geo';
import type { Point } from '@/types';

const ptsD = (pts: Point[]) => toPath(pts);

/** Route previews, the live navigation line and the walking path. */
export function RouteLayer({ z }: { z: number }) {
  const state = useJourney((s) => s.state);
  const options = useJourney((s) => s.routeOptions);
  const selectedId = useJourney((s) => s.selectedRouteId);
  const selectRoute = useJourney((s) => s.selectRoute);
  const legPolys = useJourney((s) => s.legPolys);
  const drive = useJourney((s) => s.drive);
  const walk = useJourney((s) => s.walk);
  const w = (px: number) => px / z;

  // ── Route preview (choose between options) ───────────────
  if (state === 'ROUTE_SELECTED') {
    const selected = options.find((o) => o.id === selectedId);
    return (
      <g>
        {options
          .filter((o) => o.id !== selectedId)
          .map((o) => (
            <g key={o.id} style={{ cursor: 'pointer' }} onClick={() => selectRoute(o.id)}>
              <path d={ptsD([...o.legs[0].points, ...o.legs[1].points.slice(1)])} stroke="transparent" strokeWidth={w(18)} fill="none" />
              <path d={ptsD([...o.legs[0].points, ...o.legs[1].points.slice(1)])} stroke="var(--muted)" strokeOpacity={0.55} strokeWidth={w(5)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ))}
        {selected && (
          <g key={selected.id} pointerEvents="none">
            <path d={ptsD([...selected.legs[0].points, ...selected.legs[1].points.slice(1)])} stroke="var(--route)" strokeOpacity={0.22} strokeWidth={w(14)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <motion.path
              d={ptsD(selected.legs[0].points)}
              stroke="var(--route)"
              strokeWidth={w(6)}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, ease: [0.3, 0.7, 0.2, 1] }}
            />
            <motion.path
              d={ptsD(selected.legs[1].points)}
              stroke="var(--route)"
              strokeWidth={w(6)}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 1.05, ease: 'easeOut' }}
            />
          </g>
        )}
      </g>
    );
  }

  const els: React.ReactNode[] = [];

  // ── Live navigation line ─────────────────────────────────
  if (legPolys && drive && DRIVING_STATES.includes(state)) {
    const du = drive.distanceM / METERS_PER_UNIT;
    const [p0, p1] = legPolys;
    if (drive.legIndex === 0) {
      const ahead = slicePolyline(p0, du, p0.length);
      const behind = slicePolyline(p0, 0, du);
      els.push(
        <path key="behind" d={ptsD(behind)} stroke="var(--muted)" strokeOpacity={0.35} strokeWidth={w(4)} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
        <path key="leg1" d={ptsD(p1.points)} stroke="var(--route)" strokeOpacity={0.4} strokeWidth={w(5)} strokeDasharray={`${w(1)} ${w(9)}`} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
        <path key="glow" d={ptsD(ahead)} stroke="var(--route)" strokeOpacity={0.22} strokeWidth={w(15)} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
        <path key="ahead" d={ptsD(ahead)} stroke="var(--route)" strokeWidth={w(6.5)} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
      );
    } else {
      const ahead = slicePolyline(p1, du, p1.length);
      els.push(
        <path key="glow1" d={ptsD(ahead)} stroke="var(--route)" strokeOpacity={0.22} strokeWidth={w(15)} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
        <path key="ahead1" d={ptsD(ahead)} stroke="var(--route)" strokeWidth={w(6.5)} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
      );
    }
  }

  // ── Walking path (dotted) ────────────────────────────────
  if (walk && AWAY_STATES.includes(state)) {
    els.push(
      <path key="walk-bg" d={ptsD(walk.poly.points)} stroke="var(--route)" strokeOpacity={0.14} strokeWidth={w(12)} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
      <motion.path
        key="walk"
        d={ptsD(walk.poly.points)}
        stroke="var(--route)"
        strokeWidth={w(4.2)}
        strokeDasharray={`0.01 ${w(8)}`}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: walk.phase === 'back' ? w(8) : -w(8) }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />,
    );
  }

  return <g pointerEvents="none">{els}</g>;
}
