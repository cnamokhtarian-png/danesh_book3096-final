import type { ReactNode } from "react";
import styles from "./BookMarketAnimation.module.css";

function BookGlyph() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M7 10.5c6.1-2.5 12.1-1.5 17 2.1v26c-4.9-3.6-10.9-4.6-17-2.1v-26Z" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M41 10.5c-6.1-2.5-12.1-1.5-17 2.1v26c4.9-3.6 10.9-4.6 17-2.1v-26Z" fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M12 17c3.5-.8 6-.1 8.2 1.1M12 22c3.5-.8 6-.1 8.2 1.1M36 17c-3.5-.8-6-.1-8.2 1.1M36 22c-3.5-.8-6-.1-8.2 1.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function NoteGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.5 3.5h8l4 4v13h-12v-17Z" fill="currentColor" fillOpacity=".14" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14.5 3.8v4h3.8M9 12h7M9 15.5h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ChatGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4.4A2.5 2.5 0 0 1 4 13.5v-8Z" fill="currentColor" fillOpacity=".14" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 8h8M8 11.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ExchangeGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m7 7 3-3 3 3M10 4v7a4 4 0 0 0 4 4h3M17 17l-3 3-3-3m3 3v-7a4 4 0 0 0-4-4H7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExamGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 3 2.3 5.1 5.6.6-4.2 3.8 1.2 5.5-4.9-2.8-4.9 2.8 1.2-5.5-4.2-3.8 5.6-.6L12 3Z" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.3" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DownloadGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.5v11m0 0 4-4m-4 4-4-4M5 16v3.5h14V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12.5 4.3 4.2L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FeaturePill({
  className,
  children,
  icon,
}: {
  className: string;
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className={`${styles.featurePill} ${className}`} aria-hidden="true">
      <span className={styles.featureIcon}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}

/**
 * تصویرسازی تبلیغاتی برای Hero؛ بدون پکیج، فونت یا درخواست شبکه.
 * انیمیشن با CSS اجرا می‌شود و کامپوننت نیازی به hydration ندارد.
 */
export default function BookMarketAnimation() {
  return (
    <div
      className={styles.stage}
      role="img"
      aria-label="پیش‌نمایش متحرک دانش‌بوک: جست‌وجوی کتاب، جزوه و نمونه‌سؤال، خرید و فروش یا تبادل کتاب، گفت‌وگوی دانشجویی، منابع کنکور و دانلود فایل"
    >
      <div className={styles.scene} aria-hidden="true">
        <span className={`${styles.sparkle} ${styles.sparkleOne}`} />
        <span className={`${styles.sparkle} ${styles.sparkleTwo}`} />
        <span className={styles.orbit} />
        <span className={styles.orbitDot} />

        <div className={styles.appCard}>
          <div className={styles.appHeader}>
            <span className={styles.brandMark}><BookGlyph /></span>
            <span className={styles.brandText}><strong>دانش‌بوک</strong><small>بازار دانشجویی</small></span>
            <span className={styles.avatarMark}>د</span>
          </div>

          <div className={styles.searchBar}>
            <span>کتاب یا جزوه‌ات رو پیدا کن</span>
            <span className={styles.searchButton}><SearchGlyph /></span>
          </div>

          <div className={styles.categoryRow}>
            <span className={styles.activeCategory}>کتاب</span>
            <span>جزوه</span>
            <span>کنکور</span>
          </div>

          <div className={styles.listingCard}>
            <div className={styles.bookCover}>
              <span className={styles.coverOrb} />
              <span className={styles.coverBook}><BookGlyph /></span>
              <span className={styles.coverTitle}>منابع<br />دانشگاهی</span>
              <span className={styles.coverSpark}>✦</span>
            </div>
            <div className={styles.listingInfo}>
              <span className={styles.listingEyebrow}>آگهی دانشجویی</span>
              <strong>کتاب و منابع درسی</strong>
              <span className={styles.listingMeta}><i /> آمادهٔ پیدا شدن</span>
              <span className={styles.viewListing}>مشاهدهٔ آگهی <b>←</b></span>
            </div>
          </div>

          <div className={styles.fileRow}>
            <span className={styles.fileIcon}><DownloadGlyph /></span>
            <span className={styles.fileText}><strong>جزوه و نمونه‌سؤال</strong><small>دانلود مستقیم فایل‌های درسی</small></span>
            <span className={styles.fileCheck}><CheckGlyph /></span>
          </div>

          <div className={styles.cardFooter}>
            <span><i /> ویژهٔ دانشجوها</span>
            <span className={styles.footerSpark}>✦</span>
          </div>
        </div>

        <FeaturePill className={styles.notesPill} icon={<NoteGlyph />}>جزوه + نمونه‌سؤال</FeaturePill>
        <FeaturePill className={styles.chatPill} icon={<ChatGlyph />}>گفت‌وگوی مستقیم</FeaturePill>
        <FeaturePill className={styles.exchangePill} icon={<ExchangeGlyph />}>خرید، فروش، تبادل</FeaturePill>
        <FeaturePill className={styles.examPill} icon={<ExamGlyph />}>منابع کنکور</FeaturePill>

        <span className={styles.giftSticker}>هدیهٔ رایگان <b>✦</b></span>
      </div>
    </div>
  );
}
