import type { Point } from '@/types';
import type { Insets } from '@/stores/uiStore';
import { useJourney, selectedRoute, AWAY_STATES } from '@/stores/journeyStore';
import { stationById } from '@/mock/stations';
import { placesNearStation, placeById } from '@/mock/places';
import { roadNodes, demoTrip } from '@/mock/routes';
import { WORLD } from '@/mock/city';
import { bounds, clamp } from '@/lib/geo';
import { placeMatches } from '@/lib/recommendationEngine';

export interface Camera {
  x: number;
  y: number;
  z: number;
}

export interface CameraTarget extends Camera {
  follow: boolean;
}

export const MIN_Z = 0.28;
export const MAX_Z = 7;

export function fitPoints(points: Point[], size: { w: number; h: number }, insets: Insets, pad = 60, maxZ = 5): Camera {
  const b = bounds(points);
  const vw = Math.max(80, size.w - insets.left - insets.right);
  const vh = Math.max(80, size.h - insets.top - insets.bottom);
  const bw = Math.max(1, b.maxX - b.minX);
  const bh = Math.max(1, b.maxY - b.minY);
  const z = clamp(Math.min((vw - pad * 2) / bw, (vh - pad * 2) / bh), MIN_Z, maxZ);
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, z };
}

export function cameraTarget(size: { w: number; h: number }, insets: Insets): CameraTarget {
  const s = useJourney.getState();
  const compact = size.w < 700;
  const fit = (pts: Point[], pad = compact ? 36 : 70, maxZ = 5): CameraTarget => ({ ...fitPoints(pts, size, insets, pad, maxZ), follow: false });
  const dest = roadNodes[s.destinationNodeId] ?? roadNodes[demoTrip.destination.nodeId];

  if (s.selectedStationId && (s.state === 'IDLE' || s.state === 'ROUTE_SELECTED')) {
    const st = stationById(s.selectedStationId)!;
    return fit([st.position, s.vehiclePos], 90, 2.4);
  }

  switch (s.state) {
    case 'IDLE':
      return fit([s.vehiclePos, dest, { x: 1450, y: 1250 }], compact ? 30 : 80, 1.2);
    case 'SEARCHING':
      return fit([{ x: 120, y: 200 }, { x: 2250, y: 1420 }], 20, 1);
    case 'ROUTE_SELECTED': {
      const r = selectedRoute(s);
      if (!r) return fit([s.vehiclePos, dest]);
      return fit([...r.legs[0].points, ...r.legs[1].points], compact ? 30 : 70, 1.6);
    }
    case 'NAVIGATING':
    case 'ARRIVING':
    case 'NAVIGATING_TO_DESTINATION': {
      const rad = (s.vehicleHeading * Math.PI) / 180;
      const ahead = s.state === 'ARRIVING' ? 20 : 55;
      const z = s.state === 'ARRIVING' ? 2.6 : compact ? 1.5 : 1.8;
      return { x: s.vehiclePos.x + Math.cos(rad) * ahead, y: s.vehiclePos.y + Math.sin(rad) * ahead, z, follow: true };
    }
    case 'ARRIVED':
    case 'CHARGING_COMPLETE': {
      const st = stationById(s.activeRoute?.stationId ?? '')!;
      return { x: st.position.x, y: st.position.y - 6, z: compact ? 3.6 : 4.2, follow: false };
    }
    case 'CHARGING':
    case 'EXPLORING': {
      const st = stationById(s.charging?.stationId ?? s.activeRoute?.stationId ?? '')!;
      let pts = placesNearStation(st.id);
      if (s.state === 'EXPLORING' && s.companionCategory !== 'all') {
        const cat = s.companionCategory;
        const f = pts.filter((p) => placeMatches(p, cat));
        if (f.length) pts = f;
      }
      if (s.selectedPlaceId) {
        const p = placeById(s.selectedPlaceId);
        if (p) return fit([st.position, p.position], 110, 6);
      }
      return fit([st.position, ...pts.map((p) => p.position)], compact ? 40 : 80, 5.5);
    }
    default:
      if (AWAY_STATES.includes(s.state) && s.walkerPos) {
        if (s.state === 'VISITING') {
          const st = stationById(s.charging!.stationId)!;
          return fit([s.walkerPos, st.position], 120, 6.2);
        }
        return { x: s.walkerPos.x, y: s.walkerPos.y, z: compact ? 5.4 : 6.2, follow: true };
      }
      if (s.state === 'TRIP_COMPLETE') return { x: dest.x, y: dest.y - 10, z: 3.4, follow: false };
      return fit([{ x: 0, y: 0 }, { x: WORLD.width, y: WORLD.height }]);
  }
}
