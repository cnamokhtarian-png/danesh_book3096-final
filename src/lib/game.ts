/**
 * تنظیمات بازی «بیژن؛ گربه‌ای در خیابان».
 * یک منبع حقیقت برای بنر صفحه اصلی، منو، sitemap و مستندات.
 *
 * سورس بازی در `polished-cat-street-game/` است و خروجی تکفایل آن با
 * `npm run game:build` در `public/games/bijan/index.html` قرار میگیرد؛
 * یعنی بازی روی همان دامنه دانش بوک سرو میشود (بدون لینک خارجی).
 */
export const GAME = {
  /** آدرس تمیز صفحهای که با rewrite به فایل HTML داخل public وصل میشود. */
  path: "/games/bijan",
  name: "بیژن؛ گربه‌ای در خیابان",
  shortName: "بیژن",
  image: "/images/game-bijan.webp",
  tagline: "بازی آرکید نئونی دانش بوک",
  description:
    "بین درس خوندن یه نفس تازه کن: با بیژن از ترافیک شبانه فرار کن، ماهی بگیر و رکورد خودت رو جابهجا کن.",
  cta: "همین حالا بازی کن",
} as const;
