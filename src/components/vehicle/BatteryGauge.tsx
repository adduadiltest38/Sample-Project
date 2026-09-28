import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

export function batteryTone(pct: number) {
  if (pct <= 15) return { bar: 'bg-danger', text: 'text-danger' };
  if (pct <= 30) return { bar: 'bg-amber', text: 'text-amber-600 dark:text-amber' };
  return { bar: 'bg-volt-gradient', text: 'text-volt-strong' };
}

/** Horizontal battery with animated fill and optional charging shimmer. */
export function BatteryGauge({ pct, charging, className, target }: { pct: number; charging?: boolean; className?: string; target?: number }) {
  const tone = batteryTone(pct);
  return (
    <div className={cn('relative flex items-center', className)}>
      <div className="relative h-5 flex-1 overflow-hidden rounded-[7px] border border-line bg-surface-3 p-[2px]">
        <motion.div
          className={cn('relative h-full overflow-hidden rounded-[5px]', tone.bar)}
          initial={false}
          animate={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 20 }}
        >
          {charging && (
            <motion.div
              className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/60 to-transparent"
              animate={{ x: ['-100%', '400%'] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </motion.div>
        {target !== undefined && (
          <div className="absolute inset-y-0.5 w-[2px] rounded bg-ink/40" style={{ left: `${target}%` }} />
        )}
      </div>
      <div className="ml-[3px] h-2.5 w-1 rounded-r-sm bg-line" />
    </div>
  );
}
