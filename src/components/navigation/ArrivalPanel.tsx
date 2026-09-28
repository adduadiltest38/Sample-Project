import { motion } from 'framer-motion';
import { MapPin, Zap } from 'lucide-react';
import { useJourney } from '@/stores/journeyStore';
import { stationById } from '@/mock/stations';
import { vehicleById } from '@/mock/vehicles';
import { estimateChargeMinutes } from '@/lib/energy';
import { formatMoney } from '@/utils/format';
import { Button } from '../ui/Button';
import { AmenityChips } from '../stations/AmenityChips';

export function ArrivalPanel() {
  const route = useJourney((s) => s.activeRoute);
  const battery = useJourney((s) => s.battery);
  const vehicleId = useJourney((s) => s.vehicleId);
  const startCharging = useJourney((s) => s.startCharging);
  if (!route) return null;
  const s = stationById(route.stationId)!;
  const v = vehicleById(vehicleId);
  const target = route.departureSoc;
  const minutes = Math.round(estimateChargeMinutes(v, s.powerKW, battery, target));
  const kwh = ((target - battery) / 100) * v.batteryKWh;
  const bay = (s.chargers - s.availableChargers + 1) % s.chargers || s.chargers;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[26px] bg-volt-gradient p-5 text-volt-ink">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-sm"
            style={{ left: `${(i * 37) % 100}%`, top: '-10%' }}
            initial={{ y: 0, opacity: 0, rotate: 0 }}
            animate={{ y: 180, opacity: [0, 1, 0], rotate: 180 }}
            transition={{ duration: 1.8 + (i % 4) * 0.3, delay: (i % 5) * 0.12, ease: 'easeOut' }}
          >
            {['✦', '⚡', '•'][i % 3]}
          </motion.span>
        ))}
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} className="text-4xl">
          🎉
        </motion.div>
        <h2 className="mt-2 text-[26px] font-bold leading-tight tracking-tight">You’ve arrived!</h2>
        <div className="mt-0.5 flex items-center gap-1 text-[14px] font-semibold opacity-80">
          <MapPin className="size-3.5" /> {s.name}
        </div>
      </div>

      <div className="rounded-[22px] border border-line bg-surface-solid/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Your charger</div>
            <div className="text-[16px] font-bold">
              Bay {bay} · {s.powerKW} kW
            </div>
            <div className="text-xs text-muted">{s.connector} · plugged in automatically</div>
          </div>
          <div className="num rounded-2xl bg-surface-2 px-3 py-2 text-right text-xs text-muted">
            {s.availableChargers}/{s.chargers}
            <div className="text-[10px]">available</div>
          </div>
        </div>
        <div className="num mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-surface-2 py-2.5">
            <div className="text-[17px] font-bold">
              {Math.round(battery)}→{target}%
            </div>
            <div className="text-[10px] font-semibold uppercase text-muted">Charge</div>
          </div>
          <div className="rounded-2xl bg-surface-2 py-2.5">
            <div className="text-[17px] font-bold">~{minutes} min</div>
            <div className="text-[10px] font-semibold uppercase text-muted">Time</div>
          </div>
          <div className="rounded-2xl bg-surface-2 py-2.5">
            <div className="text-[17px] font-bold">{formatMoney(kwh * s.pricePerKwh)}</div>
            <div className="text-[10px] font-semibold uppercase text-muted">{kwh.toFixed(1)} kWh</div>
          </div>
        </div>
      </div>

      <Button variant="volt" size="xl" block icon={<Zap className="size-5 fill-current" />} onClick={startCharging}>
        Start Charging
      </Button>

      <div>
        <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">While you charge</div>
        <AmenityChips amenities={s.amenities} />
      </div>
    </div>
  );
}
