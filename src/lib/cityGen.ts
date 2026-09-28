import type { Point, RoadClass } from '../types';
import { roadNodes, roads, localGrids } from '../mock/routes';
import { airport, creekPoints, creekWidth, lagoon, lakes, landmarks, parks, seaPolygon, WORLD } from '../mock/city';
import { distToSegment, pointInPolygon } from './geo';
import { seeded } from './random';

// ─────────────────────────────────────────────────────────────
// Deterministic geometry for the Nova City base map.
// Generated once at load; rendered as a handful of SVG paths.
// ─────────────────────────────────────────────────────────────

export const ROAD_WIDTH: Record<RoadClass, number> = { highway: 13, avenue: 9, street: 6.5, local: 4 };
export const CASING_WIDTH: Record<RoadClass, number> = { highway: 17, avenue: 12, street: 9, local: 5.5 };

export interface RoadGeom {
  id: string;
  name: string;
  cls: RoadClass;
  points: Point[];
  d: string;
  length: number;
}

const toD = (pts: Point[]) => 'M' + pts.map((p) => `${p.x} ${p.y}`).join(' L');

/** Catmull-Rom spline → cubic Bézier path. */
export function smoothPath(pts: [number, number][], closed = false, tension = 0.5) {
  if (pts.length < 3) return 'M' + pts.map((p) => p.join(' ')).join(' L');
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${P[1][0]} ${P[1][1]}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [x0, y0] = P[i - 1], [x1, y1] = P[i], [x2, y2] = P[i + 1], [x3, y3] = P[i + 2];
    const c1x = x1 + ((x2 - x0) / 6) * tension * 2, c1y = y1 + ((y2 - y0) / 6) * tension * 2;
    const c2x = x2 - ((x3 - x1) / 6) * tension * 2, c2y = y2 - ((y3 - y1) / 6) * tension * 2;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x2} ${y2}`;
  }
  return closed ? d + ' Z' : d;
}

export const arterials: RoadGeom[] = roads.map((r) => {
  const points = r.nodes.map((id) => ({ x: roadNodes[id].x, y: roadNodes[id].y }));
  let length = 0;
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return { id: r.id, name: r.name, cls: r.class, points, d: toD(points), length };
});

// ── Water ────────────────────────────────────────────────────
// The coastline is everything in the sea polygon except the closing
// corners along the bottom edge.
const coast = seaPolygon.slice(0, seaPolygon.length - 2);
export const coastPath = smoothPath(coast);
export const seaPath = `${coastPath} L${WORLD.width + 3000} ${coast[coast.length - 1][1]} L${WORLD.width + 3000} ${WORLD.height + 3000} L-3000 ${WORLD.height + 3000} L-3000 ${coast[0][1]} Z`;
export const creekPathD = smoothPath(creekPoints);

// ── Local street grid ────────────────────────────────────────
export const localStreets: { d: string; segs: [Point, Point][] } = (() => {
  const segs: [Point, Point][] = [];
  for (const [x0, y0, x1, y1, sp] of localGrids) {
    for (let x = x0 + sp / 2; x < x1; x += sp) segs.push([{ x, y: y0 }, { x, y: y1 }]);
    for (let y = y0 + sp / 2; y < y1; y += sp) segs.push([{ x: x0, y }, { x: x1, y }]);
  }
  return { d: segs.map(([a, b]) => `M${a.x} ${a.y} L${b.x} ${b.y}`).join(' '), segs };
})();

export const urbanBlocks = localGrids.map(([x0, y0, x1, y1]) => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }));

// ── Buildings ────────────────────────────────────────────────
interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
  tall: boolean;
}

const creekSamples: Point[] = creekPoints.map(([x, y]) => ({ x, y }));

const inRect = (p: Point, r: { x: number; y: number; w: number; h: number }, m = 0) =>
  p.x > r.x - m && p.x < r.x + r.w + m && p.y > r.y - m && p.y < r.y + r.h + m;

function blocked(c: Point, half: number): boolean {
  if (pointInPolygon(c, seaPolygon)) return true;
  if (c.y > 1250 && pointInPolygon({ x: c.x, y: c.y + half + 4 }, seaPolygon)) return true;
  for (let i = 1; i < creekSamples.length; i++)
    if (distToSegment(c, creekSamples[i - 1], creekSamples[i]) < creekWidth / 2 + half + 8) return true;
  if (((c.x - lagoon.cx) / (lagoon.rx + half + 6)) ** 2 + ((c.y - lagoon.cy) / (lagoon.ry + half + 6)) ** 2 < 1) return true;
  for (const l of lakes) if (((c.x - l.cx) / (l.rx + half)) ** 2 + ((c.y - l.cy) / (l.ry + half)) ** 2 < 1) return true;
  for (const p of parks) if (pointInPolygon(c, p.points)) return true;
  if (pointInPolygon(c, airport.zone)) return true;
  if (inRect(c, airport.terminal, half + 4)) return true;
  for (const l of landmarks) if (inRect(c, l, half + 4)) return true;
  for (const r of arterials) {
    const buffer = CASING_WIDTH[r.cls] / 2 + half + 3;
    for (let i = 1; i < r.points.length; i++) if (distToSegment(c, r.points[i - 1], r.points[i]) < buffer) return true;
  }
  for (const [a, b] of localStreets.segs) if (distToSegment(c, a, b) < CASING_WIDTH.local / 2 + half + 1.5) return true;
  return false;
}

const TALL_ZONES = [
  { x: 920, y: 560, w: 320, h: 300 }, // Downtown
  { x: 1360, y: 550, w: 420, h: 290 }, // Business Bay
];

export const buildings: Building[] = (() => {
  const rnd = seeded(20260928);
  const out: Building[] = [];
  const step = 21;
  for (let gy = 30; gy < 1390; gy += step) {
    for (let gx = 20; gx < WORLD.width - 10; gx += step) {
      const c = { x: gx + (rnd() - 0.5) * 6, y: gy + (rnd() - 0.5) * 6 };
      const tall = TALL_ZONES.some((z) => inRect(c, z));
      const w = (tall ? 10 : 8) + rnd() * (tall ? 8 : 8);
      const h = (tall ? 10 : 8) + rnd() * (tall ? 8 : 7);
      if (rnd() < (tall ? 0.06 : 0.16)) continue; // gaps & courtyards
      if (blocked(c, Math.max(w, h) / 2)) continue;
      out.push({ x: c.x - w / 2, y: c.y - h / 2, w, h, tall: tall && rnd() < 0.55 });
    }
  }
  return out;
})();

const rectD = (b: { x: number; y: number; w: number; h: number }, dx = 0, dy = 0) =>
  `M${(b.x + dx).toFixed(1)} ${(b.y + dy).toFixed(1)}h${b.w.toFixed(1)}v${b.h.toFixed(1)}h${(-b.w).toFixed(1)}Z`;

export const buildingPaths = {
  shadow: buildings.filter((b) => !b.tall).map((b) => rectD(b, 1.4, 1.8)).join(''),
  tallShadow: buildings.filter((b) => b.tall).map((b) => rectD(b, 3.2, 4)).join(''),
  base: buildings.filter((b, i) => !b.tall && i % 3 !== 0).map((b) => rectD(b)).join(''),
  alt: buildings.filter((b, i) => !b.tall && i % 3 === 0).map((b) => rectD(b)).join(''),
  tall: buildings.filter((b) => b.tall).map((b) => rectD(b)).join(''),
};
