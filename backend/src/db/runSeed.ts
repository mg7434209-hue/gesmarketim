// Optionally seeds the database at server startup using the idempotent seed
// routine, so a fresh deploy can self-populate tenant/taxonomy/catalogue without
// a manual `npm run db:seed` step.
//
// Idempotent: seedDatabase() uses onConflictDoNothing and slug lookups, so
// re-running against an already-seeded database is a no-op.
// Opt-in only: enable with AUTO_SEED=true (default off).

import { seedDatabase } from "./seed.js";

export function isAutoSeedEnabled(): boolean {
  const v = (process.env.AUTO_SEED ?? "false").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** Run the idempotent seed routine. */
export async function runSeed(): Promise<void> {
  await seedDatabase();
}
