import type { ChatContext, ChatReply, ChatSuggestion } from '../../src/types';
import { engineChat } from '../../src/lib/chatEngine';
import { isOpenAt, walkFor } from '../../src/lib/recommendationEngine';
import { planRoutes } from '../../src/lib/routePlanner';
import { travelSummary } from '../../src/lib/routing';
import {
  aiQuickPrompts,
  demoTrip,
  demoUser,
  FEATURED_STATION_ID,
  inCarActivities,
  placesNearStation,
  stationById,
  vehicleById,
} from '../mock';
import { env } from '../utils/env';
import { log } from '../utils/http';

// ─────────────────────────────────────────────────────────────
// AIRecommendationService
// Replies come from the Python AI service (ai-service/chargeflow_ai.py),
// which answers predefined questions using the trip data sent here.
// If the Python service isn't running, the TypeScript engine answers
// instead, so the chat never breaks.
// ─────────────────────────────────────────────────────────────

const TIMEOUT_MS = 4000;
const HEALTH_TTL_MS = 5000;

interface PythonReply {
  reply: string;
  intent: string;
  suggestions: ChatSuggestion[];
}

export class AIRecommendationService {
  private online = false;
  private checkedAt = 0;
  private prompts: string[] = aiQuickPrompts;

  /** Pings the Python service (cached for a few seconds). */
  async refresh() {
    if (Date.now() - this.checkedAt < HEALTH_TTL_MS) return;
    this.checkedAt = Date.now();
    try {
      const res = await this.call<{ prompts: string[] }>('/prompts');
      this.online = true;
      if (res.prompts?.length) this.prompts = res.prompts;
    } catch {
      if (this.online) log('AI: Python service went offline — using the TypeScript engine');
      this.online = false;
    }
  }

  async status() {
    await this.refresh();
    return {
      enabled: this.online,
      provider: this.online ? ('python' as const) : ('engine' as const),
      service: this.online ? env.aiServiceUrl : null,
      prompts: this.prompts,
    };
  }

  async chat(message: string, context: ChatContext): Promise<ChatReply> {
    try {
      const r = await this.call<PythonReply>('/chat', { message, context: this.buildContext(context) });
      this.online = true;
      return { reply: r.reply, source: 'python', suggestions: r.suggestions ?? [] };
    } catch (err) {
      if (this.online) log('AI: Python service unavailable, using the TypeScript engine:', (err as Error).message);
      this.online = false;
      return engineChat(message, context);
    }
  }

  /** Everything the Python service needs to answer about this trip. */
  private buildContext(ctx: ChatContext) {
    const vehicle = vehicleById(ctx.vehicleId);
    const stationId = ctx.stationId ?? FEATURED_STATION_ID;
    const station = stationById(stationId)!;
    const hour = ctx.clockHour ?? 14;
    const routes = planRoutes({ vehicle, batteryPercent: ctx.batteryPercent });
    const trip = travelSummary(demoTrip.start.nodeId, demoTrip.destination.nodeId);

    return {
      userName: demoUser.name,
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

  private async call<T>(path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${env.aiServiceUrl}${path}`, {
        method: body ? 'POST' : 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const aiService = new AIRecommendationService();
