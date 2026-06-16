// In-process scheduler that periodically syncs suppliers configured with a
// remote feed (suppliers.syncConfig.feedUrl). Opt-in via SYNC_SCHEDULER_ENABLED
// so deployments without feeds never make surprise outbound requests.
//
// A single timer ticks every SYNC_SCHEDULER_TICK_MINUTES (default 15). Each
// tick finds eligible + due suppliers and runs them sequentially. Per-supplier
// cadence is controlled by syncConfig.intervalMinutes (default daily), so the
// tick only needs to be frequent enough to honour the smallest interval.
//
// This is a best-effort, single-instance scheduler. For multiple backend
// replicas you'd move to an external cron / queue, but the feed engine
// (runFeedSync) is already the reusable unit that such a system would call.

import { db } from "../../db/index.js";
import { suppliers } from "../../db/schema.js";
import { isDue, isFeedEligible, readSyncConfig, runFeedSync } from "./feed.js";

function envNum(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function isSchedulerEnabled(): boolean {
  const v = (process.env.SYNC_SCHEDULER_ENABLED ?? "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

let ticking = false;

/** Run one pass: sync every eligible + due supplier (sequentially). */
export async function runSchedulerTick(): Promise<{ ran: number; eligible: number }> {
  if (ticking) return { ran: 0, eligible: 0 };
  ticking = true;
  let ran = 0;
  let eligible = 0;
  try {
    const rows = await db
      .select({
        id: suppliers.id,
        tenantId: suppliers.tenantId,
        name: suppliers.name,
        syncConfig: suppliers.syncConfig,
      })
      .from(suppliers);

    const now = Date.now();
    for (const s of rows) {
      const config = readSyncConfig(s.syncConfig);
      if (!isFeedEligible(config)) continue;
      eligible++;
      if (!isDue(config, now)) continue;

      const result = await runFeedSync(s.tenantId, s.id, config);
      ran++;
      if (result.status === "ok" && result.summary) {
        const sum = result.summary;
        console.log(
          `[sync] ${s.name}: +${sum.created} ~${sum.updated} =${sum.unchanged} skip ${sum.skipped} (${sum.total} satır)`,
        );
      } else {
        console.error(`[sync] ${s.name}: hata — ${result.error}`);
      }
    }
  } catch (err) {
    console.error("[sync] tick failed", err);
  } finally {
    ticking = false;
  }
  return { ran, eligible };
}

/** Start the recurring scheduler. No-op unless SYNC_SCHEDULER_ENABLED is set. */
export function startSyncScheduler(): void {
  if (!isSchedulerEnabled()) return;

  const tickMin = envNum("SYNC_SCHEDULER_TICK_MINUTES", 15);
  console.log(`[sync] scheduler enabled — tick every ${tickMin} min`);

  // First pass shortly after boot, then on the interval.
  setTimeout(() => {
    void runSchedulerTick();
  }, 30_000).unref();

  setInterval(() => {
    void runSchedulerTick();
  }, tickMin * 60_000).unref();
}
