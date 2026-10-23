import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <div className="card-surface mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-3xl bg-brand-50 text-brand-500">
        <Icon name="search" className="size-8" />
      </span>
      <h1 className="text-xl font-extrabold text-ink-900">این صفحه پیدا نشد</h1>
      <p className="max-w-sm text-[13.5px] leading-8 text-ink-400">
        ممکن است آگهی حذف شده باشد یا نشانی را اشتباه وارد کرده‌اید.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/books"
          className="rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25"
        >
          مرور کتاب‌ها
        </Link>
        <Link
          href="/"
          className="rounded-2xl border border-ink-100 bg-white px-5 py-2.5 text-sm font-bold text-ink-800 transition hover:border-brand-200 hover:text-brand-700"
        >
          صفحه اصلی
        </Link>
      </div>
    </div>
  );
}
