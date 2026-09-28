import type { Amenity, ChargingStation, RouteOption, RouteTag, Vehicle } from '../types';
import { chargingStations } from '../mock/stations';
import { demoTrip } from '../mock/routes';
import { demoUser } from '../mock/users';
import { routeWeights } from '../mock/recommendations';
import { buildLeg, findPath } from './routing';
import { estimateChargeMinutes, planningKWhPerKm } from './energy';

// ─────────────────────────────────────────────────────────────
// EV route planner: evaluates every charging stop between the
// origin and destination and picks Fastest / Cheapest /
// Comfortable / AI-recommended options. Fully deterministic.
// ─────────────────────────────────────────────────────────────

export interface PlanRequest {
  vehicle: Vehicle;
  batteryPercent: number;
  startNodeId?: string;
  destinationNodeId?: string;
  destinationLabel?: string;
  onwardKm?: number;
  reservePercent?: number;
  chargeTargetPercent?: number;
  /** Restrict planning to a single station (used by "Select station"). */
  onlyStationId?: string;
}

const AMENITY_VALUE: Record<Amenity, number> = {
  Coffee: 1.3,
  Food: 1.2,
  Restroom: 1,
  Shopping: 1,
  WiFi: 0.6,
  Lounge: 0.8,
  Cinema: 0.8,
  Park: 0.8,
  Workspace: 0.6,
  Beach: 0.6,
  Convenience: 0.4,
};

export const amenityScore = (s: ChargingStation) =>
  +s.amenities.reduce((sum, a) => sum + AMENITY_VALUE[a], 0).toFixed(1);

export function waitMinutesFor(s: ChargingStation) {
  if (s.availableChargers >= 2) return 0;
  if (s.availableChargers === 1) return Math.round(s.queueMinutes * 0.35);
  return s.queueMinutes;
}

/** Departure SoC needed to finish the trip (incl. onward driving) above reserve. */
export function requiredDepartureSoc(v: Vehicle, remainingKm: number, reservePercent: number) {
  return ((remainingKm * planningKWhPerKm(v)) / v.batteryKWh) * 100 + reservePercent;
}

export function chargeTargetFor(v: Vehicle, remainingKm: number, reserve: number, preferred: number) {
  const need = requiredDepartureSoc(v, remainingKm, reserve);
  return Math.min(95, Math.max(preferred, Math.ceil(need / 5) * 5));
}

export function planRoutes(req: PlanRequest): RouteOption[] {
  const {
    vehicle,
    batteryPercent,
    startNodeId = demoTrip.start.nodeId,
    destinationNodeId = demoTrip.destination.nodeId,
    destinationLabel = demoTrip.destination.label,
    onwardKm = demoTrip.onwardKm,
    reservePercent = demoUser.reservePercent,
    chargeTargetPercent = demoUser.chargeTargetPercent,
  } = req;

  const candidates = chargingStations.filter((s) => !req.onlyStationId || s.id === req.onlyStationId);
  const evaluated: RouteOption[] = [];

  for (const station of candidates) {
    const p0 = findPath(startNodeId, station.nodeId);
    const p1 = findPath(station.nodeId, destinationNodeId);
    if (!p0.length || !p1.length) continue;
    const leg0 = buildLeg(p0, vehicle, station.name, 'charging-stop');
    const leg1 = buildLeg(p1, vehicle, destinationLabel, 'arrive');

    const arrivalSoc = batteryPercent - (leg0.energyKWh / vehicle.batteryKWh) * 100;
    const remainingKm = leg1.distanceM / 1000 + onwardKm;
    const target = chargeTargetFor(vehicle, remainingKm, reservePercent, chargeTargetPercent);
    const from = Math.max(arrivalSoc, 0);
    const chargeMinutes = estimateChargeMinutes(vehicle, station.powerKW, from, target);
    const energyAdded = ((target - from) / 100) * vehicle.batteryKWh;
    const cost = Math.max(0, energyAdded) * station.pricePerKwh;
    const waitMinutes = waitMinutesFor(station);
    const driveMinutes = (leg0.durationS + leg1.durationS) / 60;
    const total = driveMinutes + chargeMinutes + waitMinutes;
    const arrivalAtDest = Math.max(target, from) - (leg1.energyKWh / vehicle.batteryKWh) * 100;
    const amen = amenityScore(station);
    const feasible = arrivalSoc >= 5;

    const w = routeWeights;
    const score =
      100 +
      total * w.totalMinutes +
      cost * w.costPerDollar +
      amen * w.amenity +
      (station.availableChargers >= 3 ? w.lowWait : station.availableChargers === 0 ? -w.lowWait : 0) +
      (station.powerKW >= 150 ? w.fastCharger : 0) +
      (station.rating - 4) * 10 * (w.rating / 5) +
      Math.min(40, arrivalSoc - reservePercent) * w.reserveBufferPerPercent -
      (feasible ? 0 : 1000);

    evaluated.push({
      id: `route-${station.id}`,
      label: '',
      tags: [],
      stationId: station.id,
      legs: [leg0, leg1],
      distanceKm: +((leg0.distanceM + leg1.distanceM) / 1000).toFixed(1),
      driveMinutes: Math.round(driveMinutes),
      chargeMinutes: Math.round(chargeMinutes),
      waitMinutes,
      totalMinutes: Math.round(total),
      arrivalSocAtStation: +arrivalSoc.toFixed(1),
      departureSoc: target,
      arrivalSocAtDestination: +arrivalAtDest.toFixed(1),
      energyAddedKWh: +energyAdded.toFixed(1),
      chargingCost: +cost.toFixed(2),
      amenityScore: amen,
      score: +score.toFixed(1),
      reasons: [],
      via: viaRoads([...leg0.roads, ...leg1.roads]),
      feasible,
    });
  }

  if (req.onlyStationId) {
    return evaluated.map((o) => ({ ...o, label: 'Your pick', reasons: reasonsFor(o, reservePercent) }));
  }

  const feasible = evaluated.filter((o) => o.feasible);
  const pool = feasible.length ? feasible : evaluated;
  const by = (f: (o: RouteOption) => number) => [...pool].sort((a, b) => f(a) - f(b));

  const ai = by((o) => -o.score)[0];
  const fastest = by((o) => o.totalMinutes)[0];
  const cheapest = by((o) => o.chargingCost + o.totalMinutes * 0.001)[0];
  // "Comfortable" surfaces the best-equipped stop not already on the list.
  const comfortCap = fastest.totalMinutes + 25;
  const used = new Set([ai.stationId, fastest.stationId, cheapest.stationId]);
  const comfort =
    by((o) => (o.totalMinutes <= comfortCap && !used.has(o.stationId) ? -o.amenityScore : 99))[0] ?? ai;

  const picks: [RouteTag, RouteOption][] = [
    ['ai', ai],
    ['fastest', fastest],
    ['cheapest', cheapest],
    ['comfort', comfort],
  ];
  const options: RouteOption[] = [];
  for (const [tag, opt] of picks) {
    const existing = options.find((o) => o.stationId === opt.stationId);
    if (existing) existing.tags.push(tag);
    else options.push({ ...opt, tags: [tag] });
  }
  const letters = 'ABCD';
  return options.map((o, i) => ({ ...o, label: `Route ${letters[i]}`, reasons: reasonsFor(o, reservePercent) }));
}

function viaRoads(list: string[]) {
  const unique = [...new Set(list)].filter((r) => !/Drive|Walk|Link/.test(r) || list.length < 3);
  return unique.slice(1, 3).join(' & ') || unique[0] || '';
}

function reasonsFor(o: RouteOption, reserve: number): string[] {
  const s = chargingStations.find((x) => x.id === o.stationId)!;
  const r: string[] = [];
  if (s.powerKW >= 150) r.push(`Fast charger · ${s.powerKW} kW`);
  if (s.amenities.includes('Coffee')) r.push('Coffee nearby');
  if (s.availableChargers >= 3) r.push('Low wait time');
  else if (s.availableChargers === 0) r.push(`Busy · ~${s.queueMinutes} min queue`);
  if (s.rating >= 4.7) r.push(`Top rated · ${s.rating}★`);
  if (o.arrivalSocAtStation - reserve >= 10) r.push(`${Math.round(o.arrivalSocAtStation - reserve)}% above your reserve on arrival`);
  if (s.solar) r.push('Solar-powered');
  return r.slice(0, 4);
}
