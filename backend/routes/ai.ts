import { Router } from 'express';
import type { ChatContext } from '../../src/types';
import { aiService } from '../services/ai';
import { HttpError } from '../utils/http';

export const aiRouter = Router();

// GET /api/ai/status → which AI answers (Python service or TS engine) + quick prompts
aiRouter.get('/status', async (_req, res) => {
  res.json(await aiService.status());
});

// POST /api/ai/chat { message, context }
aiRouter.post('/chat', async (req, res) => {
  const message = String(req.body?.message ?? '').trim().slice(0, 500);
  if (!message) throw new HttpError(400, '"message" is required');
  const context: ChatContext = {
    journeyState: 'IDLE',
    vehicleId: 'tesla-model-3',
    batteryPercent: 58,
    rangeKm: 245,
    ...(req.body?.context ?? {}),
  };
  res.json(await aiService.chat(message, context));
});
