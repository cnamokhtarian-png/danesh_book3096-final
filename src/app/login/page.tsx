import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { Icon } from "@/components/Icon";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "ورود | دانش‌بوک" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const params = await searchParams;
  const nextParam = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 py-4 lg:grid-cols-[0.95fr_1.05fr]">
      <aside className="relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-bl from-brand-700 via-brand-600 to-accent-500 p-8 text-white lg:block">
        <div className="aurora-blob -top-16 -start-10 size-64 bg-accent-400" aria-hidden />
        <div className="relative flex h-full flex-col justify-between">
          <div>
            <span className="grid size-14 place-items-center rounded-3xl bg-white/15 backdrop-blur">
              <Icon name="grad" className="size-7" />
            </span>
            <h2 className="mt-6 text-2xl font-extrabold leading-relaxed">
              خوش برگشتی به دانش‌بوک
            </h2>
            <p className="mt-3 text-sm leading-8 text-brand-100">
              کتاب‌ها و جزوه‌های منتشرشده‌ات، درخواست‌های تبادل دریافتی و امتیاز کارمایت همه در
              داشبورد در انتظار تو هستند.
            </p>
          </div>
          <ul className="space-y-3 text-[13px] font-medium">
            {[
              "مدیریت ساده آگهی‌های کتاب و جزوه",
              "پاسخ سریع به درخواست‌های تبادل",
              "امتیاز کارما با هر مبادله موفق",
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
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">ورود به حساب</h1>
        <p className="mt-2 mb-6 text-sm leading-7 text-ink-400">
          ایمیل و رمز عبور خود را وارد کنید.
        </p>
        <AuthForm mode="login" next={nextParam} />

        <div className="mt-6 rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 px-4 py-3.5 text-[12.5px] leading-7 text-brand-800">
          <span className="font-extrabold">حساب نمونه برای تست سریع:</span>
          <span dir="ltr" className="mx-1 font-bold">
            sara@daneshbook.ir
          </span>
          / <span dir="ltr" className="font-bold">123456</span>
        </div>
      </section>
    </div>
  );
}
