import { Icon } from "@/components/Icon";
import { faNumber } from "@/lib/constants";
import { humanSize, type BookFileMeta } from "@/lib/files";

/**
 * کارت فایل آگهی‌های دیجیتال.
 *
 * فایل آپلودی از مسیر `/api/files/[id]` استریم می‌شود؛ «لینک منبع» هم همان
 * مسیر را رد می‌کند و به منبع اصلی هدایت می‌شود. بنابراین یک دکمه برای هر دو
 * حالت کافی است و شمارش دانلود هم یک‌جا انجام می‌شود.
 */
export default function FileCard({ file }: { file: BookFileMeta }) {
  const isLink = file.storage === "link";
  // فایل‌های نمونه‌ی خود سایت (مسیر نسبی مثل /samples/x.pdf) مستقیم لینک
  // می‌شوند تا بدون عبور از API و سریع‌تر دانلود شوند.
  const isLocalSample = Boolean(file.externalUrl?.startsWith("/"));
  const href = isLocalSample ? (file.externalUrl as string) : `/api/files/${file.id}`;

  return (
    <div className="card-surface p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink-900">
        <Icon name="note" className="size-4.5 text-brand-600" />
        فایل این آگهی
      </h3>

      <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50/60 px-3.5 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-sm">
          <Icon name={isLink ? "send" : "note"} className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-bold text-ink-900" dir="auto">
            {file.fileName}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-400">
            {file.sizeBytes > 0 ? humanSize(file.sizeBytes) : "لینک منبع خارجی"}
            {file.downloadCount > 0 && ` · ${faNumber(file.downloadCount)} دانلود`}
          </p>
        </div>
      </div>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 px-4 py-3 text-[13px] font-extrabold text-white shadow-lg shadow-brand-500/25 transition hover:brightness-105"
      >
        <Icon name={isLink ? "send" : "note"} className="size-4" />
        {isLink && !isLocalSample ? "مشاهده‌ی فایل در منبع" : "دانلود فایل"}
      </a>

      <p className="mt-3 text-[11px] leading-6 text-ink-400">
        {isLocalSample
          ? "این فایل رایگان است و مستقیماً از دانش‌بوک دانلود می‌شود."
          : isLink
            ? "این فایل روی سایت دیگری میزبانی می‌شود و لینکش توسط صاحب آگهی ثبت شده است."
            : "فایل مستقیماً از دانش‌بوک دانلود می‌شود."}{" "}
        پیش از هر پرداخت، فایل یا نمونه‌ی آن را بررسی کنید.
      </p>
    </div>
  );
}
