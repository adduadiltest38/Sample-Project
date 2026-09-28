import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Footprints, Sparkles } from 'lucide-react';
import { useJourney } from '@/stores/journeyStore';
import { useRecommendations } from '@/hooks/useRecommendations';
import { buildChatContext } from '@/hooks/useChatContext';
import { explainPick } from '@/lib/recommendationEngine';
import { api } from '@/services/api';
import { Button } from '../ui/Button';
import { CategoryChips } from './CategoryChips';
import { Typewriter } from './Typewriter';

/** Signature feature: "You have ~22 minutes. What would you like to do?" */
export function CompanionPrompt() {
  const { best, minutes } = useRecommendations('all');
  const openCompanion = useJourney((s) => s.openCompanion);
  const walkTo = useJourney((s) => s.walkTo);
  const [aiText, setAiText] = useState<{ text: string; source: string } | null>(null);

  // Ask the AI service once per session for a richer suggestion (OpenRouter if configured).
  useEffect(() => {
    let alive = true;
    const ctx = buildChatContext();
    api
      .chat(`I have ${Math.round(ctx.chargingMinutesRemaining ?? 20)} minutes while my car charges. What should I do?`, ctx)
      .then((r) => alive && r.source === 'openrouter' && setAiText({ text: r.reply, source: r.model ?? 'AI' }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const text = aiText?.text ?? (best ? explainPick(best) : `${minutes} minutes is a short window — stay comfy in the car or grab something quick.`);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[19px] font-bold leading-snug tracking-tight">
          Your car is charging ⚡
          <br />
          <span className="text-muted">You have approximately </span>
          <span className="num text-volt-strong">{minutes} minutes</span>
          <span className="text-muted">.</span>
        </h3>
        <p className="mt-1 text-[14px] font-medium">What would you like to do?</p>
      </div>

      <CategoryChips value="all" onChange={(c) => openCompanion(c)} />

      {best && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="relative overflow-hidden rounded-[24px] bg-inverse p-4 text-on-inverse"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-volt/30 blur-3xl" />
          <div className="relative flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] opacity-80">
            <Sparkles className="size-3.5" /> ChargeFlow AI {aiText && <span className="normal-case opacity-60">· {aiText.source}</span>}
          </div>
          <p className="relative mt-2 text-[14.5px] font-medium leading-relaxed">
            <Typewriter text={text} />
          </p>
          <div className="relative mt-3.5 flex gap-2">
            <Button variant="volt" size="md" className="flex-1" icon={<Footprints className="size-4" />} onClick={() => walkTo(best.id)}>
              Walk to {best.name}
            </Button>
            <Button variant="ghost" size="md" className="text-on-inverse hover:bg-white/10 dark:hover:bg-black/10" onClick={() => openCompanion('all')}>
              All options
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
