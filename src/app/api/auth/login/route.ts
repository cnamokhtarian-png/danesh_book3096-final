import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, publicUser, verifyPassword, type SessionUser } from "@/lib/auth";
import { HttpError, jsonError, readJsonBody, str, withDb } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Very small in-memory throttle: stops brute force without extra packages. */
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60 * 1000;
const attempts = new Map<string, { count: number; first: number }>();

function isRateLimited(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function registerFailure(key: string): void {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: Date.now() });
    return;
  }
  entry.count += 1;
}

export async function POST(request: Request) {
  let email = "";

  try {
    const body = await readJsonBody<{ email?: unknown; password?: unknown }>(request);
    email = str(body.email, 190).toLowerCase();
    const password = str(body.password, 200);

    if (!email) return jsonError("ایمیل خود را وارد کنید.", 422);
    if (!password) return jsonError("رمز عبور خود را وارد کنید.", 422);
    if (isRateLimited(email)) {
      return jsonError(
        "تلاش‌های ناموفق زیاد بوده است. لطفاً چند دقیقه دیگر دوباره امتحان کنید.",
        429,
      );
    }

    const { response } = await withDb(async () => {
      const rows = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          passwordHash: users.passwordHash,
          studentCode: users.studentCode,
          university: users.university,
          major: users.major,
          bio: users.bio,
          avatarEmoji: users.avatarEmoji,
          karmaPoints: users.karmaPoints,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      const found = rows[0];
      if (!found) {
        throw new HttpError("حسابی با این ایمیل پیدا نشد. ابتدا ثبت‌نام کنید.", 401);
      }

      const valid = await verifyPassword(password, found.passwordHash);
      if (!valid) {
        registerFailure(email);
        throw new HttpError("رمز عبور اشتباه است.", 401);
      }

      attempts.delete(email);
      await createSession(found.id);

      return { user: publicUser(found as SessionUser) };
    });

    return response;
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error.message, error.status);
    console.error("[daneshbook:login] failed:", (error as Error).message);
    return jsonError("ورود انجام نشد. لطفاً دوباره تلاش کنید.", 400);
  }
}
