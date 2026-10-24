/**
 * منطق بازیابی رمز عبور.
 *
 * - توکن تصادفی ۳۲ بایتی به کاربر داده می‌شود و فقط هش SHA-256 آن ذخیره می‌شود.
 * - هر توکن یک‌بارمصرف است و پس از ۴۵ دقیقه منقضی می‌شود.
 * - با هر درخواست جدید، توکن‌های قبلی همان کاربر باطل می‌شوند.
 * - بعد از تغییر رمز، همه نشست‌های کاربر حذف می‌شوند تا دستگاه‌های دیگر خارج شوند.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, sessions, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

export const RESET_TTL_MINUTES = 45;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * ساخت خودکار جدول در اولین استفاده.
 *
 * چرا؟ اگر جدول روی دیتابیس نباشد، قابلیت بازیابی با خطای ۴۲P01 شکست می‌خورد و
 * کاربر مجبور می‌شد دستی SQL اجرا کند. این تابع یک‌بار (و فقط یک بار در هر
 * process) جدول را با `CREATE TABLE IF NOT EXISTS` می‌سازد — کاملاً افزایشی،
 * بدون هیچ تغییری در جدول‌ها یا داده‌های موجود.
 *
 * نتیجه در حافظه کش می‌شود؛ اگر شکست بخورد (مثلاً کاربر دیتابیس اجازه DDL
 * ندارد) هر بار دوباره تلاش نمی‌شود و خطای اصلی بالا می‌رود تا پیام مناسب
 * به کاربر داده شود.
 */
let schemaReady = false;
let schemaPromise: Promise<void> | null = null;

async function createResetTable(): Promise<void> {
  await db.execute(sql`
    create table if not exists "passwordResets" (
      "id"        serial primary key,
      "userId"    integer not null references "users"("id") on delete cascade,
      "tokenHash" varchar(64) not null,
      "expiresAt" timestamp with time zone not null,
      "usedAt"    timestamp with time zone,
      "createdAt" timestamp with time zone not null default now()
    )
  `);
  await db.execute(
    sql`create unique index if not exists "passwordResets_tokenHash_unique" on "passwordResets" ("tokenHash")`,
  );
  await db.execute(
    sql`create index if not exists "passwordResets_userId_idx" on "passwordResets" ("userId")`,
  );
}

async function tableExists(): Promise<boolean> {
  try {
    const result = await db.execute(sql`select to_regclass('public."passwordResets"') as t`);
    return Boolean((result.rows?.[0] as { t?: string } | undefined)?.t);
  } catch {
    return false;
  }
}

/** اطمینان از وجود جدول؛ در هر process فقط یک بار اجرا می‌شود. */
export async function ensureResetSchema(): Promise<void> {
  if (schemaReady) return;

  if (!schemaPromise) {
    schemaPromise = createResetTable()
      .then(() => {
        schemaReady = true;
      })
      .catch(async (error) => {
        // ممکن است درخواست هم‌زمانی جدول را ساخته باشد
        if (await tableExists()) {
          schemaReady = true;
          return;
        }
        throw error;
      })
      .finally(() => {
        schemaPromise = null;
      });
  }

  return schemaPromise;
}

/** توکن خام (برای لینک ایمیل) + ثبت هش آن در دیتابیس. */
export async function issueResetToken(userId: number): Promise<{ token: string; expiresAt: Date }> {
  await ensureResetSchema();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  // توکن‌های قبلی همین کاربر باطل می‌شوند تا فقط آخرین لینک معتبر باشد.
  await db.delete(passwordResets).where(eq(passwordResets.userId, userId));
  await db.insert(passwordResets).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return { token, expiresAt };
}

export type ResetTarget = { id: number };

/** بررسی اعتبار توکن بدون مصرف آن (برای نمایش فرم). */
export async function findResetTarget(token: string): Promise<ResetTarget | null> {
  if (!token || token.length !== 64) return null;
  try {
    await ensureResetSchema();
    const rows = await db
      .select({ id: passwordResets.id, userId: passwordResets.userId })
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, hashToken(token)),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return rows[0] ? { id: rows[0].userId } : null;
  } catch (error) {
    console.error("[daneshbook:reset] findResetTarget failed:", (error as Error).message);
    return null;
  }
}

/**
 * مصرف توکن و تعیین رمز جدید. اگر توکن نامعتبر/منقضی/مصرف‌شده باشد null
 * برمی‌گرداند (بدون throw) تا مسیر API پیام قابل‌فهم بدهد.
 */
export async function consumeResetToken(
  token: string,
  newPassword: string,
): Promise<{ userId: number } | null> {
  const target = await findResetTarget(token);
  if (!target) return null;

  const passwordHash = await hashPassword(newPassword);

  return await db.transaction(async (tx) => {
    const claimed = await tx
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResets.tokenHash, hashToken(token)),
          isNull(passwordResets.usedAt),
        ),
      )
      .returning({ userId: passwordResets.userId });

    if (!claimed.length) return null; // همزمان توسط درخواست دیگری مصرف شده

    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, target.id));

    // خروج از همه دستگاه‌ها پس از تغییر رمز
    await tx.delete(sessions).where(eq(sessions.userId, target.id));

    return { userId: target.id };
  });
}
