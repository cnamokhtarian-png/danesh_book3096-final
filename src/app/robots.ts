import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** در زمان درخواست تا آدرس سایت از متغیر محیطی خوانده شود. */
export const dynamic = "force-dynamic";

/**
 * robots.txt — مسیرهای خصوصی و API از خزش خارج می‌شوند تا بودجه خزش هدر نرود
 * و صفحات نازک/شخصی ایندکس نشوند.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/dashboard",
          "/profile",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
