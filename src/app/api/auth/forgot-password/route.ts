import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { HttpError, jsonError, readJsonBody, str, withDb } from "@/lib/http";
import { resetMailContent, sendMail, siteUrl } from "@/lib/mail";
import { issueResetToken, RESET_TTL_MINUTES } from "@/lib/password-reset";
import { createRateLimiter, rateKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * سه سطل جدا:
 * - به‌ازای هر ایمیل (مستقل از IP) تا کسی نتواند با چرخش IP صندوق یک نفر را پر کند
 * - به‌ازای هر IP+ایمیل (جلوگیری از پیمایش ایمیل‌ها)
 * - به‌ازای هر IP
 */
const targetLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 3 });
const emailLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 3 });
const ipLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

/**
 * پیام همیشه یکسان است تا معلوم نشود چه ایمیلی در سایت ثبت شده است
 * (جلوگیری از شمارش کاربران).
 */
const GENERIC =
  "اگر این ایمیل در دانش‌بوک ثبت شده باشد، لینک بازیابی رمز برایتان ارسال شد. صندوق ورودی و پوشه اسپم را ببینید.";

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = await readJsonBody<{ email?: unknown }>(request);
  } catch (error) {
    return jsonError((error as Error).message, 400);
  }

  const email = str(body.email, 190).toLowerCase();
  if (!email) return jsonError("ایمیل خود را وارد کنید.", 422);

  const emailKey = rateKey(request, email);
  const ipKey = rateKey(request, "forgot");
  const targetKey = `email::${email}`;
  if (
    targetLimiter.isLimited(targetKey) ||
    emailLimiter.isLimited(emailKey) ||
    ipLimiter.isLimited(ipKey)
  ) {
    return jsonError("تعداد درخواست‌های بازیابی زیاد است. لطفاً چند دقیقه بعد دوباره تلاش کنید.", 429);
  }

  targetLimiter.register(targetKey);

  const { response } = await withDb(async () => {
    const [found] = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // ایمیل ناموجود: همان پاسخ عمومی، بدون ساخت توکن و بدون افشای وجود حساب.
    if (!found) return { message: GENERIC };

    let token: string;
    try {
      token = (await issueResetToken(found.id)).token;
    } catch (error) {
      const code = (error as { code?: string; cause?: { code?: string } }).code
        ?? (error as { cause?: { code?: string } }).cause?.code;
      if (code === "42P01") {
        console.error(
          "[daneshbook:reset] جدول passwordResets ساخته نشده است. scripts/sql/001-password-resets.sql را اجرا کنید.",
        );
        throw new HttpError(
          "سرویس بازیابی رمز در حال آماده‌سازی است. لطفاً بعداً تلاش کنید یا از فرم پشتیبانی پیام دهید.",
          503,
        );
      }
      throw error;
    }
    const link = `${siteUrl(request)}/reset-password?token=${token}`;

    const mail = resetMailContent(found.fullName, link, RESET_TTL_MINUTES);
    const result = await sendMail({
      to: email,
      subject: "بازیابی رمز عبور دانش‌بوک",
      text: mail.text,
      html: mail.html,
    });

    // اگر سرویس ایمیل تنظیم نشده باشد (فقط محیط توسعه)، لینک در لاگ سرور است.
    if (!result.sent && process.env.NODE_ENV !== "production") {
      return { message: GENERIC, devResetLink: link };
    }

    return { message: GENERIC };
  });

  return response;
}
