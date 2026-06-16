import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { healthRouter } from './routes/health.js';
import { catalogRouter } from './routes/catalog.js';
import { ordersRouter } from './routes/orders.js';
import { adminRouter } from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

// ---------- middleware ----------
app.use(express.json({ limit: '1mb' }));
const corsOrigins = CORS_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);

// ---------- API routes ----------
app.use('/api/health', healthRouter);
app.use('/api/admin', adminRouter);
app.use('/api', catalogRouter);
app.use('/api', ordersRouter);

// ---------- static frontend (production) ----------
// In production the backend serves the built React app from frontend/dist.
// In dev, Vite runs on :5173 and proxies /api → this server, so we skip this.
if (NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));

  // SPA fallback: any non-/api GET serves index.html so client-side routing works.
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ---------- 404 (API only) ----------
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------- error handler ----------
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[gesmarketim] backend listening on :${PORT} (${NODE_ENV})`);
});
