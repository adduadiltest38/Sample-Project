import type { RoadClass, Vehicle } from '../types';
import { AMBIENT_TEMP_C } from '../mock/users';

// Deterministic, demo-grade EV energy model. No randomness anywhere.

/** Extra consumption per road class (speed / aero). */
export const ROAD_FACTOR: Record<RoadClass, number> = {
  highway: 1.18,
  avenue: 1.04,
  street: 1.0,
  local: 1.0,
};

/** Climate-control load at Nova City's ambient temperature (kW). */
export const CLIMATE_KW = AMBIENT_TEMP_C >= 35 ? 2.4 : 1.2;

/**
 * Hot-climate thermal derate: batteries at ~40 °C accept less power.
 * This is why the demo's 150 kW charger delivers well under peak.
 */
export const THERMAL_DERATE = AMBIENT_TEMP_C >= 35 ? 0.62 : 0.9;

export function driveEnergyKWh(v: Vehicle, meters: number, roadClass: RoadClass, seconds: number) {
  return (v.efficiencyWhKm / 1000) * (meters / 1000) * ROAD_FACTOR[roadClass] + (CLIMATE_KW * seconds) / 3600;
}

/** Rated range at a given state of charge (km). */
export const rangeKm = (v: Vehicle, soc: number) =>
  ((soc / 100) * v.batteryKWh) / (v.efficiencyWhKm / 1000);

/** Real-world planning consumption (kWh/km) including climate + mixed driving. */
export const planningKWhPerKm = (v: Vehicle) => (v.efficiencyWhKm / 1000) * 1.12;

// Fraction of peak power accepted at each state of charge.
const CURVE: [number, number][] = [
  [0, 0.82], [10, 1.0], [35, 0.95], [50, 0.72], [60, 0.55], [70, 0.42], [80, 0.3], [90, 0.17], [100, 0.07],
];

export function curveFraction(soc: number) {
  if (soc <= 0) return CURVE[0][1];
  for (let i = 1; i < CURVE.length; i++) {
    const [s1, f1] = CURVE[i];
    const [s0, f0] = CURVE[i - 1];
    if (soc <= s1) return f0 + ((soc - s0) / (s1 - s0)) * (f1 - f0);
  }
  return CURVE[CURVE.length - 1][1];
}

export function chargePowerKW(v: Vehicle, stationKW: number, soc: number) {
  return Math.min(stationKW, v.maxDcKW) * curveFraction(soc) * THERMAL_DERATE;
}

/** Minutes to charge between two SoC values (numerical integration). */
export function estimateChargeMinutes(v: Vehicle, stationKW: number, from: number, to: number) {
  if (to <= from) return 0;
  const step = 0.25;
  let hours = 0;
  for (let s = from; s < to; s += step) {
    const ds = Math.min(step, to - s);
    const p = chargePowerKW(v, stationKW, s + ds / 2);
    hours += ((ds / 100) * v.batteryKWh) / p;
  }
  return hours * 60;
}

/** Advances a charging session by `seconds`, returning the new SoC and energy added. */
export function stepCharge(v: Vehicle, stationKW: number, soc: number, target: number, seconds: number) {
  const p = chargePowerKW(v, stationKW, soc);
  const kwh = (p * seconds) / 3600;
  const next = Math.min(target, soc + (kwh / v.batteryKWh) * 100);
  return { soc: next, energyKWh: ((next - soc) / 100) * v.batteryKWh, powerKW: p };
}
