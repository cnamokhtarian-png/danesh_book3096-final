"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Alert, Field } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { AVATAR_CHOICES, UNIVERSITIES } from "@/lib/constants";

export default function ProfileForm({
  initial,
}: {
  initial: {
    fullName: string;
    studentCode: string | null;
    university: string | null;
    major: string | null;
    bio: string | null;
    avatarEmoji: string;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );
  const [form, setForm] = useState({
    fullName: initial.fullName,
    studentCode: initial.studentCode ?? "",
    university: initial.university ?? "",
    major: initial.major ?? "",
    bio: initial.bio ?? "",
    avatarEmoji: initial.avatarEmoji,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setFeedback(null);

        const result = await apiFetch("/api/profile", { method: "PATCH", body: form });
        setPending(false);

        if (!result.ok) {
          setFeedback({ tone: "error", text: result.message });
          return;
        }
        setFeedback({ tone: "success", text: "پروفایل شما با موفقیت به‌روزرسانی شد." });
        router.refresh();
      }}
    >
      <div className="card-surface space-y-4 p-5">
        <Field label="آواتار">
          <div className="flex flex-wrap gap-2">
            {AVATAR_CHOICES.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => set("avatarEmoji", emoji)}
                className={`grid size-12 place-items-center rounded-2xl border text-2xl transition ${
                  form.avatarEmoji === emoji
                    ? "border-brand-500 bg-brand-50 shadow-sm"
                    : "border-ink-100 bg-white hover:border-brand-200"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Field>

        <Field label="نام و نام خانوادگی">
          <input
            value={form.fullName}
            onChange={(event) => set("fullName", event.target.value)}
            className="field-base"
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="شماره دانشجویی" hint="اختیاری">
            <input
              dir="ltr"
              value={form.studentCode}
              onChange={(event) => set("studentCode", event.target.value)}
              className="field-base text-left"
              inputMode="numeric"
            />
          </Field>
          <Field label="دانشگاه">
            <select
              value={form.university}
              onChange={(event) => set("university", event.target.value)}
              className="field-base"
            >
              <option value="">انتخاب کنید…</option>
              {UNIVERSITIES.map((university) => (
                <option key={university} value={university}>
                  {university}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="رشته تحصیلی" hint="اختیاری">
          <input
            value={form.major}
            onChange={(event) => set("major", event.target.value)}
            className="field-base"
            placeholder="مثلاً مهندسی برق"
          />
        </Field>

        <Field label="درباره من" hint="اختیاری">
          <textarea
            value={form.bio}
            onChange={(event) => set("bio", event.target.value)}
            rows={3}
            maxLength={400}
            className="field-base resize-none leading-7"
            placeholder="مثلاً دانشجوی ترم چهارم مهندسی کامپیوتر؛ علاقه‌مند به کتاب‌های الگوریتم."
          />
        </Field>
      </div>

      {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-brand-700 via-brand-600 to-brand-500 px-4 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-brand-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "در حال ذخیره…" : "ذخیره تغییرات"}
        {!pending && <Icon name="check" className="size-4.5" />}
      </button>
    </form>
  );
}
