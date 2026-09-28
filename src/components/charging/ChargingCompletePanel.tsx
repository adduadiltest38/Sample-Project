import { motion } from 'framer-motion';
import { Navigation } from 'lucide-react';
import { useJourney, destinationLabel } from '@/stores/journeyStore';
import { vehicleById } from '@/mock/vehicles';
import { placeById } from '@/mock/places';
import { rangeKm } from '@/lib/energy';
import { formatMinutes, formatMoney } from '@/utils/format';
import { Button } from '../ui/Button';
import { ChargingRing } from './ChargingRing';

export function ChargingCompletePanel() {
  const c = useJourney((s) => s.charging);
  const vehicleId = useJourney((s) => s.vehicleId);
  const visited = useJourney((s) => s.trip.visitedPlaceId);
  const dest = useJourney((s) => s.destinationNodeId);
  const next = useJourney((s) => s.continueNavigation);
  if (!c) return null;
  const v = vehicleById(vehicleId);
  const place = visited ? placeById(visited) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 16 }}>
          <ChargingRing soc={c.soc} target={c.targetSoc} start={c.startSoc} size={170} active={false} />
        </motion.div>
        <h2 className="mt-3 text-[24px] font-bold tracking-tight">⚡ Charging Complete</h2>
        <p className="text-sm text-muted">Ready for the next part of your journey.</p>
      </div>
      <div className="num grid grid-cols-2 gap-2">
        <Cell label="Energy added" value={`${c.energyKWh.toFixed(1)} kWh`} />
        <Cell label="Cost" value={formatMoney(c.cost)} />
        <Cell label="Charge time" value={formatMinutes(c.elapsedS / 60)} />
        <Cell label="Range now" value={`${Math.round(rangeKm(v, c.soc))} km`} accent />
      </div>
      {place && (
        <div className="rounded-2xl bg-volt-soft px-4 py-3 text-[13.5px] font-medium">
          {place.emoji} You made the most of your stop at <b>{place.name}</b>.
        </div>
      )}
      <Button variant="primary" size="xl" block icon={<Navigation className="size-5 fill-current" />} onClick={next}>
        Continue to {destinationLabel(dest)}
      </Button>
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3.5 py-3">
      <div className={`text-[18px] font-bold ${accent ? 'text-volt-strong' : ''}`}>{value}</div>
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
