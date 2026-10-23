import Link from "next/link";
import { redirect } from "next/navigation";
import NewBookForm from "@/components/NewBookForm";
import { Icon } from "@/components/Icon";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "ثبت آگهی جدید | دانش‌بوک" };

export default async function NewBookPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/new");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-400 transition hover:text-brand-600"
        >
          <Icon name="back" className="size-4" />
          بازگشت به داشبورد
        </Link>
        <h1 className="mt-3 flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-ink-900">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/25">
            <Icon name="plus" className="size-5.5" />
          </span>
          ثبت کتاب یا جزوه
        </h1>
        <p className="mt-2 text-sm leading-7 text-ink-400">
          اطلاعات دقیق‌تر یعنی تبادل سریع‌تر. فرم زیر کمتر از یک دقیقه کامل می‌شود.
        </p>
      </div>

      <NewBookForm defaultUniversity={user.university} />
    </div>
  );
}
