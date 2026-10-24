"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Alert, Badge } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { formatDate, suggestionStatusMeta, timeAgo } from "@/lib/constants";
import type { SuggestionRow } from "@/lib/queries";

const STATUS_OPTIONS = [
  { value: "new", label: "جدید" },
  { value: "reviewing", label: "در حال بررسی" },
  { value: "resolved", label: "رسیدگی شد" },
];

const TONE: Record<string, "amber" | "brand" | "emerald"> = {
  new: "amber",
  reviewing: "brand",
  resolved: "emerald",
};

function SuggestionCard({ item }: { item: SuggestionRow }) {
  const router = useRouter();
  const [status, setStatus] = useState(item.status);
  const [note, setNote] = useState(item.adminNote ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const save = async (nextStatus: string) => {
    setPending(true);
    setError("");
    setSaved(false);
    const result = await apiFetch(`/api/suggestions/${item.id}`, {
      method: "PATCH",
      body: { status: nextStatus, adminNote: note },
    });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStatus(nextStatus);
    setSaved(true);
    router.refresh();
  };

  const remove = async () => {
    if (!window.confirm("این پیام حذف شود؟")) return;
    setPending(true);
    const result = await apiFetch(`/api/suggestions/${item.id}`, { method: "DELETE" });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  };

  const meta = suggestionStatusMeta(status);

  return (
    <article className="card-surface space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TONE[status] ?? "slate"}>{meta.label}</Badge>
            <span className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-bold text-ink-600">
              {item.subject}
            </span>
          </div>
          <h3 className="mt-2 text-[15px] font-extrabold text-ink-900">{item.fullName}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-[11.5px] text-ink-400">
            <a
              href={item.contact.includes("@") ? `mailto:${item.contact}` : `tel:${item.contact}`}
              dir="ltr"
              className="flex items-center gap-1 font-bold text-brand-600 hover:text-brand-700"
            >
              <Icon name={item.contact.includes("@") ? "mail" : "phone"} className="size-3.5" />
              {item.contact}
            </a>
            <span className="flex items-center gap-1">
              <Icon name="clock" className="size-3.5" />
              {timeAgo(item.createdAt)} · {formatDate(item.createdAt)}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="grid size-9 place-items-center rounded-xl text-ink-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
          title="حذف پیام"
          aria-label="حذف پیام"
        >
          <Icon name="trash" className="size-4" />
        </button>
      </div>

      <p className="rounded-2xl bg-ink-50/70 px-4 py-3 text-[13px] leading-8 whitespace-pre-line text-ink-600">
        {item.message}
      </p>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold text-ink-800">یادداشت مدیر</span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="یادداشت داخلی برای پیگیری…"
            className="field-base"
            maxLength={600}
          />
        </label>

        <div className="flex items-center gap-1.5">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={pending}
              onClick={() => save(option.value)}
              className={`rounded-xl border px-3 py-2 text-[11.5px] font-bold transition disabled:opacity-50 ${
                status === option.value
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-ink-100 bg-white text-ink-500 hover:border-brand-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="success">وضعیت پیام ذخیره شد.</Alert>}
    </article>
  );
}

export default function SuggestionManager({ items }: { items: SuggestionRow[] }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? items : items.filter((item) => item.status === filter);
  const counts = {
    all: items.length,
    new: items.filter((i) => i.status === "new").length,
    reviewing: items.filter((i) => i.status === "reviewing").length,
    resolved: items.filter((i) => i.status === "resolved").length,
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-ink-900">
          <span className="grid size-10 place-items-center rounded-2xl bg-ink-900 text-white">
            <Icon name="inbox" className="size-5" />
          </span>
          مدیریت پیشنهادات و پیام‌های پشتیبانی
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: "all", label: `همه (${counts.all})` },
            { value: "new", label: `جدید (${counts.new})` },
            { value: "reviewing", label: `در بررسی (${counts.reviewing})` },
            { value: "resolved", label: `رسیدگی‌شده (${counts.resolved})` },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`rounded-2xl border px-3.5 py-2 text-[12px] font-bold transition ${
                filter === tab.value
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-100 bg-white text-ink-600 hover:border-brand-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <SuggestionCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="card-surface px-6 py-14 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-ink-50 text-ink-400">
            <Icon name="inbox" className="size-7" />
          </span>
          <h3 className="mt-3 text-base font-bold text-ink-900">پیامی در این دسته نیست</h3>
          <p className="mt-2 text-[13px] text-ink-400">
            پیام‌های ارسالی کاربران از فرم «پیشنهادات و پشتیبانی» اینجا نمایش داده می‌شود.
          </p>
        </div>
      )}
    </section>
  );
}
