import { db } from "@/db";
import { suggestions } from "@/db/schema";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { HttpError, isEmail, jsonError, readJsonBody, str, withDb } from "@/lib/http";
import { listSuggestions } from "@/lib/queries";
import { createRateLimiter, rateKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * جلوگیری از ارسال انبوه پیام.
 *
 * قبلاً کلید فقط «contact» بود و کاربر خودش آن را تعیین می‌کند، پس با هر بار
 * عوض‌کردن ایمیل/شماره، محدودیت دور زده می‌شد؛ علاوه بر آن Map هرگز پاک
 * نمی‌شد (نشت حافظه). اکنون کلید ترکیب IP + تماس است و پاکسازی دوره‌ای دارد.
 */
const contactLimiter = createRateLimiter({ windowMs: 60_000, max: 4 });
const ipLimiter = createRateLimiter({ windowMs: 60_000, max: 8 });

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    return jsonError("این بخش فقط برای مدیر سایت در دسترس است.", 403);
  }
  const { response } = await withDb(async () => {
    const items = await listSuggestions();
    return { items };
  });
  return response;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return jsonError((error as Error).message, 400);
  }

  const fullName = str(body.fullName, 120);
  const contact = str(body.contact, 190);
  const subject = str(body.subject, 160);
  const message = str(body.message, 2000);

  if (fullName.length < 3) {
    return jsonError("نام خود را کامل وارد کنید.", 422);
  }
  if (!contact) {
    return jsonError("ایمیل یا شماره تماس خود را وارد کنید.", 422);
  }
  const looksLikeEmail = contact.includes("@");
  if (looksLikeEmail && !isEmail(contact)) {
    return jsonError("ایمیل وارد شده معتبر نیست.", 422);
  }
  if (!looksLikeEmail && !/^[0-9+\s\u06F0-\u06F9-]{8,15}$/.test(contact)) {
    return jsonError("شماره تماس وارد شده معتبر نیست.", 422);
  }
  if (subject.length < 3) {
    return jsonError("موضوع پیام را بنویسید.", 422);
  }
  if (message.length < 10) {
    return jsonError("متن پیشنهاد باید حداقل ۱۰ حرف باشد.", 422);
  }

  const contactKey = rateKey(request, contact);
  const ipKey = rateKey(request, "suggestion");
  if (contactLimiter.isLimited(contactKey) || ipLimiter.isLimited(ipKey)) {
    return jsonError("تعداد پیام‌های شما در این دقیقه زیاد است. کمی بعد دوباره تلاش کنید.", 429);
  }

  const { response } = await withDb(async () => {
    const [created] = await db
      .insert(suggestions)
      .values({ fullName, contact, subject, message, status: "new" })
      .returning({ id: suggestions.id, createdAt: suggestions.createdAt });

    if (!created) throw new HttpError("ثبت پیام انجام نشد. دوباره تلاش کنید.", 500);
    contactLimiter.register(contactKey);
    ipLimiter.register(ipKey);
    return { suggestion: created };
  });

  return response;
}
