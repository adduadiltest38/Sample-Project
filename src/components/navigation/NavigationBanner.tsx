import { AnimatePresence, motion } from 'framer-motion';
import { useJourney, navInfo, DRIVING_STATES } from '@/stores/journeyStore';
import { formatDistance } from '@/utils/format';
import { ManeuverIcon } from './ManeuverIcon';
import { cn } from '@/utils/cn';

/** Turn-by-turn instruction card floating over the map. */
export function NavigationBanner({ className }: { className?: string }) {
  const s = useJourney();
  const nav = DRIVING_STATES.includes(s.state) ? navInfo(s) : null;

  return (
    <AnimatePresence>
      {nav && (
        <motion.div
          className={cn('pointer-events-auto w-full max-w-[460px]', className)}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <Banner nav={nav} arriving={s.state === 'ARRIVING'} paused={Boolean(s.drive?.paused)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Banner({ nav, arriving, paused }: { nav: NonNullable<ReturnType<typeof navInfo>>; arriving: boolean; paused: boolean }) {
  const far = nav.distanceToNextM > 1500 && nav.next.type !== 'charging-stop' && nav.next.type !== 'arrive';
  const stopAhead = nav.next.type === 'charging-stop' && nav.distanceToNextM <= 1000;
  const primary = stopAhead ? 'Charging station ahead' : far ? `Continue on ${nav.road}` : nav.next.text;
  const iconType = far ? 'straight' : nav.next.type;
  const secondary = stopAhead ? nav.station.name : far ? `then ${nav.next.text.charAt(0).toLowerCase()}${nav.next.text.slice(1)}` : nav.after ? `then ${nav.after.text.charAt(0).toLowerCase()}${nav.after.text.slice(1)}` : null;

  return (
    <div className={cn('overflow-hidden rounded-[26px] shadow-2xl', stopAhead || arriving ? 'bg-volt-gradient text-volt-ink' : 'bg-inverse text-on-inverse')}>
      <div className="flex items-center gap-4 p-4 pr-5">
        <motion.div
          key={iconType + nav.next.atM}
          initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          className={cn('grid size-14 shrink-0 place-items-center rounded-2xl', stopAhead || arriving ? 'bg-black/10' : 'bg-white/10 dark:bg-black/10')}
        >
          <ManeuverIcon type={iconType} className="size-8" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="num text-[28px] font-bold leading-none tracking-tight">{formatDistance(nav.distanceToNextM)}</div>
          <motion.div key={primary} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 truncate text-[17px] font-semibold leading-snug">
            {primary}
          </motion.div>
        </div>
      </div>
      <div className={cn('flex items-center justify-between gap-3 px-5 py-2 text-[12.5px] font-medium', stopAhead || arriving ? 'bg-black/10' : 'bg-white/[0.07] dark:bg-black/[0.07]')}>
        <span className="truncate opacity-80">{secondary ?? nav.road}</span>
        <span className="num shrink-0 opacity-80">{paused ? 'Paused' : `${nav.speedKmh} km/h`}</span>
      </div>
    </div>
  );
}
