import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

export const healthRouter = Router();

// DB'ye hafif bir ping atar: veritabanı erişilemezken 200 dönüp trafiği
// bozuk instance'a yönlendirmemek için 503 verir.
healthRouter.get('/', async (_req, res) => {
  let dbOk = true;
  try {
    await db.execute(sql`select 1`);
  } catch {
    dbOk = false;
  }
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk ? 'ok' : 'unreachable',
    service: 'gesmarketim-backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});
