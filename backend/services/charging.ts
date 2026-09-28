import { randomUUID } from 'node:crypto';
import type { ChargingSessionInfo } from '../../src/types';
import { estimateChargeMinutes, stepCharge } from '../../src/lib/energy';
import { stationById, vehicleById } from '../mock';
import { HttpError, notFound } from '../utils/http';

/** Real seconds → simulated seconds (1 real second = 1 simulated minute). */
export const DEMO_TIME_SCALE = 60;

interface StoredSession extends ChargingSessionInfo {
  startedAtMs: number;
}

const sessions = new Map<string, StoredSession>();

export const ChargingService = {
  start(input: { stationId: string; vehicleId: string; startSoc: number; targetSoc: number }): ChargingSessionInfo {
    const station = stationById(input.stationId);
    if (!station) throw notFound('Station');
    if (input.targetSoc <= input.startSoc) throw new HttpError(400, 'targetSoc must be above startSoc');
    const vehicle = vehicleById(input.vehicleId);
    const session: StoredSession = {
      id: `chg_${randomUUID().slice(0, 8)}`,
      stationId: station.id,
      vehicleId: vehicle.id,
      startSoc: input.startSoc,
      targetSoc: input.targetSoc,
      estimateMinutes: Math.round(estimateChargeMinutes(vehicle, station.powerKW, input.startSoc, input.targetSoc)),
      pricePerKwh: station.pricePerKwh,
      startedAt: new Date().toISOString(),
      startedAtMs: Date.now(),
    };
    sessions.set(session.id, session);
    return strip(session);
  },

  /** Replays the deterministic charge curve for the elapsed (accelerated) time. */
  status(id: string) {
    const s = sessions.get(id);
    if (!s) throw notFound('Charging session');
    const station = stationById(s.stationId)!;
    const vehicle = vehicleById(s.vehicleId);
    const simSeconds = ((Date.now() - s.startedAtMs) / 1000) * DEMO_TIME_SCALE;
    let soc = s.startSoc;
    let energy = 0;
    let power = 0;
    for (let t = 0; t < simSeconds && soc < s.targetSoc; t += 5) {
      const step = stepCharge(vehicle, station.powerKW, soc, s.targetSoc, Math.min(5, simSeconds - t));
      soc = step.soc;
      energy += step.energyKWh;
      power = step.powerKW;
    }
    const complete = soc >= s.targetSoc - 0.01;
    return {
      ...strip(s),
      soc: +soc.toFixed(1),
      energyAddedKWh: +energy.toFixed(2),
      powerKW: complete ? 0 : +power.toFixed(1),
      cost: +(energy * s.pricePerKwh).toFixed(2),
      minutesRemaining: Math.round(estimateChargeMinutes(vehicle, station.powerKW, soc, s.targetSoc)),
      status: complete ? 'complete' : 'charging',
    };
  },
};

function strip({ startedAtMs: _drop, ...rest }: StoredSession): ChargingSessionInfo {
  return rest;
}
