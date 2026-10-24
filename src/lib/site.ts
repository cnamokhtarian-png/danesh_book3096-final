/**
 * پیکربندی سئو و برند — یک منبع حقیقت برای همه متادیتاها.
 *
 * `NEXT_PUBLIC_SITE_URL` باید روی هاست تنظیم شود (مثال: https://daneshbook.ir).
 * بدون آن، لینک‌های canonical و sitemap روی localhost ساخته می‌شوند و گوگل
 * آن‌ها را نادیده می‌گیرد.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE = {
  name: "دانش‌بوک",
  legalName: "دانش‌بوک",
  url: SITE_URL,
  locale: "fa_IR",
  description:
    "دانش‌بوک بازار دانشجویی خرید، فروش و تبادل کتاب‌های دانشگاهی و دسترسی رایگان به جزوه، اسلاید و نمونه سوال است؛ به‌همراه هاب اختصاصی منابع کنکور.",
  shortDescription: "بازار دانشجویی کتاب، جزوه و فایل‌های درسی",
  email: "c.na.mokhtarian@gmail.com",
  ogImage: "/images/og-cover.jpg",
  /** برای متاتگ keywords (اثر کم ولی بی‌ضرر) */
  keywords: [
    "کتاب دست دوم دانشگاهی",
    "خرید کتاب دانشگاهی",
    "تبادل کتاب دانشجویی",
    "دانلود جزوه دانشگاهی",
    "جزوه کنکور",
    "نمونه سوال امتحانی",
    "اسلاید درس",
    "بازار کتاب دانشجویی",
    "دانش‌بوک",
  ],
} as const;

/** آدرس مطلق برای یک مسیر داخلی. */
export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** تیتر صفحه‌ها: بدون تکرار نام برند (قالب در layout اعمال می‌شود). */
export function pageTitle(title: string): string {
  return title;
}
