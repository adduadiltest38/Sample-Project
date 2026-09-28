import type { ChatContext, ChatReply, ChatSuggestion } from '../../src/types';
import { engineChat } from '../../src/lib/chatEngine';
import { buildAiContext } from '../../src/lib/aiContext';
import { aiQuickPrompts } from '../mock';
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
      const r = await this.call<PythonReply>('/chat', { message, context: buildAiContext(context) });
      this.online = true;
      return { reply: r.reply, source: 'python', suggestions: r.suggestions ?? [] };
    } catch (err) {
      if (this.online) log('AI: Python service unavailable, using the TypeScript engine:', (err as Error).message);
      this.online = false;
      return engineChat(message, context);
    }
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
