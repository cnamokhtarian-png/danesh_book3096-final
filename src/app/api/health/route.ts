import { db, isDatabaseConfigured } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * بررسی سلامت. اگر DATABASE_URL تنظیم نشده باشد، بدون تلاش برای اتصال
 * پاسخ ۵۰۳ با `configured: false` برمی‌گردد تا پایشگر علت را ببیند.
 */
export async function GET() {
  if (!isDatabaseConfigured) {
    return Response.json({ ok: false, configured: false }, { status: 503 });
  }
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, configured: true });
  } catch {
    return Response.json({ ok: false, configured: true }, { status: 503 });
  }
}
