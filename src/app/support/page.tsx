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
          </div>

          {/* هشدار معامله — جایگزین کارت «زمان پاسخ‌گویی» */}
          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/70 p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-amber-900">
              <span className="grid size-7 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <Icon name="alert" className="size-4" />
              </span>
              قبل از معامله حواستان باشد
            </h2>

            <p className="mt-3 rounded-2xl bg-white/70 px-3.5 py-3 text-[12.5px] leading-7 font-bold text-amber-900">
              هیچ مبلغی را بدون دیدن کالا، توافق روشن و رسیدِ واریز پرداخت نکنید؛ هر پرداختی باید
              حساب و کتاب داشته باشد.
            </p>

            <ul className="mt-3 space-y-2 text-[12px] leading-6 text-amber-900/90">
              {[
                "کتاب یا جزوه را پیش از پرداخت، حضوری یا با تماس تصویری ببینید.",
                "قیمت، وضعیت کالا و نحوه تحویل را قبل از واریز مشخص کنید.",
                "فقط به حساب به نام همان فروشنده واریز کنید؛ رسید را نگه دارید.",
                "در صورت تردید، معامله را انجام ندهید و موضوع را به پشتیبانی گزارش کنید.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Icon name="check" className="mt-1 size-3.5 shrink-0 text-amber-600" />
                  {item}
                </li>
              ))}
            </ul>

            <p className="mt-3 border-t border-amber-200/80 pt-3 text-[11px] leading-6 text-amber-800/80">
              دانش‌بوک واسطهٔ پرداخت نیست و مسئولیت بررسی صحت معامله با خود کاربران است.
            </p>
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
