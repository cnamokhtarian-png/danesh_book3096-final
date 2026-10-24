/**
 * Authentication utilities — no external packages.
 * Password hashing uses Node's built-in scrypt, sessions are opaque tokens
 * stored in PostgreSQL and delivered through an httpOnly cookie.
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

/**
 * تنها منبع حقیقت برای دسترسی مدیریت، ستون `role` در دیتابیس است.
 *
 * قبلاً ایمیل ثابت `MANAGEMENT_EMAIL` هم به‌عنوان ادمین پذیرفته می‌شد؛ چون
 * ثبت‌نام هیچ تأیید مالکیت ایمیلی ندارد، هر کسی می‌توانست با آن ایمیل ثبت‌نام
 * کند و بلافاصله مدیر شود. حساب مدیر با اسکریپت
 * `scripts/set-admin.mjs` ساخته/ارتقا می‌یابد.
 */
export function isAdminUser(user: { role: string } | null | undefined): boolean {
  return user?.role === "admin";
}

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "daneshbook_session";
const SESSION_TTL_DAYS = 30;
/** حداقل طول رمز عبور: از ۶ به ۸ افزایش یافت (بدون اثر روی حساب‌های فعلی). */
export const PASSWORD_MIN_LENGTH = 8;

export type SessionUser = {
  id: number;
  fullName: string;
  email: string;
  studentCode: string | null;
  university: string | null;
  major: string | null;
  bio: string | null;
  avatarEmoji: string;
  karmaPoints: number;
  role: string;
  createdAt: Date;
};

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, salt, digest] = stored.split("$");
    if (scheme !== "scrypt" || !salt || !digest) return false;
    const derived = await scrypt(password, salt, 64);
    const expected = Buffer.from(digest, "hex");
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/** Creates a session row and writes the cookie. Only call from route handlers. */
export async function createSession(userId: number): Promise<string> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });

  const store = await cookies();
  store.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    // در HTTPS کوکی بدون Secure قابل شنود است — در تولید روشن می‌شود.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) {
      await db.delete(sessions).where(eq(sessions.token, token));
    }
    store.delete(SESSION_COOKIE);
  } catch (error) {
    console.error("[daneshbook:auth] logout cleanup failed:", (error as Error).message);
  }
}

/**
 * حذف نشست‌های منقضی — حداکثر یک بار در ساعت و به‌صورت غیرمسدودکننده.
 * قبلاً هیچ پاکسازی‌ای وجود نداشت و جدول sessions بی‌نهایت رشد می‌کرد.
 */
let lastSessionSweep = 0;
export function purgeExpiredSessions(): void {
  const now = Date.now();
  if (now - lastSessionSweep < 60 * 60 * 1000) return;
  lastSessionSweep = now;
  void db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .catch((error: Error) => {
      console.error("[daneshbook:auth] session purge failed:", error.message);
    });
}

/** Returns the signed-in user or null. NEVER throws — pages stay alive offline. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    purgeExpiredSessions();
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token || token.length !== 64) return null;

    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        studentCode: users.studentCode,
        university: users.university,
        major: users.major,
        bio: users.bio,
        avatarEmoji: users.avatarEmoji,
        karmaPoints: users.karmaPoints,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    return rows[0] ?? null;
  } catch (error) {
    console.error("[daneshbook:auth] session lookup failed:", (error as Error).message);
    return null;
  }
}

export function publicUser(user: SessionUser) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    studentCode: user.studentCode,
    university: user.university,
    major: user.major,
    bio: user.bio,
    avatarEmoji: user.avatarEmoji,
    karmaPoints: user.karmaPoints,
    role: user.role,
  };
}

/**
 * بررسی کیفیت رمز عبور. پیام فارسی برمی‌گرداند یا null اگر قابل قبول باشد.
 * عمداً فقط طول را چک می‌کند تا رمزهای موجود و ساده کاربران خراب نشوند.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    // رقم فارسی برای هم‌خوانی با بقیه پیام‌ها
    const fa = PASSWORD_MIN_LENGTH.toLocaleString("fa-IR");
    return `رمز عبور باید حداقل ${fa} کاراکتر باشد.`;
  }
  if (password.length > 200) {
    return "رمز عبور بیش از حد طولانی است.";
  }
  return null;
}
