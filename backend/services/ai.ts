import type { ChatContext, ChatReply } from '../../src/types';
import { engineChat, detectIntent } from '../../src/lib/chatEngine';
import { rankActivities } from '../../src/lib/recommendationEngine';
import { planRoutes } from '../../src/lib/routePlanner';
import { placeById, stationById, vehicleById, FEATURED_STATION_ID } from '../mock';
import { env } from '../utils/env';
import { log } from '../utils/http';

// ─────────────────────────────────────────────────────────────
// AIRecommendationService
// • With OPENROUTER_API_KEY → OpenRouter writes the reply, grounded
//   in structured data computed by the deterministic engine.
// • Without it (or on any failure) → RecommendationEngine replies.
// Suggestions (tappable cards) always come from the engine, so the
// UI behaves identically in both modes.
// ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are ChargeFlow AI, the in-car assistant of a premium EV navigation app in the fictional Nova City.
You help drivers pick charging stations and make the most of their charging time.
Rules:
- Use ONLY the JSON data provided. Never invent places, stations, prices or times.
- Respect the time maths: an activity fits only if walk there + activity + walk back + safety buffer <= charging minutes remaining.
- Be warm, concise and confident: at most 3 short sentences (under 70 words). One emoji at the start is welcome.
- Recommend one clear best option first, then optionally one alternative.
- No markdown headings, no bullet lists.`;

const TIMEOUT_MS = 12_000;

export class AIRecommendationService {
  get enabled() {
    return Boolean(env.openRouter.apiKey);
  }

  get model() {
    return env.openRouter.model;
  }

  status() {
    return { enabled: this.enabled, provider: this.enabled ? 'openrouter' : 'engine', model: this.enabled ? this.model : null };
  }

  async chat(message: string, context: ChatContext): Promise<ChatReply> {
    const fallback = engineChat(message, context);
    if (!this.enabled) return fallback;

    try {
      const grounding = this.buildGrounding(message, context);
      const reply = await this.callOpenRouter([
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Driver message: "${message}"\n\nStructured context (JSON):\n${JSON.stringify(grounding, null, 1)}\n\nThe app's deterministic engine suggests: "${fallback.reply}". Write the reply for the driver.`,
        },
      ]);
      if (!reply) return fallback;
      return { reply, source: 'openrouter', model: this.model, suggestions: fallback.suggestions };
    } catch (err) {
      log('OpenRouter unavailable, using RecommendationEngine:', (err as Error).message);
      return fallback;
    }
  }

  /** Mirrors the spec payload: chargingMinutesRemaining, walkingTime, nearbyPlaces, userPreferences. */
  private buildGrounding(message: string, ctx: ChatContext) {
    const intent = detectIntent(message);
    const vehicle = vehicleById(ctx.vehicleId);
    const stationId = ctx.stationId ?? FEATURED_STATION_ID;
    const station = stationById(stationId)!;
    const minutes =
      intent.kind === 'activity' && intent.minutes ? intent.minutes : Math.round(ctx.chargingMinutesRemaining ?? 20);

    const ranked = rankActivities({
      chargingMinutesRemaining: minutes,
      stationId,
      category: intent.kind === 'activity' ? intent.tag : 'all',
      preferences: ctx.preferences,
      clockHour: ctx.clockHour,
    }).slice(0, 6);

    const base = {
      journeyState: ctx.journeyState,
      vehicle: { name: vehicle.name, batteryPercent: Math.round(ctx.batteryPercent), rangeKm: Math.round(ctx.rangeKm) },
      isCharging: Boolean(ctx.isCharging),
      chargingMinutesRemaining: minutes,
      chargeTargetPercent: ctx.chargeTargetPercent ?? 80,
      userPreferences: ctx.preferences ?? [],
      station: { name: station.name, powerKW: station.powerKW, available: `${station.availableChargers}/${station.chargers}`, amenities: station.amenities },
      nearbyPlaces: ranked.map((r) => {
        const p = r.kind === 'place' ? placeById(r.id) : undefined;
        return {
          name: r.name,
          type: r.category,
          rating: r.rating,
          walkingTime: r.fit.walkMinutes,
          activityMinutes: r.fit.activityMinutes,
          safetyBuffer: r.fit.bufferMinutes,
          fits: r.fit.status,
          blurb: p?.blurb,
        };
      }),
    };

    if (intent.kind === 'best-charger') {
      const routes = planRoutes({ vehicle, batteryPercent: ctx.batteryPercent });
      return {
        ...base,
        routeOptions: routes.map((o) => ({
          station: stationById(o.stationId)!.name,
          tags: o.tags,
          driveMinutes: o.driveMinutes,
          chargeMinutes: o.chargeMinutes,
          totalMinutes: o.totalMinutes,
          chargingCost: o.chargingCost,
          reasons: o.reasons,
        })),
      };
    }
    return base;
  }

  private async callOpenRouter(messages: { role: string; content: string }[]): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${env.openRouter.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${env.openRouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'ChargeFlow Demo',
        },
        body: JSON.stringify({ model: this.model, messages, temperature: 0.5, max_tokens: 220 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content?.trim();
      return text || null;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const aiService = new AIRecommendationService();
