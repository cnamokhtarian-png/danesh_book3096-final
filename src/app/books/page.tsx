import type { Metadata } from "next";
import Link from "next/link";
import { BookCard } from "@/components/BookCard";
import JsonLd from "@/components/JsonLd";
import { getBookPhotosMap } from "@/lib/photos";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/ui";
import { CATEGORIES, faNumber, KINDS, OFFER_TYPES } from "@/lib/constants";
import { listBooks } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * متادیتای صفحه فهرست:
 * - حالت ساده: index + canonical به /books
 * - حالت فیلترشده/جستجو/مرتب‌سازی: noindex, follow تا محتوای تکراری و
 *   صفحه‌های بی‌پایان وارد ایندکس گوگل نشوند.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const hasFilter = ["q", "kind", "medium", "offerType", "category", "sort"].some(
    (key) => Boolean(one(params[key])),
  );

  return {
    title: "بازار کتاب، جزوه و فایل درسی",
    description:
      "جستجو در آگهی‌های دانش‌بوک: خرید و فروش کتاب دست دوم دانشگاهی، تبادل کتاب، واگذاری رایگان، دانلود جزوه، اسلاید و نمونه سوال امتحانی.",
    alternates: { canonical: "/books" },
    robots: hasFilter ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: "بازار کتاب، جزوه و فایل درسی | دانش‌بوک",
      description: "خرید، فروش و تبادل کتاب دانشگاهی، جزوه، اسلاید و نمونه سوال.",
      url: "/books",
    },
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SORTS = [
  { value: "new", label: "جدیدترین", icon: "clock" as const },
  { value: "cheap", label: "ارزان‌ترین", icon: "coin" as const },
  { value: "popular", label: "پربازدیدترین", icon: "flame" as const },
];

/** بازارها با برچسب کوتاه — برای کنترل سگمنتی بالای صفحه. */
const MARKETS = [
  { value: undefined, label: "همه", emoji: "🗂️" },
  { value: "digital", label: "دیجیتال", emoji: "💾" },
  { value: "physical", label: "فیزیکی", emoji: "📚" },
] as const;

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function buildHref(
  params: Record<string, string | string[] | undefined>,
  patch: Record<string, string | undefined>,
) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const single = one(value);
    if (single) next.set(key, single);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  const query = next.toString();
  return query ? `/books?${query}` : "/books";
}

/* ------------------------------ small parts ------------------------------ */

/** دکمه سگمنتی (بازار/مرتب‌سازی) — حالت فعال روشن و برجسته، بقیه آرام. */
function Segment({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-bold whitespace-nowrap transition ${
        active
          ? "bg-white text-brand-700 shadow-sm ring-1 ring-brand-200/80"
          : "text-ink-500 hover:bg-white/60 hover:text-ink-800"
      }`}
    >
      {children}
    </Link>
  );
}

/** چیپ افقی یکنواخت داخل پنل فیلترها. */
function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap transition ${
        active
          ? "border-brand-500 bg-brand-500 text-white shadow-sm shadow-brand-500/25"
          : "border-ink-100 bg-white text-ink-600 hover:border-brand-200 hover:bg-brand-50/40 hover:text-brand-700"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * یک گروه فیلتر: سرتیتر + (در صورت وجود مقدار فعال) لینک «همه».
 * ستون‌ها هم‌عرض‌اند و چیپ‌ها از سمت راست هم‌تراز می‌شوند.
 */
function FilterGroup({
  title,
  resetHref,
  isActive,
  children,
}: {
  title: string;
  resetHref: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex min-h-5 items-center justify-between gap-2">
        <span className="text-[11px] font-black tracking-wide text-ink-400">{title}</span>
        {isActive && (
          <Link
            href={resetHref}
            className="rounded-md px-1.5 py-0.5 text-[10.5px] font-bold text-brand-600 transition hover:bg-brand-50"
          >
            همه
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/** برچسب فیلتر فعال با دکمه حذف. */
function FilterToken({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      title="حذف این فیلتر"
      className="group inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 py-1 pr-2.5 pl-1 text-[11px] font-bold text-brand-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
    >
      {label}
      <span className="grid size-4 place-items-center rounded-full bg-white text-ink-400 transition group-hover:bg-rose-100 group-hover:text-rose-600">
        <Icon name="x" className="size-2.5" />
      </span>
    </Link>
  );
}

/* --------------------------------- page ---------------------------------- */

export default async function BooksPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = one(params.q);
  const kind = one(params.kind);
  const medium = one(params.medium);
  const offerType = one(params.offerType);
  const category = one(params.category);
  const sort = one(params.sort) || "new";

  const books = await listBooks({
    q,
    kind,
    medium,
    offerType,
    category,
    sort,
    limit: 48,
  });

  const photosMap = await getBookPhotosMap(books.map((book) => book.id));

  const kindLabel = KINDS.find((item) => item.value === kind)?.label;
  const offerLabel = OFFER_TYPES.find((item) => item.value === offerType)?.label;
  const categoryLabel = CATEGORIES.find((item) => item.value === category)?.label;
  const marketLabel = MARKETS.find((item) => item.value === (medium || undefined))?.label;

  const activeTokens = [
    q && { key: "q", label: `جستجو: ${q}` },
    medium && { key: "medium", label: `بازار: ${marketLabel}` },
    kind && { key: "kind", label: `نوع: ${kindLabel}` },
    offerType && { key: "offerType", label: `معامله: ${offerLabel}` },
    category && { key: "category", label: `رشته: ${categoryLabel}` },
  ].filter((token): token is { key: string; label: string } => Boolean(token));

  const hasAdvancedFilters = Boolean(kind || offerType || category);
  const hasFilters = activeTokens.length > 0;

  return (
    <div className="space-y-5 text-right" dir="rtl">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "آگهی‌های کتاب و جزوه",
          numberOfItems: books.length,
          itemListElement: books.slice(0, 20).map((book, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `/books/${book.id}`,
            name: book.title,
          })),
        }}
      />
      {/* -------------------------------- header ------------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-ink-900">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/25">
              <Icon name="books" className="size-5.5" />
            </span>
            بازار کتاب و فایل دانشجویی
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            {faNumber(books.length)} آگهی
            {q ? ` برای «${q}»` : ""}
            {hasFilters ? " · با فیلترهای انتخابی" : " فعال"}
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25"
        >
          <Icon name="plus" className="size-4.5" />
          ثبت آگهی
        </Link>
      </div>

      {/* ------------------------------- toolbar ------------------------------- */}
      <section className="card-surface p-3.5 sm:p-4">
        {/* ردیف ۱: جستجو + مرتب‌سازی */}
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <form action="/books" method="get" className="relative flex-1" role="search">
            {medium && <input type="hidden" name="medium" value={medium} />}
            {kind && <input type="hidden" name="kind" value={kind} />}
            {offerType && <input type="hidden" name="offerType" value={offerType} />}
            {category && <input type="hidden" name="category" value={category} />}
            {sort !== "new" && <input type="hidden" name="sort" value={sort} />}

            <Icon
              name="search"
              className="pointer-events-none absolute inset-y-0 right-3.5 my-auto size-4.5 text-ink-400"
            />
            <input
              name="q"
              defaultValue={q}
              placeholder="نام کتاب، جزوه، استاد یا دانشگاه…"
              className="field-base h-11 pr-11 pl-24 text-[13.5px]"
              autoComplete="off"
            />
            <div className="absolute inset-y-0 left-1.5 my-auto flex items-center gap-0.5">
              {q && (
                <Link
                  href={buildHref(params, { q: undefined })}
                  aria-label="پاک کردن جستجو"
                  className="grid size-8 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-50 hover:text-rose-600"
                >
                  <Icon name="x" className="size-3.5" />
                </Link>
              )}
              <button
                type="submit"
                className="h-8 rounded-lg bg-gradient-to-l from-brand-600 to-brand-500 px-3 text-[11.5px] font-bold text-white shadow-sm shadow-brand-500/25 transition hover:from-brand-700 hover:to-brand-600"
              >
                جستجو
              </button>
            </div>
          </form>

          <div className="flex items-center gap-0.5 rounded-2xl bg-ink-50 p-1 lg:w-80">
            {SORTS.map((item) => (
              <Segment
                key={item.value}
                href={buildHref(params, {
                  sort: item.value === "new" ? undefined : item.value,
                })}
                active={sort === item.value}
              >
                <Icon name={item.icon} className="size-3.5 opacity-70" />
                {item.label}
              </Segment>
            ))}
          </div>
        </div>

        {/* ردیف ۲: بازار */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-dashed border-ink-100 pt-2.5">
          <div className="flex w-full items-center gap-0.5 rounded-2xl bg-ink-50 p-1 sm:w-auto">
            {MARKETS.map((item) => (
              <Segment
                key={item.label}
                href={buildHref(params, { medium: item.value })}
                active={(medium || undefined) === item.value}
              >
                <span className="text-[13px]">{item.emoji}</span>
                {item.label}
              </Segment>
            ))}
          </div>

          {/* پنل بازشو: summary جمع‌وجور و پنل تمام‌عرض زیر آن */}
          <details className="group w-full" open={hasAdvancedFilters}>
            <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-2xl border border-ink-100 bg-white px-3 py-2 text-[12px] font-bold text-ink-600 transition select-none hover:border-brand-200 hover:text-brand-700 [&::-webkit-details-marker]:hidden sm:w-auto">
              <Icon name="filter" className="size-4 opacity-80" />
              فیلترهای بیشتر
              {hasAdvancedFilters && (
                <span className="grid size-4.5 place-items-center rounded-full bg-brand-600 text-[9.5px] font-black text-white">
                  {faNumber([kind, offerType, category].filter(Boolean).length)}
                </span>
              )}
              <Icon
                name="chevron"
                className="size-3.5 opacity-70 transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="mt-3 grid gap-x-5 gap-y-4 rounded-2xl border border-ink-100 bg-ink-50/40 p-3.5 sm:grid-cols-3 sm:divide-x sm:divide-ink-100 sm:rtl:divide-x-reverse">
              <FilterGroup
                title="نوع محتوا"
                resetHref={buildHref(params, { kind: undefined })}
                isActive={Boolean(kind)}
              >
                {KINDS.map((item) => (
                  <Chip
                    key={item.value}
                    href={buildHref(params, { kind: item.value })}
                    active={kind === item.value}
                  >
                    <span className="text-[12px]">{item.emoji}</span>
                    {item.label}
                  </Chip>
                ))}
              </FilterGroup>

              <div className="sm:ps-5">
                <FilterGroup
                  title="نوع معامله"
                  resetHref={buildHref(params, { offerType: undefined })}
                  isActive={Boolean(offerType)}
                >
                  {OFFER_TYPES.map((item) => (
                    <Chip
                      key={item.value}
                      href={buildHref(params, { offerType: item.value })}
                      active={offerType === item.value}
                    >
                      <span className="text-[12px]">{item.emoji}</span>
                      {item.label}
                    </Chip>
                  ))}
                </FilterGroup>
              </div>

              <div className="sm:ps-5">
                <FilterGroup
                  title="رشته تحصیلی"
                  resetHref={buildHref(params, { category: undefined })}
                  isActive={Boolean(category)}
                >
                  {CATEGORIES.map((item) => (
                    <Chip
                      key={item.value}
                      href={buildHref(params, { category: item.value })}
                      active={category === item.value}
                    >
                      <span className="text-[12px]">{item.emoji}</span>
                      {item.label}
                    </Chip>
                  ))}
                </FilterGroup>
              </div>
            </div>
          </details>
        </div>

        {/* ردیف ۳: فیلترهای فعال */}
        {hasFilters && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-dashed border-ink-100 pt-2.5">
            <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-ink-400">
              <Icon name="filter" className="size-3.5" />
              فعال:
            </span>
            {activeTokens.map((token) => (
              <FilterToken
                key={token.key}
                label={token.label}
                href={buildHref(params, { [token.key]: undefined })}
              />
            ))}
            <Link
              href="/books"
              className="rounded-md px-1.5 py-0.5 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
            >
              پاک کردن همه
            </Link>
          </div>
        )}
      </section>

      {/* -------------------------------- results ------------------------------- */}
      {books.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => {
            const firstPhoto = photosMap.get(book.id)?.[0];
            return (
              <BookCard
                key={book.id}
                book={book}
                photoUrl={firstPhoto ? `/api/photos/${firstPhoto.id}` : undefined}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="search"
          title="نتیجه‌ای پیدا نشد"
          description="جستجو را کوتاه‌تر کنید یا فیلترها را تغییر دهید؛ شاید این مورد هنوز در دانش‌بوک ثبت نشده باشد."
          actionLabel="مشاهده همه آگهی‌ها"
          actionHref="/books"
        />
      )}
    </div>
  );
}
