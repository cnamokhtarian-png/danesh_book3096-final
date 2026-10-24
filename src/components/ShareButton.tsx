"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { formatPrice } from "@/lib/constants";

/**
 * اشتراک‌گذاری — مهم‌ترین اهرم رشد دهان‌به‌دهان.
 *
 * هر آگهی یک آدرس یکتا با کارت Open Graph دارد، پس فرستادن لینک هم به
 * صاحب آگهی کمک می‌کند و هم بازدیدکننده واقعی می‌آورد.
 *
 * آدرس کامل عمداً فقط هنگام کلیک ساخته می‌شود (نه در رندر) تا خروجی سرور و
 * کلاینت یکی بماند و hydration به‌هم نریزد.
 *
 * variant:
 *  - "card"    → کارت کامل برای صفحه‌ی آگهی
 *  - "inline"  → ردیف فشرده برای معرفی سایت (خانه/داشبورد)
 *  - "icon"    → فقط آیکون، برای کنار دکمه‌های دیگر
 *
 * kind:
 *  - "ad"  → متن تبلیغاتی آگهی (عنوان، قیمت، دانشگاه + لینک)
 *  - "site"→ معرفی کل سایت (۲۰ کارما ثبت‌نام، تبادل کتاب، فایل PDF/پاورپوینت رایگان)
 */
export default function ShareButton({
  title,
  path = "/",
  variant = "card",
  description,
  kind = "ad",
  price,
  university,
}: {
  title: string;
  path?: string;
  variant?: "card" | "inline" | "icon";
  description?: string;
  kind?: "ad" | "site";
  price?: number | null;
  university?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const message = `${title} — در دانش‌بوک`;

  function absoluteUrl() {
    return new URL(path, window.location.origin).toString();
  }

  const url = absoluteUrl();

  const priceText =
    price != null && price > 0 ? formatPrice(price, "sell") : "رایگان";
  const universityText = university || "ثبت نشده";

  /** متن تبلیغاتی آگهی: عنوان، قیمت، دانشگاه و لینک. */
  const adText = `${title}\nقیمت: ${priceText}\nدانشگاه: ${universityText}\n${url}`;

  /** معرفی کل سایت: کارما ثبت‌نام، تبادل کتاب، فایل رایگان PDF و پاورپوینت. */
  const siteText = `دانش‌بوک — تبادل کتاب و دانلود رایگان جزوه و پاورپوینت\nثبت‌نام کنید و ۲۰ کارما هدیه بگیرید، کتاب و جزوه تبادل کنید و فایل‌های PDF و پاورپوینت رایگان دانلود کنید.\n${url}`;

  /** متن نهایی که همراه با لینک کپی/ارسال می‌شود. */
  const shareText = kind === "site" ? siteText : adText;

  async function copyText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    } catch {
      // مرورگر بدون دسترسی کلیپ‌بورد: انتخاب دستی به کاربر پیشنهاد می‌شود.
      window.prompt("متن و لینک را کپی کنید:", shareText);
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: message, text: shareText, url });
        return;
      } catch {
        /* کاربر انصراف داد — سراغ کپی می‌رویم */
      }
    }
    await copyText();
  }

  function openMessenger(base: string) {
    const target = base.replace("{text}", encodeURIComponent(shareText));
    window.open(target, "_blank", "noopener,noreferrer");
  }

  const outlineBtn =
    "inline-flex items-center justify-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-[13px] font-bold text-ink-800 transition hover:border-brand-200 hover:text-brand-700";

  const primaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 px-4 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-brand-500/25 transition hover:brightness-105";

  const copyBtn =
    "inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-100 bg-ink-50/60 px-4 py-2.5 text-[13px] font-bold text-ink-600 transition hover:border-brand-200 hover:text-brand-700";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={share}
        title="اشتراک‌گذاری"
        aria-label="اشتراک‌گذاری"
        className="grid size-8 place-items-center rounded-xl text-ink-400 transition hover:bg-brand-50 hover:text-brand-700"
      >
        <Icon name={copied ? "check" : "send"} className="size-4" />
      </button>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={share} className={primaryBtn}>
          <Icon name="send" className="size-4" /> اشتراک‌گذاری
        </button>
        <button
          type="button"
          onClick={() => openMessenger("https://t.me/share/url?url={text}")}
          className={outlineBtn}
        >
          تلگرام
        </button>
        <button
          type="button"
          onClick={() => openMessenger("https://wa.me/?text={text}")}
          className={outlineBtn}
        >
          واتساپ
        </button>
        <button type="button" onClick={copyText} className={copyBtn}>
          <Icon name={copied ? "check" : "note"} className="size-4" />
          {copied ? "متن و لینک کپی شد" : "کپی لینک"}
        </button>
      </div>
    );
  }

  return (
    <div className="card-surface p-5">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-extrabold text-ink-900">
        <Icon name="send" className="size-4.5 text-brand-600" />
        برای دوستت بفرست
      </h3>
      <p className="mb-4 text-[12px] leading-6 text-ink-400">
        {description ??
          "اگر این آگهی به کار کسی می‌آید، لینکش را در گروه کلاسی یا کانال دانشگاهی بفرست. هر بازدید تازه شانس دیده‌شدن این آگهی را بیشتر می‌کند."}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={share} className={`col-span-2 ${primaryBtn}`}>
          <Icon name="send" className="size-4" /> اشتراک‌گذاری آگهی
        </button>

        <button
          type="button"
          onClick={() => openMessenger("https://t.me/share/url?url={text}")}
          className={outlineBtn}
        >
          تلگرام
        </button>

        <button
          type="button"
          onClick={() => openMessenger("https://wa.me/?text={text}")}
          className={outlineBtn}
        >
          واتساپ
        </button>

        <button type="button" onClick={copyText} className={`col-span-2 ${copyBtn}`}>
          <Icon name={copied ? "check" : "note"} className="size-4" />
          {copied ? "متن و لینک کپی شد" : "کپی لینک"}
        </button>
      </div>
    </div>
  );
}
