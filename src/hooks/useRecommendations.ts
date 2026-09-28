import { useMemo } from 'react';
import type { ActivityTag } from '@/types';
import { useJourney } from '@/stores/journeyStore';
import { bestPick, rankActivities } from '@/lib/recommendationEngine';

/** Live-ranked activities for the current charging window (recomputed each minute). */
export function useRecommendations(category: ActivityTag | 'all') {
  const stationId = useJourney((s) => s.charging?.stationId ?? null);
  const minutes = useJourney((s) => Math.max(0, Math.floor(s.charging?.minutesLeft ?? 0)));
  const hour = useJourney((s) => Math.floor(s.clockS / 3600));

  return useMemo(() => {
    if (!stationId) return { ranked: [], best: undefined, minutes };
    const req = { chargingMinutesRemaining: minutes, stationId, category, clockHour: hour };
    return { ranked: rankActivities(req), best: bestPick(req), minutes };
  }, [stationId, minutes, category, hour]);
}
