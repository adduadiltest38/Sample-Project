import { motion } from 'framer-motion';
import { Leaf, RotateCcw } from 'lucide-react';
import { useJourney, destinationLabel } from '@/stores/journeyStore';
import { placeById } from '@/mock/places';
import { stationById } from '@/mock/stations';
import { formatMinutes, formatMoney } from '@/utils/format';
import { Button } from '../ui/Button';

export function TripCompletePanel() {
  const trip = useJourney((s) => s.trip);
  const battery = useJourney((s) => s.battery);
  const dest = useJourney((s) => s.destinationNodeId);
  const stationId = useJourney((s) => s.activeRoute?.stationId);
  const reset = useJourney((s) => s.resetDemo);
  const place = trip.visitedPlaceId ? placeById(trip.visitedPlaceId) : null;
  const km = trip.distanceM / 1000;
  const co2 = km * 0.17; // kg saved vs. a petrol car

  return (
    <div className="space-y-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-[26px] bg-inverse p-5 text-on-inverse">
        <div className="text-4xl">🏁</div>
        <h2 className="mt-2 text-[24px] font-bold leading-tight tracking-tight">Welcome to {destinationLabel(dest)}</h2>
        <p className="mt-1 text-sm opacity-70">Journey complete · {Math.round(battery)}% battery left</p>
      </motion.div>
      <div className="num grid grid-cols-2 gap-2">
        <Box label="Distance" value={`${km.toFixed(1)} km`} />
        <Box label="Driving" value={formatMinutes(trip.driveS / 60)} />
        <Box label="Charging" value={formatMinutes(trip.chargeMinutes)} />
        <Box label="Cost" value={formatMoney(trip.chargeCost)} />
      </div>
      <div className="space-y-2 rounded-[22px] bg-surface-2 p-4 text-[13.5px]">
        {stationId && (
          <div>
            ⚡ Charged at <b>{stationById(stationId)!.name}</b> (+{trip.energyAddedKWh.toFixed(1)} kWh)
          </div>
        )}
        {place && (
          <div>
            {place.emoji} Made the most of it at <b>{place.name}</b>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-volt-strong">
          <Leaf className="size-4" /> {co2.toFixed(1)} kg CO₂ saved vs. petrol
        </div>
      </div>
      <Button variant="primary" size="xl" block icon={<RotateCcw className="size-4" />} onClick={reset}>
        Plan a new trip
      </Button>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3.5 py-3">
      <div className="text-[18px] font-bold">{value}</div>
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
