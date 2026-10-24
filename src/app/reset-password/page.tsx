import Link from "next/link";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { Icon } from "@/components/Icon";
import { findResetTarget } from "@/lib/password-reset";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "تعیین رمز عبور جدید | دانش‌بوک",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = params.token;
  const token = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  const target = token ? await findResetTarget(token) : null;

  return (
    <div className="mx-auto max-w-xl py-6">
      <section className="card-surface p-6 sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/25">
          <Icon name="lock" className="size-5.5" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900">
          تعیین رمز عبور جدید
        </h1>

        {target ? (
          <>
            <p className="mt-2 mb-6 text-sm leading-7 text-ink-400">
              یک رمز قوی انتخاب کنید؛ بعد از ذخیره، از همه دستگاه‌های دیگر خارج می‌شوید.
            </p>
            <ResetPasswordForm token={token} />
          </>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <Icon name="alert" className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <p className="text-[13px] leading-7 text-amber-900">
                این لینک بازیابی معتبر نیست، منقضی شده یا قبلاً استفاده شده است. لطفاً یک لینک
                تازه درخواست کنید.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 px-4 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-brand-500/25"
              >
                <Icon name="send" className="size-4" />
                درخواست لینک جدید
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-ink-100 px-4 py-2.5 text-[13px] font-bold text-ink-600 transition hover:border-brand-200 hover:text-brand-700"
              >
                بازگشت به ورود
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
