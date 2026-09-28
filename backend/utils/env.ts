import 'dotenv/config';

const clean = (v?: string) => (v ?? '').trim();

export const env = {
  port: Number(clean(process.env.API_PORT) || 8787),
  isProd: process.env.NODE_ENV === 'production',
  /** Python AI service (ai-service/chargeflow_ai.py). */
  aiServiceUrl: (clean(process.env.AI_SERVICE_URL) || `http://localhost:${clean(process.env.AI_SERVICE_PORT) || 8790}`).replace(/\/$/, ''),
};
