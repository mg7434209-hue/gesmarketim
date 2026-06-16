// Remote supplier feed sync — fetches a CSV/feed from a URL and runs it
// through the existing CSV engine. This turns the manual CSV import into an
// automatable source: the scheduler (./scheduler.ts) calls runFeedSync() on a
// timer, and an admin endpoint can trigger it on demand.
//
// Feed configuration lives in suppliers.syncConfig (jsonb):
//   {
//     feedUrl: "https://bayi.example.com/export.csv",  // required to be eligible
//     intervalMinutes: 1440,        // how often to sync (default 1440 = daily)
//     createMissing: false,         // create draft products for unmatched rows
//     defaultCategoryId: null,      // category for created drafts
//     enabled: true,                // set false to pause without clearing config
//     lastSyncedAt: "<iso>",        // written by the engine after each run
//     lastResult: { ... }           // compact summary of the last run
//   }

import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { suppliers } from "../../db/schema.js";
import { parseCsv } from "./csv.js";
import { runCsvSync, type SyncSummary } from "./engine.js";

export interface SupplierSyncConfig {
  feedUrl?: string;
  intervalMinutes?: number;
  createMissing?: boolean;
  defaultCategoryId?: string | null;
  enabled?: boolean;
  lastSyncedAt?: string;
  lastResult?: {
    at: string;
    ok: boolean;
    total?: number;
    created?: number;
    updated?: number;
    skipped?: number;
    error?: string;
  };
}

const DEFAULT_INTERVAL_MIN = 1440; // daily
const FETCH_TIMEOUT_MS = 20_000;
const MAX_FEED_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_ROWS = 5000;

export function readSyncConfig(raw: unknown): SupplierSyncConfig {
  return raw && typeof raw === "object" ? (raw as SupplierSyncConfig) : {};
}

/** A supplier is schedulable when it has a feed URL and isn't paused. */
export function isFeedEligible(config: SupplierSyncConfig): boolean {
  return Boolean(config.feedUrl) && config.enabled !== false;
}

/** Whether enough time has elapsed since the last successful/attempted sync. */
export function isDue(config: SupplierSyncConfig, now = Date.now()): boolean {
  const interval =
    (config.intervalMinutes && config.intervalMinutes > 0
      ? config.intervalMinutes
      : DEFAULT_INTERVAL_MIN) * 60_000;
  if (!config.lastSyncedAt) return true;
  const last = Date.parse(config.lastSyncedAt);
  if (!Number.isFinite(last)) return true;
  return now - last >= interval;
}

/** Fetch the feed body as text, with a timeout and size cap. */
export async function fetchFeedCsv(feedUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(feedUrl);
  } catch {
    throw new Error("Geçersiz feed URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Feed URL yalnızca http/https olabilir.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/csv,text/plain,*/*" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);

    const len = Number(res.headers.get("content-length") ?? "0");
    if (len && len > MAX_FEED_BYTES) throw new Error("Feed çok büyük (>8MB).");

    const text = await res.text();
    if (text.length > MAX_FEED_BYTES) throw new Error("Feed çok büyük (>8MB).");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function compactResult(summary: SyncSummary, ok: boolean, error?: string) {
  return {
    at: new Date().toISOString(),
    ok,
    total: summary.total,
    created: summary.created,
    updated: summary.updated,
    skipped: summary.skipped,
    ...(error ? { error } : {}),
  };
}

/** Persist run metadata back into the supplier's syncConfig. */
async function recordRun(
  tenantId: string,
  supplierId: string,
  config: SupplierSyncConfig,
  patch: Partial<SupplierSyncConfig>,
): Promise<void> {
  await db
    .update(suppliers)
    .set({
      syncConfig: { ...config, ...patch },
      updatedAt: new Date(),
    })
    .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.id, supplierId)));
}

export interface FeedSyncResult {
  status: "ok" | "error";
  summary?: SyncSummary;
  error?: string;
}

/**
 * Fetch a supplier's feed and run it through the sync engine. Always records
 * the outcome in syncConfig (including failures) and never throws.
 */
export async function runFeedSync(
  tenantId: string,
  supplierId: string,
  rawConfig: unknown,
  opts: { dryRun?: boolean } = {},
): Promise<FeedSyncResult> {
  const config = readSyncConfig(rawConfig);
  if (!config.feedUrl) {
    return { status: "error", error: "Feed URL tanımlı değil." };
  }

  try {
    const csv = await fetchFeedCsv(config.feedUrl);
    const { rows } = parseCsv(csv);
    if (rows.length === 0) throw new Error("Feed satırı bulunamadı.");
    if (rows.length > MAX_ROWS) throw new Error(`En fazla ${MAX_ROWS} satır.`);

    const summary = await runCsvSync(tenantId, supplierId, rows, {
      createMissing: config.createMissing === true,
      defaultCategoryId: config.defaultCategoryId ?? null,
      dryRun: opts.dryRun === true,
    });

    if (!summary.dryRun) {
      await recordRun(tenantId, supplierId, config, {
        lastSyncedAt: new Date().toISOString(),
        lastResult: compactResult(summary, true),
      });
    }
    return { status: "ok", summary };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (opts.dryRun !== true) {
      await recordRun(tenantId, supplierId, config, {
        // Stamp lastSyncedAt so a hard-failing feed doesn't hot-loop every tick.
        lastSyncedAt: new Date().toISOString(),
        lastResult: { at: new Date().toISOString(), ok: false, error: message },
      });
    }
    return { status: "error", error: message };
  }
}
