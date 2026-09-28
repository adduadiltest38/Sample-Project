import { Router } from 'express';
import { RoutingService } from '../services/routing';
import { notFound } from '../utils/http';

export const stationsRouter = Router();

// GET /api/stations?from=NODE_ID
stationsRouter.get('/', (req, res) => {
  res.json({ stations: RoutingService.stationsFrom(req.query.from as string | undefined) });
});

// GET /api/stations/:id
stationsRouter.get('/:id', (req, res) => {
  const station = RoutingService.stationsFrom(req.query.from as string | undefined).find((s) => s.id === req.params.id);
  if (!station) throw notFound('Station');
  res.json({ station });
});
