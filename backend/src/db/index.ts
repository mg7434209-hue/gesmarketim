import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("railway.internal")
    ? false
    : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
