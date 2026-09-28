import { Moon, Sun, Timer } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUi } from '@/stores/uiStore';
import { useJourney, effectiveTimeScale } from '@/stores/journeyStore';
import { useChat } from '@/stores/chatStore';
import { demoUser } from '@/mock/users';
import { formatClock } from '@/utils/format';
import { JourneyStepper } from './JourneyStepper';
import { IconButton } from '../ui/IconButton';

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid size-10 place-items-center rounded-[14px] bg-inverse shadow-lg">
        <svg viewBox="0 0 24 24" className="size-5">
          <defs>
            <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2EF2B5" />
              <stop offset="1" stopColor="#3B9BFF" />
            </linearGradient>
          </defs>
          <path d="M13.5 2 5 13.5h6L9.5 22 19 9.5h-6.2z" fill="url(#logo-g)" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-[17px] font-extrabold tracking-tight">ChargeFlow</div>
        {!compact && <div className="text-[11px] font-medium text-muted">Charge your car. Make the most of your time.</div>}
      </div>
    </div>
  );
}

export function ClockChip() {
  const clock = useJourney((s) => s.clockS);
  const state = useJourney((s) => s.state);
  const mode = useJourney((s) => s.speedMode);
  const paused = useJourney((s) => s.drive?.paused && (s.state === 'NAVIGATING' || s.state === 'ARRIVING' || s.state === 'NAVIGATING_TO_DESTINATION'));
  const running = ['NAVIGATING', 'ARRIVING', 'CHARGING', 'EXPLORING', 'WALKING', 'VISITING', 'RETURNING', 'NAVIGATING_TO_DESTINATION'].includes(state) && !paused;
  return (
    <div className="glass num flex h-11 items-center gap-2 rounded-2xl px-3.5 text-[14px] font-semibold">
      <span>{formatClock(clock)}</span>
      {running && (
        <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} className="flex items-center gap-1 overflow-hidden rounded-full bg-volt-soft px-2 py-0.5 text-[11px] text-volt-strong">
          <Timer className="size-3" />
          {Math.round(effectiveTimeScale(mode, state))}×
        </motion.span>
      )}
    </div>
  );
}

export function ThemeToggle() {
  const theme = useUi((s) => s.theme);
  const toggle = useUi((s) => s.toggleTheme);
  return (
    <IconButton label="Toggle theme" onClick={toggle}>
      <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}>
        {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
      </motion.span>
    </IconButton>
  );
}

export function TopBar() {
  const status = useChat((s) => s.status);
  const online = useChat((s) => s.apiOnline);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-4 p-4">
      <div className="glass pointer-events-auto flex h-14 items-center rounded-[20px] pl-2 pr-5">
        <Logo />
      </div>
      <div className="pointer-events-auto hidden xl:block">
        <JourneyStepper />
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="glass hidden h-11 items-center gap-2 rounded-2xl px-3 text-[12px] font-semibold md:flex" title={status?.service ?? undefined}>
          <span className={`size-2 rounded-full ${online === false ? 'bg-amber' : status?.enabled ? 'bg-volt' : 'bg-route'}`} />
          {online === false ? 'AI · On-device' : status?.enabled ? 'AI · Python' : 'AI · Local engine'}
        </div>
        <ClockChip />
        <ThemeToggle />
        <div className="glass flex h-11 items-center gap-2 rounded-2xl pl-1.5 pr-3">
          <div className="grid size-8 place-items-center rounded-xl bg-volt-gradient text-[12px] font-bold text-volt-ink">{demoUser.initials}</div>
          <div className="leading-tight">
            <div className="text-[13px] font-bold">{demoUser.name}</div>
            <div className="text-[10.5px] font-medium text-muted">{demoUser.plan}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
