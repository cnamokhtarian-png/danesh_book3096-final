import { redirect } from "next/navigation";
import { ChatInbox } from "@/components/Chat";
import { Icon } from "@/components/Icon";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "گفتگوهای من",
  robots: { index: false, follow: false },
};

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-l from-brand-700 via-brand-600 to-accent-500 p-6 text-white shadow-lg shadow-brand-500/15 sm:p-8">
        <div className="aurora-blob -top-20 start-10 size-48 bg-accent-400" aria-hidden />
        <div className="relative flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15"><Icon name="message" className="size-7" /></span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">گفتگوهای من</h1>
            <p className="mt-1 text-sm text-white/75">ارتباط خصوصی و مستقیم با دانشجوهای دیگر</p>
          </div>
        </div>
      </header>
      <ChatInbox currentUserId={user.id} />
      <p className="px-2 text-center text-[11px] leading-6 text-ink-400">پیام‌ها فقط برای شما و طرف گفتگوی همان آگهی قابل مشاهده‌اند.</p>
    </div>
  );
}
