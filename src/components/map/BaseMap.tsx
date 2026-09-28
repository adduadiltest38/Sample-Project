import { memo } from 'react';
import {
  arterials,
  buildingPaths,
  CASING_WIDTH,
  coastPath,
  creekPathD,
  localStreets,
  ROAD_WIDTH,
  seaPath,
  urbanBlocks,
} from '@/lib/cityGen';
import { airport, creekWidth, lagoon, lakes, landmarks, parks, WORLD } from '@/mock/city';
import type { RoadClass } from '@/types';

const CLASS_ORDER: RoadClass[] = ['street', 'avenue', 'highway'];
const joinD = (cls: RoadClass) => arterials.filter((r) => r.cls === cls).map((r) => r.d).join(' ');
const ROAD_D = Object.fromEntries(CLASS_ORDER.map((c) => [c, joinD(c)])) as Record<RoadClass, string>;
const polyD = (pts: [number, number][]) => 'M' + pts.map((p) => p.join(' ')).join(' L') + ' Z';

/** Static city layers. Rendered once — never depends on camera or state. */
export const BaseMap = memo(function BaseMap() {
  return (
    <g>
      {/* Land, far beyond the world edge so panning never shows a void */}
      <rect x={-3000} y={-3000} width={WORLD.width + 6000} height={WORLD.height + 6000} fill="var(--map-land)" />

      {urbanBlocks.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={10} fill="var(--map-urban)" />
      ))}

      {/* Local street grid */}
      <path d={localStreets.d} stroke="var(--map-road-casing)" strokeWidth={CASING_WIDTH.local} fill="none" strokeLinecap="round" opacity={0.6} />
      <path d={localStreets.d} stroke="var(--map-local)" strokeWidth={ROAD_WIDTH.local} fill="none" strokeLinecap="round" />

      {/* Parks & beaches */}
      {parks.map((p) => (
        <path
          key={p.id}
          d={polyD(p.points)}
          fill={p.kind === 'beach' ? 'var(--map-beach)' : 'var(--map-park)'}
          stroke={p.kind === 'beach' ? 'none' : 'var(--map-park-line)'}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ))}
      {/* Park footpaths */}
      <path
        d="M1370 1150 C1420 1120 1470 1170 1520 1130 S1570 1110 1572 1100 M1470 1092 L1470 1204 M936 390 C990 330 1050 470 1120 380 M390 360 C430 330 500 400 545 350"
        stroke="var(--map-park-line)"
        strokeWidth={3}
        fill="none"
        strokeDasharray="1 5"
        strokeLinecap="round"
      />

      {/* Water */}
      {lakes.map((l, i) => (
        <ellipse key={i} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill="var(--map-water)" />
      ))}
      <ellipse cx={lagoon.cx} cy={lagoon.cy} rx={lagoon.rx} ry={lagoon.ry} fill="var(--map-water)" />
      <path d={creekPathD} stroke="var(--map-water)" strokeWidth={creekWidth} fill="none" strokeLinecap="round" />
      <path d={coastPath} stroke="var(--map-beach)" strokeWidth={16} fill="none" strokeLinejoin="round" />
      <path d={seaPath} fill="url(#cf-sea)" />
      {/* Marina piers */}
      <path d="M160 1290 v34 M195 1290 v40 M230 1290 v40 M265 1290 v36 M1994 1484 l8 14 M2092 1504 l3 14" stroke="var(--map-road)" strokeWidth={1.6} strokeLinecap="round" opacity={0.85} />

      {/* Airport */}
      <path d={polyD(airport.zone)} fill="var(--map-airport)" />
      {airport.runways.map((r, i) => (
        <g key={i} transform={`rotate(-2 ${r.x} ${r.y})`}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={2} fill="var(--map-runway)" />
          <line x1={r.x + 10} y1={r.y + r.h / 2} x2={r.x + r.w - 10} y2={r.y + r.h / 2} stroke="var(--map-land)" strokeWidth={1.2} strokeDasharray="10 8" />
        </g>
      ))}
      <rect {...rectProps(airport.terminal)} rx={8} fill="var(--map-building-tall)" />

      {/* Buildings */}
      <path d={buildingPaths.shadow} fill="var(--map-building-shadow)" />
      <path d={buildingPaths.tallShadow} fill="var(--map-building-shadow)" />
      <path d={buildingPaths.base} fill="var(--map-building)" />
      <path d={buildingPaths.alt} fill="var(--map-building-alt)" />
      <path d={buildingPaths.tall} fill="var(--map-building-tall)" />
      {landmarks.map((l) => (
        <g key={l.id}>
          <rect x={l.x + 3} y={l.y + 4} width={l.w} height={l.h} rx={l.r} fill="var(--map-building-shadow)" />
          <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={l.r} fill="var(--map-building-tall)" />
        </g>
      ))}

      {/* Arterial roads: casings first, then fills, then highway centre lines */}
      {CLASS_ORDER.map((c) => (
        <path key={`c-${c}`} d={ROAD_D[c]} stroke={c === 'highway' ? 'var(--map-highway-casing)' : 'var(--map-road-casing)'} strokeWidth={CASING_WIDTH[c]} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {CLASS_ORDER.map((c) => (
        <path key={`f-${c}`} d={ROAD_D[c]} stroke={c === 'highway' ? 'var(--map-highway)' : 'var(--map-road)'} strokeWidth={ROAD_WIDTH[c]} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      <path d={ROAD_D.highway} stroke="var(--map-highway-line)" strokeWidth={0.9} fill="none" strokeDasharray="14 10" strokeLinejoin="round" />
    </g>
  );
});

function rectProps(r: { x: number; y: number; w: number; h: number }) {
  return { x: r.x, y: r.y, width: r.w, height: r.h };
}

/** Shared SVG definitions (gradients, filters, label paths). */
export const MapDefs = memo(function MapDefs() {
  return (
    <defs>
      <linearGradient id="cf-sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--map-water)" />
        <stop offset="1" stopColor="var(--map-water-deep)" />
      </linearGradient>
      <linearGradient id="cf-volt" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#2EF2B5" />
        <stop offset="1" stopColor="#10B981" />
      </linearGradient>
      <linearGradient id="cf-busy" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FBBF24" />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>
      <linearGradient id="cf-full" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FB7185" />
        <stop offset="1" stopColor="#E11D48" />
      </linearGradient>
      <filter id="cf-shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#000" floodOpacity="0.28" />
      </filter>
      <filter id="cf-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="3.2" />
      </filter>
      {arterials.map((r) => (
        <path key={r.id} id={`road-${r.id}`} d={r.d} />
      ))}
    </defs>
  );
});
