import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { seedDemoContent } from "@/lib/demo-content";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ساخت محتوای نمونه (فقط مدیر).
 *
 * چرا در API و نه اسکریپت؟ چون کاربر باید بتواند بدون دست‌زدن به ترمینال و
 * بدون اجرای SQL دستی، سایت خالی را از پنل مدیریت پر کند.
 *
 * عملیات فقط INSERT است و idempotent؛ دوبار زدن دکمه داده‌ی تکراری نمی‌سازد.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return jsonError("برای این کار باید وارد حساب شوید.", 401);
  if (!isAdminUser(user)) return jsonError("این عملیات فقط برای مدیر سایت مجاز است.", 403);

  try {
    const result = await seedDemoContent();
    return jsonOk({ result });
  } catch (error) {
    console.error("[daneshbook:seed] failed:", (error as Error).message);
    return jsonError("ساخت محتوای نمونه انجام نشد. دوباره تلاش کنید.", 500);
  }
}
