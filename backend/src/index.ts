import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { healthRouter } from './routes/health.js';
import { catalogRouter } from './routes/catalog.js';
import { ordersRouter } from './routes/orders.js';
import { adminRouter } from './routes/admin.js';
import { paymentRouter } from './routes/payment.js';
import { accountRouter } from './routes/account.js';
import { seoRouter } from './routes/seo.js';
import { startSyncScheduler } from './lib/sync/scheduler.js';
import { runMigrations, isAutoMigrateEnabled } from './db/runMigrations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

// ---------- middleware ----------
app.use(express.json({ limit: '1mb' }));
// Payment provider callbacks (iyzico) post application/x-www-form-urlencoded.
app.use(express.urlencoded({ extended: false }));
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
app.use('/api', paymentRouter);
app.use('/api', accountRouter);

// ---------- SEO (served at site root, before the SPA fallback) ----------
app.use('/', seoRouter);

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

// ---------- root info (API-only deployments) ----------
// When the frontend is a separate service, the backend root has no SPA to
// serve. Return a small JSON status instead of a bare "Cannot GET /" so the
// API URL looks healthy. In single-service production the static handler above
// already claimed '/' (served index.html), so this only runs in API-only mode.
app.get('/', (_req, res) => {
  res.json({
    name: 'gesmarketim-api',
    status: 'ok',
    health: '/api/health',
    products: '/api/products',
  });
});

// ---------- 404 (API only) ----------
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------- error handler ----------
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start(): Promise<void> {
  // Apply pending DB migrations before serving (AUTO_MIGRATE=false to skip).
  // Fail-soft: a migration error is logged but doesn't stop the server, so
  // browsing/catalog stay up even if the DB is briefly unreachable at boot.
  if (isAutoMigrateEnabled()) {
    try {
      await runMigrations();
      console.log('[gesmarketim] migrations up to date');
    } catch (err) {
      console.error('[gesmarketim] migration failed — run `npm run db:migrate`', err);
    }
  }

  app.listen(PORT, () => {
    console.log(`[gesmarketim] backend listening on :${PORT} (${NODE_ENV})`);
    // Opt-in supplier feed scheduler (no-op unless SYNC_SCHEDULER_ENABLED=true).
    startSyncScheduler();
  });
}

void start();
