import { getCurrentUser } from "@/lib/auth";
import { toInt, jsonError, jsonOk } from "@/lib/http";
import { createRateLimiter, rateKey } from "@/lib/rate-limit";
import {
  ensurePhotoSchema,
  MAX_PHOTO_BYTES,
  saveUploadedPhoto,
} from "@/lib/photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** حداکثر ۶۰ آپلود عکس در ساعت برای هر کاربر (۴ مگابايت هر عکس). */
const uploadLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 60 });

/**
 * امضای بایت‌های recognizable برای فایل‌های تصویر.
 * اعتبارسنجی بر اساس محتوای واقعی فایل انجام می‌شود، نه پسوند یا هدر MIME
 * قابل-made przeglądarki (که قابل جعل است).
 */
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const WEBP_RIFF_OFFSET = 0;
const WEBP_WEBP_OFFSET = 8;

function imageMimeTypeFromSignature(bytes: Buffer): string | null {
  if (
    bytes.length >= JPEG_SIGNATURE.length &&
    JPEG_SIGNATURE.every((value, index) => bytes[index] === value)
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((value, index) => bytes[index] === value)
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * آپلود عکس آگهی.
 *
 * عکس ابتدا آپلود می‌شود و شناسه‌ی آن برمی‌گردد؛ سپس هنگام ثبت آگهی همان
 * `photoId`ها فرستاده می‌شوند. این دو مرحله‌ای بودن باعث می‌شود کاربر پیش از
 * زدن دکمه‌ی «ثبت آگهی» بداند عکس با موفقیت ذخیره شده است.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("برای آپلود عکس ابتدا وارد حساب خود شوید.", 401);
  }

  const limiterKey = rateKey(request, `photo:${user.id}`);
  if (uploadLimiter.isLimited(limiterKey)) {
    return jsonError("تعداد آپلودهای عکس این ساعت زیاد است. کمی بعد دوباره تلاش کنید.", 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("فایل ارسالی خوانده نشد. دوباره تلاش کنید.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("عکاسی انتخاب نشده است.", 422);
  }

  if (file.size === 0) {
    return jsonError("فایل انتخاب‌شده خالی است.", 422);
  }

  const width = toInt(form.get("width"), 0);
  const height = toInt(form.get("height"), 0);

  try {
    await ensurePhotoSchema();
    const bytes = Buffer.from(await file.arrayBuffer());

    // نوع MIME از امضای بایت فایل تشخیص می‌شود، نه پسوند یا هدر مرورگر.
    const mimeType = imageMimeTypeFromSignature(bytes);
    if (!mimeType) {
      return jsonError(
        "فایل انتخاب‌شده یک تصویر معتبر نیست (فرمتهای JPEG، PNG و WebP مجاز است).",
        415,
      );
    }

    if (bytes.byteLength > MAX_PHOTO_BYTES) {
      return jsonError(
        "حجم عکس بیشتر از ۴ مگابایت است. عکس را کوچک‌تر کنید و دوباره بفرستید.",
        413,
      );
    }

    const saved = await saveUploadedPhoto({
      ownerId: user.id,
      mimeType,
      sizeBytes: bytes.byteLength,
      base64: bytes.toString("base64"),
      width,
      height,
    });
    uploadLimiter.register(limiterKey);
    return jsonOk({
      photo: {
        id: saved.id,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        width: saved.width,
        height: saved.height,
      },
    });
  } catch (error) {
    console.error("[daneshbook:photos] upload failed:", (error as Error).message);
    return jsonError("ذخیره‌ی عکس انجام نشد. دوباره تلاش کنید.", 500);
  }
}
