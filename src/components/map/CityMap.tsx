import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useJourney, AT_STATION_STATES, AWAY_STATES } from '@/stores/journeyStore';
import { useUi } from '@/stores/uiStore';
import { chargingStations } from '@/mock/stations';
import { places } from '@/mock/places';
import { roadNodes } from '@/mock/routes';
import { WORLD } from '@/mock/city';
import { clamp, lerp } from '@/lib/geo';
import { bestPick, placeMatches, rankActivities } from '@/lib/recommendationEngine';
import { BaseMap, MapDefs } from './BaseMap';
import { MapLabels } from './MapLabels';
import { RouteLayer } from './RouteLayer';
import { StationMarker, type StationMarkerMode } from './StationMarker';
import { PlaceMarker } from './PlaceMarker';
import { VehicleMarker } from './VehicleMarker';
import { WalkerMarker } from './WalkerMarker';
import { DestinationMarker } from './DestinationMarker';
import { cameraTarget, fitPoints, MAX_Z, MIN_Z, type Camera } from './cameraTargets';
import { destinationLabel } from '@/stores/journeyStore';
import type { FitStatus } from '@/types';

const COMPANION_STATES = ['CHARGING', 'EXPLORING', 'WALKING', 'VISITING', 'RETURNING'];

/** Interactive SVG map of Nova City with an animated, state-driven camera. */
export function CityMap() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const insets = useUi((s) => s.mapInsets);
  const setMapFree = useUi((s) => s.setMapFree);
  const setMapControls = useUi((s) => s.setMapControls);
  const camRef = useRef<Camera>({ x: WORLD.width / 2, y: WORLD.height / 2, z: 0.4 });
  const [cam, setCam] = useState<Camera>(camRef.current);
  const freeRef = useRef(false);
  const sizeRef = useRef(size);
  const insetsRef = useRef(insets);
  sizeRef.current = size;
  insetsRef.current = insets;

  const state = useJourney((s) => s.state);
  const selectedStationId = useJourney((s) => s.selectedStationId);
  const selectedPlaceId = useJourney((s) => s.selectedPlaceId);

  // ── Size tracking ────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    // Start with the whole city in view, then glide into the journey.
    const r = el.getBoundingClientRect();
    const start = fitPoints([{ x: 0, y: 0 }, { x: WORLD.width, y: WORLD.height }], { w: r.width, h: r.height }, { top: 0, left: 0, right: 0, bottom: 0 }, 0, 1);
    camRef.current = { ...start, z: start.z * 0.9 };
    setCam(camRef.current);
    return () => ro.disconnect();
  }, []);

  const setFree = useCallback(
    (v: boolean) => {
      freeRef.current = v;
      setMapFree(v);
    },
    [setMapFree],
  );

  // Any journey change hands the camera back to autopilot.
  useEffect(() => setFree(false), [state, selectedStationId, selectedPlaceId, setFree]);

  // ── Camera autopilot ─────────────────────────────────────
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!freeRef.current) {
        const t = cameraTarget(sizeRef.current, insetsRef.current);
        const c = camRef.current;
        const a = 1 - Math.exp(-dt * (t.follow ? 6 : 2.6));
        const next = {
          x: lerp(c.x, t.x, a),
          y: lerp(c.y, t.y, a),
          z: Math.exp(lerp(Math.log(c.z), Math.log(t.z), a)),
        };
        if (Math.abs(next.x - c.x) > 0.01 || Math.abs(next.y - c.y) > 0.01 || Math.abs(next.z - c.z) > 0.0005) {
          camRef.current = next;
          setCam(next);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Manual pan / zoom ────────────────────────────────────
  const viewCenter = () => {
    const s = sizeRef.current;
    const i = insetsRef.current;
    return { x: i.left + (s.w - i.left - i.right) / 2, y: i.top + (s.h - i.top - i.bottom) / 2 };
  };

  const zoomAt = useCallback(
    (factor: number, sx?: number, sy?: number) => {
      const c = camRef.current;
      const vc = viewCenter();
      const px = sx ?? vc.x;
      const py = sy ?? vc.y;
      const nz = clamp(c.z * factor, MIN_Z, MAX_Z);
      const wx = c.x + (px - vc.x) / c.z;
      const wy = c.y + (py - vc.y) / c.z;
      camRef.current = { x: wx - (px - vc.x) / nz, y: wy - (py - vc.y) / nz, z: nz };
      setCam(camRef.current);
      setFree(true);
    },
    [setFree],
  );

  useEffect(() => {
    setMapControls({ zoomBy: (f) => zoomAt(f), recenter: () => setFree(false) });
  }, [zoomAt, setFree, setMapControls]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ sx: number; sy: number; cam: Camera; moved: boolean; pinch?: { d: number; z: number } } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 1) gesture.current = { sx: e.clientX, sy: e.clientY, cam: { ...camRef.current }, moved: false };
    if (pts.length === 2 && gesture.current) {
      gesture.current.pinch = { d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), z: camRef.current.z };
      gesture.current.moved = true;
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (g.pinch && pts.length >= 2) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const r = wrapRef.current!.getBoundingClientRect();
      const target = clamp(g.pinch.z * (d / g.pinch.d), MIN_Z, MAX_Z);
      zoomAt(target / camRef.current.z, (pts[0].x + pts[1].x) / 2 - r.left, (pts[0].y + pts[1].y) / 2 - r.top);
      return;
    }
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (!g.moved && Math.hypot(dx, dy) < 5) return;
    if (!g.moved) {
      g.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setFree(true);
    }
    camRef.current = { ...camRef.current, x: g.cam.x - dx / camRef.current.z, y: g.cam.y - dy / camRef.current.z };
    setCam(camRef.current);
  };
  const dragged = useRef(false);
  const onPointerUp = (e: React.PointerEvent) => {
    dragged.current = Boolean(gesture.current?.moved);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    else if (gesture.current) {
      const [p] = [...pointers.current.values()];
      gesture.current = { sx: p.x, sy: p.y, cam: { ...camRef.current }, moved: true };
    }
  };

  const vc = viewCenter();
  const zq = Math.round(cam.z * 40) / 40;

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 touch-none select-none overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(e) => {
        const r = wrapRef.current!.getBoundingClientRect();
        zoomAt(1.8, e.clientX - r.left, e.clientY - r.top);
      }}
      onClick={() => {
        if (!dragged.current) {
          const js = useJourney.getState();
          if (js.selectedStationId) js.selectStation(null);
        }
      }}
    >
      <svg width={size.w} height={size.h} className="block">
        <MapDefs />
        <g transform={`translate(${vc.x} ${vc.y}) scale(${cam.z}) translate(${-cam.x} ${-cam.y})`}>
          <BaseMap />
          <MapLabels z={zq} />
          <RouteLayer z={zq} />
          <SearchPulse z={zq} />
          <Pois z={zq} />
          <WalkerMarker z={zq} />
          <VehicleMarker z={cam.z} />
        </g>
      </svg>
    </div>
  );
}

/** Radar sweep from the car while routes are being computed. */
function SearchPulse({ z }: { z: number }) {
  const searching = useJourney((s) => s.state === 'SEARCHING');
  const pos = useJourney((s) => s.vehiclePos);
  if (!searching) return null;
  return (
    <g transform={`translate(${pos.x} ${pos.y}) scale(${1 / z})`} pointerEvents="none">
      {[0, 0.6, 1.2].map((d) => (
        <motion.circle
          key={d}
          fill="var(--volt)"
          initial={{ r: 10, opacity: 0.35 }}
          animate={{ r: 380, opacity: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, delay: d, ease: 'easeOut' }}
        />
      ))}
    </g>
  );
}

/** Stations, places and the destination pin. */
function Pois({ z }: { z: number }) {
  const state = useJourney((s) => s.state);
  const activeStationId = useJourney((s) => s.charging?.stationId ?? s.activeRoute?.stationId ?? null);
  const selectedRouteStation = useJourney((s) => s.routeOptions.find((o) => o.id === s.selectedRouteId)?.stationId ?? null);
  const selectedStationId = useJourney((s) => s.selectedStationId);
  const selectedPlaceId = useJourney((s) => s.selectedPlaceId);
  const category = useJourney((s) => s.companionCategory);
  const minutesLeft = useJourney((s) => Math.round(s.charging?.minutesLeft ?? 0));
  const walkPlaceId = useJourney((s) => s.walk?.placeId ?? null);
  const destNode = useJourney((s) => s.destinationNodeId);
  const clockHour = useJourney((s) => Math.floor(s.clockS / 3600));
  const selectStation = useJourney((s) => s.selectStation);
  const selectPlace = useJourney((s) => s.selectPlace);
  const openCompanion = useJourney((s) => s.openCompanion);

  const companion = COMPANION_STATES.includes(state) && activeStationId;
  const focusStation = companion ? activeStationId : state === 'ARRIVED' ? activeStationId : null;

  const fits = useMemo(() => {
    if (!companion || !activeStationId) return new Map<string, FitStatus>();
    const ranked = rankActivities({ chargingMinutesRemaining: minutesLeft, stationId: activeStationId, clockHour });
    return new Map(ranked.map((r) => [r.id, r.fit.status]));
  }, [companion, activeStationId, minutesLeft, clockHour]);

  const topPickId = useMemo(() => {
    if (!companion || !activeStationId) return null;
    return bestPick({ chargingMinutesRemaining: minutesLeft, stationId: activeStationId, category, clockHour })?.id ?? null;
  }, [companion, activeStationId, minutesLeft, category, clockHour]);

  const stationMode = (id: string): StationMarkerMode => {
    if (state === 'SEARCHING') return 'scan';
    if (id === activeStationId && (state === 'CHARGING' || state === 'EXPLORING' || AWAY_STATES.includes(state))) return 'charging';
    if (id === selectedStationId) return 'selected';
    if (state === 'ROUTE_SELECTED' && id === selectedRouteStation) return 'active';
    if ((state === 'NAVIGATING' || state === 'ARRIVING' || state === 'ARRIVED') && id === activeStationId) return 'active';
    if (state === 'ROUTE_SELECTED' || state === 'NAVIGATING' || state === 'ARRIVING' || AT_STATION_STATES.includes(state)) return 'dim';
    return 'default';
  };

  const visiblePlaces = places.filter((p) => (focusStation ? p.nearStationId === focusStation : z >= 2.4));
  const dest = roadNodes[destNode];

  return (
    <g>
      {visiblePlaces.map((p) => {
        const matches = category === 'all' || placeMatches(p, category);
        return (
          <PlaceMarker
            key={p.id}
            place={p}
            z={z}
            fit={companion ? fits.get(p.id) : undefined}
            highlighted={p.id === selectedPlaceId || p.id === walkPlaceId}
            dim={Boolean(companion && state === 'EXPLORING' && !matches)}
            topPick={p.id === topPickId}
            showLabel={z >= 3.3 || p.id === selectedPlaceId || p.id === topPickId}
            onSelect={(id) => {
              selectPlace(id);
              if (state === 'CHARGING') openCompanion('all');
            }}
          />
        );
      })}
      <DestinationMarker at={dest} z={z} label={destinationLabel(destNode)} />
      {chargingStations.map((s, i) => {
        const mode = stationMode(s.id);
        return (
          <StationMarker
            key={s.id}
            station={s}
            z={z}
            mode={mode}
            scanDelay={i * 0.12}
            showLabel={mode === 'selected' || mode === 'active' || (z >= 1.4 && mode === 'default') || (mode === 'charging' && z < 5)}
            onSelect={(id) => selectStation(useJourney.getState().selectedStationId === id ? null : id)}
          />
        );
      })}
    </g>
  );
}

