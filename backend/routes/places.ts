import { Router } from 'express';
import { places, placesNearStation } from '../mock';

export const placesRouter = Router();

// GET /api/places?stationId=station-001&category=cafe
placesRouter.get('/', (req, res) => {
  const { stationId, category } = req.query as Record<string, string | undefined>;
  let list = stationId ? placesNearStation(stationId) : places;
  if (category) list = list.filter((p) => p.category === category);
  res.json({ places: list });
});
