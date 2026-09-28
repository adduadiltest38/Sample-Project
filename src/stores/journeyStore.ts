import { create } from 'zustand';
import type { ActivityTag, JourneyState, Point, RouteOption } from '@/types';
import { chargingStations, stationById } from '@/mock/stations';
import { placeById } from '@/mock/places';
import { vehicleById } from '@/mock/vehicles';
import { demoTrip, destinations, roadNodes } from '@/mock/routes';
import { demoUser, DEMO_START_CLOCK } from '@/mock/users';
import { planRoutes } from '@/lib/routePlanner';
import { driveEnergyKWh, estimateChargeMinutes, stepCharge } from '@/lib/energy';
import { bestPick, computeTimeFit, walkFor } from '@/lib/recommendationEngine';
import {
  METERS_PER_UNIT,
  clamp,
  headingAt,
  makePolyline,
  pointAt,
  walkPath,
  type Polyline,
} from '@/lib/geo';
import { api } from '@/services/api';

// ─────────────────────────────────────────────────────────────
// Journey store — the single state machine behind the demo.
// Every screen, the map camera and all animations react to it.
// ─────────────────────────────────────────────────────────────

export type SpeedMode = 'presenter' | 'minute' | 'turbo';

/** Allowed transitions (documented + enforced in `go`). */
export const TRANSITIONS: Record<JourneyState, JourneyState[]> = {
  IDLE: ['SEARCHING', 'ROUTE_SELECTED'],
  SEARCHING: ['ROUTE_SELECTED', 'IDLE'],
  ROUTE_SELECTED: ['NAVIGATING', 'SEARCHING', 'IDLE'],
  NAVIGATING: ['ARRIVING', 'ARRIVED', 'IDLE'],
  ARRIVING: ['ARRIVED', 'IDLE'],
  ARRIVED: ['CHARGING', 'IDLE'],
  CHARGING: ['EXPLORING', 'WALKING', 'VISITING', 'CHARGING_COMPLETE', 'IDLE'],
  EXPLORING: ['CHARGING', 'WALKING', 'VISITING', 'CHARGING_COMPLETE', 'IDLE'],
  WALKING: ['VISITING', 'RETURNING', 'CHARGING', 'CHARGING_COMPLETE', 'IDLE'],
  VISITING: ['RETURNING', 'CHARGING', 'CHARGING_COMPLETE', 'IDLE'],
  RETURNING: ['CHARGING', 'CHARGING_COMPLETE', 'IDLE'],
  CHARGING_COMPLETE: ['NAVIGATING_TO_DESTINATION', 'IDLE'],
  NAVIGATING_TO_DESTINATION: ['TRIP_COMPLETE', 'IDLE'],
  TRIP_COMPLETE: ['IDLE'],
};

const PHASE_MULT: Partial<Record<JourneyState, number>> = {
  NAVIGATING: 1.6,
  ARRIVING: 1.6,
  NAVIGATING_TO_DESTINATION: 1.6,
  CHARGING: 0.34,
  EXPLORING: 0.34,
  WALKING: 1,
  VISITING: 1,
  RETURNING: 1,
};

const SIM_ACTIVE: JourneyState[] = [
  'NAVIGATING',
  'ARRIVING',
  'CHARGING',
  'EXPLORING',
  'WALKING',
  'VISITING',
  'RETURNING',
  'NAVIGATING_TO_DESTINATION',
];

export const AT_STATION_STATES: JourneyState[] = ['ARRIVED', 'CHARGING', 'EXPLORING', 'WALKING', 'VISITING', 'RETURNING', 'CHARGING_COMPLETE'];
export const DRIVING_STATES: JourneyState[] = ['NAVIGATING', 'ARRIVING', 'NAVIGATING_TO_DESTINATION'];
export const AWAY_STATES: JourneyState[] = ['WALKING', 'VISITING', 'RETURNING'];

export const ARRIVING_THRESHOLD_M = 800;
export const WALK_SPEED_MPS = 75 / 60;

export function effectiveTimeScale(mode: SpeedMode, state: JourneyState) {
  if (mode === 'minute') return 60;
  if (mode === 'turbo') return 120;
  return 30 * (PHASE_MULT[state] ?? 1);
}

export interface DriveProgress {
  legIndex: 0 | 1;
  distanceM: number;
  paused: boolean;
}

export interface ChargingProgress {
  stationId: string;
  backendId?: string;
  startSoc: number;
  targetSoc: number;
  soc: number;
  energyKWh: number;
  powerKW: number;
  cost: number;
  elapsedS: number;
  minutesLeft: number;
  status: 'charging' | 'complete';
}

export interface WalkProgress {
  placeId: string;
  poly: Polyline;
  totalM: number;
  distanceM: number;
  phase: 'to' | 'visiting' | 'back';
  visitElapsedS: number;
  visitPlannedMin: number;
  walkMinutes: number;
}

export interface Toast {
  id: number;
  icon: string;
  title: string;
  body?: string;
  tone?: 'default' | 'accent' | 'warn';
}

export interface TripLog {
  driveS: number;
  distanceM: number;
  energyUsedKWh: number;
  visitedPlaceId?: string;
  chargeMinutes: number;
  chargeCost: number;
  energyAddedKWh: number;
}

interface JourneyStore {
  state: JourneyState;
  vehicleId: string;
  battery: number;
  clockS: number;
  speedMode: SpeedMode;
  destinationNodeId: string;

  routeOptions: RouteOption[];
  selectedRouteId: string | null;
  activeRoute: RouteOption | null;
  legPolys: [Polyline, Polyline] | null;
  routesSource: 'api' | 'local' | null;

  drive: DriveProgress | null;
  vehiclePos: Point;
  vehicleHeading: number;

  charging: ChargingProgress | null;
  walk: WalkProgress | null;
  walkerPos: Point | null;
  walkerHeading: number;

  selectedStationId: string | null;
  selectedPlaceId: string | null;
  companionCategory: ActivityTag | 'all';
  returnAlert: boolean;
  returnAlertDismissed: boolean;
  trip: TripLog;
  toasts: Toast[];
  searchToken: number;

  // actions
  setVehicle: (id: string) => void;
  setBattery: (pct: number) => void;
  setDestination: (nodeId: string) => void;
  setSpeedMode: (m: SpeedMode) => void;
  findRoutes: () => Promise<void>;
  selectRoute: (id: string) => void;
  startNavigation: () => void;
  togglePause: () => void;
  cancelTrip: () => void;
  skipToStation: () => void;
  startCharging: () => void;
  openCompanion: (category?: ActivityTag | 'all') => void;
  backToCharging: () => void;
  selectPlace: (id: string | null) => void;
  walkTo: (placeId: string) => void;
  returnToCar: () => void;
  dismissReturnAlert: () => void;
  completeCharging: () => void;
  addMinutes: (min: number) => void;
  continueNavigation: () => void;
  selectStation: (id: string | null) => void;
  planViaStation: (id: string, navigateNow: boolean) => void;
  demoStartNavigation: () => void;
  demoStartCharging: () => void;
  demoMoveToPlace: () => void;
  demoReturnToCar: () => void;
  resetDemo: () => void;
  tick: (realDtS: number) => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
}

const startNode = roadNodes[demoTrip.start.nodeId];
const INITIAL_CLOCK = DEMO_START_CLOCK.hour * 3600 + DEMO_START_CLOCK.minute * 60;
let toastId = 1;

const emptyTrip = (): TripLog => ({ driveS: 0, distanceM: 0, energyUsedKWh: 0, chargeMinutes: 0, chargeCost: 0, energyAddedKWh: 0 });

const initialState = () => ({
  state: 'IDLE' as JourneyState,
  vehicleId: demoUser.vehicleId,
  battery: demoUser.battery,
  clockS: INITIAL_CLOCK,
  destinationNodeId: demoTrip.destination.nodeId,
  routeOptions: [],
  selectedRouteId: null,
  activeRoute: null,
  legPolys: null,
  routesSource: null,
  drive: null,
  vehiclePos: { x: startNode.x, y: startNode.y },
  vehicleHeading: 90,
  charging: null,
  walk: null,
  walkerPos: null,
  walkerHeading: 0,
  selectedStationId: null,
  selectedPlaceId: null,
  companionCategory: 'all' as const,
  returnAlert: false,
  returnAlertDismissed: false,
  trip: emptyTrip(),
  toasts: [],
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const destinationLabel = (nodeId: string) =>
  destinations.find((d) => d.nodeId === nodeId)?.label ?? demoTrip.destination.label;

function localPlan(vehicleId: string, battery: number, destinationNodeId: string, onlyStationId?: string) {
  return planRoutes({
    vehicle: vehicleById(vehicleId),
    batteryPercent: battery,
    destinationNodeId,
    destinationLabel: destinationLabel(destinationNodeId),
    onlyStationId,
  });
}

const polysFor = (r: RouteOption): [Polyline, Polyline] => [makePolyline(r.legs[0].points), makePolyline(r.legs[1].points)];

export const useJourney = create<JourneyStore>((set, get) => {
  /** Guarded state transition. */
  const go = (next: JourneyState) => {
    const cur = get().state;
    if (cur === next) return;
    if (!TRANSITIONS[cur].includes(next)) {
      console.warn(`[journey] blocked transition ${cur} → ${next}`);
      return;
    }
    set({ state: next });
  };

  const toast = (t: Omit<Toast, 'id'>) => get().pushToast(t);

  const chargeMinutesLeft = (c: ChargingProgress) => {
    const s = stationById(c.stationId)!;
    return estimateChargeMinutes(vehicleById(get().vehicleId), s.powerKW, c.soc, c.targetSoc);
  };

  /** Moves the vehicle to the end of leg 0 (charging stop), consuming energy deterministically. */
  const jumpToStation = () => {
    let s = get();
    if (!s.activeRoute) {
      if (!s.routeOptions.length) {
        const opts = localPlan(s.vehicleId, s.battery, s.destinationNodeId);
        set({ routeOptions: opts, selectedRouteId: opts[0].id, routesSource: 'local' });
      }
      s = get();
      const route = s.routeOptions.find((o) => o.id === s.selectedRouteId) ?? s.routeOptions[0];
      set({ activeRoute: route, legPolys: polysFor(route), drive: { legIndex: 0, distanceM: 0, paused: false }, selectedStationId: null });
      set({ state: 'NAVIGATING' });
      s = get();
    }
    if (!s.drive || s.drive.legIndex !== 0) return;
    const leg = s.activeRoute!.legs[0];
    const frac = 1 - s.drive.distanceM / leg.distanceM;
    const v = vehicleById(s.vehicleId);
    const energy = leg.energyKWh * frac;
    const remainingS = leg.durationS * frac;
    const station = stationById(s.activeRoute!.stationId)!;
    const poly = s.legPolys![0];
    set({
      drive: { ...s.drive, distanceM: leg.distanceM, paused: true },
      battery: Math.max(1, s.battery - (energy / v.batteryKWh) * 100),
      clockS: s.clockS + remainingS,
      vehiclePos: pointAt(poly, poly.length),
      vehicleHeading: headingAt(poly, poly.length),
      trip: { ...s.trip, driveS: s.trip.driveS + remainingS, distanceM: s.trip.distanceM + leg.distanceM * frac, energyUsedKWh: s.trip.energyUsedKWh + energy },
      state: 'ARRIVED',
    });
    toast({ icon: '📍', title: `Arrived at ${station.name}`, tone: 'accent' });
  };

  const finishWalk = () => {
    const s = get();
    const station = s.charging ? stationById(s.charging.stationId) : null;
    set({
      walk: null,
      walkerPos: null,
      returnAlert: false,
      returnAlertDismissed: false,
      state: s.charging?.status === 'complete' ? 'CHARGING_COMPLETE' : 'CHARGING',
    });
    toast({ icon: '🚗', title: 'Back at your car', body: station ? station.name : undefined });
  };

  /** Advances every running process by `dt` simulated seconds. */
  const advance = (dt: number) => {
    const s = get();
    if (!SIM_ACTIVE.includes(s.state) || dt <= 0) return;
    const vehicle = vehicleById(s.vehicleId);
    const patch: Partial<JourneyStore> = { clockS: s.clockS + dt };
    const events: (() => void)[] = [];

    // ── Driving ─────────────────────────────────────────────
    if (s.drive && s.activeRoute && s.legPolys && DRIVING_STATES.includes(s.state) && !s.drive.paused) {
      const li = s.drive.legIndex;
      const leg = s.activeRoute.legs[li];
      const poly = s.legPolys[li];
      let d = s.drive.distanceM;
      let t = dt;
      let energy = 0;
      let guard = 0;
      while (t > 1e-6 && d < leg.distanceM - 1e-6 && guard++ < 5000) {
        let seg = leg.segments[0];
        for (const sg of leg.segments) if (sg.startM <= d) seg = sg;
        const ramp = clamp(Math.min(Math.sqrt((d + 4) / 140), Math.sqrt((leg.distanceM - d + 4) / 260)), 0.16, 1);
        const v = seg.speedMps * ramp;
        const segEnd = seg.startM + seg.lengthM;
        const step = Math.max(0.01, Math.min(segEnd - d, v * t, 25));
        const stepT = step / v;
        energy += driveEnergyKWh(vehicle, step, seg.roadClass, stepT);
        d = Math.min(leg.distanceM, d + step);
        t -= stepT;
      }
      const driven = d - s.drive.distanceM;
      patch.drive = { ...s.drive, distanceM: d };
      patch.battery = Math.max(0.5, s.battery - (energy / vehicle.batteryKWh) * 100);
      patch.vehiclePos = pointAt(poly, d / METERS_PER_UNIT);
      patch.vehicleHeading = headingAt(poly, d / METERS_PER_UNIT);
      patch.trip = { ...s.trip, driveS: s.trip.driveS + (dt - Math.max(0, t)), distanceM: s.trip.distanceM + driven, energyUsedKWh: s.trip.energyUsedKWh + energy };

      const remaining = leg.distanceM - d;
      if (li === 0) {
        const station = stationById(s.activeRoute.stationId)!;
        if (remaining <= 0.5) {
          patch.drive = { ...patch.drive, paused: true };
          events.push(() => {
            go('ARRIVED');
            toast({ icon: '🎉', title: "You've arrived!", body: station.name, tone: 'accent' });
          });
        } else if (remaining <= ARRIVING_THRESHOLD_M && s.state === 'NAVIGATING') {
          events.push(() => {
            go('ARRIVING');
            toast({ icon: '⚡', title: 'Charging station ahead', body: `${station.name} · ${Math.round(remaining / 10) * 10} m` });
          });
        }
      } else if (remaining <= 0.5) {
        patch.drive = { ...patch.drive, paused: true };
        events.push(() => {
          go('TRIP_COMPLETE');
          toast({ icon: '🏁', title: `Welcome to ${destinationLabel(get().destinationNodeId)}`, tone: 'accent' });
        });
      }
    }

    // ── Charging (keeps running while you're away) ──────────
    if (s.charging && s.charging.status === 'charging') {
      const c = { ...s.charging };
      const station = stationById(c.stationId)!;
      let rem = dt;
      while (rem > 1e-6 && c.soc < c.targetSoc) {
        const st = Math.min(5, rem);
        const step = stepCharge(vehicle, station.powerKW, c.soc, c.targetSoc, st);
        c.soc = step.soc;
        c.energyKWh += step.energyKWh;
        c.powerKW = step.powerKW;
        c.elapsedS += st;
        rem -= st;
      }
      c.cost = c.energyKWh * station.pricePerKwh;
      c.minutesLeft = chargeMinutesLeft(c);
      patch.battery = c.soc;
      if (c.soc >= c.targetSoc - 0.01) {
        c.status = 'complete';
        c.powerKW = 0;
        c.minutesLeft = 0;
        const t = get().trip;
        patch.trip = { ...(patch.trip ?? t), chargeMinutes: c.elapsedS / 60, chargeCost: c.cost, energyAddedKWh: c.energyKWh };
        events.push(() => {
          const st = get().state;
          if (st === 'CHARGING' || st === 'EXPLORING') {
            go('CHARGING_COMPLETE');
            toast({ icon: '⚡', title: 'Charging complete', body: `${Math.round(c.soc)}% · ready to go`, tone: 'accent' });
          } else {
            set({ returnAlert: true });
            toast({ icon: '⚡', title: 'Charging complete', body: 'Head back to your car to avoid idle fees', tone: 'warn' });
          }
        });
      }
      patch.charging = c;
    }

    // ── Walking / visiting ──────────────────────────────────
    if (s.walk) {
      const w = { ...s.walk };
      let t = dt;
      if (w.phase === 'to') {
        const step = WALK_SPEED_MPS * t;
        if (w.distanceM + step >= w.totalM) {
          t -= (w.totalM - w.distanceM) / WALK_SPEED_MPS;
          w.distanceM = w.totalM;
          w.phase = 'visiting';
          w.visitElapsedS += Math.max(0, t);
          const place = placeById(w.placeId)!;
          events.push(() => {
            go('VISITING');
            toast({ icon: place.emoji, title: `You're at ${place.name}`, body: `Enjoy — I'll tell you when to head back` });
          });
        } else w.distanceM += step;
      } else if (w.phase === 'visiting') {
        w.visitElapsedS += t;
      } else {
        w.distanceM += WALK_SPEED_MPS * t;
        if (w.distanceM >= w.totalM) {
          w.distanceM = w.totalM;
          events.push(finishWalk);
        }
      }
      const along = w.phase === 'back' ? w.totalM - w.distanceM : w.distanceM;
      const u = along / METERS_PER_UNIT;
      patch.walk = w;
      patch.walkerPos = pointAt(w.poly, u);
      patch.walkerHeading = w.phase === 'back' ? headingAt(w.poly, u, 3) + 180 : headingAt(w.poly, u, 3);

      // Return reminder: charging window − walk back ≤ safety buffer.
      const c = patch.charging ?? s.charging;
      if (c && c.status === 'charging' && w.phase !== 'back' && !s.returnAlert && !s.returnAlertDismissed) {
        const walkBackMin = ((w.phase === 'to' ? w.distanceM : w.totalM) / WALK_SPEED_MPS) / 60;
        const visitDone = w.phase === 'visiting' && w.visitElapsedS / 60 >= w.visitPlannedMin;
        if (c.minutesLeft <= walkBackMin + demoUser.safetyBufferMinutes || visitDone) {
          patch.returnAlert = true;
        }
      }
    }

    set(patch);
    events.forEach((e) => e());
  };

  return {
    ...initialState(),
    speedMode: 'presenter',
    searchToken: 0,

    pushToast: (t) => {
      const id = toastId++;
      set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
      setTimeout(() => get().dismissToast(id), 3800);
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    setVehicle: (id) => {
      set({ vehicleId: id });
      const s = get();
      if (s.state === 'ROUTE_SELECTED') {
        const opts = localPlan(id, s.battery, s.destinationNodeId);
        set({ routeOptions: opts, selectedRouteId: opts[0]?.id ?? null });
      }
      toast({ icon: '🚘', title: `${vehicleById(id).name} selected` });
    },

    setBattery: (pct) => {
      const s = get();
      if (s.charging && s.charging.status === 'charging') {
        set({ charging: { ...s.charging, soc: Math.min(pct, s.charging.targetSoc) }, battery: pct });
        return;
      }
      set({ battery: pct });
      if (s.state === 'ROUTE_SELECTED') {
        const opts = localPlan(s.vehicleId, pct, s.destinationNodeId);
        set({ routeOptions: opts, selectedRouteId: opts[0]?.id ?? null });
      }
    },

    setDestination: (nodeId) => {
      set({ destinationNodeId: nodeId });
      const s = get();
      if (s.state === 'ROUTE_SELECTED') {
        const opts = localPlan(s.vehicleId, s.battery, nodeId);
        set({ routeOptions: opts, selectedRouteId: opts[0]?.id ?? null });
      }
    },

    setSpeedMode: (m) => set({ speedMode: m }),

    findRoutes: async () => {
      const s0 = get();
      if (!['IDLE', 'ROUTE_SELECTED'].includes(s0.state)) return;
      const token = s0.searchToken + 1;
      set({ searchToken: token, selectedStationId: null });
      go('SEARCHING');
      const { vehicleId, battery, destinationNodeId } = get();
      let source: 'api' | 'local' = 'api';
      const [opts] = await Promise.all([
        api
          .planRoutes({ vehicleId, batteryPercent: battery, destinationNodeId })
          .catch(() => {
            source = 'local';
            return localPlan(vehicleId, battery, destinationNodeId);
          }),
        sleep(1900),
      ]);
      if (get().searchToken !== token || get().state !== 'SEARCHING') return;
      set({ routeOptions: opts, selectedRouteId: opts[0]?.id ?? null, routesSource: source });
      go('ROUTE_SELECTED');
    },

    selectRoute: (id) => set({ selectedRouteId: id }),

    startNavigation: () => {
      const s = get();
      const route = s.routeOptions.find((o) => o.id === s.selectedRouteId);
      if (!route || s.state !== 'ROUTE_SELECTED') return;
      const polys = polysFor(route);
      set({
        activeRoute: route,
        legPolys: polys,
        drive: { legIndex: 0, distanceM: 0, paused: false },
        vehiclePos: polys[0].points[0],
        vehicleHeading: headingAt(polys[0], 0),
        selectedStationId: null,
        trip: emptyTrip(),
      });
      go('NAVIGATING');
      toast({ icon: '🧭', title: 'Navigation started', body: route.legs[0].maneuvers[0]?.text });
    },

    togglePause: () => {
      const d = get().drive;
      if (d) set({ drive: { ...d, paused: !d.paused } });
    },

    cancelTrip: () => {
      const s = get();
      set({
        ...initialState(),
        vehicleId: s.vehicleId,
        battery: s.battery,
        clockS: s.clockS,
        vehiclePos: s.vehiclePos,
        vehicleHeading: s.vehicleHeading,
        destinationNodeId: s.destinationNodeId,
      });
    },

    skipToStation: () => {
      const st = get().state;
      if (['IDLE', 'SEARCHING', 'ROUTE_SELECTED', 'NAVIGATING', 'ARRIVING'].includes(st)) {
        if (st === 'SEARCHING') set({ searchToken: get().searchToken + 1, state: 'IDLE' });
        if (get().state === 'ROUTE_SELECTED') get().startNavigation();
        jumpToStation();
      }
    },

    startCharging: () => {
      const s = get();
      if (s.state !== 'ARRIVED' || !s.activeRoute) return;
      const station = stationById(s.activeRoute.stationId)!;
      const target = s.activeRoute.departureSoc;
      const c: ChargingProgress = {
        stationId: station.id,
        startSoc: s.battery,
        targetSoc: Math.max(target, Math.min(100, s.battery + 5)),
        soc: s.battery,
        energyKWh: 0,
        powerKW: 0,
        cost: 0,
        elapsedS: 0,
        minutesLeft: 0,
        status: 'charging',
      };
      c.minutesLeft = chargeMinutesLeft(c);
      set({ charging: c, companionCategory: 'all', selectedPlaceId: null });
      go('CHARGING');
      toast({ icon: '⚡', title: 'Charging started', body: `${station.powerKW} kW · ${Math.round(c.startSoc)}% → ${c.targetSoc}%`, tone: 'accent' });
      api
        .startCharging({ stationId: station.id, vehicleId: s.vehicleId, startSoc: +c.startSoc.toFixed(1), targetSoc: c.targetSoc })
        .then((session) => {
          const cur = get().charging;
          if (cur && cur.stationId === station.id) set({ charging: { ...cur, backendId: session.id } });
        })
        .catch(() => undefined);
    },

    openCompanion: (category = 'all') => {
      set({ companionCategory: category });
      if (get().state === 'CHARGING') go('EXPLORING');
    },

    backToCharging: () => {
      if (get().state === 'EXPLORING') go('CHARGING');
      set({ selectedPlaceId: null });
    },

    selectPlace: (id) => set({ selectedPlaceId: id }),

    walkTo: (placeId) => {
      const s = get();
      if (!s.charging || !['CHARGING', 'EXPLORING'].includes(s.state)) return;
      const place = placeById(placeId);
      if (!place) return;
      const station = stationById(s.charging.stationId)!;
      const walk = walkFor(station.id, place);
      const fit = computeTimeFit(s.charging.minutesLeft, walk.minutes, walk.meters, place.visitMinutes, place.minVisitMinutes, demoUser.safetyBufferMinutes);
      const pts = walkPath(station.position, place.position);
      const poly = makePolyline(pts);
      set({
        walk: {
          placeId,
          poly,
          totalM: poly.length * METERS_PER_UNIT,
          distanceM: 0,
          phase: 'to',
          visitElapsedS: 0,
          visitPlannedMin: Math.max(place.minVisitMinutes, fit.activityMinutes),
          walkMinutes: walk.minutes,
        },
        walkerPos: pts[0],
        walkerHeading: headingAt(poly, 0, 3),
        selectedPlaceId: placeId,
        returnAlert: false,
        returnAlertDismissed: false,
        trip: { ...s.trip, visitedPlaceId: placeId },
      });
      go('WALKING');
    },

    returnToCar: () => {
      const s = get();
      if (!s.walk) return;
      const w = s.walk;
      // Walking back from wherever you are on the path.
      const along = w.phase === 'to' ? w.distanceM : w.totalM;
      set({ walk: { ...w, phase: 'back', distanceM: w.totalM - along }, returnAlert: false, returnAlertDismissed: true });
      go('RETURNING');
    },

    dismissReturnAlert: () => set({ returnAlert: false, returnAlertDismissed: true }),

    completeCharging: () => {
      const s = get();
      if (!s.charging) {
        get().demoStartCharging();
      }
      const c = get().charging;
      if (!c || c.status === 'complete') return;
      // Fast-forward the session deterministically to its target.
      advance(c.minutesLeft * 60 + 5);
      for (let i = 0; i < 30 && get().charging?.status === 'charging'; i++) advance(60);
    },

    addMinutes: (min) => advance(min * 60),

    continueNavigation: () => {
      const s = get();
      if (s.state !== 'CHARGING_COMPLETE' || !s.activeRoute || !s.legPolys) return;
      const poly = s.legPolys[1];
      set({
        drive: { legIndex: 1, distanceM: 0, paused: false },
        vehiclePos: poly.points[0],
        vehicleHeading: headingAt(poly, 0),
        selectedPlaceId: null,
      });
      go('NAVIGATING_TO_DESTINATION');
      toast({ icon: '🧭', title: `Continuing to ${destinationLabel(s.destinationNodeId)}`, body: s.activeRoute.legs[1].maneuvers[0]?.text });
    },

    selectStation: (id) => set({ selectedStationId: id }),

    planViaStation: (id, navigateNow) => {
      const s = get();
      if (!['IDLE', 'ROUTE_SELECTED'].includes(s.state)) return;
      const existing = s.routeOptions.find((o) => o.stationId === id);
      let options = s.routeOptions;
      let routeId = existing?.id;
      if (!existing) {
        const [custom] = localPlan(s.vehicleId, s.battery, s.destinationNodeId, id);
        if (!custom) return;
        const base = s.routeOptions.length ? s.routeOptions : localPlan(s.vehicleId, s.battery, s.destinationNodeId);
        options = [...base, custom];
        routeId = custom.id;
      }
      set({ routeOptions: options, selectedRouteId: routeId!, selectedStationId: null, routesSource: s.routesSource ?? 'local' });
      if (s.state === 'IDLE') set({ state: 'ROUTE_SELECTED' });
      if (navigateNow) get().startNavigation();
    },

    demoStartNavigation: () => {
      const s = get();
      if (s.state === 'IDLE' || s.state === 'SEARCHING') {
        const opts = localPlan(s.vehicleId, s.battery, s.destinationNodeId);
        set({ routeOptions: opts, selectedRouteId: opts[0].id, routesSource: 'local', searchToken: s.searchToken + 1, state: 'ROUTE_SELECTED' });
      }
      if (get().state === 'ROUTE_SELECTED') get().startNavigation();
      else if (get().drive?.paused && DRIVING_STATES.includes(get().state)) get().togglePause();
      else if (get().state === 'CHARGING_COMPLETE') get().continueNavigation();
    },

    demoStartCharging: () => {
      const st = get().state;
      if (['IDLE', 'SEARCHING', 'ROUTE_SELECTED', 'NAVIGATING', 'ARRIVING'].includes(st)) get().skipToStation();
      if (get().state === 'ARRIVED') get().startCharging();
    },

    demoMoveToPlace: () => {
      if (!get().charging || get().charging?.status === 'complete') get().demoStartCharging();
      const s = get();
      if (!s.charging) return;
      if (s.walk) {
        // Teleport to the destination of the current walk.
        set({ walk: { ...s.walk, phase: 'visiting', distanceM: s.walk.totalM }, walkerPos: s.walk.poly.points[s.walk.poly.points.length - 1] });
        if (s.state !== 'VISITING') set({ state: 'VISITING' });
        return;
      }
      const pick =
        s.selectedPlaceId ??
        bestPick({ chargingMinutesRemaining: s.charging.minutesLeft, stationId: s.charging.stationId, category: 'coffee' })?.id ??
        bestPick({ chargingMinutesRemaining: 60, stationId: s.charging.stationId })?.id;
      if (!pick) return;
      get().walkTo(pick);
      const w = get().walk;
      if (w) {
        set({ walk: { ...w, phase: 'visiting', distanceM: w.totalM }, walkerPos: w.poly.points[w.poly.points.length - 1] });
        go('VISITING');
      }
    },

    demoReturnToCar: () => {
      if (get().walk) finishWalk();
    },

    resetDemo: () => {
      set({ ...initialState(), searchToken: get().searchToken + 1 });
      toast({ icon: '↺', title: 'Demo reset' });
    },

    tick: (realDtS) => {
      const s = get();
      if (!SIM_ACTIVE.includes(s.state)) return;
      advance(Math.min(realDtS, 0.1) * effectiveTimeScale(s.speedMode, s.state));
    },
  };
});

// ── Derived helpers ───────────────────────────────────────────

export function currentLeg(s: Pick<JourneyStore, 'activeRoute' | 'drive'>) {
  if (!s.activeRoute || !s.drive) return null;
  return s.activeRoute.legs[s.drive.legIndex];
}

export function navInfo(s: JourneyStore) {
  const leg = currentLeg(s);
  if (!leg || !s.drive || !s.activeRoute) return null;
  const d = s.drive.distanceM;
  const remainingM = Math.max(0, leg.distanceM - d);
  let remainingS = 0;
  for (const seg of leg.segments) {
    const end = seg.startM + seg.lengthM;
    if (end <= d) continue;
    remainingS += (end - Math.max(seg.startM, d)) / seg.speedMps;
  }
  const next = leg.maneuvers.find((m) => m.atM > d + 1 && m.type !== 'depart') ?? leg.maneuvers[leg.maneuvers.length - 1];
  const after = leg.maneuvers[leg.maneuvers.indexOf(next) + 1];
  let seg = leg.segments[0];
  for (const sg of leg.segments) if (sg.startM <= d) seg = sg;
  const vehicle = vehicleById(s.vehicleId);
  const route = s.activeRoute;
  const station = stationById(route.stationId)!;
  const arrivalSoc = s.battery - ((leg.energyKWh * (remainingM / leg.distanceM || 0)) / vehicle.batteryKWh) * 100;
  // ETA to the final destination (includes the charging stop on leg 0).
  const finalS =
    s.drive.legIndex === 0
      ? remainingS + (route.chargeMinutes + route.waitMinutes) * 60 + route.legs[1].durationS
      : remainingS;
  return {
    leg,
    legIndex: s.drive.legIndex,
    remainingM,
    remainingS,
    etaClockS: s.clockS + remainingS,
    finalEtaClockS: s.clockS + finalS,
    next,
    distanceToNextM: Math.max(0, next.atM - d),
    after,
    road: seg.road,
    speedKmh: Math.round(seg.speedMps * 3.6),
    station,
    arrivalSoc,
    progress: d / leg.distanceM,
  };
}

export const selectedRoute = (s: JourneyStore) => s.routeOptions.find((o) => o.id === s.selectedRouteId) ?? null;

export const stationForJourney = (s: JourneyStore) =>
  stationById(s.charging?.stationId ?? s.activeRoute?.stationId ?? selectedRoute(s)?.stationId ?? '') ?? null;

export const allStations = chargingStations;
