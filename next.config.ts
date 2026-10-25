import type { NextConfig } from "next";

/**
 * هدرهای امنیتی پایه. قبلاً هیچ‌کدام تنظیم نشده بود.
 * CSP عمداً انعطاف‌پذیر است (inline style مجاز) تا ظاهر فعلی سایت نشکند.
 */
const scriptSources = ["'self'", "'unsafe-inline'"];
if (process.env.NODE_ENV !== "production") scriptSources.push("'unsafe-eval'");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      `script-src ${scriptSources.join(" ")}`,
      "connect-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  /**
   * آدرس تمیز بازی: `/games/bijan` همان فایل تکفایل HTML بازی را از public
   * نشان میدهد. بدون این rewrite فقط `/games/bijan/index.html` در دسترس بود.
   * (Next بهطور پیشفرض `/games/bijan/` را به `/games/bijan` هدایت میکند.)
   */
  async rewrites() {
    return [{ source: "/games/bijan", destination: "/games/bijan/index.html" }];
  },
};

export default nextConfig;
