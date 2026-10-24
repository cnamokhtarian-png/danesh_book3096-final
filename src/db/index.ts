/**
 * اتصال PostgreSQL (سازگار با Supabase) به‌صورت مقاوم.
 *
 * - یک pool مشترک برای هر process (نه برای هر درخواست)
 * - TLS خودکار برای هاست‌های ریموت مثل Supabase
 * - تایم‌اوت کوتاه اتصال/دستور تا شبکه کند هرگز درخواست را قفل نکند
 * - شنونده `error` روی pool تا مرگ یک کلاینت بی‌کار کل process را نبندد
 *
 * مهم: اگر `DATABASE_URL` تنظیم نشده باشد، این ماژول **throw نمی‌کند**.
 * قبلاً throw در زمان import کل زنجیره را می‌شکست و سایت با استک‌تریس بالا
 * نمی‌آمد؛ حالا سایت با همان لایه fallback خودش رندر می‌شود و APIها پیام
 * فارسی «دیتابیس تنظیم نشده» می‌دهند.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL?.trim();
export const isDatabaseConfigured = Boolean(databaseUrl);

const url = databaseUrl ?? "";
const hostLooksLocal = /(@|\/\/)(localhost|127\.0\.0\.1|\[::1\])(:|\?|\/|$)/.test(url);
const sslDisabled = /sslmode=disable/.test(url);
const sslForced = /sslmode=(require|verify-ca|verify-full)/.test(url);
const needsSsl = Boolean(url) && !sslDisabled && (sslForced || !hostLooksLocal);

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
  // یک کلاینت idle مرده نباید کل process را پایین بیاورد.
  created.on("error", (error) => {
    console.error("[daneshbook:db] idle client error:", error.message);
  });
  return created;
}

export const pool: Pool | null = databaseUrl
  ? (globalForDb.__daneshbookPool ?? createPool())
  : null;

if (pool && process.env.NODE_ENV !== "production") {
  globalForDb.__daneshbookPool = pool;
}

type Db = ReturnType<typeof drizzle<typeof schema>>;

export const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED";

/**
 * وقتی DATABASE_URL وجود ندارد، هر استفاده از `db` یک خطای قابل‌تشخیص با
 * کد DB_NOT_CONFIGURED می‌دهد (نه یک TypeError مبهم). این خطا در
 * `describeDbError` به پیام فارسی ۵۰۳ تبدیل می‌شود.
 */
const unconfiguredDb = new Proxy({} as Db, {
  get(_target, property) {
    if (typeof property === "symbol" || property === "then") return undefined;
    const error = new Error(
      "DATABASE_URL تنظیم نشده است. مقدار آن را در فایل .env یا محیط هاست قرار دهید.",
    ) as Error & { code?: string };
    error.code = DB_NOT_CONFIGURED;
    throw error;
  },
});

export const db: Db = pool ? drizzle(pool, { schema }) : unconfiguredDb;
export { schema };
