import { ChevronDown, Thermometer, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useJourney } from '@/stores/journeyStore';
import { useUi } from '@/stores/uiStore';
import { vehicleById } from '@/mock/vehicles';
import { AMBIENT_TEMP_C } from '@/mock/users';
import { rangeKm } from '@/lib/energy';
import { BatteryGauge, batteryTone } from './BatteryGauge';
import { CarIllustration } from './CarIllustration';
import { cn } from '@/utils/cn';

/** Vehicle summary: model, live battery %, range. `compact` for in-journey states. */
export function VehicleCard({ compact }: { compact?: boolean }) {
  const vehicleId = useJourney((s) => s.vehicleId);
  const battery = useJourney((s) => s.battery);
  const charging = useJourney((s) => s.charging?.status === 'charging');
  const canPick = useJourney((s) => s.state === 'IDLE' || s.state === 'ROUTE_SELECTED');
  const setPicker = useUi((s) => s.setVehiclePickerOpen);
  const v = vehicleById(vehicleId);
  const range = rangeKm(v, battery);
  const tone = batteryTone(battery);

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-surface-2/70 px-3 py-2.5">
        <CarIllustration vehicle={v} className="h-8 w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold">{v.name}</div>
          <BatteryGauge pct={battery} charging={charging} className="mt-1 max-w-[150px]" />
        </div>
        <div className="text-right">
          <div className={cn('num text-lg font-bold leading-none', tone.text)}>
            {Math.round(battery)}
            <span className="text-xs">%</span>
          </div>
          <div className="num mt-1 text-[11px] text-muted">{Math.round(range)} km</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-surface-2/70 p-4">
      <div className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full opacity-40 blur-3xl" style={{ background: v.color }} />
      <div className="relative flex items-start justify-between">
        <button
          disabled={!canPick}
          onClick={() => setPicker(true)}
          className="group -m-1 flex items-center gap-1 rounded-xl p-1 text-left enabled:hover:bg-surface-3/60"
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Your vehicle</div>
            <div className="flex items-center gap-1 text-[17px] font-bold tracking-tight">
              {v.name}
              {canPick && <ChevronDown className="size-4 text-muted transition-transform group-hover:translate-y-0.5" />}
            </div>
            <div className="text-xs text-muted">
              {v.trim} · {v.batteryKWh} kWh
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1 rounded-full bg-surface-solid/70 px-2 py-1 text-[11px] font-semibold text-muted">
          <Thermometer className="size-3" /> {AMBIENT_TEMP_C}°C
        </div>
      </div>
      <motion.div key={v.id} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
        <CarIllustration vehicle={v} className="mx-auto my-1 h-[78px] w-[210px]" />
      </motion.div>
      <div className="relative flex items-end justify-between">
        <div>
          <div className={cn('num flex items-baseline text-[38px] font-bold leading-none tracking-tight', tone.text)}>
            {Math.round(battery)}
            <span className="text-lg">%</span>
            {charging && <Zap className="ml-1 size-5 fill-current" />}
          </div>
        </div>
        <div className="text-right">
          <div className="num text-[22px] font-bold leading-none">
            {Math.round(range)}
            <span className="ml-0.5 text-sm font-semibold text-muted">km</span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-muted">Estimated range</div>
        </div>
      </div>
      <BatteryGauge pct={battery} charging={charging} className="mt-3" />
    </div>
  );
}
