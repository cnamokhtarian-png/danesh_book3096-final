"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import PasswordInput from "@/components/PasswordInput";
import { Alert, Field } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <Icon name="check" className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <p className="text-[13px] leading-7 text-emerald-900">
            رمز عبور شما با موفقیت تغییر کرد. برای امنیت بیشتر، از همه دستگاه‌های دیگر خارج شدید.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 px-4 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-brand-500/25"
        >
          <Icon name="login" className="size-4" />
          ورود با رمز جدید
        </button>
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

        if (password.length < 8) {
          setError("رمز عبور باید حداقل ۸ کاراکتر باشد.");
          return;
        }
        if (password !== confirm) {
          setError("رمز عبور و تکرار آن یکسان نیست.");
          return;
        }

        setPending(true);
        const result = await apiFetch("/api/auth/reset-password", {
          method: "POST",
          body: { token, password },
        });
        setPending(false);

        if (!result.ok) {
          setError(result.message);
          return;
        }
        setDone(true);
      }}
    >
      <Field label="رمز عبور جدید" hint="حداقل ۸ کاراکتر">
        <PasswordInput
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
        />
      </Field>

      <Field label="تکرار رمز عبور جدید">
        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          showLockIcon={false}
          required
        />
      </Field>

      {error && <Alert tone="error">{error}</Alert>}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-brand-700 via-brand-600 to-brand-500 px-4 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-brand-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "در حال ذخیره…" : "تعیین رمز عبور جدید"}
        {!pending && <Icon name="lock" className="size-4.5" />}
      </button>

      <p className="text-center text-[12.5px] text-ink-400">
        <Link href="/login" className="font-bold text-brand-600 hover:text-brand-700">
          بازگشت به صفحه ورود
        </Link>
      </p>
    </form>
  );
}
