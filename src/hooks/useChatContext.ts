import type { ChatContext } from '@/types';
import { useJourney } from '@/stores/journeyStore';
import { vehicleById } from '@/mock/vehicles';
import { demoUser } from '@/mock/users';
import { rangeKm } from '@/lib/energy';

/** Snapshot of the journey that grounds AI answers. */
export function buildChatContext(): ChatContext {
  const s = useJourney.getState();
  const v = vehicleById(s.vehicleId);
  const charging = s.charging && s.charging.status === 'charging';
  return {
    journeyState: s.state,
    vehicleId: s.vehicleId,
    batteryPercent: +s.battery.toFixed(1),
    rangeKm: Math.round(rangeKm(v, s.battery)),
    stationId: s.charging?.stationId ?? s.activeRoute?.stationId ?? undefined,
    chargingMinutesRemaining: s.charging ? +s.charging.minutesLeft.toFixed(1) : undefined,
    chargeTargetPercent: s.charging?.targetSoc ?? s.activeRoute?.departureSoc,
    isCharging: Boolean(charging),
    routeOptions: s.routeOptions.map((o) => ({
      id: o.id,
      stationId: o.stationId,
      totalMinutes: o.totalMinutes,
      chargeMinutes: o.chargeMinutes,
      chargingCost: o.chargingCost,
      tags: o.tags,
    })),
    preferences: demoUser.preferences,
    clockHour: Math.floor(s.clockS / 3600),
  };
}
