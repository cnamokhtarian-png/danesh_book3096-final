import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, publicUser, verifyPassword, type SessionUser } from "@/lib/auth";
import { HttpError, jsonError, readJsonBody, str, withDb } from "@/lib/http";
import { createRateLimiter, rateKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * محدودکننده تلاش ورود: ۸ تلاش در ۵ دقیقه به‌ازای «IP + ایمیل».
 * قبلاً فقط «رمز اشتباه» شمارش می‌شد و ایمیل ناموجود اصلاً شمرده نمی‌شد،
 * بنابراین هم brute-force روی ایمیل و هم شمارش ایمیل‌های ثبت‌شده آزاد بود.
 */
const limiter = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 8 });
const IP_LIMITER = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 40 });

/** پیام یکسان برای «کاربر نیست» و «رمز غلط» تا ایمیل‌ها قابل شمارش نباشند. */
const INVALID_CREDENTIALS = "ایمیل یا رمز عبور اشتباه است.";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<{ email?: unknown; password?: unknown }>(request);
    const email = str(body.email, 190).toLowerCase();
    const password = str(body.password, 200);

    if (!email) return jsonError("ایمیل خود را وارد کنید.", 422);
    if (!password) return jsonError("رمز عبور خود را وارد کنید.", 422);

    const key = rateKey(request, email);
    const ip = rateKey(request, "login");

    if (limiter.isLimited(key) || IP_LIMITER.isLimited(ip)) {
      return jsonError(
        "تلاش‌های ناموفق زیاد بوده است. لطفاً چند دقیقه دیگر دوباره امتحان کنید.",
        429,
      );
    }
    IP_LIMITER.register(ip);

    const { response } = await withDb(async () => {
      /**
       * شناسه ورود می‌تواند ایمیل کامل یا «نام کاربری» (بخش قبل از @) باشد.
       * مثال: هم `sins1996@daneshbook.local` و هم `Sins1996` کار می‌کند.
       * این کار بدون تغییر schema انجام می‌شود تا دیتابیس موجود دست‌نخورده بماند.
       */
      const usesFullEmail = email.includes("@");
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
        .where(
          usesFullEmail
            ? eq(users.email, email)
            : sql`lower(split_part(${users.email}, '@', 1)) = ${email}`,
        )
        .limit(5);

      let found: (typeof rows)[number] | undefined;
      for (const candidate of rows) {
        if (await verifyPassword(password, candidate.passwordHash)) {
          found = candidate;
          break;
        }
      }

      if (!found) {
        limiter.register(key);
        throw new HttpError(INVALID_CREDENTIALS, 401);
      }

      limiter.reset(key);
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
