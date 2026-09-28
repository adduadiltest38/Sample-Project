import { AnimatePresence, motion } from 'framer-motion';
import { useJourney } from '@/stores/journeyStore';
import { cn } from '@/utils/cn';

export function Toasts({ className }: { className?: string }) {
  const toasts = useJourney((s) => s.toasts);
  const dismiss = useJourney((s) => s.dismissToast);
  return (
    <div className={cn('pointer-events-none flex flex-col items-center gap-2', className)}>
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, y: -14, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
            className={cn(
              'glass pointer-events-auto flex max-w-[340px] items-center gap-3 rounded-2xl py-2.5 pl-2.5 pr-4 text-left',
              t.tone === 'accent' && 'ring-1 ring-volt/60',
              t.tone === 'warn' && 'ring-1 ring-amber/70',
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-lg">{t.icon}</span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-bold">{t.title}</span>
              {t.body && <span className="block truncate text-[12px] text-muted">{t.body}</span>}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
