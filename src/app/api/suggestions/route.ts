import { db } from "@/db";
import { suggestions } from "@/db/schema";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { HttpError, isEmail, jsonError, readJsonBody, str, withDb } from "@/lib/http";
import { listSuggestions } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** جلوگیری ساده از ارسال انبوه پیام */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 4;
const buckets = new Map<string, { count: number; first: number }>();

function isThrottled(key: string) {
  const entry = buckets.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    buckets.delete(key);
    return false;
  }
  return entry.count >= MAX_PER_WINDOW;
}

function registerSend(key: string) {
  const entry = buckets.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    buckets.set(key, { count: 1, first: Date.now() });
    return;
  }
  entry.count += 1;
}

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

  const throttleKey = contact.toLowerCase();
  if (isThrottled(throttleKey)) {
    return jsonError("تعداد پیام‌های شما در این دقیقه زیاد است. کمی بعد دوباره تلاش کنید.", 429);
  }
  registerSend(throttleKey);

  const { response } = await withDb(async () => {
    const [created] = await db
      .insert(suggestions)
      .values({ fullName, contact, subject, message, status: "new" })
      .returning({ id: suggestions.id, createdAt: suggestions.createdAt });

    if (!created) throw new HttpError("ثبت پیام انجام نشد. دوباره تلاش کنید.", 500);
    return { suggestion: created };
  });

  return response;
}
