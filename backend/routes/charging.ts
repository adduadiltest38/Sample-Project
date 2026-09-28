import { Router } from 'express';
import { ChargingService } from '../services/charging';
import { num } from '../utils/http';

export const chargingRouter = Router();

// POST /api/charging/start  { stationId, vehicleId, startSoc, targetSoc }
chargingRouter.post('/start', (req, res) => {
  const b = req.body ?? {};
  const session = ChargingService.start({
    stationId: String(b.stationId),
    vehicleId: String(b.vehicleId ?? 'tesla-model-3'),
    startSoc: num(b.startSoc, 'startSoc', { min: 0, max: 100 }),
    targetSoc: num(b.targetSoc, 'targetSoc', { min: 1, max: 100, fallback: 80 }),
  });
  res.status(201).json({ session });
});

// GET /api/charging/:id
chargingRouter.get('/:id', (req, res) => {
  res.json({ session: ChargingService.status(req.params.id) });
});
