import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Footprints, Star } from 'lucide-react';
import type { ActivityRecommendation } from '@/types';
import { placeById, categoryMeta } from '@/mock/places';
import { useJourney } from '@/stores/journeyStore';
import { formatDistance } from '@/utils/format';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { TimeFitBreakdown } from './TimeFitBreakdown';
import { cn } from '@/utils/cn';

const FIT_BADGE = {
  perfect: { tone: 'volt', text: '✓ Fits perfectly' },
  plenty: { tone: 'volt', text: '✓ Plenty of time' },
  shortened: { tone: 'amber', text: '◑ Shorter visit' },
  'no-fit': { tone: 'neutral', text: 'Not recommended' },
  closed: { tone: 'neutral', text: 'Closed now' },
} as const;

interface Props {
  rec: ActivityRecommendation;
  selected: boolean;
  topPick?: boolean;
  onSelect: () => void;
  onWalk: () => void;
  index?: number;
}

export function PlaceCard({ rec, selected, topPick, onSelect, onWalk, index = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const place = rec.kind === 'place' ? placeById(rec.id) : undefined;
  const badge = FIT_BADGE[rec.fit.status];
  const fits = rec.fit.status === 'perfect' || rec.fit.status === 'plenty' || rec.fit.status === 'shortened';
  const expanded = open;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, layout: { type: 'spring', stiffness: 300, damping: 30 } }}
      className={cn(
        'rounded-[22px] border p-3.5 transition-colors',
        selected ? 'border-route bg-route-soft/60' : 'border-line bg-surface-solid/70',
        !fits && 'opacity-80',
      )}
    >
      <button
        className="flex w-full items-start gap-3 text-left"
        onClick={() => {
          onSelect();
          setOpen((o) => !o);
        }}
      >
        <div className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-2xl">
          {rec.emoji}
          {topPick && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-volt text-[10px] text-volt-ink shadow">✦</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-[15px] font-bold">{rec.name}</div>
            {rec.rating && (
              <span className="num flex shrink-0 items-center gap-0.5 text-[12.5px] font-semibold">
                <Star className="size-3.5 fill-amber text-amber" /> {rec.rating}
              </span>
            )}
          </div>
          <div className="num text-[12.5px] text-muted">
            {rec.kind === 'place' ? (
              <>
                {rec.fit.walkMinutes} min walk · {formatDistance(rec.fit.walkMeters)} · {categoryMeta[place!.category].label} · {'$'.repeat(place!.priceLevel)}
              </>
            ) : (
              <>In your car · no walking</>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={badge.tone}>{badge.text}</Badge>
            <span className="num text-[12px] text-muted">
              {rec.kind === 'place' ? 'Est. visit' : 'Duration'} {rec.fit.activityMinutes} min
            </span>
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3">
              {place && <p className="mb-3 text-[13px] text-ink-2">{place.blurb}</p>}
              {rec.kind === 'place' && <TimeFitBreakdown fit={rec.fit} activityLabel={categoryMeta[place!.category].label} />}
              {!fits && rec.fit.status === 'no-fit' && (
                <p className="mt-2 text-[12.5px] text-muted">This activity may take longer than your remaining charging window.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 flex items-center gap-2">
        {rec.kind === 'place' ? (
          <Button variant={fits ? 'primary' : 'secondary'} size="md" className="flex-1" icon={<Footprints className="size-4" />} onClick={onWalk} disabled={rec.fit.status === 'closed'}>
            {fits ? 'Walk There' : 'Walk anyway'}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={() => useJourney.getState().pushToast({ icon: rec.emoji, title: `${rec.name} started`, body: 'I’ll let you know when charging is done' })}
          >
            {rec.emoji} Start in car
          </Button>
        )}
        {rec.kind === 'place' && (
          <Button variant="ghost" size="md" onClick={() => setOpen((o) => !o)} aria-label="Time breakdown" className="px-3">
            <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
