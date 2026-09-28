import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './utils/env';
import { errorHandler, log } from './utils/http';
import { stationsRouter } from './routes/stations';
import { routesRouter } from './routes/routes';
import { chargingRouter } from './routes/charging';
import { placesRouter } from './routes/places';
import { recommendationsRouter } from './routes/recommendations';
import { aiRouter } from './routes/ai';
import { aiService } from './services/ai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', async (_req, res) => {
  res.json({ ok: true, name: 'ChargeFlow API', ai: await aiService.status(), time: new Date().toISOString() });
});

app.use('/api/stations', stationsRouter);
app.use('/api/routes', routesRouter);
app.use('/api/charging', chargingRouter);
app.use('/api/places', placesRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/ai', aiRouter);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// In production, serve the built frontend from the same origin.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (env.isProd && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);

app.listen(env.port, () => {
  log(`API ready on http://localhost:${env.port}`);
  // Give the Python AI service a moment to boot, then report which brain answers.
  setTimeout(async () => {
    const s = await aiService.status();
    log(s.enabled ? `AI: Python service connected at ${s.service}` : 'AI: Python service not running — the TypeScript engine will answer');
  }, 1500);
});
