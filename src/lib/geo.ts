import type { Point } from '../types';

/** 1 map unit = 10 metres. */
export const METERS_PER_UNIT = 10;

export const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});

/** Heading in degrees, 0 = east, 90 = south (screen coordinates). */
export const headingDeg = (a: Point, b: Point) =>
  (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

/** Normalises an angle to (-180, 180]. */
export const normAngle = (deg: number) => {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
};

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export interface Polyline {
  points: Point[];
  /** Cumulative length in map units at each point. */
  cum: number[];
  length: number;
}

export function makePolyline(points: Point[]): Polyline {
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + dist(points[i - 1], points[i]));
  return { points, cum, length: cum[cum.length - 1] ?? 0 };
}

/** Point at distance `d` (map units) along the polyline. */
export function pointAt(pl: Polyline, d: number): Point {
  const { points, cum } = pl;
  if (points.length === 0) return { x: 0, y: 0 };
  if (d <= 0) return points[0];
  if (d >= pl.length) return points[points.length - 1];
  let i = 1;
  while (i < cum.length && cum[i] < d) i++;
  const seg = cum[i] - cum[i - 1] || 1;
  return lerpPoint(points[i - 1], points[i], (d - cum[i - 1]) / seg);
}

/** Heading at distance `d`, smoothed with a look-ahead so corners rotate gracefully. */
export function headingAt(pl: Polyline, d: number, lookAhead = 14): number {
  const a = pointAt(pl, Math.max(0, d - lookAhead * 0.35));
  const b = pointAt(pl, Math.min(pl.length, d + lookAhead));
  if (dist(a, b) < 0.01) {
    const n = pl.points.length;
    return n > 1 ? headingDeg(pl.points[n - 2], pl.points[n - 1]) : 0;
  }
  return headingDeg(a, b);
}

/** Sub-section of the polyline between two distances. */
export function slicePolyline(pl: Polyline, from: number, to: number): Point[] {
  const out: Point[] = [pointAt(pl, from)];
  for (let i = 0; i < pl.points.length; i++) {
    if (pl.cum[i] > from && pl.cum[i] < to) out.push(pl.points[i]);
  }
  out.push(pointAt(pl, to));
  return out;
}

export const toPath = (pts: Point[]) =>
  pts.length ? 'M' + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L') : '';

export function bounds(points: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

export function distToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return dist(p, a);
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function pointInPolygon(p: Point, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** L-shaped footpath (along the street, then across). */
export function walkPath(from: Point, to: Point): Point[] {
  return [from, { x: to.x, y: from.y }, to];
}

export const walkMeters = (from: Point, to: Point) =>
  Math.round((Math.abs(to.x - from.x) + Math.abs(to.y - from.y)) * METERS_PER_UNIT);

/** Comfortable walking pace in metres per minute. */
export const WALK_M_PER_MIN = 75;

export const walkMinutesFor = (meters: number) => Math.max(1, Math.round(meters / WALK_M_PER_MIN));
