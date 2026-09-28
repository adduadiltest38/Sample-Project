import { motion } from 'framer-motion';
import { ArrowLeft, Check, Clock, DollarSign, Navigation, Sparkles, Zap } from 'lucide-react';
import type { RouteOption, RouteTag } from '@/types';
import { useJourney, destinationLabel } from '@/stores/journeyStore';
import { stationById } from '@/mock/stations';
import { formatMinutes, formatMoney } from '@/utils/format';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SectionTitle } from '../ui/SectionTitle';
import { AmenityIcons } from '../stations/AmenityChips';
import { cn } from '@/utils/cn';

const TAG_META: Record<RouteTag, { label: string; tone: 'volt' | 'route' | 'amber' | 'neutral'; icon: string }> = {
  ai: { label: 'AI Recommended', tone: 'volt', icon: '✨' },
  fastest: { label: 'Fastest', tone: 'route', icon: '⚡' },
  cheapest: { label: 'Cheapest', tone: 'amber', icon: '💰' },
  comfort: { label: 'Comfortable', tone: 'neutral', icon: '☕' },
};

export function RouteOptions() {
  const options = useJourney((s) => s.routeOptions);
  const selectedId = useJourney((s) => s.selectedRouteId);
  const select = useJourney((s) => s.selectRoute);
  const start = useJourney((s) => s.startNavigation);
  const cancel = useJourney((s) => s.cancelTrip);
  const source = useJourney((s) => s.routesSource);
  const destNode = useJourney((s) => s.destinationNodeId);

  const ai = options.find((o) => o.tags.includes('ai')) ?? options[0];
  const others = options.filter((o) => o !== ai);
  const selected = options.find((o) => o.id === selectedId) ?? ai;
  if (!ai) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={cancel} className="-ml-1 flex items-center gap-1 rounded-xl px-1.5 py-1 text-sm font-semibold text-muted hover:bg-surface-2">
          <ArrowLeft className="size-4" /> Trip
        </button>
        <Badge tone={source === 'api' ? 'route' : 'neutral'}>{source === 'api' ? '● Live API' : '● On-device'}</Badge>
      </div>
      <div>
        <h2 className="text-[21px] font-bold leading-tight tracking-tight">Routes to {destinationLabel(destNode)}</h2>
        <p className="text-sm text-muted">{options.length} smart charging options, ranked for you</p>
      </div>

      <HeroCard option={ai} selected={selected.id === ai.id} onSelect={() => select(ai.id)} />

      {others.length > 0 && (
        <div>
          <SectionTitle>Other options</SectionTitle>
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:overflow-visible lg:px-0">
            {others.map((o, i) => (
              <OptionCard key={o.id} option={o} index={i} selected={o.id === selected.id} onSelect={() => select(o.id)} />
            ))}
          </div>
        </div>
      )}

      <div className="sticky -bottom-5 -mx-5 -mb-5 bg-gradient-to-t from-surface-solid via-surface-solid/90 to-transparent px-5 pb-5 pt-6 max-lg:-bottom-6 max-lg:-mx-4 max-lg:-mb-6 max-lg:px-4 max-lg:pb-6">
        <Button variant="primary" size="xl" block icon={<Navigation className="size-5 fill-current" />} onClick={start}>
          Navigate via {stationById(selected.stationId)!.name.replace('ChargeFlow ', '')}
        </Button>
      </div>
    </div>
  );
}

function HeroCard({ option, selected, onSelect }: { option: RouteOption; selected: boolean; onSelect: () => void }) {
  const s = stationById(option.stationId)!;
  return (
    <motion.button
      layout
      onClick={onSelect}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={cn('relative block w-full rounded-[26px] p-[1.5px] text-left', selected ? 'bg-volt-gradient' : 'bg-line')}
    >
      <div className="relative overflow-hidden rounded-[25px] bg-surface-solid p-4">
        <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-volt/25 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12.5px] font-bold">
            <Sparkles className="size-4 text-volt-strong" />
            <span className="text-gradient">AI Recommended · Best for you</span>
          </div>
          <div className="flex gap-1">
            {option.tags
              .filter((t) => t !== 'ai')
              .map((t) => (
                <Badge key={t} tone={TAG_META[t].tone}>
                  {TAG_META[t].label}
                </Badge>
              ))}
          </div>
        </div>
        <div className="relative mt-2 flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-volt-gradient text-volt-ink shadow-lg shadow-volt/30">
            <Zap className="size-5 fill-current" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[18px] font-bold tracking-tight">{s.name}</div>
            <div className="num text-xs text-muted">
              {s.powerKW} kW · {s.availableChargers}/{s.chargers} available · ★ {s.rating}
            </div>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-4 gap-2">
          <Mini label="Distance" value={`${option.distanceKm}`} unit="km" />
          <Mini label="Driving" value={`${option.driveMinutes}`} unit="min" />
          <Mini label="Charging" value={`${option.chargeMinutes}`} unit="min" accent />
          <Mini label="Total" value={`${option.totalMinutes}`} unit="min" />
        </div>
        <div className="relative mt-4">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Why?</div>
          <ul className="grid gap-1.5">
            {option.reasons.map((r, i) => (
              <motion.li key={r} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.08 }} className="flex items-center gap-2 text-[13.5px] font-medium">
                <span className="grid size-4.5 place-items-center rounded-full bg-volt-soft text-volt-strong">
                  <Check className="size-3" strokeWidth={3.5} />
                </span>
                {r}
              </motion.li>
            ))}
          </ul>
        </div>
        <div className="num relative mt-4 flex items-center justify-between rounded-2xl bg-surface-2 px-3 py-2 text-[12.5px]">
          <span className="text-muted">
            Arrive <b className="text-ink">{Math.round(option.arrivalSocAtStation)}%</b> → leave <b className="text-volt-strong">{option.departureSoc}%</b>
          </span>
          <span className="font-semibold">{formatMoney(option.chargingCost)}</span>
        </div>
      </div>
    </motion.button>
  );
}

function OptionCard({ option, index, selected, onSelect }: { option: RouteOption; index: number; selected: boolean; onSelect: () => void }) {
  const s = stationById(option.stationId)!;
  const tag = option.tags[0];
  const meta = tag ? TAG_META[tag] : { label: option.label, tone: 'neutral' as const, icon: '📍' };
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.07 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        'w-[78%] shrink-0 snap-start rounded-[22px] border p-3.5 text-left transition-colors lg:w-full',
        selected ? 'border-route bg-route-soft' : 'border-line bg-surface-solid/70 hover:bg-surface-2',
      )}
    >
      <div className="flex items-center justify-between">
        <Badge tone={meta.tone}>
          {meta.icon} {option.tags.map((t) => TAG_META[t].label).join(' · ') || meta.label}
        </Badge>
        <span className="text-[11px] font-semibold text-muted">{option.label}</span>
      </div>
      <div className="mt-2 truncate text-[15px] font-bold">{s.name}</div>
      <div className="num mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-2">
        <span className="flex items-center gap-1">
          <Clock className="size-3.5 text-muted" />
          {formatMinutes(option.totalMinutes)}
        </span>
        <span className="flex items-center gap-1">
          <Zap className="size-3.5 text-muted" />
          {option.chargeMinutes} min
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="size-3.5 text-muted" />
          {option.chargingCost.toFixed(2)}
        </span>
        <span className="text-muted">{option.distanceKm} km</span>
      </div>
      <AmenityIcons amenities={s.amenities} className="mt-2" />
    </motion.button>
  );
}

function Mini({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-2 py-2 text-center">
      <div className={cn('num text-[18px] font-bold leading-none', accent && 'text-volt-strong')}>{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {unit} · {label}
      </div>
    </div>
  );
}
