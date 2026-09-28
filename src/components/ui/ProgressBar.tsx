import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

export function ProgressBar({ value, className, tone = 'volt', height = 8 }: { value: number; className?: string; tone?: 'volt' | 'route' | 'amber'; height?: number }) {
  const color = tone === 'volt' ? 'bg-volt-gradient' : tone === 'route' ? 'bg-route' : 'bg-amber';
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-surface-3', className)} style={{ height }}>
      <motion.div
        className={cn('h-full rounded-full', color)}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 24 }}
      />
    </div>
  );
}
