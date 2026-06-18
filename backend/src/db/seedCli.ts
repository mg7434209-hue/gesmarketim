// CLI entrypoint for `npm run db:seed`: loads env, runs the idempotent seed
// routine, then closes the connection pool and exits.

import "dotenv/config";
import { pool } from "./index.js";
import { seedDatabase } from "./seed.js";

seedDatabase()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Seed hatası:", err);
    await pool.end();
    process.exit(1);
  });
