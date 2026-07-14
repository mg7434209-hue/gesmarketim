// Optionally seeds the database at server startup using the idempotent seed
// routine, so a fresh deploy can self-populate tenant/taxonomy/catalogue without
// a manual `npm run db:seed` step.
//
// Idempotent: seedDatabase() uses onConflictDoNothing and slug lookups, so
// re-running against an already-seeded database only inserts what's missing —
// existing rows (admin edits, prices) are never touched.
// DEFAULT ON: canlı mağazanın boş açılmaması için varsayılan açık.
// Kapatmak için AUTO_SEED=false. (Admin'in kasıtlı sildiği bir seed ürünü
// sonraki deploy'da geri gelir; kalıcı kaldırmak için ürünü silmek yerine
// "archived" durumuna almak yeterlidir — seed slug'ı görüp atlar.)

import { seedDatabase } from "./seed.js";

export function isAutoSeedEnabled(): boolean {
  const v = (process.env.AUTO_SEED ?? "true").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** Run the idempotent seed routine. */
export async function runSeed(): Promise<void> {
  await seedDatabase();
}
