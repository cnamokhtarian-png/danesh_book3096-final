import type { MetadataRoute } from "next";
import { listBooksForSitemap } from "@/lib/queries";
import { GAME } from "@/lib/game";
import { SITE, absoluteUrl } from "@/lib/site";

/**
 * در زمان درخواست ساخته می‌شود تا `NEXT_PUBLIC_SITE_URL` و آگهی‌های تازه
 * حتماً لحاظ شوند. (کش یک‌ساعته با revalidate انجام می‌شود.)
 */
export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * sitemap.xml — صفحه‌های ثابت عمومی + همه آگهی‌ها.
 *
 * صفحه‌های خصوصی (داشبورد، پروفایل، پنل مدیریت، ورود/ثبت‌نام، بازیابی رمز)
 * عمداً داخل sitemap نیستند.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/books"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/konkur"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/support"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      // صفحه تکفایل بازی که از public/games/bijan/index.html سرو میشود.
      url: absoluteUrl(GAME.path),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const books = await listBooksForSitemap();

  const bookPages: MetadataRoute.Sitemap = books.map((book) => ({
    url: `${SITE.url}/books/${book.id}`,
    lastModified: book.updatedAt ?? book.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...bookPages];
}
