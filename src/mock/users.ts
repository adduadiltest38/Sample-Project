import type { ActivityTag } from '../types';

export const demoUser = {
  name: 'Alex',
  initials: 'AR',
  vehicle: 'Tesla Model 3',
  vehicleId: 'tesla-model-3',
  battery: 58,
  /** Preferences the recommendation engine boosts. */
  preferences: ['coffee', 'relax'] as ActivityTag[],
  /** Keep this much battery in reserve when planning (percent). */
  reservePercent: 15,
  /** Default DC charge target (percent). */
  chargeTargetPercent: 80,
  /** Minutes to be back at the car before charging finishes. */
  safetyBufferMinutes: 5,
  memberSince: '2024',
  plan: 'ChargeFlow Plus',
};

/** Simulated local time when the demo starts (24h). */
export const DEMO_START_CLOCK = { hour: 14, minute: 20 };

/** Nova City ambient temperature — drives climate-control load. */
export const AMBIENT_TEMP_C = 38;
