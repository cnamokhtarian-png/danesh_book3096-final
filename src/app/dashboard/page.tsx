import Link from "next/link";
import { redirect } from "next/navigation";
import BookOwnerActions from "@/components/BookOwnerActions";
import ShareButton from "@/components/ShareButton";
import RequestActions from "@/components/RequestActions";
import { Icon } from "@/components/Icon";
import { Badge, EmptyState, SectionHeading, StatTile } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import {
  faNumber,
  formatPrice,
  kindLabel,
  offerLabel,
  requestKindLabel,
  statusLabel,
  timeAgo,
} from "@/lib/constants";
import { listBooksByOwner, listUserRequests } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "داشبورد",
  robots: { index: false, follow: false },
};

const STATUS_TONE: Record<string, "brand" | "amber" | "emerald" | "rose" | "slate"> = {
  pending: "amber",
  accepted: "emerald",
  declined: "rose",
  exchanged: "emerald",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const [myBooks, myRequests] = await Promise.all([
    listBooksByOwner(user.id),
    listUserRequests(user.id),
  ]);

  const incoming = myRequests.filter((request) => request.direction === "incoming");
  const outgoing = myRequests.filter((request) => request.direction === "outgoing");
  const pendingIncoming = incoming.filter((request) => request.status === "pending");

  return (
    <div className="space-y-10">
      <header className="card-surface relative overflow-hidden p-6">
        <div className="aurora-blob -top-24 end-0 size-56 bg-brand-300" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-500 to-accent-500 text-3xl shadow-lg shadow-brand-500/25">
              {user.avatarEmoji}
            </span>
            <div>
              <p className="text-[12px] font-bold text-ink-400">خوش آمدی</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
                {user.fullName}
              </h1>
              <p className="mt-1 text-[12.5px] text-ink-400">
                {user.university ?? "دانشگاه ثبت نشده"}
                {user.major ? ` · ${user.major}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="flex items-center gap-1.5 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-[13px] font-bold text-ink-800 transition hover:border-brand-200 hover:text-brand-700"
            >
              <Icon name="user" className="size-4.5" />
              ویرایش پروفایل
            </Link>
            <Link
              href="/dashboard/new"
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 px-4 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-brand-500/25"
            >
              <Icon name="plus" className="size-4.5" />
              آگهی جدید
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-2xl bg-ink-900 px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-brand-700"
              >
                <Icon name="shield" className="size-4.5" />
                پنل مدیریت
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon="flame" label="امتیاز کارما" value={faNumber(user.karmaPoints)} tone="amber" />
        <StatTile icon="books" label="آگهی‌های من" value={faNumber(myBooks.length)} />
        <StatTile icon="message" label="درخواست دریافتی" value={faNumber(incoming.length)} tone="emerald" />
        <StatTile icon="send" label="درخواست ارسالی" value={faNumber(outgoing.length)} tone="rose" />
      </section>

      {/* --------------------------- my listings --------------------------- */}
      <section>
        <SectionHeading
          icon="books"
          title="آگهی‌های من"
          subtitle={`${faNumber(myBooks.length)} کتاب و جزوه منتشرشده`}
        />
        {myBooks.length ? (
          <div className="space-y-2.5">
            {myBooks.map((book) => (
              <div
                key={book.id}
                className="card-surface flex flex-wrap items-center gap-4 p-4 transition hover:border-brand-200"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-2xl">
                  {book.coverEmoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={book.medium === "digital" ? "amber" : "brand"}>
                      {kindLabel(book.kind)}
                    </Badge>
                    <Badge tone="slate">{offerLabel(book.offerType)}</Badge>
                    {book.audience === "konkur" && <Badge tone="rose">کنکور</Badge>}
                    <Badge tone={book.status === "available" ? "emerald" : "slate"}>
                      {statusLabel(book.status)}
                    </Badge>
                  </div>
                  <Link
                    href={`/books/${book.id}`}
                    className="mt-1.5 block truncate text-[14.5px] font-bold text-ink-900 hover:text-brand-700"
                  >
                    {book.title}
                  </Link>
                  <p className="mt-0.5 truncate text-[11.5px] text-ink-400">
                    {book.course ? `درس ${book.course} · ` : ""}
                    {timeAgo(book.createdAt)} · {faNumber(book.views)} بازدید
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[13px] font-extrabold text-brand-700">
                    {formatPrice(book.price, book.offerType)}
                  </span>
                  <div className="flex items-center gap-1">
                    <ShareButton
                      variant="icon"
                      title={book.title}
                      path={`/books/${book.id}`}
                      kind="ad"
                      price={book.price}
                      university={book.university}
                    />
                    <BookOwnerActions id={book.id} status={book.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="plus"
            title="هنوز آگهی ندارید"
            description="اولین کتاب یا جزوه‌ات را ثبت کن تا دانشجویان دیگر بتوانند آن را برای تبادل پیدا کنند."
            actionLabel="ثبت آگهی جدید"
            actionHref="/dashboard/new"
          />
        )}
      </section>

      {/* ------------------------------ requests --------------------------- */}
      <section>
        <SectionHeading
          icon="message"
          title="درخواست‌های تبادل"
          subtitle={
            pendingIncoming.length
              ? `${faNumber(pendingIncoming.length)} درخواست در انتظار پاسخ شماست`
              : "درخواست‌های دریافتی و ارسالی"
          }
        />
        {myRequests.length ? (
          <div className="space-y-2.5">
            {myRequests.map((request) => (
              <div
                key={`${request.direction}-${request.id}`}
                className="card-surface flex flex-wrap items-center gap-4 p-4"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ink-50 text-xl">
                  {request.bookEmoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={request.direction === "incoming" ? "brand" : "slate"}>
                      {request.direction === "incoming" ? "دریافتی" : "ارسالی"}
                    </Badge>
                    <Badge tone="slate">{requestKindLabel(request.kind)}</Badge>
                    <Badge tone={STATUS_TONE[request.status] ?? "slate"}>
                      {statusLabel(request.status)}
                    </Badge>
                  </div>
                  <Link
                    href={`/books/${request.bookId}`}
                    className="mt-1.5 block truncate text-[14px] font-bold text-ink-900 hover:text-brand-700"
                  >
                    {request.bookTitle}
                  </Link>
                  <p className="mt-0.5 text-[11.5px] text-ink-400">
                    {request.direction === "incoming" ? "از طرف" : "برای آگهی"}{" "}
                    {request.counterpartEmoji} {request.counterpartName} · {timeAgo(request.createdAt)}
                  </p>
                  {request.message && (
                    <p className="mt-2 rounded-2xl bg-ink-50 px-3 py-2 text-[12px] leading-6 text-ink-600">
                      «{request.message}»
                    </p>
                  )}
                </div>
                {request.direction === "incoming" && request.status === "pending" && (
                  <RequestActions id={request.id} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="send"
            title="درخواستی وجود ندارد"
            description="وقتی دانشجویی برای کتاب‌های شما درخواست بفرستد یا شما درخواستی ثبت کنید، اینجا نمایش داده می‌شود."
            actionLabel="مرور کتاب‌ها"
            actionHref="/books"
          />
        )}
      </section>
    </div>
  );
}
