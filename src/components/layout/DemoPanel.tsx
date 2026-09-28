import { AnimatePresence, motion } from 'framer-motion';
import { FlaskConical, X } from 'lucide-react';
import { useJourney, type SpeedMode } from '@/stores/journeyStore';
import { useUi } from '@/stores/uiStore';
import { cn } from '@/utils/cn';

/** Presenter controls — hidden behind a small "Demo Mode" button. */
export function DemoToggle({ className }: { className?: string }) {
  const open = useUi((s) => s.demoOpen);
  const setOpen = useUi((s) => s.setDemoOpen);
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => setOpen(!open)}
      className={cn(
        'glass pointer-events-auto flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold',
        open && 'bg-inverse text-on-inverse',
        className,
      )}
    >
      <FlaskConical className="size-3.5" /> Demo Mode
    </motion.button>
  );
}

export function DemoPanel({ className }: { className?: string }) {
  const open = useUi((s) => s.demoOpen);
  const setOpen = useUi((s) => s.setDemoOpen);
  const j = useJourney();
  const paused = Boolean(j.drive?.paused);
  const driving = ['NAVIGATING', 'ARRIVING', 'NAVIGATING_TO_DESTINATION'].includes(j.state);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          className={cn('card pointer-events-auto w-[330px] rounded-[24px] p-4', className)}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-bold">Demo controls</div>
              <div className="num text-[11px] text-muted">State: {j.state}</div>
            </div>
            <button onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-full hover:bg-surface-2" aria-label="Close demo panel">
              <X className="size-4" />
            </button>
          </div>

          <Group title="Battery">
            {[10, 25, 50, 75].map((b) => (
              <Chip key={b} active={Math.round(j.battery) === b} onClick={() => j.setBattery(b)}>
                {b}%
              </Chip>
            ))}
          </Group>

          <Group title="Navigation">
            <Chip onClick={j.demoStartNavigation}>Start</Chip>
            <Chip onClick={j.togglePause} disabled={!driving}>
              {paused ? 'Resume' : 'Pause'}
            </Chip>
            <Chip onClick={j.skipToStation}>Skip to Station</Chip>
          </Group>

          <Group title="Charging">
            <Chip onClick={j.demoStartCharging}>Start Charging</Chip>
            <Chip onClick={() => j.addMinutes(5)} disabled={!j.charging}>
              +5 min
            </Chip>
            <Chip onClick={() => j.addMinutes(10)} disabled={!j.charging}>
              +10 min
            </Chip>
            <Chip onClick={j.completeCharging}>Complete Charging</Chip>
          </Group>

          <Group title="Location">
            <Chip onClick={j.skipToStation}>Move to Station</Chip>
            <Chip onClick={j.demoMoveToPlace}>Move to Café</Chip>
            <Chip onClick={j.demoReturnToCar} disabled={!j.walk}>
              Return to Car
            </Chip>
          </Group>

          <Group title="Simulation speed">
            {(
              [
                ['presenter', 'Presenter'],
                ['minute', '1 s = 1 min'],
                ['turbo', 'Turbo'],
              ] as [SpeedMode, string][]
            ).map(([m, l]) => (
              <Chip key={m} active={j.speedMode === m} onClick={() => j.setSpeedMode(m)}>
                {l}
              </Chip>
            ))}
          </Group>

          <button onClick={j.resetDemo} className="mt-1 w-full rounded-xl bg-danger/10 py-2 text-[12.5px] font-bold text-danger hover:bg-danger/15">
            Reset demo
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">{title}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ children, onClick, active, disabled }: { children: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-8 rounded-xl px-3 text-[12.5px] font-semibold transition-colors disabled:opacity-35',
        active ? 'bg-inverse text-on-inverse' : 'bg-surface-2 hover:bg-surface-3',
      )}
    >
      {children}
    </motion.button>
  );
}
