import { motion } from 'framer-motion';
import { useJourney } from '@/stores/journeyStore';
import { stationById } from '@/mock/stations';
import { vehicleById } from '@/mock/vehicles';
import { formatMoney } from '@/utils/format';
import { ChargingRing } from './ChargingRing';
import { CompanionPrompt } from '../recommendations/CompanionPrompt';

/** CHARGING: live session + the Charging Companion prompt. */
export function ChargingPanel() {
  const c = useJourney((s) => s.charging);
  const vehicleId = useJourney((s) => s.vehicleId);
  if (!c) return null;
  const station = stationById(c.stationId)!;
  const v = vehicleById(vehicleId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[20px] font-bold tracking-tight">
            Charging
            <motion.span animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
              ⚡
            </motion.span>
          </div>
          <div className="text-sm text-muted">
            {v.name} · {station.name}
          </div>
        </div>
        <span className="num rounded-full bg-volt-soft px-2.5 py-1 text-[12px] font-bold text-volt-strong">{Math.round(c.powerKW)} kW</span>
      </div>

      <div className="flex items-center gap-4">
        <ChargingRing soc={c.soc} target={c.targetSoc} start={c.startSoc} size={150} />
        <div className="num grid flex-1 grid-cols-1 gap-2.5">
          <Row label="Added" value={`${c.energyKWh.toFixed(1)} kWh`} />
          <Row label="Cost" value={formatMoney(c.cost)} />
          <Row label="Remaining" value={`${Math.max(1, Math.ceil(c.minutesLeft))} min`} strong />
          <div className="text-[11px] font-medium text-muted">
            {Math.round(c.startSoc)}% → {c.targetSoc}% · {station.powerKW} kW max
          </div>
        </div>
      </div>

      <CompanionPrompt />
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line pb-1.5">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <span className={strong ? 'text-[18px] font-bold text-volt-strong' : 'text-[15px] font-semibold'}>{value}</span>
    </div>
  );
}
