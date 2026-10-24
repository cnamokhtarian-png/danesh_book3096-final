"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Alert, Field } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";

type Result = { message?: string; devResetLink?: string };

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Result | null>(null);

  if (done) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <Icon name="check" className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <p className="text-[13px] leading-7 text-emerald-900">{done.message}</p>
        </div>

        {done.devResetLink && (
          <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4">
            <p className="text-[11.5px] leading-6 font-bold text-amber-900">
              سرویس ایمیل هنوز تنظیم نشده است (محیط توسعه). از این لینک برای تعیین رمز جدید استفاده کنید:
            </p>
            <Link
              href={done.devResetLink}
              dir="ltr"
              className="mt-2 block truncate rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-brand-700"
            >
              {done.devResetLink}
            </Link>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 px-4 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-brand-500/25"
          >
            <Icon name="login" className="size-4" />
            بازگشت به صفحه ورود
          </Link>
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setEmail("");
            }}
            className="text-[12.5px] font-bold text-ink-500 transition hover:text-brand-700"
          >
            ارسال برای ایمیل دیگر
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setPending(true);
        const result = await apiFetch<Result>("/api/auth/forgot-password", {
          method: "POST",
          body: { email },
        });
        setPending(false);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setDone((result.data as Result) ?? { message: "درخواست ثبت شد." });
      }}
    >
      <Field label="ایمیل حساب" hint="همان ایمیلی که با آن ثبت‌نام کرده‌اید">
        <div className="relative">
          <Icon
            name="mail"
            className="pointer-events-none absolute inset-y-0 right-3.5 my-auto size-4.5 text-ink-400"
          />
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field-base pr-11 text-left"
            placeholder="student@university.ac.ir"
            autoComplete="email"
            required
          />
        </div>
      </Field>

      {error && <Alert tone="error">{error}</Alert>}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-brand-700 via-brand-600 to-brand-500 px-4 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-brand-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "در حال ارسال…" : "ارسال لینک بازیابی"}
        {!pending && <Icon name="send" className="size-4.5" />}
      </button>

      <p className="text-center text-[12.5px] text-ink-400">
        رمزتان را به یاد آوردید؟{" "}
        <Link href="/login" className="font-bold text-brand-600 hover:text-brand-700">
          ورود به حساب
        </Link>
      </p>
    </form>
  );
}
