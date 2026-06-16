// Runs pending Drizzle migrations at server startup using the application's own
// connection pool (same SSL/credentials that already work for the app), so a
// deploy self-applies schema changes without a manual `db:migrate` step.
//
// Idempotent: Drizzle tracks applied migrations in drizzle.__drizzle_migrations
// (the same table drizzle-kit uses), so already-applied migrations are skipped.
// Disable with AUTO_MIGRATE=false (then run `npm run db:migrate` manually).

import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index.js";

export function isAutoMigrateEnabled(): boolean {
  const v = (process.env.AUTO_MIGRATE ?? "true").toLowerCase();
  return v !== "false" && v !== "0" && v !== "no";
}

/** Apply pending migrations. Resolves the drizzle folder relative to this file
 *  (backend/drizzle) so it works regardless of the process cwd. */
export async function runMigrations(): Promise<void> {
  // dist/db/runMigrations.js → ../../drizzle = backend/drizzle
  const here = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = path.resolve(here, "../../drizzle");
  await migrate(db, { migrationsFolder });
}
