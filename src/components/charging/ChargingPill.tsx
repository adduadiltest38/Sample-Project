import { AnimatePresence, motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useJourney, AWAY_STATES } from '@/stores/journeyStore';
import { cn } from '@/utils/cn';

/** Floating live charging status over the map while you're away from the car. */
export function ChargingPill({ className }: { className?: string }) {
  const show = useJourney((s) => Boolean(s.charging) && (AWAY_STATES.includes(s.state) || s.state === 'EXPLORING'));
  const soc = useJourney((s) => Math.floor(s.charging?.soc ?? 0));
  const left = useJourney((s) => Math.ceil(s.charging?.minutesLeft ?? 0));
  const done = useJourney((s) => s.charging?.status === 'complete');
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          className={cn('glass pointer-events-auto flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-[13px] font-semibold', className)}
        >
          <span className="relative grid size-7 place-items-center rounded-full bg-volt text-volt-ink">
            {!done && <span className="absolute inset-0 animate-ping rounded-full bg-volt opacity-40" />}
            <Zap className="relative size-3.5 fill-current" />
          </span>
          <span className="num">{soc}%</span>
          <span className="text-muted">·</span>
          <span className="num text-muted">{done ? 'Charged — return to car' : `${left} min left`}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
