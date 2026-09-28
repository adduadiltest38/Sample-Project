import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigation, Star, X, Zap } from 'lucide-react';
import { useJourney } from '@/stores/journeyStore';
import { stationById } from '@/mock/stations';
import { vehicleById } from '@/mock/vehicles';
import { nearestNode, travelSummary } from '@/lib/routing';
import { planRoutes } from '@/lib/routePlanner';
import { formatDistance, formatMoney } from '@/utils/format';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AmenityChips } from './AmenityChips';
import { cn } from '@/utils/cn';

/** Details for a station tapped on the map. */
export function StationCard({ className }: { className?: string }) {
  const id = useJourney((s) => s.selectedStationId);
  return (
    <AnimatePresence mode="wait">
      {id && (
        <motion.div
          key={id}
          initial={{ y: 40, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          className={className}
        >
          <Card id={id} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Card({ id }: { id: string }) {
  const s = stationById(id)!;
  const vehiclePos = useJourney((st) => st.vehiclePos);
  const vehicleId = useJourney((st) => st.vehicleId);
  const battery = useJourney((st) => st.battery);
  const state = useJourney((st) => st.state);
  const destNode = useJourney((st) => st.destinationNodeId);
  const close = useJourney((st) => st.selectStation);
  const planVia = useJourney((st) => st.planViaStation);
  const canPlan = state === 'IDLE' || state === 'ROUTE_SELECTED';

  const info = useMemo(() => {
    const t = travelSummary(nearestNode(vehiclePos), s.nodeId);
    const [plan] = planRoutes({ vehicle: vehicleById(vehicleId), batteryPercent: battery, onlyStationId: s.id, destinationNodeId: destNode });
    return { t, plan };
  }, [vehiclePos, s, vehicleId, battery, destNode]);

  return (
    <div className="card overflow-hidden rounded-[28px]">
      <div className="relative p-4 pb-3">
        <button onClick={() => close(null)} className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-surface-2 hover:bg-surface-3" aria-label="Close">
          <X className="size-4" />
        </button>
        <div className="flex items-center gap-3 pr-9">
          <div className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', s.availableChargers > 1 ? 'bg-volt-gradient text-volt-ink' : s.availableChargers === 1 ? 'bg-amber text-black' : 'bg-rose-500 text-white')}>
            <Zap className="size-5 fill-current" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[17px] font-bold tracking-tight">{s.name}</div>
            <div className="flex items-center gap-1.5 text-[12.5px] text-muted">
              <Star className="size-3.5 fill-amber text-amber" />
              <span className="num font-semibold text-ink">{s.rating}</span>
              <span className="num">({s.reviews.toLocaleString()})</span> · {s.network}
            </div>
          </div>
        </div>
        <div className="num mt-3 flex flex-wrap gap-1.5">
          <Badge tone="inverse">
            {formatDistance(info.t.meters)} away · {Math.max(1, Math.round(info.t.seconds / 60))} min
          </Badge>
          <Badge tone="volt">{s.powerKW} kW DC Fast</Badge>
          {s.solar && <Badge tone="amber">☀️ Solar</Badge>}
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <div className="rounded-2xl bg-surface-2 p-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold">
              <span className="num">
                {s.availableChargers} / {s.chargers}
              </span>{' '}
              chargers available
            </span>
            <span className="num text-muted">{formatMoney(s.pricePerKwh)}/kWh</span>
          </div>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: s.chargers }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.03 }}
                className={cn('h-2 flex-1 rounded-full', i < s.availableChargers ? 'bg-volt' : 'bg-surface-3')}
              />
            ))}
          </div>
        </div>

        {info.plan && (
          <div className="num flex items-center justify-between rounded-2xl border border-line px-3 py-2.5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Estimated charging</div>
              <div className="text-[15px] font-bold">
                {Math.round(info.plan.arrivalSocAtStation)} → {info.plan.departureSoc}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-[20px] font-bold text-volt-strong">{info.plan.chargeMinutes} min</div>
              <div className="text-xs text-muted">{formatMoney(info.plan.chargingCost)}</div>
            </div>
          </div>
        )}

        <AmenityChips amenities={s.amenities} />
        <div className="text-xs text-muted">{s.address} · {s.connector}</div>

        {canPlan ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="primary" size="lg" icon={<Navigation className="size-4 fill-current" />} onClick={() => planVia(s.id, true)}>
              Navigate
            </Button>
            <Button variant="secondary" size="lg" onClick={() => planVia(s.id, false)}>
              Select Station
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-2 px-3 py-2.5 text-center text-[12.5px] font-medium text-muted">Finish your current trip to change stations.</div>
        )}
      </div>
    </div>
  );
}
