import { motion } from 'framer-motion';
import { Footprints, Undo2 } from 'lucide-react';
import { useJourney, WALK_SPEED_MPS } from '@/stores/journeyStore';
import { placeById } from '@/mock/places';
import { demoUser } from '@/mock/users';
import { formatClock, formatDistance } from '@/utils/format';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { ChargingMini } from '../charging/ChargingMini';
import { cn } from '@/utils/cn';

/** WALKING / VISITING / RETURNING — on-foot companion with the time maths live. */
export function WalkingPanel() {
  const state = useJourney((s) => s.state);
  const walk = useJourney((s) => s.walk);
  const c = useJourney((s) => s.charging);
  const clockS = useJourney((s) => s.clockS);
  const returnToCar = useJourney((s) => s.returnToCar);
  if (!walk || !c) return null;
  const place = placeById(walk.placeId)!;
  const buffer = demoUser.safetyBufferMinutes;
  const chargeLeft = c.status === 'complete' ? 0 : c.minutesLeft;

  const remainingM = walk.phase === 'visiting' ? 0 : walk.totalM - walk.distanceM;
  const walkLeftMin = remainingM / WALK_SPEED_MPS / 60;
  const returnM = walk.phase === 'to' ? walk.distanceM : walk.phase === 'visiting' ? walk.totalM : remainingM;
  const returnMin = returnM / WALK_SPEED_MPS / 60;
  const leaveInMin = chargeLeft - returnMin - buffer;
  const leaveAt = clockS + Math.max(0, leaveInMin) * 60;

  if (state === 'VISITING') {
    const visitLeft = Math.max(0, walk.visitPlannedMin - walk.visitElapsedS / 60);
    const pct = (walk.visitElapsedS / 60 / walk.visitPlannedMin) * 100;
    const late = leaveInMin <= 0;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-3xl">
            {place.emoji}
          </motion.div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">You’re at</div>
            <div className="text-[21px] font-bold tracking-tight">{place.name}</div>
          </div>
        </div>
        <div className={cn('rounded-[22px] p-4', late ? 'bg-amber-soft' : 'bg-volt-soft')}>
          <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{late ? 'Time to head back' : 'Enjoy — leave in'}</div>
          <div className="num text-[34px] font-bold leading-tight">{late ? 'Now' : `${Math.max(1, Math.ceil(Math.min(leaveInMin, visitLeft + 3)))} min`}</div>
          <div className="num text-[12.5px] text-ink-2">
            Leave by {formatClock(leaveAt)} to be back with a {buffer}-min buffer
          </div>
          <ProgressBar value={pct} className="mt-3" height={6} tone={late ? 'amber' : 'volt'} />
        </div>
        <ChargingMini />
        <Button variant="primary" size="xl" block icon={<Undo2 className="size-5" />} onClick={returnToCar}>
          Head back now
        </Button>
      </div>
    );
  }

  const returning = state === 'RETURNING';
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-route text-white">
          <Footprints className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{returning ? 'Returning to' : 'Walking to'}</div>
          <div className="truncate text-[19px] font-bold tracking-tight">{returning ? 'Your car' : `${place.emoji} ${place.name}`}</div>
        </div>
        <div className="text-right">
          <div className="num text-[22px] font-bold leading-none">🚶 {Math.max(1, Math.ceil(walkLeftMin))} min</div>
          <div className="num text-[12px] text-muted">{formatDistance(remainingM)}</div>
        </div>
      </div>
      <ProgressBar value={(walk.distanceM / walk.totalM) * 100} tone="route" height={6} />
      <div className="num grid grid-cols-2 gap-2">
        <Cell label="Charging remaining" value={c.status === 'complete' ? 'Done' : `${Math.ceil(chargeLeft)} min`} accent />
        <Cell label="Return distance" value={formatDistance(returnM)} />
        <Cell label="Safety buffer" value={`${buffer} min`} />
        <Cell label={returning ? 'Back at car' : 'Planned visit'} value={returning ? formatClock(clockS + walkLeftMin * 60) : `${walk.visitPlannedMin} min`} />
      </div>
      <ChargingMini />
      {!returning && (
        <Button variant="secondary" size="lg" block icon={<Undo2 className="size-4" />} onClick={returnToCar}>
          Return to car
        </Button>
      )}
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3.5 py-2.5">
      <div className={cn('text-[17px] font-bold', accent && 'text-volt-strong')}>{value}</div>
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
