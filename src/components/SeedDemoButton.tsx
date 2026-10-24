"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { apiFetch } from "@/lib/api-client";
import { faNumber } from "@/lib/constants";

type SeedResult = {
  usersCreated: number;
  usersExisting: number;
  booksCreated: number;
  filesAttached: number;
};

/**
 * دکمه‌ی «پر کردن سایت با محتوای نمونه» در پنل مدیریت.
 *
 * اجرای دوباره بی‌خطر است (idempotent) و نتیجه‌ی هر بار را نشان می‌دهد.
 */
export default function SeedDemoButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [error, setError] = useState("");

  return (
    <div className="card-surface p-5">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink-900">
        <span className="grid size-8 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Icon name="sparkles" className="size-4" />
        </span>
        محتوای نمونه
      </h3>
      <p className="mt-2 text-[12.5px] leading-7 text-ink-500">
        چند دانشجوی نمونه و چند آگهی واقعیِ فایل (با لینک به منابع آزاد و رایگان مثل
        MIT OpenCourseWare و OpenStax) می‌سازد تا بازار در روزهای اول خالی به‌نظر
        نرسد. اجرای دوباره داده‌ی تکراری نمی‌سازد.
      </p>

      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          const response = await apiFetch<{ result: SeedResult }>("/api/admin/seed-demo", {
            method: "POST",
          });
          setPending(false);
          if (!response.ok) {
            setError(response.message);
            return;
          }
          setResult(response.data.result);
          router.refresh();
        }}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 px-4 py-3 text-[13px] font-extrabold text-white shadow-lg shadow-brand-500/25 transition hover:brightness-105 disabled:opacity-60"
      >
        <Icon name="plus" className="size-4" />
        {pending ? "در حال ساخت…" : "افزودن آگهی‌ها و کاربران نمونه"}
      </button>

      {error && (
        <p className="mt-3 rounded-2xl bg-rose-50 px-3.5 py-2.5 text-[12px] font-bold text-rose-700">
          {error}
        </p>
      )}

      {result && (
        <p className="mt-3 rounded-2xl bg-emerald-50 px-3.5 py-2.5 text-[12px] font-bold leading-6 text-emerald-700">
          {result.usersCreated + result.booksCreated === 0
            ? "محتوای نمونه از قبل کامل است؛ چیزی اضافه نشد."
            : `${faNumber(result.usersCreated)} کاربر و ${faNumber(result.booksCreated)} آگهی ساخته شد (${faNumber(result.filesAttached)} فایل وصل شد).`}
        </p>
      )}
    </div>
  );
}
