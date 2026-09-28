import type { ActivityRecommendation, ActivityTag, ChatContext, ChatReply, ChatSuggestion } from '../types';
import { stationById, FEATURED_STATION_ID } from '../mock/stations';
import { vehicleById } from '../mock/vehicles';
import { companionCategories } from '../mock/recommendations';
import { bestPick, explainPick, rankActivities } from './recommendationEngine';
import { planRoutes } from './routePlanner';

// ─────────────────────────────────────────────────────────────
// Deterministic chat fallback. Detects intent with keywords and
// answers from the RecommendationEngine + route planner.
// ─────────────────────────────────────────────────────────────

export type ChatIntent =
  | { kind: 'activity'; tag: ActivityTag | 'all'; minutes?: number }
  | { kind: 'best-charger' }
  | { kind: 'car-status' }
  | { kind: 'help' };

const TAG_WORDS: [ActivityTag, RegExp][] = [
  ['coffee', /coffee|caf[eé]|latte|espresso|tea\b/i],
  ['food', /food|eat|lunch|dinner|hungry|restaurant|burger|sushi|meal|snack/i],
  ['entertainment', /entertain|movie|cinema|film|fun\b/i],
  ['shopping', /shop|store|mall|buy/i],
  ['relax', /relax|park|walk|chill|fresh air|quiet/i],
  ['work', /work|laptop|meeting|call|wifi|email/i],
  ['music', /music|song|playlist|vinyl|jazz/i],
  ['games', /game|arcade|play\b|vr\b|kart/i],
];

export function detectIntent(message: string): ChatIntent {
  const m = message.toLowerCase();
  if (/(which|best|recommend|cheapest|fastest).*(charger|station|route)|charger.*best/.test(m)) return { kind: 'best-charger' };
  if (/ready|battery|charged|how long|range|status|percent|%/.test(m) && !/\d+\s*min/.test(m)) return { kind: 'car-status' };
  const mins = m.match(/(\d{1,3})\s*(min|minute)/);
  for (const [tag, re] of TAG_WORDS) if (re.test(m)) return { kind: 'activity', tag, minutes: mins ? +mins[1] : undefined };
  if (mins || /what (can|should) i do|bored|nearby|around here|kill time/.test(m))
    return { kind: 'activity', tag: 'all', minutes: mins ? +mins[1] : undefined };
  return { kind: 'help' };
}

export function placeSuggestion(r: ActivityRecommendation): ChatSuggestion {
  const fitLabel =
    r.fit.status === 'perfect' || r.fit.status === 'plenty'
      ? 'fits ✓'
      : r.fit.status === 'shortened'
        ? `${r.fit.activityMinutes} min visit`
        : 'too long';
  return {
    type: r.kind === 'in-car' ? 'action' : 'place',
    id: r.id,
    label: r.name,
    emoji: r.emoji,
    meta: r.kind === 'in-car' ? 'In your car' : `${r.fit.walkMinutes} min walk · ${fitLabel}`,
  };
}

export function engineChat(message: string, ctx: ChatContext): ChatReply {
  const intent = detectIntent(message);
  const vehicle = vehicleById(ctx.vehicleId);
  const stationId = ctx.stationId ?? FEATURED_STATION_ID;
  const station = stationById(stationId)!;
  const window = ctx.chargingMinutesRemaining ?? 0;

  if (intent.kind === 'car-status') {
    if (ctx.isCharging) {
      return {
        source: 'engine',
        reply: `⚡ Your ${vehicle.name} is at ${Math.round(ctx.batteryPercent)}% and charging at ${station.name}. About ${Math.max(1, Math.round(window))} minutes until it reaches ${ctx.chargeTargetPercent ?? 80}% — I'll remind you when it's time to head back.`,
        suggestions: [],
      };
    }
    return {
      source: 'engine',
      reply: `🔋 Your ${vehicle.name} is at ${Math.round(ctx.batteryPercent)}% with about ${Math.round(ctx.rangeKm)} km of range. ${ctx.batteryPercent < 30 ? 'I recommend charging soon.' : 'You\'re good for now, but a top-up on the way keeps your onward trip stress-free.'}`,
      suggestions: [{ type: 'action', id: 'find-routes', label: 'Find best charging route', emoji: '✨' }],
    };
  }

  if (intent.kind === 'best-charger') {
    const opts = planRoutes({ vehicle, batteryPercent: ctx.batteryPercent });
    const ai = opts.find((o) => o.tags.includes('ai')) ?? opts[0];
    const s = stationById(ai.stationId)!;
    const fastest = opts.find((o) => o.tags.includes('fastest'));
    const cheapest = opts.find((o) => o.tags.includes('cheapest'));
    const extra: string[] = [];
    if (fastest && fastest.stationId !== ai.stationId) extra.push(`${stationById(fastest.stationId)!.name} is ${ai.totalMinutes - fastest.totalMinutes} min faster overall`);
    if (cheapest && cheapest.stationId !== ai.stationId) extra.push(`${stationById(cheapest.stationId)!.name} saves $${(ai.chargingCost - cheapest.chargingCost).toFixed(2)}`);
    return {
      source: 'engine',
      reply: `✨ ${s.name} is the best balance for you: ${s.powerKW} kW, ${s.availableChargers}/${s.chargers} chargers free and about ${ai.chargeMinutes} min of charging. ${ai.reasons.slice(0, 2).join(' · ')}.${extra.length ? ` Alternatives: ${extra.join('; ')}.` : ''}`,
      suggestions: opts.slice(0, 3).map((o) => ({
        type: 'station',
        id: o.stationId,
        label: stationById(o.stationId)!.name,
        emoji: '⚡',
        meta: `${o.totalMinutes} min total · $${o.chargingCost.toFixed(2)}`,
      })),
    };
  }

  if (intent.kind === 'activity') {
    const minutes = intent.minutes ?? (window > 0 ? window : 20);
    const ranked = rankActivities({
      chargingMinutesRemaining: minutes,
      stationId,
      category: intent.tag,
      preferences: ctx.preferences,
      clockHour: ctx.clockHour,
    });
    const best = bestPick({ chargingMinutesRemaining: minutes, stationId, category: intent.tag, preferences: ctx.preferences, clockHour: ctx.clockHour });
    const cat = companionCategories.find((c) => c.id === intent.tag);
    const lead = ctx.isCharging || intent.minutes
      ? `With ${Math.round(minutes)} minutes${ctx.isCharging && !intent.minutes ? ' of charging left' : ''}:`
      : `Near ${station.name}:`;
    const suggestions = ranked.filter((r) => r.fit.status !== 'closed').slice(0, 3).map(placeSuggestion);

    if (best) return { source: 'engine', reply: `${lead} ${explainPick(best)}`, suggestions };

    const closest = ranked.filter((r) => r.kind === 'place' && r.fit.status !== 'closed').sort((a, b) => a.fit.totalMinutes - b.fit.totalMinutes)[0];
    const inCar = ranked.find((r) => r.kind === 'in-car');
    const tight = closest
      ? `${Math.round(minutes)} minutes is tight for a walk — even ${closest.emoji} ${closest.name} needs about ${closest.fit.walkMinutes * 2 + closest.fit.activityMinutes + closest.fit.bufferMinutes} min round-trip with your ${closest.fit.bufferMinutes}-min buffer.`
      : `I couldn't find ${cat ? cat.label.toLowerCase() : 'anything'} near ${station.name} that fits ${Math.round(minutes)} minutes.`;
    return {
      source: 'engine',
      reply: inCar ? `${tight} Stay comfy instead: ${inCar.emoji} ${inCar.name}.` : tight,
      suggestions,
    };
  }

  return {
    source: 'engine',
    reply: `I'm ChargeFlow AI. I can find the best charger for your trip, tell you how long charging will take, and plan something useful to do while you charge — coffee, food, a walk, or a quick work session. Try "What can I do in 15 minutes?"`,
    suggestions: [],
  };
}
