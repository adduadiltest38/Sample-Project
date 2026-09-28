import { AnimatePresence, motion } from 'framer-motion';
import { Footprints, X } from 'lucide-react';
import { useJourney, WALK_SPEED_MPS } from '@/stores/journeyStore';
import { Button } from '../ui/Button';

/** "Charging almost complete — return to your vehicle now." */
export function ReturnAlert({ className }: { className?: string }) {
  const show = useJourney((s) => s.returnAlert && Boolean(s.walk) && s.walk!.phase !== 'back');
  const left = useJourney((s) => Math.ceil(s.charging?.minutesLeft ?? 0));
  const done = useJourney((s) => s.charging?.status === 'complete');
  const walkMin = useJourney((s) => (s.walk ? Math.max(1, Math.round((s.walk.phase === 'to' ? s.walk.distanceM : s.walk.totalM) / WALK_SPEED_MPS / 60)) : 0));
  const returnToCar = useJourney((s) => s.returnToCar);
  const dismiss = useJourney((s) => s.dismissReturnAlert);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -40, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className={className}
        >
          <div className="relative overflow-hidden rounded-[26px] bg-inverse p-[1.5px] shadow-2xl">
            <motion.div className="absolute inset-0 bg-volt-gradient" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.6, repeat: Infinity }} />
            <div className="relative rounded-[25px] bg-inverse p-4 text-on-inverse">
              <button onClick={dismiss} className="absolute right-3 top-3 rounded-full p-1 opacity-60 hover:opacity-100" aria-label="Dismiss">
                <X className="size-4" />
              </button>
              <div className="text-[17px] font-bold">{done ? 'Your car is ready ⚡' : 'Charging almost complete ⚡'}</div>
              <div className="text-sm opacity-75">Return to your vehicle now.</div>
              <div className="num mt-3 flex gap-5 text-[13px]">
                <div>
                  <div className="text-[22px] font-bold leading-none">{done ? '0' : left} min</div>
                  <div className="opacity-60">remaining</div>
                </div>
                <div>
                  <div className="text-[22px] font-bold leading-none">{walkMin} min</div>
                  <div className="opacity-60">walk</div>
                </div>
              </div>
              <Button variant="volt" size="lg" block className="mt-3.5" icon={<Footprints className="size-4" />} onClick={returnToCar}>
                Head back now
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
