import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

// SSL: Railway'in iç ağı ve yerel geliştirme (localhost) TLS konuşmaz;
// bunların dışındaki (ör. Railway public proxy) bağlantılarda TLS kullan.
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
export const pool = new Pool({
  connectionString,
  ssl:
    connectionString.includes("railway.internal") || isLocal
      ? false
      : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

