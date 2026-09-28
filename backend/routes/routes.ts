import { Router } from 'express';
import { RoutingService } from '../services/routing';
import { num } from '../utils/http';

export const routesRouter = Router();

// POST /api/routes  { vehicleId, batteryPercent, destinationNodeId?, stationId? }
routesRouter.post('/', (req, res) => {
  const body = req.body ?? {};
  const options = RoutingService.plan({
    vehicleId: String(body.vehicleId ?? 'tesla-model-3'),
    batteryPercent: num(body.batteryPercent, 'batteryPercent', { min: 1, max: 100 }),
    destinationNodeId: body.destinationNodeId,
    stationId: body.stationId,
  });
  res.json({ options, computedAt: new Date().toISOString() });
});
