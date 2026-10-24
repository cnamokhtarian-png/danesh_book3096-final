import Link from "next/link";
import { BookCardGrid } from "@/components/BookCard";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/ui";
import { CATEGORIES, faNumber, KINDS, OFFER_TYPES } from "@/lib/constants";
import { listBooks } from "@/lib/queries";

export const dynamic = "force-dynamic";

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

/** دکمه سگمنتی (کنترل بازاری/مرتب‌سازی) — حالت فعال با گرادیان و سایه. */
function Segment({
  href,
  active,
  children,
  icon,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-bold whitespace-nowrap transition ${
        active
          ? "bg-white text-brand-700 shadow-sm ring-1 ring-brand-200"
          : "text-ink-500 hover:bg-white/70 hover:text-ink-800"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

/** چیپ انتخاب داخل پنل «فیلترهای بیشتر». */
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
      className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[12px] font-bold whitespace-nowrap transition ${
        active
          ? "border-brand-500 bg-brand-500 text-white shadow-sm shadow-brand-500/25"
          : "border-ink-100 bg-white text-ink-600 hover:border-brand-200 hover:text-brand-700"
      }`}
    >
      {children}
    </Link>
  );
}

/** برچسب فیلتر فعال با دکمه حذف. */
function FilterToken({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      title="حذف این فیلتر"
      className="group inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pr-2.5 pl-1.5 text-[11.5px] font-bold text-brand-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
    >
      {label}
      <span className="grid size-4 place-items-center rounded-full bg-white/80 text-ink-400 transition group-hover:bg-rose-100 group-hover:text-rose-600">
        <Icon name="x" className="size-2.5" />
      </span>
    </Link>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-2 block text-[11px] font-black tracking-wide text-ink-400">
      {children}
    </span>
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
            {hasFilters ? " با فیلترهای انتخابی" : " فعال"}
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
      <section className="card-surface overflow-hidden p-3.5 sm:p-4">
        {/* ردیف ۱: جستجو + مرتب‌سازی */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
              className="field-base pr-11 pl-24"
              autoComplete="off"
            />
            <div className="absolute inset-y-0 left-1.5 my-auto flex items-center gap-1">
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
                className="flex h-8 items-center gap-1 rounded-lg bg-ink-900 px-3 text-[11.5px] font-bold text-white transition hover:bg-brand-700"
              >
                جستجو
              </button>
            </div>
          </form>

          {/* مرتب‌سازی */}
          <div className="flex items-center gap-2">
            <span className="hidden shrink-0 items-center gap-1 text-[11.5px] font-bold text-ink-400 sm:flex">
              <Icon name="filter" className="size-3.5" />
              ترتیب
            </span>
            <div className="flex flex-1 items-center gap-0.5 rounded-2xl bg-ink-50 p-1">
              {SORTS.map((item) => (
                <Segment
                  key={item.value}
                  href={buildHref(params, {
                    sort: item.value === "new" ? undefined : item.value,
                  })}
                  active={sort === item.value}
                  icon={<Icon name={item.icon} className="size-3.5" />}
                >
                  {item.label}
                </Segment>
              ))}
            </div>
          </div>
        </div>

        {/* ردیف ۲: بازار + فیلترهای بیشتر */}
        <div className="mt-3 flex flex-col gap-2.5 border-t border-dashed border-ink-100 pt-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-0.5 rounded-2xl bg-ink-50 p-1">
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

          <details className="group sm:w-auto" open={hasAdvancedFilters}>
            <summary
              className={`flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-2xl border px-3.5 py-2 text-[12.5px] font-bold transition select-none [&::-webkit-details-marker]:hidden ${
                hasAdvancedFilters
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-ink-100 bg-white text-ink-600 hover:border-brand-200 hover:text-brand-700"
              }`}
            >
              <Icon name="filter" className="size-4" />
              فیلترهای بیشتر
              {hasAdvancedFilters && (
                <span className="grid size-4.5 place-items-center rounded-full bg-brand-600 text-[9.5px] font-black text-white">
                  {faNumber([kind, offerType, category].filter(Boolean).length)}
                </span>
              )}
              <Icon
                name="chevron"
                className="size-3.5 transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="mt-3 grid gap-4 rounded-2xl border border-ink-100 bg-ink-50/50 p-3.5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <GroupLabel>نوع محتوا</GroupLabel>
                <div className="flex flex-wrap gap-1.5">
                  <Chip href={buildHref(params, { kind: undefined })} active={!kind}>
                    همه
                  </Chip>
                  {KINDS.map((item) => (
                    <Chip
                      key={item.value}
                      href={buildHref(params, { kind: item.value })}
                      active={kind === item.value}
                    >
                      <span>{item.emoji}</span>
                      {item.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <GroupLabel>نوع معامله</GroupLabel>
                <div className="flex flex-wrap gap-1.5">
                  <Chip href={buildHref(params, { offerType: undefined })} active={!offerType}>
                    همه
                  </Chip>
                  {OFFER_TYPES.map((item) => (
                    <Chip
                      key={item.value}
                      href={buildHref(params, { offerType: item.value })}
                      active={offerType === item.value}
                    >
                      <span>{item.emoji}</span>
                      {item.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <GroupLabel>رشته تحصیلی</GroupLabel>
                <div className="flex flex-wrap gap-1.5">
                  <Chip href={buildHref(params, { category: undefined })} active={!category}>
                    همه
                  </Chip>
                  {CATEGORIES.map((item) => (
                    <Chip
                      key={item.value}
                      href={buildHref(params, { category: item.value })}
                      active={category === item.value}
                    >
                      <span>{item.emoji}</span>
                      {item.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* ردیف ۳: فیلترهای فعال */}
        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-dashed border-ink-100 pt-3">
            <span className="text-[11.5px] font-bold text-ink-400">فیلترهای فعال:</span>
            {activeTokens.map((token) => (
              <FilterToken
                key={token.key}
                label={token.label}
                href={buildHref(params, { [token.key]: undefined })}
              />
            ))}
            <Link
              href="/books"
              className="mr-auto text-[11.5px] font-bold text-rose-600 transition hover:text-rose-700 hover:underline"
            >
              پاک کردن همه
            </Link>
          </div>
        )}
      </section>

      {/* -------------------------------- results ------------------------------- */}
      {books.length ? (
        <BookCardGrid books={books} />
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
