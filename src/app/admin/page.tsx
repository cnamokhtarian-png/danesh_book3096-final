import Link from "next/link";
import { redirect } from "next/navigation";
import SeedDemoButton from "@/components/SeedDemoButton";
import SuggestionManager from "@/components/SuggestionManager";
import { Icon } from "@/components/Icon";
import { Badge, EmptyState, StatTile } from "@/components/ui";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { faNumber, formatDate, MANAGEMENT_EMAIL } from "@/lib/constants";
import { demoContentStatus } from "@/lib/demo-content";
import { getStats, listSuggestions, listUsersForAdmin } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "پنل مدیریت",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminUser(user)) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <EmptyState
          icon="shield"
          title="دسترسی محدود"
          description="این بخش فقط برای مدیر سایت در دسترس است. اگر فکر می‌کنید خطایی رخ داده، با پشتیبانی تماس بگیرید."
          actionLabel="بازگشت به داشبورد"
          actionHref="/dashboard"
        />
      </div>
    );
  }

  const [stats, suggestions, users, demo] = await Promise.all([
    getStats(),
    listSuggestions(),
    listUsersForAdmin(),
    demoContentStatus(),
  ]);

  return (
    <div className="space-y-8">
      <header className="card-surface relative overflow-hidden p-6">
        <div className="aurora-blob -top-24 end-0 size-56 bg-ink-400/60" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-3xl bg-ink-900 text-white shadow-xl">
              <Icon name="shield" className="size-7" />
            </span>
            <div>
              <p className="text-[12px] font-bold text-ink-400">پنل مدیریت دانش‌بوک</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
                {user.fullName}
              </h1>
              <p className="mt-1 text-[12.5px] text-ink-400" dir="ltr">
                {MANAGEMENT_EMAIL}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/books"
              className="flex items-center gap-1.5 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-[13px] font-bold text-ink-800 transition hover:border-brand-200 hover:text-brand-700"
            >
              <Icon name="books" className="size-4.5" />
              مشاهده سایت
            </Link>
            <Link
              href="/support"
              className="flex items-center gap-1.5 rounded-2xl bg-ink-900 px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-brand-700"
            >
              <Icon name="headset" className="size-4.5" />
              فرم پیشنهادات
            </Link>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon="users" label="کاربران" value={faNumber(stats.students)} />
        <StatTile
          icon="books"
          label="کل آگهی‌ها"
          value={faNumber(stats.books + stats.notes + stats.slides + stats.exams)}
          tone="emerald"
        />
        <StatTile icon="crown" label="منابع کنکور" value={faNumber(stats.konkur)} tone="rose" />
        <StatTile
          icon="inbox"
          label="پیام‌های جدید"
          value={faNumber(stats.newSuggestions)}
          tone="amber"
        />
      </section>

      <SeedDemoButton demoUsers={demo.users} />

      <SuggestionManager items={suggestions} />

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold tracking-tight text-ink-900">
          <span className="grid size-10 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon name="chart" className="size-5" />
          </span>
          کاربران ثبت‌نام‌شده
        </h2>
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right">
              <thead className="bg-ink-50/70 text-[11.5px] font-bold text-ink-400">
                <tr>
                  <th className="px-4 py-3">کاربر</th>
                  <th className="px-4 py-3">ایمیل</th>
                  <th className="px-4 py-3">دانشگاه / رشته</th>
                  <th className="px-4 py-3">آگهی‌ها</th>
                  <th className="px-4 py-3">کارما</th>
                  <th className="px-4 py-3">عضویت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 text-[12.5px]">
                {users.map((row) => (
                  <tr key={row.id} className="transition hover:bg-ink-50/50">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-bold text-ink-900">
                        <span className="text-lg">{row.avatarEmoji}</span>
                        {row.fullName}
                        {row.role === "admin" && <Badge tone="brand">مدیر</Badge>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-600" dir="ltr">
                      {row.email}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {row.university ?? "—"}
                      {row.major ? ` · ${row.major}` : ""}
                    </td>
                    <td className="px-4 py-3 font-bold text-ink-800">{faNumber(row.bookCount)}</td>
                    <td className="px-4 py-3 font-bold text-amber-600">
                      {faNumber(row.karmaPoints)}
                    </td>
                    <td className="px-4 py-3 text-ink-400">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-ink-400">
                      کاربری ثبت‌نام نکرده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
