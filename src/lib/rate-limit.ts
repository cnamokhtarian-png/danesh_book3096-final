/**
 * محدودکننده نرخ درخواست — بدون وابستگی خارجی.
 *
 * - کلیدها به‌صورت دوره‌ای پاک‌سازی می‌شوند تا حافظه بی‌نهایت رشد نکند
 *   (باگ قبلی: Map هرگز خالی نمی‌شد و با ایمیل/تماس تصادفی نشت حافظه داشت).
 * - کلید ترکیبی «IP + شناسه» است تا هم مهاجم نتواند با چرخش ایمیل از سقف
 *   فرار کند و هم قفل‌کردن حساب یک کاربر توسط دیگران سخت شود.
 *
 * توجه: این محدودیت درون‌حافظه‌ای است؛ در محیط چندنمونه‌ای (serverless) هر
 * instance سطل جدا دارد. برای تولید جدی از Redis/Upstash استفاده کنید.
 */

const SWEEP_INTERVAL_MS = 60_000;

type Bucket = { count: number; first: number };

export type RateLimiter = {
  /** آیا کلید به سقف مجاز رسیده است؟ */
  isLimited(key: string): boolean;
  /** یک تلاش (موفق یا ناموفق) ثبت می‌کند. */
  register(key: string): void;
  /** شمارنده کلید را صفر می‌کند (مثلاً بعد از ورود موفق). */
  reset(key: string): void;
};

export function createRateLimiter({
  windowMs,
  max,
}: {
  windowMs: number;
  max: number;
}): RateLimiter {
  const buckets = new Map<string, Bucket>();
  let lastSweep = Date.now();

  function sweep(now: number) {
    if (now - lastSweep < SWEEP_INTERVAL_MS) return;
    lastSweep = now;
    for (const [key, bucket] of buckets) {
      if (now - bucket.first > windowMs) buckets.delete(key);
    }
  }

  function live(key: string, now: number): Bucket | null {
    const bucket = buckets.get(key);
    if (!bucket) return null;
    if (now - bucket.first > windowMs) {
      buckets.delete(key);
      return null;
    }
    return bucket;
  }

  return {
    isLimited(key) {
      const now = Date.now();
      sweep(now);
      const bucket = live(key, now);
      return Boolean(bucket && bucket.count >= max);
    },
    register(key) {
      const now = Date.now();
      sweep(now);
      const bucket = live(key, now);
      if (!bucket) {
        buckets.set(key, { count: 1, first: now });
        return;
      }
      bucket.count += 1;
    },
    reset(key) {
      buckets.delete(key);
    },
  };
}

/** IP مشتری؛ پشت پروکسی (Vercel/Cloudflare) از x-forwarded-for خوانده می‌شود. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** کلید ترکیبی برای محدودسازی بر اساس IP و شناسه کاربر. */
export function rateKey(request: Request, identifier: string): string {
  return `${clientIp(request)}::${identifier.trim().toLowerCase()}`;
}
