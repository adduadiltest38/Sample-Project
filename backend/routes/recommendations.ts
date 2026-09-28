import { Router } from 'express';
import type { ActivityTag } from '../../src/types';
import { RecommendationService } from '../services/recommendations';
import { num } from '../utils/http';

export const recommendationsRouter = Router();

// POST /api/recommendations { chargingMinutesRemaining, stationId, category?, preferences?, bufferMinutes? }
recommendationsRouter.post('/', (req, res) => {
  const b = req.body ?? {};
  res.json(
    RecommendationService.recommend({
      chargingMinutesRemaining: num(b.chargingMinutesRemaining, 'chargingMinutesRemaining', { min: 0, max: 600 }),
      stationId: String(b.stationId ?? 'station-001'),
      category: (b.category ?? 'all') as ActivityTag | 'all',
      preferences: Array.isArray(b.preferences) ? b.preferences : undefined,
      bufferMinutes: num(b.bufferMinutes, 'bufferMinutes', { min: 0, max: 30, fallback: 5 }),
      clockHour: num(b.clockHour, 'clockHour', { min: 0, max: 24, fallback: 14 }),
    }),
  );
});
