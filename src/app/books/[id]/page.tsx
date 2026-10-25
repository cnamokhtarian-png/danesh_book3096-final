import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCardGrid } from "@/components/BookCard";
import FileCard from "@/components/FileCard";
import { Icon } from "@/components/Icon";
import JsonLd from "@/components/JsonLd";
import RequestForm from "@/components/RequestForm";
import { ChatLauncher } from "@/components/Chat";
import ShareButton from "@/components/ShareButton";
import { Badge } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getBookFile } from "@/lib/files";
import { getBookPhotos } from "@/lib/photos";
import {
  categoryEmoji,
  categoryLabel,
  conditionLabel,
  coverGradient,
  faNumber,
  formatDate,
  formatPrice,
  kindEmoji,
  kindLabel,
  mediumLabel,
  offerEmoji,
  offerLabel,
} from "@/lib/constants";
import { bumpViews, getBookById, listRelatedBooks } from "@/lib/queries";
import { SITE, absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

/**
 * متادیتای هر آگهی بر اساس محتوای واقعی آن ساخته می‌شود: عنوان، توضیح،
 * canonical و تصویر اشتراک‌گذاری. آگهی‌های مبادله‌شده noindex می‌شوند تا
 * صفحات نازک/بی‌ارزش وارد ایندکس نشوند.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = Number.parseInt((await params).id, 10);
  const book = Number.isFinite(id) ? await getBookById(id) : null;

  // آگهی ناموجود: هم در متادیتا و هم در بدنه notFound می‌شود. Next روی
  // صفحه‌های not-found به‌صورت خودکار noindex می‌گذارد، بنابراین آدرس‌های
  // نامعتبر وارد ایندکس گوگل نمی‌شوند (چون loading.tsx استریم را شروع
  // می‌کند، کد وضعیت 200 می‌ماند و به همین تگ noindex تکیه می‌کنیم).
  if (!book) notFound();

  const price =
    book.offerType === "free"
      ? "واگذاری رایگان"
      : book.offerType === "request"
        ? "درخواست کتاب"
        : book.price
          ? `${book.price.toLocaleString("fa-IR")} تومان`
          : "رایگان";

  const description = [
    book.title,
    kindLabel(book.kind),
    book.course ? `درس ${book.course}` : null,
    book.author ? `نویسنده ${book.author}` : null,
    book.university,
    `${offerLabel(book.offerType)} — ${price}`,
    book.description?.slice(0, 90),
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 300);

  const isAvailable = book.status === "available";

  return {
    title: book.title,
    description,
    alternates: { canonical: `/books/${book.id}` },
    robots: isAvailable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: "article",
      title: book.title,
      description,
      url: `/books/${book.id}`,
      siteName: SITE.name,
      locale: SITE.locale,
      images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: book.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: book.title,
      description,
      images: [SITE.ogImage],
    },
  };
}

export default async function BookDetailPage({ params }: PageProps) {
  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const [book, user] = await Promise.all([getBookById(id), getCurrentUser()]);
  if (!book) notFound();

  const [related, file, photos] = await Promise.all([
    listRelatedBooks(book.id, book.category, 4),
    getBookFile(book.id),
    getBookPhotos(id),
  ]);

  const isOwner = user?.id === book.ownerId;

  // بازدید صاحب آگهی و ربات‌های خزش شمارنده را بالا نمی‌برند.
  if (!isOwner) await bumpViews(book.id);

  const meta = [
    { label: "بازار", value: mediumLabel(book.medium), icon: "presentation" as const },
    { label: "نوع محتوا", value: kindLabel(book.kind), icon: "note" as const },
    {
      label: "نوع معامله",
      value: `${offerEmoji(book.offerType)} ${offerLabel(book.offerType)}`,
      icon: "exchange" as const,
    },
    { label: "درس", value: book.course ?? "—", icon: "books" as const },
    { label: "نویسنده", value: book.author ?? "—", icon: "user" as const },
    { label: "دانشگاه", value: book.university ?? "—", icon: "grad" as const },
    { label: "وضعیت", value: conditionLabel(book.condition), icon: "star" as const },
    { label: "تاریخ انتشار", value: formatDate(book.createdAt), icon: "clock" as const },
  ];

  // داده ساختاریافته: آگهی + مسیر راهنما. گوگل با این اطلاعات نتایج غنی‌تری
  // (قیمت، موجود بودن، breadcrumb) نشان می‌دهد.
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: book.title,
    description: book.description ?? `${kindLabel(book.kind)} — ${book.course ?? ""}`,
    category: categoryLabel(book.category),
    brand: book.author ? { "@type": "Brand", name: book.author } : undefined,
    offers: {
      "@type": "Offer",
      price: book.price,
      priceCurrency: "IRR",
      availability:
        book.status === "available"
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      url: absoluteUrl(`/books/${book.id}`),
      seller: { "@type": "Person", name: book.ownerName },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "بازار کتاب", item: absoluteUrl("/books") },
      {
        "@type": "ListItem",
        position: 3,
        name: book.title,
        item: absoluteUrl(`/books/${book.id}`),
      },
    ],
  };

  return (
    <div className="space-y-8">
      <JsonLd data={[productSchema, breadcrumbSchema]} />

      <Link
        href="/books"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-400 transition hover:text-brand-600"
      >
        <Icon name="back" className="size-4" />
        بازگشت به فهرست
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        {/* --------------------------- main card --------------------------- */}
        <article className="card-surface overflow-hidden">
          {/* ------------------- گالری عکس / کاور پیش‌فرض ------------------- */}
          <div className="border-b border-ink-100">
            {photos.length > 0 ? (
              <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 lg:p-6">
                {photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={`/api/photos/${photo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-ink-50"
                    aria-label={`نمایش عکس ${book.title}`}
                  >
                    <Image
                      src={`/api/photos/${photo.id}`}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <DefaultCover kind={book.kind} category={book.category} />
            )}
          </div>

          <div className="border-b border-ink-100 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={book.kind === "note" ? "amber" : "brand"}>
                    {kindLabel(book.kind)}
                  </Badge>
                  <Badge tone="slate">
                    {categoryEmoji(book.category)} {categoryLabel(book.category)}
                  </Badge>
                  {book.status === "exchanged" && <Badge tone="emerald">مبادله شد</Badge>}
                  {book.audience === "konkur" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-[#7c3aed] to-[#c026d3] px-2.5 py-1 text-[11px] font-bold text-white">
                      ویژه کنکور
                    </span>
                  )}
                  <Badge tone="slate">
                    {offerEmoji(book.offerType)} {offerLabel(book.offerType)}
                  </Badge>
                  {book.isExchangeable && <Badge tone="rose">قابل تبادل</Badge>}
                </div>
                <h1 className="mt-3 text-[22px] leading-snug font-black tracking-tight text-ink-900 sm:text-[30px]">
                  {book.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] font-medium text-ink-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="clock" className="size-3.5" />
                    {formatDate(book.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="eye" className="size-3.5" />
                    {faNumber(book.views)} بازدید
                  </span>
                  {book.university && (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="grad" className="size-3.5" />
                      {book.university}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`w-full shrink-0 rounded-2xl border px-4 py-3 sm:w-auto sm:min-w-[170px] ${
                  book.price === 0
                    ? "border-emerald-100 bg-emerald-50/70"
                    : "border-brand-100 bg-brand-50/70"
                }`}
              >
                <p className="text-[10.5px] font-bold text-ink-400">قیمت</p>
                <p
                  className={`mt-1 text-[19px] leading-tight font-black sm:text-xl ${
                    book.price === 0 ? "text-emerald-600" : "text-brand-700"
                  }`}
                >
                  {formatPrice(book.price, book.offerType)}
                </p>
                <p className="mt-1 text-[10.5px] font-medium text-ink-400">
                  {book.offerType === "free"
                    ? "بدون دریافت وجه"
                    : book.offerType === "request"
                      ? "دنبال این کتاب"
                      : book.isExchangeable
                        ? "قابل تبادل با کتاب شما"
                        : "پرداخت نقدی"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {/* ۸ خانه دقیقاً در ۲ ستون (موبایل/تبلت) یا ۴ ستون (دسکتاپ) جا می‌شود
                تا هیچ خانه‌ی خالی با پس‌زمینه‌ی خطوط باقی نماند. */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-100 bg-ink-100 lg:grid-cols-4">
              {meta.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 bg-white px-3.5 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon name={item.icon} className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-medium text-ink-400">{item.label}</p>
                    <p className="mt-0.5 truncate text-[12.5px] font-extrabold text-ink-900">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-ink-100 p-5 sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-ink-900">
              <span className="grid size-8 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name="note" className="size-4.5" />
              </span>
              توضیحات
            </h2>
            <p className="whitespace-pre-line text-[13.5px] leading-8 text-ink-600">
              {book.description?.trim() ||
                "توضیحاتی برای این آگهی ثبت نشده است. برای کسب جزئیات بیشتر از طریق فرم درخواست با صاحب آگهی در ارتباط باشید."}
            </p>
          </div>
        </article>

        {/* --------------------------- side card --------------------------- */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card-surface p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink-900">
              <Icon name="user" className="size-4.5 text-brand-600" />
              صاحب آگهی
            </h3>
            <div className="flex items-center gap-3">
              <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-2xl">
                {book.ownerEmoji}
              </span>
              <div>
                <p className="text-sm font-extrabold text-ink-900">{book.ownerName}</p>
                <p className="mt-1 flex items-center gap-1 text-[12px] font-bold text-amber-600">
                  <Icon name="flame" className="size-3.5" />
                  {faNumber(book.ownerKarma)} امتیاز کارما
                </p>
              </div>
            </div>
            {!isOwner && book.status === "available" && (
              <div className="mt-4">
                <ChatLauncher
                  bookId={book.id}
                  bookTitle={book.title}
                  isLoggedIn={Boolean(user)}
                  currentUserId={user?.id}
                />
              </div>
            )}
            <p className="mt-4 rounded-2xl bg-ink-50 px-3.5 py-3 text-[12px] leading-6 text-ink-600">
              هر تبادل موفق ۵ امتیاز کارما برای دو طرف دارد؛ امتیاز نشان‌دهنده اعتبار و
              سابقه دانشجو در دانش‌بوک است.
            </p>
          </div>

          {file && <FileCard file={file} />}

          <RequestForm
            bookId={book.id}
            bookTitle={book.title}
            offerType={book.offerType}
            isLoggedIn={Boolean(user)}
            isOwner={isOwner}
          />

          <ShareButton
            title={book.title}
            path={`/books/${book.id}`}
            kind="ad"
            price={book.price}
            university={book.university}
          />
        </aside>
      </div>

      {/* لینک‌سازی داخلی: آگهی‌های هم‌دسته برای کاربر و خزنده */}
      {related.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink-900">
              <span className="grid size-8 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name="books" className="size-4.5" />
              </span>
              آگهی‌های مشابه در {categoryLabel(book.category)}
            </h2>
            <Link
              href={`/books?category=${book.category}`}
              className="flex items-center gap-1 text-[12.5px] font-bold text-brand-600 transition hover:text-brand-700"
            >
              همه
              <Icon name="back" className="size-3.5" />
            </Link>
          </div>
          <BookCardGrid books={related} />
        </section>
      )}
    </div>
  );
}

/**
 * کاور پیش‌فرض زیبا وقتی آگهی عکس ندارد — بر اساس دسته‌بندی و نوع محتوا
 * (کتاب / جزوه / اسلاید / نمونه سوال) رنگ‌بندی می‌شود.
 */
function DefaultCover({ kind, category }: { kind: string; category: string }) {
  return (
    <div className={`relative isolate overflow-hidden bg-gradient-to-bl ${coverGradient(category)}`}>
      <div className="pointer-events-none absolute -top-24 end-[-8%] size-64 rounded-full bg-white/25 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 start-[-6%] size-72 rounded-full bg-ink-900/25 blur-3xl" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(circle_at_center,#fff_1px,transparent_0)] [background-size:20px_20px]"
        aria-hidden
      />
      <div className="relative flex h-52 flex-col items-center justify-center gap-4 px-6 sm:h-60 lg:h-64">
        <div className="relative [perspective:800px]">
          <div
            className="relative grid size-24 place-items-center rounded-2xl bg-white/95 shadow-[0_18px_40px_-12px_rgba(10,12,30,.55)] ring-1 ring-white/60 sm:size-28"
            style={{ transform: "rotateX(6deg) rotateY(-12deg) rotate(-3deg)" }}
          >
            <span className="absolute inset-y-1.5 start-0 w-2 rounded-full bg-gradient-to-b from-white to-ink-900/10" aria-hidden />
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-tl from-transparent via-white/50 to-transparent opacity-60" aria-hidden />
            <span className="relative text-4xl drop-shadow-sm sm:text-5xl">{kindEmoji(kind)}</span>
          </div>
          <span className="absolute -bottom-3 left-1/2 h-3 w-20 -translate-x-1/2 rounded-full bg-ink-900/30 blur-md" aria-hidden />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[11.5px] font-bold text-white ring-1 ring-white/30 backdrop-blur-md">
            {kindEmoji(kind)} {kindLabel(kind)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11.5px] font-bold text-ink-800 shadow-sm">
            {categoryEmoji(category)} {categoryLabel(category)}
          </span>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-ink-900/15 to-transparent" aria-hidden />
    </div>
  );
}
