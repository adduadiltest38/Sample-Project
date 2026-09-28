import { create } from 'zustand';
import type { ChatSuggestion } from '@/types';
import { api, type AiStatus } from '@/services/api';
import { engineChat } from '@/lib/chatEngine';
import { buildChatContext } from '@/hooks/useChatContext';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  suggestions?: ChatSuggestion[];
  source?: 'python' | 'engine' | 'offline';
}

interface ChatStore {
  messages: ChatMessage[];
  pending: boolean;
  status: AiStatus | null;
  apiOnline: boolean | null;
  send: (text: string) => Promise<void>;
  loadStatus: () => Promise<void>;
  clear: () => void;
}

let id = 1;

export const useChat = create<ChatStore>((set, get) => ({
  messages: [],
  pending: false,
  status: null,
  apiOnline: null,

  loadStatus: async () => {
    try {
      const h = await api.health();
      set({ status: h.ai, apiOnline: true });
    } catch {
      set({ status: { enabled: false, provider: 'engine', service: null }, apiOnline: false });
    }
  },

  send: async (text) => {
    const msg = text.trim();
    if (!msg || get().pending) return;
    set((s) => ({ messages: [...s.messages, { id: id++, role: 'user', text: msg }], pending: true }));
    const ctx = buildChatContext();
    const started = performance.now();
    let reply: ChatMessage;
    try {
      const r = await api.chat(msg, ctx);
      reply = { id: id++, role: 'assistant', text: r.reply, suggestions: r.suggestions, source: r.source };
    } catch {
      // Backend unreachable — answer on-device with the same deterministic engine.
      const r = engineChat(msg, ctx);
      reply = { id: id++, role: 'assistant', text: r.reply, suggestions: r.suggestions, source: 'offline' };
    }
    const wait = Math.max(0, 650 - (performance.now() - started));
    await new Promise((r) => setTimeout(r, wait));
    set((s) => ({ messages: [...s.messages, reply], pending: false }));
  },

  clear: () => set({ messages: [] }),
}));
