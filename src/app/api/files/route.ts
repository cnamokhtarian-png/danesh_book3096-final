import { getCurrentUser } from "@/lib/auth";
import {
  ALLOWED_EXTENSIONS_LABEL,
  ALLOWED_FILE_TYPES,
  MAX_UPLOAD_BYTES,
  ensureFileSchema,
  extensionOf,
  saveUploadedFile,
} from "@/lib/files";
import { jsonError, jsonOk } from "@/lib/http";
import { createRateLimiter, rateKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** حداکثر ۲۰ آپلود در ساعت برای هر کاربر (۸ مگابایت هر فایل). */
const uploadLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 20 });

/**
 * آپلود فایل آگهی.
 *
 * فایل ابتدا آپلود می‌شود و شناسه‌ی آن برمی‌گردد؛ سپس هنگام ثبت آگهی همان
 * `fileId` فرستاده می‌شود. این دو مرحله‌ای بودن باعث می‌شود کاربر پیش از
 * زدن دکمه‌ی «ثبت آگهی» از آپلود موفق مطمئن شود.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("برای آپلود فایل ابتدا وارد حساب خود شوید.", 401);
  }

  const limiterKey = rateKey(request, `upload:${user.id}`);
  if (uploadLimiter.isLimited(limiterKey)) {
    return jsonError("تعداد آپلودهای این ساعت زیاد است. کمی بعد دوباره تلاش کنید.", 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("فایل ارسالی خوانده نشد. دوباره تلاش کنید.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("فایلی انتخاب نشده است.", 422);
  }

  if (file.size === 0) {
    return jsonError("فایل انتخاب‌شده خالی است.", 422);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError("حجم فایل بیشتر از ۸ مگابایت است. فایل را فشرده کنید و دوباره بفرستید.", 413);
  }

  const originalName = file.name || "file";
  const ext = extensionOf(originalName);
  const mimeFromExt = ALLOWED_FILE_TYPES[ext];
  if (!mimeFromExt) {
    return jsonError(`پسوند فایل مجاز نیست. فرمت‌های مجاز: ${ALLOWED_EXTENSIONS_LABEL}`, 415);
  }

  try {
    await ensureFileSchema();
    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = await saveUploadedFile({
      ownerId: user.id,
      fileName: originalName.slice(0, 180),
      // نوع MIME از پسوند تعیین می‌شود، نه از هدر مرورگر (که قابل جعل است).
      mimeType: mimeFromExt,
      sizeBytes: bytes.byteLength,
      base64: bytes.toString("base64"),
    });
    uploadLimiter.register(limiterKey);
    return jsonOk({
      file: {
        id: saved.id,
        fileName: saved.fileName,
        sizeBytes: saved.sizeBytes,
      },
    });
  } catch (error) {
    console.error("[daneshbook:files] upload failed:", (error as Error).message);
    return jsonError("ذخیره‌ی فایل انجام نشد. دوباره تلاش کنید.", 500);
  }
}
