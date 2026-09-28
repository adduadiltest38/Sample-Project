import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useJourney } from '@/stores/journeyStore';
import { ProgressBar } from '../ui/ProgressBar';

/** Compact live charging strip used while exploring. */
export function ChargingMini() {
  const c = useJourney((s) => s.charging);
  if (!c) return null;
  const pct = ((c.soc - c.startSoc) / Math.max(1, c.targetSoc - c.startSoc)) * 100;
  const done = c.status === 'complete';
  return (
    <div className="rounded-2xl bg-surface-2 px-3.5 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-bold">
          <motion.span
            className="grid size-6 place-items-center rounded-full bg-volt text-volt-ink"
            animate={done ? {} : { scale: [1, 1.12, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            <Zap className="size-3.5 fill-current" />
          </motion.span>
          {done ? 'Charged' : 'Charging'} · <span className="num">{Math.floor(c.soc)}%</span>
        </div>
        <div className="num text-[12.5px] font-semibold text-muted">
          {done ? 'Ready' : `${Math.max(1, Math.ceil(c.minutesLeft))} min left · ${Math.round(c.powerKW)} kW`}
        </div>
      </div>
      <ProgressBar value={pct} className="mt-2" height={6} />
    </div>
  );
}
