/**
 * Resilient PostgreSQL (Supabase compatible) connection.
 *
 * - one pooled connection per process (never per request)
 * - TLS automatically enabled for remote hosts such as Supabase
 * - short connect / statement timeouts so a slow network can never hang a
 *   request and turn it into a 5xx / gateway timeout
 * - pool `error` listener so an idle client dying never crashes the server
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to your .env file.");
}

const isLocalHost =
  /(@|\/\/)(localhost|127\.0\.0\.1|\[::1\])(:|\?|\/|$)/.test(databaseUrl) ||
  /sslmode=(disable|prefer)/.test(databaseUrl);

const needsSsl = !isLocalHost || /sslmode=(require|verify-ca|verify-full)/.test(databaseUrl);

const poolConfig: PoolConfig = {
  connectionString: databaseUrl,
  max: Number(process.env.PG_POOL_MAX ?? 5),
  min: 1,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 8_000,
  keepAlive: true,
  statement_timeout: 12_000,
  query_timeout: 12_000,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
};

const globalForDb = globalThis as typeof globalThis & {
  __daneshbookPool?: Pool;
};

function createPool(): Pool {
  const created = new Pool(poolConfig);
  // A dead idle client must never take the whole Node process down.
  created.on("error", (error) => {
    console.error("[daneshbook:db] idle client error:", error.message);
  });
  return created;
}

export const pool = globalForDb.__daneshbookPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__daneshbookPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
