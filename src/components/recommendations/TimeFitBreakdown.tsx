import { motion } from 'framer-motion';
import type { TimeFit } from '@/types';
import { cn } from '@/utils/cn';

/** Visualises: charging window = walk there + activity + walk back + buffer (+ slack). */
export function TimeFitBreakdown({ fit, activityLabel = 'Activity' }: { fit: TimeFit; activityLabel?: string }) {
  const windowMin = Math.max(fit.chargingMinutes, fit.totalMinutes, 1);
  const parts = [
    { key: 'walk', label: 'Walk there', min: fit.walkMinutes, cls: 'bg-route' },
    { key: 'act', label: activityLabel, min: fit.activityMinutes, cls: 'bg-volt' },
    { key: 'back', label: 'Walk back', min: fit.walkMinutes, cls: 'bg-route/70' },
    { key: 'buf', label: 'Safety buffer', min: fit.bufferMinutes, cls: 'bg-amber' },
  ].filter((p) => p.min > 0);
  const over = fit.totalMinutes > fit.chargingMinutes;

  return (
    <div className="space-y-2.5">
      <div className="relative flex h-3 overflow-hidden rounded-full bg-surface-3">
        {parts.map((p, i) => (
          <motion.div
            key={p.key}
            className={cn('h-full', p.cls, i > 0 && 'border-l-2 border-surface-solid')}
            initial={{ width: 0 }}
            animate={{ width: `${(p.min / windowMin) * 100}%` }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 140, damping: 22 }}
          />
        ))}
        {over && <div className="absolute inset-y-0 w-0.5 bg-danger" style={{ left: `${(fit.chargingMinutes / windowMin) * 100}%` }} />}
      </div>
      <div className="num grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]">
        {parts.map((p) => (
          <div key={p.key} className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted">
              <span className={cn('size-2 rounded-full', p.cls)} />
              {p.label}
            </span>
            <span className="font-semibold">{p.min} min</span>
          </div>
        ))}
      </div>
      <div className={cn('num flex items-center justify-between rounded-xl px-3 py-2 text-[12.5px] font-semibold', over ? 'bg-danger/10 text-danger' : 'bg-volt-soft text-volt-strong')}>
        <span>
          Total {fit.totalMinutes} min / charging {fit.chargingMinutes} min
        </span>
        <span>{over ? 'Too long ✕' : fit.slackMinutes <= 3 ? 'Perfect fit ✓' : `${Math.round(fit.slackMinutes)} min spare ✓`}</span>
      </div>
    </div>
  );
}
