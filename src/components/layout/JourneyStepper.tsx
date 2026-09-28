import { motion } from 'framer-motion';
import type { JourneyState } from '@/types';
import { useJourney } from '@/stores/journeyStore';
import { cn } from '@/utils/cn';

const STEPS: { label: string; states: JourneyState[] }[] = [
  { label: 'Plan', states: ['IDLE', 'SEARCHING', 'ROUTE_SELECTED'] },
  { label: 'Drive', states: ['NAVIGATING', 'ARRIVING', 'ARRIVED'] },
  { label: 'Charge', states: ['CHARGING'] },
  { label: 'Explore', states: ['EXPLORING', 'WALKING', 'VISITING', 'RETURNING'] },
  { label: 'Continue', states: ['CHARGING_COMPLETE', 'NAVIGATING_TO_DESTINATION', 'TRIP_COMPLETE'] },
];

/** The connected journey, visible at all times. */
export function JourneyStepper() {
  const state = useJourney((s) => s.state);
  const active = STEPS.findIndex((s) => s.states.includes(state));
  return (
    <div className="glass flex items-center gap-1 rounded-full p-1">
      {STEPS.map((s, i) => (
        <div key={s.label} className="relative">
          {i === active && (
            <motion.div layoutId="step-pill" className="absolute inset-0 rounded-full bg-inverse" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
          )}
          <div
            className={cn(
              'relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
              i === active ? 'text-on-inverse' : i < active ? 'text-ink' : 'text-muted',
            )}
          >
            <span className={cn('grid size-4 place-items-center rounded-full text-[9px]', i < active ? 'bg-volt text-volt-ink' : i === active ? 'bg-volt text-volt-ink' : 'bg-surface-3')}>
              {i < active ? '✓' : i + 1}
            </span>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
