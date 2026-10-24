import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCardGrid } from "@/components/BookCard";
import FileCard from "@/components/FileCard";
import { Icon } from "@/components/Icon";
import JsonLd from "@/components/JsonLd";
import RequestForm from "@/components/RequestForm";
import ShareButton from "@/components/ShareButton";
import { Badge } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getBookFile } from "@/lib/files";
import {
  categoryEmoji,
  categoryLabel,
  conditionLabel,
  faNumber,
  formatDate,
  formatPrice,
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

  const [related, file] = await Promise.all([
    listRelatedBooks(book.id, book.category, 4),
    getBookFile(book.id),
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
          <div className="relative flex flex-wrap items-center gap-5 border-b border-ink-100 bg-gradient-to-bl from-brand-50/80 via-white to-accent-400/10 p-6">
            <span className="grid size-24 place-items-center rounded-3xl bg-white text-5xl shadow-lg shadow-brand-900/10">
              {book.coverEmoji}
            </span>
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
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
                {book.title}
              </h1>
              <p className="mt-2 text-sm text-ink-400">
                منتشر شده در {formatDate(book.createdAt)} · {faNumber(book.views)} بازدید
              </p>
            </div>
            <div className="text-left">
              <p
                className={`text-2xl font-black ${book.price === 0 ? "text-emerald-600" : "text-brand-700"}`}
              >
                {formatPrice(book.price, book.offerType)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {meta.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50/60 px-3.5 py-3"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-white text-brand-600 shadow-sm">
                  <Icon name={item.icon} className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-ink-400">{item.label}</p>
                  <p className="truncate text-[13px] font-bold text-ink-900">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-ink-100 p-6">
            <h2 className="mb-3 text-base font-extrabold text-ink-900">توضیحات</h2>
            <p className="whitespace-pre-line text-[14px] leading-8 text-ink-600">
              {book.description?.trim() ||
                "توضیحاتی برای این آگهی ثبت نشده است. برای کسب جزئیات بیشتر از طریق فرم درخواست با صاحب آگهی در ارتباط باشید."}
            </p>
          </div>
        </article>

        {/* --------------------------- side card --------------------------- */}
        <aside className="space-y-4">
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

          <ShareButton title={book.title} path={`/books/${book.id}`} />
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
