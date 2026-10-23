"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Alert, Field } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";

const KIND_OPTIONS = [
  { value: "exchange", label: "تبادل با کتاب من" },
  { value: "buy", label: "خرید" },
  { value: "borrow", label: "امانت‌گیری" },
];

const WANTED_OPTIONS = [
  { value: "exchange", label: "آماده تبادل هستم" },
  { value: "sell", label: "می‌فروشم" },
  { value: "borrow", label: "امانت می‌دهم" },
];

export default function RequestForm({
  bookId,
  isLoggedIn,
  isOwner,
  bookTitle,
  offerType = "exchange",
}: {
  bookId: number;
  isLoggedIn: boolean;
  isOwner: boolean;
  bookTitle: string;
  offerType?: string;
}) {
  const isWanted = offerType === "request";
  const [kind, setKind] = useState("exchange");
  const options = isWanted ? WANTED_OPTIONS : KIND_OPTIONS;
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(
    null,
  );

  if (!isLoggedIn) {
    return (
      <div className="card-surface space-y-3 p-5 text-center">
        <p className="text-sm leading-7 text-ink-600">
          برای ارسال درخواست تبادل، ابتدا وارد حساب دانشجویی خود شوید.
        </p>
        <a
          href={`/login?next=/books/${bookId}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25"
        >
          <Icon name="login" className="size-4.5" />
          ورود / ثبت‌نام
        </a>
      </div>
    );
  }

  if (isOwner) {
    return (
      <div className="card-surface p-5 text-center">
        <p className="text-sm leading-7 text-ink-600">
          این آگهی متعلق به شماست. می‌توانید وضعیت آن را از داشبورد تغییر دهید.
        </p>
      </div>
    );
  }

  return (
    <form
      className="card-surface space-y-4 p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setFeedback(null);

        const result = await apiFetch<{ message?: string }>("/api/requests", {
          method: "POST",
          body: { bookId, kind, message },
        });

        setPending(false);
        if (result.ok) {
          setFeedback({
            tone: "success",
            text: "درخواست شما ثبت شد و به صاحب آگهی اطلاع داده شد.",
          });
          setMessage("");
        } else {
          setFeedback({ tone: "error", text: result.message });
        }
      }}
    >
      <h3 className="flex items-center gap-2 text-base font-extrabold text-ink-900">
        <Icon name="send" className="size-5 text-brand-600" />
        ارسال درخواست برای «{bookTitle}»
      </h3>

      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setKind(option.value)}
            className={`rounded-2xl border px-3 py-2.5 text-[12.5px] font-bold transition ${
              kind === option.value
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-ink-100 bg-white text-ink-600 hover:border-brand-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Field label="پیام شما" hint="اختیاری">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          maxLength={600}
          placeholder={
            isWanted
              ? "مثلاً: این کتاب را دارم و آماده‌ام واگذار یا تبادل کنم."
              : "مثلاً: من جزوه ریاضی ۲ نیم‌سال گذشته را دارم، علاقه‌مندم با این کتاب تبادل کنم."
          }
          className="field-base resize-none leading-7"
        />
      </Field>

      {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-brand-700 via-brand-600 to-brand-500 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "در حال ارسال…" : isWanted ? "ارسال پاسخ به درخواست" : "ثبت درخواست"}
        {!pending && <Icon name="send" className="size-4" />}
      </button>
    </form>
  );
}
