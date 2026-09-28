import type { LegSegment, Maneuver, ManeuverType, RoadClass, RouteLeg, Vehicle } from '../types';
import { roadNodes, roads } from '../mock/routes';
import { METERS_PER_UNIT, dist, headingDeg, normAngle } from './geo';
import { driveEnergyKWh } from './energy';

// ─────────────────────────────────────────────────────────────
// Routing service: Dijkstra over the Nova City road graph,
// plus turn-by-turn maneuver generation.
// ─────────────────────────────────────────────────────────────

interface Edge {
  to: string;
  road: string;
  roadClass: RoadClass;
  lengthM: number;
  speedMps: number;
  timeS: number;
}

const graph = new Map<string, Edge[]>();

for (const road of roads) {
  if (road.routable === false) continue;
  const speedMps = (road.speedKmh * (road.traffic ?? 1)) / 3.6;
  for (let i = 1; i < road.nodes.length; i++) {
    const a = road.nodes[i - 1];
    const b = road.nodes[i];
    const lengthM = dist(roadNodes[a], roadNodes[b]) * METERS_PER_UNIT;
    const base = { road: road.name, roadClass: road.class, lengthM, speedMps, timeS: lengthM / speedMps };
    if (!graph.has(a)) graph.set(a, []);
    if (!graph.has(b)) graph.set(b, []);
    graph.get(a)!.push({ to: b, ...base });
    graph.get(b)!.push({ to: a, ...base });
  }
}

const TURN_PENALTY_S = 12;

/** Fastest path between two nodes (by travel time, with a small turn penalty). */
export function findPath(from: string, to: string): string[] {
  if (from === to) return [from];
  // State = node + road we arrived on, so road changes can be penalised.
  const key = (n: string, r: string) => `${n}|${r}`;
  const best = new Map<string, number>();
  const prev = new Map<string, string>();
  const queue: { k: string; node: string; road: string; t: number }[] = [
    { k: key(from, ''), node: from, road: '', t: 0 },
  ];
  best.set(key(from, ''), 0);
  let endKey: string | null = null;

  while (queue.length) {
    let bi = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i].t < queue[bi].t) bi = i;
    const cur = queue.splice(bi, 1)[0];
    if (cur.t > (best.get(cur.k) ?? Infinity)) continue;
    if (cur.node === to) {
      endKey = cur.k;
      break;
    }
    for (const e of graph.get(cur.node) ?? []) {
      const t = cur.t + e.timeS + (cur.road && cur.road !== e.road ? TURN_PENALTY_S : 0);
      const k = key(e.to, e.road);
      if (t < (best.get(k) ?? Infinity)) {
        best.set(k, t);
        prev.set(k, cur.k);
        queue.push({ k, node: e.to, road: e.road, t });
      }
    }
  }
  if (!endKey) return [];
  const path: string[] = [];
  let k: string | undefined = endKey;
  while (k) {
    path.unshift(k.split('|')[0]);
    k = prev.get(k);
  }
  return path;
}

function edgeBetween(a: string, b: string): Edge {
  const e = graph.get(a)?.find((x) => x.to === b);
  if (!e) throw new Error(`No edge ${a} → ${b}`);
  return e;
}

const COMPASS = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
const compass = (deg: number) => COMPASS[((Math.round(deg / 45) % 8) + 8) % 8];

function classifyTurn(delta: number): ManeuverType {
  const a = Math.abs(delta);
  if (a < 22) return 'straight';
  if (a < 55) return delta > 0 ? 'slight-right' : 'slight-left';
  if (a < 155) return delta > 0 ? 'right' : 'left';
  return 'uturn';
}

const turnText: Record<ManeuverType, string> = {
  depart: 'Head',
  straight: 'Continue onto',
  'slight-left': 'Keep left onto',
  'slight-right': 'Keep right onto',
  left: 'Turn left onto',
  right: 'Turn right onto',
  uturn: 'Make a U-turn onto',
  'charging-stop': 'Arrive at',
  arrive: 'Arrive at',
};

/** Builds a drivable leg with geometry, timings, energy and maneuvers. */
export function buildLeg(
  nodeIds: string[],
  vehicle: Vehicle,
  endLabel: string,
  endType: 'charging-stop' | 'arrive',
): RouteLeg {
  const points = nodeIds.map((id) => ({ x: roadNodes[id].x, y: roadNodes[id].y }));
  const segments: LegSegment[] = [];
  const maneuvers: Maneuver[] = [];
  const roadsUsed: string[] = [];
  let startM = 0;
  let durationS = 0;
  let energyKWh = 0;

  for (let i = 1; i < nodeIds.length; i++) {
    const e = edgeBetween(nodeIds[i - 1], nodeIds[i]);
    segments.push({
      from: points[i - 1],
      to: points[i],
      lengthM: e.lengthM,
      road: e.road,
      roadClass: e.roadClass,
      speedMps: e.speedMps,
      startM,
    });
    durationS += e.timeS;
    energyKWh += driveEnergyKWh(vehicle, e.lengthM, e.roadClass, e.timeS);
    if (roadsUsed[roadsUsed.length - 1] !== e.road) roadsUsed.push(e.road);

    if (i === 1) {
      maneuvers.push({
        atM: 0,
        type: 'depart',
        road: e.road,
        text: `Head ${compass(headingDeg(points[0], points[1]))} on ${e.road}`,
      });
    } else {
      const prevSeg = segments[segments.length - 2];
      if (prevSeg.road !== e.road) {
        const delta = normAngle(headingDeg(points[i - 1], points[i]) - headingDeg(points[i - 2], points[i - 1]));
        const type = classifyTurn(delta);
        maneuvers.push({ atM: startM, type, road: e.road, text: `${turnText[type]} ${e.road}` });
      }
    }
    startM += e.lengthM;
  }

  maneuvers.push({ atM: startM, type: endType, road: endLabel, text: `${turnText[endType]} ${endLabel}` });

  return { nodeIds, points, segments, distanceM: startM, durationS, energyKWh, maneuvers, roads: roadsUsed };
}

/** Travel time + distance between two nodes (used for "2.4 km · 6 min" labels). */
export function travelSummary(from: string, to: string) {
  const path = findPath(from, to);
  let meters = 0;
  let seconds = 0;
  for (let i = 1; i < path.length; i++) {
    const e = edgeBetween(path[i - 1], path[i]);
    meters += e.lengthM;
    seconds += e.timeS;
  }
  return { meters, seconds, path };
}

/** Nearest graph node to a map point. */
export function nearestNode(p: { x: number; y: number }) {
  let bestId = '';
  let bestD = Infinity;
  for (const id of graph.keys()) {
    const d = dist(p, roadNodes[id]);
    if (d < bestD) {
      bestD = d;
      bestId = id;
    }
  }
  return bestId;
}
