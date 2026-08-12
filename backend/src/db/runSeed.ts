// Optionally seeds the database at server startup using the idempotent seed
// routine, so a fresh deploy can self-populate tenant/taxonomy/catalogue without
// a manual `npm run db:seed` step.
//
// Idempotent: seedDatabase() uses onConflictDoNothing and slug lookups, so
// re-running against an already-seeded database only inserts what's missing —
// existing rows (admin edits, prices) are never touched.
// VARSAYILAN KAPALI (aşamalı katalog kurulumu, 11.08.2026): katalog artık
// gerçek fiyat listelerinden `npm run db:rebuild` / `db:import-csv` ile
// kurulur; demo seed'in deploy'da geri gelmesi istenmez. Seed'i bilinçli
// çalıştırmak için AUTO_SEED=true ver (ya da `npm run db:seed`).

import { seedDatabase } from "./seed.js";

export function isAutoSeedEnabled(): boolean {
  const v = (process.env.AUTO_SEED ?? "false").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** Run the idempotent seed routine. */
export async function runSeed(): Promise<void> {
  await seedDatabase();
}
