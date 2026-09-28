import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ChevronRight, MapPin, Sparkles, Zap } from 'lucide-react';
import { useJourney } from '@/stores/journeyStore';
import { vehicleById } from '@/mock/vehicles';
import { chargingStations } from '@/mock/stations';
import { demoTrip, destinations } from '@/mock/routes';
import { demoUser } from '@/mock/users';
import { nearestNode, travelSummary } from '@/lib/routing';
import { planningKWhPerKm } from '@/lib/energy';
import { requiredDepartureSoc } from '@/lib/routePlanner';
import { formatClock, formatDistance } from '@/utils/format';
import { VehicleCard } from '../vehicle/VehicleCard';
import { Button } from '../ui/Button';
import { SectionTitle } from '../ui/SectionTitle';
import { cn } from '@/utils/cn';

export function TripPlanner() {
  const vehicleId = useJourney((s) => s.vehicleId);
  const battery = useJourney((s) => s.battery);
  const clockS = useJourney((s) => s.clockS);
  const destNode = useJourney((s) => s.destinationNodeId);
  const vehiclePos = useJourney((s) => s.vehiclePos);
  const setDestination = useJourney((s) => s.setDestination);
  const findRoutes = useJourney((s) => s.findRoutes);
  const selectStation = useJourney((s) => s.selectStation);
  const v = vehicleById(vehicleId);

  const fromNode = useMemo(() => nearestNode(vehiclePos), [vehiclePos]);
  const trip = useMemo(() => travelSummary(fromNode, destNode), [fromNode, destNode]);
  const tripKm = trip.meters / 1000;
  const dayKm = tripKm + demoTrip.onwardKm;
  const needed = requiredDepartureSoc(v, dayKm, demoUser.reservePercent);
  const required = battery < needed;
  const arriveWithout = battery - ((dayKm * planningKWhPerKm(v)) / v.batteryKWh) * 100;

  const nearby = useMemo(
    () =>
      chargingStations
        .map((s) => ({ s, t: travelSummary(fromNode, s.nodeId) }))
        .sort((a, b) => a.t.seconds - b.t.seconds)
        .slice(0, 3),
    [fromNode],
  );

  const hour = Math.floor(clockS / 3600);
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-4">
      <div>
        <div className="num text-xs font-medium text-muted">{formatClock(clockS)} · Nova City</div>
        <h1 className="mt-0.5 text-[24px] font-bold leading-tight tracking-tight">
          {greeting}, {demoUser.name} <span className="inline-block origin-[70%_70%] animate-[wave_2s_ease-in-out_1]">👋</span>
        </h1>
      </div>

      <VehicleCard />

      <div className="rounded-[22px] border border-line bg-surface-solid/60 p-4">
        <div className="flex gap-3">
          <div className="flex flex-col items-center pt-1.5">
            <div className="size-2.5 rounded-full border-2 border-route bg-surface-solid" />
            <div className="my-1 w-px flex-1 border-l-2 border-dotted border-line" />
            <MapPin className="size-4 text-ink" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">From</div>
              <div className="text-[15px] font-semibold">
                {demoTrip.start.district} · {demoTrip.start.label}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">To</div>
              <select
                value={destNode}
                onChange={(e) => setDestination(e.target.value)}
                className="-ml-1 w-full cursor-pointer appearance-none rounded-lg bg-transparent px-1 text-[15px] font-semibold outline-none hover:bg-surface-2"
              >
                {destinations.map((d) => (
                  <option key={d.nodeId} value={d.nodeId}>
                    {d.label}
                  </option>
                ))}
              </select>
              <div className="num text-xs text-muted">
                {formatDistance(trip.meters)} · {Math.round(trip.seconds / 60)} min · then {demoTrip.onwardLabel} ({demoTrip.onwardKm} km)
              </div>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('flex gap-3 rounded-[20px] p-3.5', required ? 'bg-amber-soft' : 'bg-volt-soft')}
      >
        <div className={cn('grid size-9 shrink-0 place-items-center rounded-xl', required ? 'bg-amber text-black' : 'bg-volt text-volt-ink')}>
          {required ? <AlertTriangle className="size-4.5" /> : <Zap className="size-4.5" />}
        </div>
        <div className="min-w-0 text-[13px] leading-snug">
          <div className="font-bold">Charging required: {required ? 'Yes' : 'Optional'}</div>
          <div className="text-ink-2">
            Today’s plan is <span className="num font-semibold">{Math.round(dayKm)} km</span>.{' '}
            {required ? (
              <>
                Without a stop you’d reach Al Noor with <span className="num font-semibold">{Math.round(arriveWithout)}%</span> — below your {demoUser.reservePercent}% reserve.
              </>
            ) : (
              <>You have enough range, but a top-up keeps your {demoUser.reservePercent}% reserve safe.</>
            )}
          </div>
        </div>
      </motion.div>

      <Button variant="volt" size="xl" block icon={<Sparkles className="size-5" />} onClick={() => findRoutes()}>
        Find Best Charging Route
      </Button>

      <div>
        <SectionTitle>Chargers near you</SectionTitle>
        <div className="space-y-1.5">
          {nearby.map(({ s, t }) => (
            <button
              key={s.id}
              onClick={() => selectStation(s.id)}
              className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-surface-2"
            >
              <div className={cn('grid size-10 shrink-0 place-items-center rounded-xl', s.availableChargers > 1 ? 'bg-volt-soft text-volt-strong' : 'bg-amber-soft text-amber-600')}>
                <Zap className="size-4.5 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{s.name}</div>
                <div className="num text-xs text-muted">
                  {formatDistance(t.meters)} · {Math.max(1, Math.round(t.seconds / 60))} min · {s.powerKW} kW
                </div>
              </div>
              <div className="text-right">
                <div className="num text-[13px] font-bold">
                  {s.availableChargers}/{s.chargers}
                </div>
                <div className="text-[10.5px] text-muted">free</div>
              </div>
              <ChevronRight className="size-4 text-muted" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
