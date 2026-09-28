import type { ChatContext } from '../types';
import { demoTrip } from '../mock/routes';
import { demoUser } from '../mock/users';
import { FEATURED_STATION_ID, stationById } from '../mock/stations';
import { placesNearStation } from '../mock/places';
import { vehicleById } from '../mock/vehicles';
import { inCarActivities } from '../mock/recommendations';
import { isOpenAt, walkFor } from './recommendationEngine';
import { planRoutes } from './routePlanner';
import { travelSummary } from './routing';

// Trip data sent with every chat message so the Python AI can answer
// about this journey. Shared by the Node backend and the browser (Vercel).

/** Energy, time and cost to finish charging (live session) or for a planned stop. */
export function chargeEstimate(ctx: ChatContext) {
  const vehicle = vehicleById(ctx.vehicleId);
  const station = stationById(ctx.stationId ?? FEATURED_STATION_ID)!;
  if (ctx.isCharging && ctx.chargingMinutesRemaining !== undefined) {
    const target = ctx.chargeTargetPercent ?? demoUser.chargeTargetPercent;
    const energyKWh = Math.max(0, ((target - ctx.batteryPercent) / 100) * vehicle.batteryKWh);
    return { live: true, energyKWh: +energyKWh.toFixed(1), minutes: Math.max(1, Math.round(ctx.chargingMinutesRemaining)), cost: +(energyKWh * station.pricePerKwh).toFixed(2), pricePerKwh: station.pricePerKwh };
  }
  const [plan] = planRoutes({ vehicle, batteryPercent: ctx.batteryPercent, onlyStationId: station.id });
  if (!plan) return null;
  return { live: false, energyKWh: plan.energyAddedKWh, minutes: plan.chargeMinutes, cost: plan.chargingCost, pricePerKwh: station.pricePerKwh };
}

/** Everything the Python AI needs to answer about this trip. */
export function buildAiContext(ctx: ChatContext) {
  const vehicle = vehicleById(ctx.vehicleId);
  const stationId = ctx.stationId ?? FEATURED_STATION_ID;
  const station = stationById(stationId)!;
  const hour = ctx.clockHour ?? 14;
  const routes = planRoutes({ vehicle, batteryPercent: ctx.batteryPercent });
  const trip = travelSummary(demoTrip.start.nodeId, demoTrip.destination.nodeId);

  return {
    userName: demoUser.name,
    chargeEstimate: chargeEstimate(ctx),
    journeyState: ctx.journeyState,
    isCharging: Boolean(ctx.isCharging),
    chargingMinutesRemaining: ctx.chargingMinutesRemaining ?? null,
    chargeTargetPercent: ctx.chargeTargetPercent ?? demoUser.chargeTargetPercent,
    bufferMinutes: demoUser.safetyBufferMinutes,
    reservePercent: demoUser.reservePercent,
    preferences: ctx.preferences ?? demoUser.preferences,
    destination: demoTrip.destination.label,
    tripKm: +(trip.meters / 1000).toFixed(1),
    onwardKm: demoTrip.onwardKm,
    vehicle: { name: vehicle.name, batteryPercent: ctx.batteryPercent, rangeKm: ctx.rangeKm },
    station: {
      id: station.id,
      name: station.name,
      powerKW: station.powerKW,
      pricePerKwh: station.pricePerKwh,
      amenities: station.amenities,
    },
    places: placesNearStation(stationId).map((p) => {
      const walk = walkFor(stationId, p);
      return {
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        category: p.category,
        tags: p.tags,
        rating: p.rating,
        walkMinutes: walk.minutes,
        walkMeters: walk.meters,
        visitMinutes: p.visitMinutes,
        minVisitMinutes: p.minVisitMinutes,
        open: isOpenAt(p, hour),
      };
    }),
    inCar: inCarActivities.map((a) => ({ id: a.id, name: a.name, emoji: a.emoji, tags: a.tags })),
    routeOptions: routes.map((o) => {
      const s = stationById(o.stationId)!;
      return {
        stationId: o.stationId,
        station: s.name,
        tags: o.tags,
        powerKW: s.powerKW,
        available: `${s.availableChargers}/${s.chargers}`,
        pricePerKwh: s.pricePerKwh,
        energyKWh: o.energyAddedKWh,
        chargeMinutes: o.chargeMinutes,
        totalMinutes: o.totalMinutes,
        chargingCost: o.chargingCost,
        reasons: o.reasons,
      };
    }),
  };
}
