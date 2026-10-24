"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

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
 */
export default function ShareButton({
  title,
  path = "/",
  variant = "card",
  description,
}: {
  title: string;
  path?: string;
  variant?: "card" | "inline" | "icon";
  description?: string;
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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absoluteUrl());
      setCopied(true);
    } catch {
      // مرورگر بدون دسترسی کلیپ‌بورد: انتخاب دستی به کاربر پیشنهاد می‌شود.
      window.prompt("لینک را کپی کنید:", absoluteUrl());
    }
  }

  async function share() {
    const url = absoluteUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: message, text: message, url });
        return;
      } catch {
        /* کاربر انصراف داد — سراغ کپی می‌رویم */
      }
    }
    await copyLink();
  }

  function openMessenger(base: string) {
    const url = absoluteUrl();
    const target = base.replace("{text}", encodeURIComponent(`${message}\n${url}`));
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
          <Icon name="send" className="size-4" />
          اشتراک‌گذاری
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
        <button type="button" onClick={copyLink} className={copyBtn}>
          <Icon name={copied ? "check" : "note"} className="size-4" />
          {copied ? "کپی شد" : "کپی لینک"}
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
          <Icon name="send" className="size-4" />
          اشتراک‌گذاری آگهی
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

        <button type="button" onClick={copyLink} className={`col-span-2 ${copyBtn}`}>
          <Icon name={copied ? "check" : "note"} className="size-4" />
          {copied ? "لینک کپی شد" : "کپی لینک"}
        </button>
      </div>
    </div>
  );
}
