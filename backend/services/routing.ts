import { planRoutes, type PlanRequest } from '../../src/lib/routePlanner';
import { travelSummary } from '../../src/lib/routing';
import { chargingStations, vehicleById, demoTrip } from '../mock';

export const RoutingService = {
  plan(input: { vehicleId: string; batteryPercent: number; destinationNodeId?: string; stationId?: string }) {
    const req: PlanRequest = {
      vehicle: vehicleById(input.vehicleId),
      batteryPercent: input.batteryPercent,
      destinationNodeId: input.destinationNodeId ?? demoTrip.destination.nodeId,
      onlyStationId: input.stationId,
    };
    return planRoutes(req);
  },

  /** Stations annotated with distance/time from a road node. */
  stationsFrom(nodeId = demoTrip.start.nodeId) {
    return chargingStations.map((s) => {
      const t = travelSummary(nodeId, s.nodeId);
      return { ...s, distanceKm: +(t.meters / 1000).toFixed(1), driveMinutes: Math.max(1, Math.round(t.seconds / 60)) };
    });
  },
};
