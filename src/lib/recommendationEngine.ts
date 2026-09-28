import type {
  ActivityRecommendation,
  ActivityTag,
  FitStatus,
  Place,
  RecommendationRequest,
  TimeFit,
} from '../types';
import { placesNearStation } from '../mock/places';
import { stationById } from '../mock/stations';
import { demoUser } from '../mock/users';
import { inCarActivities, rankingWeights } from '../mock/recommendations';
import { walkMeters, walkMinutesFor } from './geo';

// ─────────────────────────────────────────────────────────────
// RecommendationEngine — deterministic charging-time planner.
// This is the always-available fallback behind the AI service.
// ─────────────────────────────────────────────────────────────

/** Spec formula: does the activity fit inside the charging window? */
export function recommendActivity(
  chargingMinutes: number,
  walkingMinutes: number,
  activityDuration: number,
  safetyBuffer: number,
) {
  const required = walkingMinutes * 2 + activityDuration + safetyBuffer;
  return required <= chargingMinutes;
}

/**
 * Available Activity Time =
 *   Charging Time Remaining − Walk To − Activity − Walk Back − Safety Buffer
 */
export function computeTimeFit(
  chargingMinutes: number,
  walkMinutes: number,
  walkMetersValue: number,
  typicalMinutes: number,
  minMinutes: number,
  bufferMinutes: number,
  isOpen = true,
): TimeFit {
  const available = chargingMinutes - walkMinutes * 2 - bufferMinutes;
  let status: FitStatus;
  let activity: number;
  if (!isOpen) {
    status = 'closed';
    activity = typicalMinutes;
  } else if (available >= typicalMinutes + 6) {
    status = 'plenty';
    activity = typicalMinutes;
  } else if (available >= Math.max(minMinutes, typicalMinutes * 0.8)) {
    status = 'perfect';
    activity = Math.min(typicalMinutes, Math.floor(available));
  } else if (available >= minMinutes) {
    status = 'shortened';
    activity = Math.floor(available);
  } else {
    status = 'no-fit';
    activity = typicalMinutes;
  }
  const total = walkMinutes * 2 + activity + bufferMinutes;
  return {
    status,
    walkMinutes,
    walkMeters: walkMetersValue,
    activityMinutes: activity,
    bufferMinutes,
    totalMinutes: total,
    slackMinutes: +(chargingMinutes - total).toFixed(1),
    chargingMinutes: Math.round(chargingMinutes),
  };
}

export function isOpenAt(place: Place, hour: number) {
  if (place.opens === 0 && place.closes === 24) return true;
  return hour >= place.opens && hour < place.closes;
}

export function walkFor(stationId: string, place: Place) {
  const station = stationById(stationId)!;
  const meters = walkMeters(station.position, place.position);
  return { meters, minutes: walkMinutesFor(meters) };
}

const CATEGORY_TAG: Record<Place['category'], ActivityTag> = {
  cafe: 'coffee',
  restaurant: 'food',
  cinema: 'entertainment',
  entertainment: 'entertainment',
  shopping: 'shopping',
  park: 'relax',
};

export function placeMatches(place: Place, tag: ActivityTag) {
  return place.tags.includes(tag) || CATEGORY_TAG[place.category] === tag;
}

function headlineFor(fit: TimeFit, place?: Place): string {
  switch (fit.status) {
    case 'plenty':
      return 'Plenty of time — no rush';
    case 'perfect':
      return 'Perfect for your charging time';
    case 'shortened':
      return `Fits with a ${fit.activityMinutes}-min visit`;
    case 'closed':
      return place ? `Closed now · opens ${String(place.opens).padStart(2, '0')}:00` : 'Closed now';
    default:
      return 'Not recommended — longer than your charging window';
  }
}

/** Ranks nearby places (and in-car options) for the remaining charging window. */
export function rankActivities(req: RecommendationRequest): ActivityRecommendation[] {
  const {
    chargingMinutesRemaining,
    stationId,
    category = 'all',
    preferences = demoUser.preferences,
    bufferMinutes = demoUser.safetyBufferMinutes,
    clockHour = 14,
  } = req;
  const w = rankingWeights;
  const out: ActivityRecommendation[] = [];

  for (const place of placesNearStation(stationId)) {
    if (category !== 'all' && !placeMatches(place, category)) continue;
    const walk = walkFor(stationId, place);
    const open = isOpenAt(place, clockHour);
    const fit = computeTimeFit(
      chargingMinutesRemaining,
      walk.minutes,
      walk.meters,
      place.visitMinutes,
      place.minVisitMinutes,
      bufferMinutes,
      open,
    );
    const prefHit = preferences.some((p) => placeMatches(place, p));
    const score =
      w.timeFit[fit.status] +
      walk.minutes * w.walkPerMinute +
      (place.rating - 4) * w.ratingAbove4 +
      (prefHit ? w.preference : 0) +
      (category !== 'all' ? w.categoryMatch : 0);

    const reasons: string[] = [];
    if (fit.status === 'perfect' || fit.status === 'plenty') reasons.push('Fits your charging window');
    if (walk.minutes <= 5) reasons.push(`Only ${walk.minutes} min walk`);
    if (place.rating >= 4.7) reasons.push(`Rated ${place.rating}★`);
    if (prefHit) reasons.push('Matches your preferences');

    out.push({
      kind: 'place',
      id: place.id,
      name: place.name,
      emoji: place.emoji,
      category: place.category,
      rating: place.rating,
      fit,
      score: +score.toFixed(1),
      headline: headlineFor(fit, place),
      reasons,
    });
  }

  // In-car options — zero walking, always "open". Offered for matching
  // categories, or for "anything" when nothing nearby fits the window.
  const anyPlaceFits = out.some((r) => r.fit.status !== 'no-fit' && r.fit.status !== 'closed');
  for (const a of inCarActivities) {
    if (category === 'all' ? anyPlaceFits : !a.tags.includes(category)) continue;
    const minutes = Math.max(5, Math.min(a.minutes, Math.floor(chargingMinutesRemaining - 1)));
    const fit = computeTimeFit(chargingMinutesRemaining, 0, 0, minutes, 5, 0);
    out.push({
      kind: 'in-car',
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      category: 'in-car',
      fit,
      score: w.timeFit[fit.status] + 4,
      headline: 'Stay comfy in your car',
      reasons: [a.blurb],
    });
  }

  return out.sort((a, b) => b.score - a.score);
}

export function bestPick(req: RecommendationRequest) {
  return rankActivities(req).find(
    (r) => r.kind === 'place' && (r.fit.status === 'perfect' || r.fit.status === 'plenty' || r.fit.status === 'shortened'),
  );
}

/** Natural-language explanation of a recommendation (engine voice). */
export function explainPick(r: ActivityRecommendation): string {
  const f = r.fit;
  if (r.kind === 'in-car') return `${r.emoji} ${r.name} keeps you right by the car — ${r.reasons[0]}`;
  if (f.status === 'no-fit' || f.status === 'closed')
    return `${r.emoji} ${r.name} isn't a good fit right now — ${r.headline.toLowerCase()}.`;
  return `${r.emoji} ${r.name} is your best option. It's a ${f.walkMinutes}-minute walk, you'll spend about ${f.activityMinutes} minutes there and still be back with a ${Math.max(f.bufferMinutes, Math.round(f.bufferMinutes + f.slackMinutes))}-minute buffer.`;
}
