import type { ChargingSessionInfo, ChatContext, ChatReply, RouteOption } from '@/types';
import { buildAiContext } from '@/lib/aiContext';

// Thin client for the ChargeFlow mock backend. Every caller has a
// local fallback, so the UI keeps working if the API is offline.

const BASE = import.meta.env.VITE_API_BASE ?? '';

/** Static builds (no backend) skip the network and use the on-device engines. */
const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === '1';
/** Vercel builds only have the Python chat function; everything else runs in the browser. */
const CHAT_ONLY = import.meta.env.VITE_CHAT_ONLY === '1';

async function request<T>(path: string, init?: RequestInit, timeoutMs = 6000): Promise<T> {
  if (STATIC_DEMO) throw new Error('Static demo: no backend');
  if (CHAT_ONLY && path !== '/ai/chat') throw new Error('Serverless build: handled in the browser');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

const post = <T>(path: string, body: unknown, timeoutMs?: number) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) }, timeoutMs);

export interface AiStatus {
  enabled: boolean;
  provider: 'python' | 'engine';
  service: string | null;
  prompts?: string[];
}

export const api = {
  health: () => request<{ ok: boolean; ai: AiStatus }>('/health', undefined, 2500),

  planRoutes: (body: { vehicleId: string; batteryPercent: number; destinationNodeId?: string }) =>
    post<{ options: RouteOption[] }>('/routes', body).then((r) => {
      if (!r.options?.length) throw new Error('No routes');
      return r.options;
    }),

  startCharging: (body: { stationId: string; vehicleId: string; startSoc: number; targetSoc: number }) =>
    post<{ session: ChargingSessionInfo }>('/charging/start', body).then((r) => r.session),

  chat: (message: string, context: ChatContext) =>
    post<ChatReply>('/ai/chat', { message, context, aiContext: buildAiContext(context) }, 16000),
};
