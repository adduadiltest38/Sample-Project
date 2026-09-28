import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { chargingStations } from '@/mock/stations';
import { Skeleton } from '../ui/Skeleton';

const STEPS = [
  'Reading battery & consumption',
  `Checking ${chargingStations.length} chargers across Nova City`,
  'Live availability & queue times',
  'Amenities around each stop',
  'Balancing time, cost & comfort',
];

export function SearchingPanel() {
  const [done, setDone] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDone((d) => Math.min(STEPS.length, d + 1)), 360);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative grid size-12 place-items-center">
          <motion.div className="absolute inset-0 rounded-2xl bg-volt-gradient" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
          <div className="absolute inset-[3px] grid place-items-center rounded-[13px] bg-surface-solid text-xl">✨</div>
        </div>
        <div>
          <h2 className="text-[19px] font-bold tracking-tight">Finding your best stop…</h2>
          <p className="text-sm text-muted">ChargeFlow AI is planning your route</p>
        </div>
      </div>
      <ul className="space-y-2.5">
        {STEPS.map((s, i) => (
          <motion.li key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: i <= done ? 1 : 0.35, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-2.5 text-[14px]">
            <span className={`grid size-5 place-items-center rounded-full ${i < done ? 'bg-volt text-volt-ink' : 'bg-surface-3 text-muted'}`}>
              {i < done ? <Check className="size-3" strokeWidth={3.5} /> : <Loader2 className="size-3 animate-spin" />}
            </span>
            {s}
          </motion.li>
        ))}
      </ul>
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-[24px]" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-[20px]" />
          <Skeleton className="h-24 rounded-[20px]" />
        </div>
      </div>
    </div>
  );
}
