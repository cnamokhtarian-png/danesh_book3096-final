import Link from "next/link";
import { redirect } from "next/navigation";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import { Icon } from "@/components/Icon";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "فراموشی رمز عبور | دانش‌بوک",
  description: "بازیابی رمز عبور حساب دانشجویی از طریق ایمیل ثبت‌شده.",
};

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="mx-auto grid max-w-5xl gap-6 py-4 lg:grid-cols-[0.95fr_1.05fr]">
      <aside className="relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-bl from-ink-900 via-brand-800 to-brand-600 p-8 text-white lg:block">
        <div className="aurora-blob -bottom-20 start-0 size-72 bg-accent-500" aria-hidden />
        <div className="relative flex h-full flex-col justify-between">
          <div>
            <span className="grid size-14 place-items-center rounded-3xl bg-white/15 backdrop-blur">
              <Icon name="lock" className="size-7" />
            </span>
            <h2 className="mt-6 text-2xl font-extrabold leading-relaxed">
              رمز عبورت را فراموش کرده‌ای؟
            </h2>
            <p className="mt-3 text-sm leading-8 text-brand-100">
              نگران نباش. ایمیل حسابت را وارد کن تا لینک تعیین رمز جدید برایت ارسال شود. لینک
              یک‌بارمصرف است و بعد از ۴۵ دقیقه منقضی می‌شود.
            </p>
          </div>
          <ul className="space-y-3 text-[13px] font-medium">
            {[
              "لینک امن و یک‌بارمصرف",
              "خروج خودکار از دستگاه‌های دیگر",
              "رمز فعلی تا تعیین رمز جدید تغییر نمی‌کند",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/20">
                  <Icon name="check" className="size-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="card-surface p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">بازیابی رمز عبور</h1>
        <p className="mt-2 mb-6 text-sm leading-7 text-ink-400">
          ایمیل حساب خود را وارد کنید؛ اگر این ایمیل در دانش‌بوک ثبت شده باشد، لینک بازیابی برایتان
          ارسال می‌شود.
        </p>
        <ForgotPasswordForm />

        <p className="mt-6 text-center text-[11.5px] leading-6 text-ink-400">
          اگر به ایمیل خود دسترسی ندارید، از{" "}
          <Link href="/support" className="font-bold text-brand-600 hover:text-brand-700">
            فرم پشتیبانی
          </Link>{" "}
          با مدیر سایت در تماس باشید.
        </p>
      </section>
    </div>
  );
}
