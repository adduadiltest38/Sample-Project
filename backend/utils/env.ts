import 'dotenv/config';

const clean = (v?: string) => (v ?? '').trim();

export const env = {
  port: Number(clean(process.env.API_PORT) || 8787),
  isProd: process.env.NODE_ENV === 'production',
  openRouter: {
    apiKey: clean(process.env.OPENROUTER_API_KEY),
    model: clean(process.env.OPENROUTER_MODEL) || 'anthropic/claude-sonnet-4.5',
    baseUrl: (clean(process.env.OPENROUTER_BASE_URL) || 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
  },
};
