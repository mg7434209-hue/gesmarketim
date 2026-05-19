import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    '[db] DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in.',
  );
}

// Lazy singleton so importing this file in tests / migrations doesn't open a pool prematurely.
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client);
export const rawClient = client;
