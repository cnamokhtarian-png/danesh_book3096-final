"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Alert, Field } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { MANAGEMENT_EMAIL } from "@/lib/constants";

const SUBJECTS = [
  "پیشنهاد بخش یا قابلیت جدید",
  "انتقاد به طراحی سایت",
  "گزارش مشکل فنی",
  "پشتیبانی حساب کاربری",
  "سایر موارد",
];

export default function SuggestionForm({ defaultName = "" }: { defaultName?: string }) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    fullName: defaultName,
    contact: "",
    subject: SUBJECTS[0],
    message: "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="card-surface space-y-5 p-6"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setFeedback(null);

        const result = await apiFetch("/api/suggestions", { method: "POST", body: form });
        setPending(false);

        if (!result.ok) {
          setFeedback({ tone: "error", text: result.message });
          return;
        }
        setFeedback({
          tone: "success",
          text: `پیام شما با موفقیت ثبت شد و در پنل مدیریت بررسی می‌شود. پاسخ به ${MANAGEMENT_EMAIL} ارسال خواهد شد.`,
        });
        setForm((prev) => ({ ...prev, subject: SUBJECTS[0], message: "" }));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="نام و نام خانوادگی">
          <div className="relative">
            <Icon
              name="user"
              className="pointer-events-none absolute inset-y-0 right-3.5 my-auto size-4.5 text-ink-400"
            />
            <input
              value={form.fullName}
              onChange={(event) => set("fullName", event.target.value)}
              className="field-base pr-11"
              placeholder="نام شما"
              required
            />
          </div>
        </Field>

        <Field label="ایمیل یا شماره تماس" hint="برای پاسخ‌گویی">
          <div className="relative">
            <Icon
              name={form.contact.includes("@") ? "mail" : "phone"}
              className="pointer-events-none absolute inset-y-0 right-3.5 my-auto size-4.5 text-ink-400"
            />
            <input
              dir="ltr"
              value={form.contact}
              onChange={(event) => set("contact", event.target.value)}
              className="field-base pr-11 text-left"
              placeholder="you@example.com"
              required
            />
          </div>
        </Field>
      </div>

      <Field label="موضوع">
        <div className="grid gap-2 sm:grid-cols-2">
          {SUBJECTS.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => set("subject", subject)}
              className={`rounded-2xl border px-3.5 py-2.5 text-right text-[12.5px] font-bold transition ${
                form.subject === subject
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-ink-100 bg-white text-ink-500 hover:border-brand-200"
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      </Field>

      <Field label="متن پیشنهاد / انتقاد" hint={`${form.message.length}/2000`}>
        <textarea
          value={form.message}
          onChange={(event) => set("message", event.target.value.slice(0, 2000))}
          rows={5}
          className="field-base resize-none leading-8"
          placeholder="نظر خود را با جزئیات بنویسید؛ هرچه دقیق‌تر باشد، سریع‌تر رسیدگی می‌شود."
          required
        />
      </Field>

      {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-brand-700 via-brand-600 to-brand-500 px-4 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-brand-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "در حال ارسال…" : "ارسال به مدیریت"}
        {!pending && <Icon name="send" className="size-4.5" />}
      </button>
    </form>
  );
}
