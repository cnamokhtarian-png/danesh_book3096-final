"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * فیلد رمز عبور با دکمه «نمایش/پنهان‌سازی».
 *
 * چرا کامپوننت جدا؟ تا در هر جای سایت که رمز عبور گرفته می‌شود (ورود، ثبت‌نام،
 * تغییر رمز در آینده) یک رفتار و یک ظاهر داشته باشیم و آیکن چشم دوباره‌نویسی نشود.
 *
 * نکات دسترس‌پذیری و امنیتی:
 * - دکمه `type="button"` است تا هرگز فرم را ارسال نکند.
 * - `aria-pressed` و `aria-label` وضعیت را برای صفحه‌خوان اعلام می‌کند.
 * - مقدار فیلد در هر دو حالت یکی است؛ فقط `type` بین password و text عوض می‌شود
 *   تا مدیر رمز عبور مرورگر رفتار عادی خودش را داشته باشد.
 */
export default function PasswordInput({
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete,
  required = false,
  disabled = false,
  id,
  name,
  className = "",
  showLockIcon = true,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  showLockIcon?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور";

  return (
    <div className="relative">
      {showLockIcon && (
        <Icon
          name="lock"
          className="pointer-events-none absolute inset-y-0 right-3.5 my-auto size-4.5 text-ink-400"
        />
      )}

      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        dir="ltr"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`field-base text-left ${showLockIcon ? "pr-11" : ""} pl-11 ${className}`}
        placeholder={placeholder}
        autoComplete={autoComplete}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        required={required}
        disabled={disabled}
      />

      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={toggleLabel}
        aria-pressed={visible}
        title={toggleLabel}
        disabled={disabled}
        // در RTL دکمه سمت چپِ فیلد می‌نشیند و با تب هم قابل دسترسی است.
        className="absolute inset-y-0 left-1.5 my-auto grid size-9 place-items-center rounded-xl text-ink-400 transition hover:bg-ink-50 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-400/70 focus-visible:outline-none disabled:opacity-50"
        tabIndex={0}
      >
        <Icon name={visible ? "eyeOff" : "eye"} className="size-4.5" />
      </button>
    </div>
  );
}
