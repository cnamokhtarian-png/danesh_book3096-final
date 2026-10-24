/**
 * منطق بازیابی رمز عبور.
 *
 * - توکن تصادفی ۳۲ بایتی به کاربر داده می‌شود و فقط هش SHA-256 آن ذخیره می‌شود.
 * - هر توکن یک‌بارمصرف است و پس از ۴۵ دقیقه منقضی می‌شود.
 * - با هر درخواست جدید، توکن‌های قبلی همان کاربر باطل می‌شوند.
 * - بعد از تغییر رمز، همه نشست‌های کاربر حذف می‌شوند تا دستگاه‌های دیگر خارج شوند.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, sessions, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

export const RESET_TTL_MINUTES = 45;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** توکن خام (برای لینک ایمیل) + ثبت هش آن در دیتابیس. */
export async function issueResetToken(userId: number): Promise<{ token: string; expiresAt: Date }> {
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
