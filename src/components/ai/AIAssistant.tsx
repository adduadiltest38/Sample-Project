import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Sparkles, X } from 'lucide-react';
import { useUi } from '@/stores/uiStore';
import { useChat, type ChatMessage } from '@/stores/chatStore';
import { useJourney } from '@/stores/journeyStore';
import { aiQuickPrompts } from '@/mock/recommendations';
import { placeById } from '@/mock/places';
import { Typewriter } from '../recommendations/Typewriter';
import type { ChatSuggestion } from '@/types';
import { cn } from '@/utils/cn';

/** Floating "✨ Ask ChargeFlow" button. */
export function AIFab({ className, compact }: { className?: string; compact?: boolean }) {
  const open = useUi((s) => s.chatOpen);
  const setOpen = useUi((s) => s.setChatOpen);
  return (
    <motion.button
      onClick={() => setOpen(!open)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'pointer-events-auto relative flex items-center gap-2 overflow-hidden rounded-full bg-inverse font-semibold text-on-inverse shadow-xl',
        compact ? 'size-11 justify-center' : 'h-12 pl-4 pr-5 text-[14px]',
        className,
      )}
      aria-label="Ask ChargeFlow"
    >
      <motion.span
        className="absolute inset-0 bg-volt-gradient opacity-0"
        animate={{ opacity: open ? 0 : [0, 0.18, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      {open ? <X className="relative size-4.5" /> : <Sparkles className="relative size-4.5 text-volt" />}
      {!compact && <span className="relative">{open ? 'Close' : 'Ask ChargeFlow'}</span>}
    </motion.button>
  );
}

/** The chat panel itself. */
export function AIChatPanel({ className, solid }: { className?: string; solid?: boolean }) {
  const open = useUi((s) => s.chatOpen);
  const setOpen = useUi((s) => s.setChatOpen);
  const { messages, pending, send, status, apiOnline } = useChat();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, pending]);

  const submit = (t: string) => {
    if (!t.trim()) return;
    send(t);
    setInput('');
  };

  const providerLabel = apiOnline === false ? 'On-device engine' : status?.enabled ? 'Python AI service' : 'Local RecommendationEngine';
  const prompts = status?.prompts?.length ? status.prompts : aiQuickPrompts;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className={cn(solid ? 'card' : 'glass', 'pointer-events-auto flex flex-col overflow-hidden rounded-[28px]', className)}
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
            <div className="relative grid size-10 place-items-center rounded-2xl bg-inverse">
              <Sparkles className="size-4.5 text-volt" />
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface-solid bg-volt" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">ChargeFlow AI</div>
              <div className="truncate text-[11.5px] text-muted">{providerLabel}</div>
            </div>
            <button onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-full hover:bg-surface-2" aria-label="Close chat">
              <X className="size-4" />
            </button>
          </div>

          <div className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-[22px] font-bold tracking-tight">How can I help?</div>
                <p className="mt-1 text-[13px] text-muted">I know your battery, your route and what’s around every charger.</p>
                <div className="mt-4 space-y-2">
                  {prompts.map((p, i) => (
                    <motion.button
                      key={p}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.05 }}
                      onClick={() => submit(p)}
                      className="flex w-full items-center gap-2 rounded-2xl border border-line bg-surface-solid/70 px-3.5 py-2.5 text-left text-[13.5px] font-medium hover:bg-surface-2"
                    >
                      <span className="text-volt-strong">•</span> {p}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
            {messages.map((m, i) => (
              <Message key={m.id} m={m} latest={i === messages.length - 1} />
            ))}
            {pending && (
              <div className="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-surface-2 px-3.5 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} className="size-1.5 rounded-full bg-muted" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }} />
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {messages.length > 0 && (
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-2">
              {prompts.map((p) => (
                <button key={p} onClick={() => submit(p)} className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-[12px] font-medium hover:bg-surface-3">
                  {p}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-center gap-2 border-t border-line p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about chargers, time, food…"
              className="h-11 min-w-0 flex-1 rounded-2xl bg-surface-2 px-4 text-[16px] outline-none lg:text-[14px] placeholder:text-muted focus:ring-2 focus:ring-volt/50"
            />
            <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={!input.trim() || pending} className="grid size-11 place-items-center rounded-2xl bg-inverse text-on-inverse disabled:opacity-30" aria-label="Send">
              <ArrowUp className="size-4.5" />
            </motion.button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Message({ m, latest }: { m: ChatMessage; latest: boolean }) {
  const [typed, setTyped] = useState(!latest);
  if (m.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-inverse px-3.5 py-2.5 text-[14px] text-on-inverse">
        {m.text}
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-[92%] space-y-2">
      <div className="rounded-2xl rounded-bl-md bg-surface-2 px-3.5 py-2.5 text-[14px] leading-relaxed">
        {latest && !typed ? <Typewriter text={m.text} onDone={() => setTyped(true)} /> : m.text}
      </div>
      {typed && m.suggestions && m.suggestions.length > 0 && (
        <div className="space-y-1.5">
          {m.suggestions.map((s, i) => (
            <SuggestionChip key={s.id} s={s} i={i} />
          ))}
        </div>
      )}
      <div className="px-1 text-[10.5px] text-muted">
        {m.source === 'python' ? '🐍 Python AI service' : m.source === 'offline' ? 'On-device engine' : 'RecommendationEngine'}
      </div>
    </motion.div>
  );
}

function SuggestionChip({ s, i }: { s: ChatSuggestion; i: number }) {
  const js = useJourney();
  const setOpen = useUi((u) => u.setChatOpen);
  const charging = js.state === 'CHARGING' || js.state === 'EXPLORING';
  const act = () => {
    if (s.type === 'place') {
      if (charging) {
        js.selectPlace(s.id);
        js.openCompanion('all');
      } else if (js.state === 'IDLE' || js.state === 'ROUTE_SELECTED') {
        const p = placeById(s.id);
        if (p) js.selectStation(p.nearStationId);
      }
    } else if (s.type === 'station') {
      if (js.state === 'IDLE' || js.state === 'ROUTE_SELECTED') js.selectStation(s.id);
    } else if (s.id === 'find-routes') js.findRoutes();
    else if (s.id.startsWith('incar-')) js.pushToast({ icon: s.emoji ?? '🎧', title: `${s.label} started`, body: 'I’ll let you know when charging is done' });
    if (window.innerWidth < 1024) setOpen(false);
  };
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface-solid/80 p-2">
      <div className="grid size-9 place-items-center rounded-xl bg-surface-2 text-lg">{s.emoji ?? '•'}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{s.label}</div>
        {s.meta && <div className="num truncate text-[11.5px] text-muted">{s.meta}</div>}
      </div>
      <button onClick={act} className="rounded-xl bg-inverse px-3 py-1.5 text-[12px] font-semibold text-on-inverse">
        {s.type === 'place' ? (charging ? 'View' : 'Show') : s.type === 'station' ? 'Details' : s.id.startsWith('incar-') ? 'Start' : 'Go'}
      </button>
      {s.type === 'place' && charging && (
        <button
          onClick={() => {
            js.walkTo(s.id);
            if (window.innerWidth < 1024) setOpen(false);
          }}
          className="rounded-xl bg-volt px-3 py-1.5 text-[12px] font-semibold text-volt-ink"
        >
          Walk
        </button>
      )}
    </motion.div>
  );
}
