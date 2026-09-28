import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { vehicles } from '@/mock/vehicles';
import { useJourney } from '@/stores/journeyStore';
import { useUi } from '@/stores/uiStore';
import { rangeKm } from '@/lib/energy';
import { CarIllustration } from './CarIllustration';
import { cn } from '@/utils/cn';

export function VehiclePicker() {
  const open = useUi((s) => s.vehiclePickerOpen);
  const setOpen = useUi((s) => s.setVehiclePickerOpen);
  const vehicleId = useJourney((s) => s.vehicleId);
  const battery = useJourney((s) => s.battery);
  const setVehicle = useJourney((s) => s.setVehicle);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div
            className="card relative m-0 max-h-[86dvh] w-full max-w-2xl overflow-hidden rounded-t-[28px] sm:m-4 sm:rounded-[28px]"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="flex items-center justify-between px-6 pb-2 pt-5">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Choose your vehicle</h2>
                <p className="text-sm text-muted">Range and charging times adapt to each car.</p>
              </div>
              <button className="grid size-9 place-items-center rounded-full bg-surface-2" onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="scroll-thin grid max-h-[68dvh] grid-cols-1 gap-2.5 overflow-y-auto px-5 pb-6 pt-2 sm:grid-cols-2">
              {vehicles.map((v, i) => {
                const active = v.id === vehicleId;
                return (
                  <motion.button
                    key={v.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setVehicle(v.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'relative flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                      active ? 'border-volt bg-volt-soft' : 'border-line bg-surface-2/60 hover:bg-surface-2',
                    )}
                  >
                    <CarIllustration vehicle={v} className="h-12 w-24 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-bold">{v.name}</div>
                      <div className="truncate text-xs text-muted">
                        {v.trim} · {v.colorName}
                      </div>
                      <div className="num mt-1 text-xs text-ink-2">
                        {v.batteryKWh} kWh · {Math.round(rangeKm(v, battery))} km @ {Math.round(battery)}% · {v.maxDcKW} kW
                      </div>
                    </div>
                    {active && (
                      <div className="grid size-6 place-items-center rounded-full bg-volt text-volt-ink">
                        <Check className="size-3.5" strokeWidth={3} />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
