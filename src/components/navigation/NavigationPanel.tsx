import { motion } from 'framer-motion';
import { Flag, Pause, Play, X, Zap } from 'lucide-react';
import { useJourney, navInfo, destinationLabel } from '@/stores/journeyStore';
import { formatClock, formatDistance } from '@/utils/format';
import { VehicleCard } from '../vehicle/VehicleCard';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { SectionTitle } from '../ui/SectionTitle';
import { ManeuverIcon } from './ManeuverIcon';
import { cn } from '@/utils/cn';

export function NavigationPanel() {
  const s = useJourney();
  const nav = navInfo(s);
  if (!nav) return null;
  const toStation = nav.legIndex === 0;
  const upcoming = nav.leg.maneuvers.filter((m) => m.atM > s.drive!.distanceM + 1 && m.type !== 'depart').slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Next stop — this is also the peek row on mobile */}
      <div className="flex items-center gap-3">
        <div className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', toStation ? 'bg-volt-gradient text-volt-ink' : 'bg-inverse text-on-inverse')}>
          {toStation ? <Zap className="size-5 fill-current" /> : <Flag className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{toStation ? 'Charging stop' : 'Destination'}</div>
          <div className="truncate text-[17px] font-bold tracking-tight">{toStation ? nav.station.name : destinationLabel(s.destinationNodeId)}</div>
        </div>
        <div className="text-right">
          <div className="num text-[22px] font-bold leading-none">{formatClock(nav.etaClockS)}</div>
          <div className="text-[11px] font-medium text-muted">arrival</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile value={formatDistance(nav.remainingM)} label="Remaining" />
        <Tile value={`${Math.max(1, Math.round(nav.remainingS / 60))} min`} label="Drive time" />
        <Tile value={`${Math.round(nav.arrivalSoc)}%`} label="On arrival" accent />
      </div>
      <ProgressBar value={nav.progress * 100} tone="route" height={6} />

      <VehicleCard compact />

      {toStation && (
        <div className="num flex items-center justify-between rounded-2xl bg-surface-2 px-3.5 py-2.5 text-[12.5px]">
          <span className="text-muted">
            Then charge <b className="text-ink">{s.activeRoute!.chargeMinutes} min</b> → {s.activeRoute!.departureSoc}%
          </span>
          <span className="text-muted">
            Final ETA <b className="text-ink">{formatClock(nav.finalEtaClockS)}</b>
          </span>
        </div>
      )}

      <div>
        <SectionTitle>Upcoming</SectionTitle>
        <ol className="relative space-y-1">
          {upcoming.map((m, i) => (
            <motion.li
              key={m.atM + m.text}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn('flex items-center gap-3 rounded-2xl px-2.5 py-2', i === 0 && 'bg-route-soft')}
            >
              <div className={cn('grid size-8 shrink-0 place-items-center rounded-xl', m.type === 'charging-stop' ? 'bg-volt text-volt-ink' : 'bg-surface-2')}>
                <ManeuverIcon type={m.type} className="size-4" />
              </div>
              <div className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{m.text}</div>
              <div className="num text-xs font-semibold text-muted">{formatDistance(m.atM - s.drive!.distanceM)}</div>
            </motion.li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="lg" icon={s.drive?.paused ? <Play className="size-4" /> : <Pause className="size-4" />} onClick={s.togglePause}>
          {s.drive?.paused ? 'Resume' : 'Pause'}
        </Button>
        <Button variant="danger" size="lg" icon={<X className="size-4" />} onClick={s.cancelTrip}>
          End trip
        </Button>
      </div>
    </div>
  );
}

function Tile({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
      <div className={cn('num truncate text-[17px] font-bold leading-none', accent && 'text-volt-strong')}>{value}</div>
      <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
