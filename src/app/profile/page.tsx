import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { Icon } from "@/components/Icon";
import { Badge, StatTile } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { faNumber, formatDate } from "@/lib/constants";
import { listBooksByOwner } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "پروفایل | دانش‌بوک" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  const myBooks = await listBooksByOwner(user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="card-surface relative overflow-hidden p-6">
        <div className="aurora-blob -top-20 -start-10 size-56 bg-accent-400" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-5">
          <span className="grid size-20 place-items-center rounded-[1.6rem] bg-gradient-to-br from-brand-500 to-accent-500 text-4xl shadow-xl shadow-brand-500/25">
            {user.avatarEmoji}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
              {user.fullName}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-400">
              <span dir="ltr" className="font-bold">
                {user.email}
              </span>
              {user.studentCode && <Badge tone="slate">شماره دانشجویی: {user.studentCode}</Badge>}
            </p>
            <p className="mt-2 text-[12.5px] text-ink-400">
              عضو از {formatDate(user.createdAt)} · {user.university ?? "دانشگاه ثبت نشده"}
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatTile
          icon="flame"
          label="امتیاز کارما"
          value={faNumber(user.karmaPoints)}
          tone="amber"
        />
        <StatTile icon="books" label="آگهی فعال" value={faNumber(myBooks.length)} />
      </section>

      {user.bio && (
        <section className="card-surface flex items-start gap-3 p-5">
          <Icon name="message" className="mt-0.5 size-5 shrink-0 text-brand-600" />
          <p className="text-[13.5px] leading-8 text-ink-600">{user.bio}</p>
        </section>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-ink-900">
          <Icon name="shield" className="size-5 text-brand-600" />
          ویرایش اطلاعات
        </h2>
        <ProfileForm
          initial={{
            fullName: user.fullName,
            studentCode: user.studentCode,
            university: user.university,
            major: user.major,
            bio: user.bio,
            avatarEmoji: user.avatarEmoji,
          }}
        />
      </section>
    </div>
  );
}
