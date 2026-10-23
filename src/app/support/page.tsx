import SuggestionForm from "@/components/SuggestionForm";
import { Icon } from "@/components/Icon";
import { getCurrentUser } from "@/lib/auth";
import { MANAGEMENT_EMAIL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "پیشنهادات و پشتیبانی | دانش‌بوک",
  description: "نظرات، پیشنهادات و انتقادات خود را با تیم مدیریت دانش‌بوک به اشتراک بگذارید.",
};

export default async function SupportPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="card-surface relative overflow-hidden p-6">
        <div className="aurora-blob -top-24 end-0 size-56 bg-brand-300" aria-hidden />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-[12px] font-bold text-brand-700">
            <Icon name="headset" className="size-4" />
            ارتباط با مدیریت
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            پیشنهادات و پشتیبانی
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-8 text-ink-600">
            هر ایده، انتقاد یا مشکلی که در دانش‌بوک می‌بینید برایمان ارزشمند است. پیام شما مستقیماً
            در داشبورد مدیریت ثبت می‌شود و پس از بررسی، از طریق ایمیل مدیریت پاسخ داده می‌شود.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <SuggestionForm defaultName={user?.fullName ?? ""} />

        <aside className="space-y-4">
          <div className="card-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink-900">
              <Icon name="mail" className="size-4.5 text-brand-600" />
              ایمیل مدیریت
            </h2>
            <a
              href={`mailto:${MANAGEMENT_EMAIL}`}
              dir="ltr"
              className="mt-3 block rounded-2xl bg-brand-50 px-3.5 py-3 text-center text-[12.5px] font-bold text-brand-700 break-all"
            >
              {MANAGEMENT_EMAIL}
            </a>
            <p className="mt-3 text-[11.5px] leading-6 text-ink-400">
              همه پیشنهادات ارسالی در جدول <span dir="ltr" className="font-bold">suggestions</span>{" "}
              ذخیره و توسط مدیر سایت پیگیری می‌شود.
            </p>
          </div>

          <div className="card-surface space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink-900">
              <Icon name="inbox" className="size-4.5 text-brand-600" />
              زمان پاسخ‌گویی
            </h2>
            <ul className="space-y-2 text-[12.5px] leading-7 text-ink-600">
              {[
                "ثبت پیام: آنی و بدون نیاز به حساب کاربری",
                "بررسی اولیه: حداکثر ۴۸ ساعت کاری",
                "پاسخ نهایی: از طریق ایمیل یا شماره تماس شما",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Icon name="check" className="mt-1 size-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[1.5rem] border border-dashed border-brand-200 bg-brand-50/50 p-5">
            <p className="text-[12.5px] leading-7 text-brand-800">
              اگر فایل یا کتاب نامناسبی در سایت مشاهده کردید، لطفاً با موضوع «گزارش مشکل فنی» و
              ذکر نشانی صفحه گزارش کنید تا سریع حذف شود.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
