import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "ثبت‌نام | دانش‌بوک" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="mx-auto grid max-w-5xl gap-6 py-4 lg:grid-cols-[0.85fr_1.15fr]">
      <aside className="relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-bl from-ink-900 via-brand-800 to-brand-600 p-8 text-white lg:block">
        <div className="aurora-blob -bottom-20 start-0 size-72 bg-accent-500" aria-hidden />
        <div className="relative flex h-full flex-col justify-between">
          <div>
            <Badge tone="amber">
              <Icon name="flame" className="size-3.5" /> ۲۰ امتیاز هدیه ثبت‌نام
            </Badge>
            <h2 className="mt-5 text-2xl font-extrabold leading-relaxed">
              به بزرگ‌ترین بازار کتاب دانشجویی بپیوند
            </h2>
            <p className="mt-3 text-sm leading-8 text-brand-100">
              در چند ثانیه حساب بساز، کتاب‌های درسی‌ات را ثبت کن و با دانشجویان دانشگاه خودت
              تبادل کن.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { icon: "books" as const, label: "کتاب درسی" },
              { icon: "note" as const, label: "جزوه و نمونه سوال" },
              { icon: "exchange" as const, label: "تبادل امن" },
              { icon: "coin" as const, label: "امتیاز کارما" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                <Icon name={item.icon} className="mx-auto size-5" />
                <p className="mt-1.5 text-[12px] font-bold">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="card-surface p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">ساخت حساب دانشجویی</h1>
        <p className="mt-2 mb-6 text-sm leading-7 text-ink-400">
          اطلاعات زیر را کامل کنید؛ همه‌چیز رایگان است.
        </p>
        <AuthForm mode="register" />
      </section>
    </div>
  );
}
