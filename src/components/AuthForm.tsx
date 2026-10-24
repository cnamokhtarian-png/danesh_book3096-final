"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Alert, Field } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { UNIVERSITIES } from "@/lib/constants";

type Mode = "login" | "register";

export default function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    studentCode: "",
    university: "",
    major: "",
  });

  const update = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const isRegister = mode === "register";

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setPending(true);

        const payload = isRegister
          ? {
              fullName: form.fullName,
              email: form.email,
              password: form.password,
              studentCode: form.studentCode,
              university: form.university,
              major: form.major,
            }
          : { email: form.email, password: form.password };

        const result = await apiFetch(`/api/auth/${mode}`, { method: "POST", body: payload });

        if (!result.ok) {
          setPending(false);
          setError(result.message);
          return;
        }

        // refresh the server components so the sidebar shows the signed-in user
        router.refresh();
        router.push(next && next.startsWith("/") ? next : "/dashboard");
      }}
    >
      {isRegister && (
        <Field label="نام و نام خانوادگی">
          <div className="relative">
            <Icon
              name="user"
              className="pointer-events-none absolute inset-y-0 right-3.5 my-auto size-4.5 text-ink-400"
            />
            <input
              value={form.fullName}
              onChange={update("fullName")}
              className="field-base pr-11"
              placeholder="مثلاً سارا محمدی"
              autoComplete="name"
              required
            />
          </div>
        </Field>
      )}

      <Field label="ایمیل دانشگاهی">
        <div className="relative">
          <Icon
            name="mail"
            className="pointer-events-none absolute inset-y-0 right-3.5 my-auto size-4.5 text-ink-400"
          />
          <input
            type="email"
            dir="ltr"
            value={form.email}
            onChange={update("email")}
            className="field-base pr-11 text-left"
            placeholder="student@university.ac.ir"
            autoComplete="email"
            required
          />
        </div>
      </Field>

      <Field label="رمز عبور" hint={isRegister ? "حداقل ۸ کاراکتر" : undefined}>
        <div className="relative">
          <Icon
            name="lock"
            className="pointer-events-none absolute inset-y-0 right-3.5 my-auto size-4.5 text-ink-400"
          />
          <input
            type="password"
            dir="ltr"
            value={form.password}
            onChange={update("password")}
            className="field-base pr-11 text-left"
            placeholder="••••••••"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
          />
        </div>
      </Field>

      {isRegister && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="شماره دانشجویی" hint="اختیاری">
            <div className="relative">
              <Icon
                name="id"
                className="pointer-events-none absolute inset-y-0 right-3.5 my-auto size-4.5 text-ink-400"
              />
              <input
                dir="ltr"
                value={form.studentCode}
                onChange={update("studentCode")}
                className="field-base pr-11 text-left"
                placeholder="۴۰۱۲۳۴۵۶۷"
                inputMode="numeric"
              />
            </div>
          </Field>

          <Field label="دانشگاه">
            <select value={form.university} onChange={update("university")} className="field-base">
              <option value="">انتخاب کنید…</option>
              {UNIVERSITIES.map((university) => (
                <option key={university} value={university}>
                  {university}
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="رشته تحصیلی" hint="اختیاری">
              <input
                value={form.major}
                onChange={update("major")}
                className="field-base"
                placeholder="مثلاً مهندسی کامپیوتر"
              />
            </Field>
          </div>
        </div>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-brand-700 via-brand-600 to-brand-500 px-4 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-brand-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "لطفاً صبر کنید…" : isRegister ? "ساخت حساب دانشجویی" : "ورود به دانش‌بوک"}
        {!pending && <Icon name={isRegister ? "sparkles" : "login"} className="size-4.5" />}
      </button>

      <p className="pt-1 text-center text-[13px] text-ink-400">
        {isRegister ? "قبلاً ثبت‌نام کرده‌اید؟ " : "حساب ندارید؟ "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-bold text-brand-600 hover:text-brand-700"
        >
          {isRegister ? "وارد شوید" : "ثبت‌نام رایگان"}
        </Link>
      </p>
    </form>
  );
}
