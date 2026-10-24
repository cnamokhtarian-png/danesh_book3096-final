import Link from "next/link";
import { BookCardGrid } from "@/components/BookCard";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/ui";
import { CATEGORIES, faNumber, KINDS, MEDIUMS, OFFER_TYPES } from "@/lib/constants";
import { listBooks } from "@/lib/queries";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SORTS = [
  { value: "new", label: "جدیدترین" },
  { value: "cheap", label: "ارزان‌ترین" },
  { value: "popular", label: "پربازدیدترین" },
];

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

function Chip({
  active,
  children,
  tone = "brand",
}: {
  active: boolean;
  children: React.ReactNode;
  tone?: "brand" | "cyan" | "violet";
}) {
  const tones = {
    brand: "border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-500/25",
    cyan: "border-cyan-500 bg-cyan-500 text-white shadow-lg shadow-cyan-500/25",
    violet: "border-[#7c3aed] bg-[#7c3aed] text-white shadow-lg shadow-[#7c3aed]/25",
  };
  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-2xl border px-3.5 py-2 text-[12.5px] font-bold transition ${
        active ? tones[tone] : "border-ink-100 bg-white text-ink-600 hover:border-brand-200 hover:text-brand-700"
      }`}
    >
      {children}
    </span>
  );
}

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
  const hasFilters = Boolean(q || kind || medium || offerType || category);

  // کلاس مشترک برای اسکرول افقیِ مختصِ دکمه‌ها (بدون تأثیر روی برچسب ثابت)
  const chipsScrollContainer =
    "flex items-center gap-2 overflow-x-auto overflow-y-hidden py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-full";

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* هدر صفحه */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-ink-900">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/25">
              <Icon name="books" className="size-5.5" />
            </span>
            بازار کتاب و فایل دانشجویی
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            {faNumber(books.length)} آگهی فعال
            {q ? ` برای «${q}»` : ""}
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

      {/* پنل فیلترها */}
      <div className="card-surface space-y-3.5 p-4 overflow-hidden rounded-3xl shadow-sm bg-white border border-ink-100">
        
        {/* ردیف اول: بازار + مرتب‌سازی */}
        <div className="flex items-center gap-3">
          <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-bold text-ink-500 w-20">
            <Icon name="filter" className="size-4" />
            بازار:
          </span>
          <div className={chipsScrollContainer}>
            <Link href={buildHref(params, { medium: undefined })} className="shrink-0">
              <Chip active={!medium}>همه</Chip>
            </Link>
            {MEDIUMS.map((item) => (
              <Link
                key={item.value}
                href={buildHref(params, { medium: item.value })}
                className="shrink-0"
              >
                <Chip active={medium === item.value} tone="cyan">
                  {item.emoji} {item.label}
                </Chip>
              </Link>
            ))}
            <span className="mx-2 h-6 w-px shrink-0 bg-ink-100" />
            {SORTS.map((item) => (
              <Link
                key={item.value}
                href={buildHref(params, { sort: item.value === "new" ? undefined : item.value })}
                className="shrink-0"
              >
                <Chip active={sort === item.value}>{item.label}</Chip>
              </Link>
            ))}
            {hasFilters && (
              <>
                <span className="mx-2 h-6 w-px shrink-0 bg-ink-100" />
                <Link
                  href="/books"
                  className="shrink-0 whitespace-nowrap rounded-2xl border border-rose-100 bg-rose-50 px-3.5 py-2 text-[12.5px] font-bold text-rose-600 transition hover:bg-rose-100"
                >
                  حذف فیلترها
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ردیف دوم: نوع */}
        <div className="flex items-center gap-3 border-t border-dashed border-ink-100 pt-3">
          <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-bold text-ink-500 w-20">
            <Icon name="note" className="size-4" />
            نوع:
          </span>
          <div className={chipsScrollContainer}>
            <Link href={buildHref(params, { kind: undefined })} className="shrink-0">
              <Chip active={!kind}>همه انواع</Chip>
            </Link>
            {KINDS.map((item) => (
              <Link key={item.value} href={buildHref(params, { kind: item.value })} className="shrink-0">
                <Chip active={kind === item.value} tone="violet">
                  {item.emoji} {item.label}
                </Chip>
              </Link>
            ))}
          </div>
        </div>

        {/* ردیف سوم: معامله */}
        <div className="flex items-center gap-3 border-t border-dashed border-ink-100 pt-3">
          <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-bold text-ink-500 w-20">
            <Icon name="exchange" className="size-4" />
            معامله:
          </span>
          <div className={chipsScrollContainer}>
            <Link href={buildHref(params, { offerType: undefined })} className="shrink-0">
              <Chip active={!offerType}>همه</Chip>
            </Link>
            {OFFER_TYPES.map((item) => (
              <Link
                key={item.value}
                href={buildHref(params, { offerType: item.value })}
                className="shrink-0"
              >
                <Chip active={offerType === item.value}>
                  {item.emoji} {item.label}
                </Chip>
              </Link>
            ))}
          </div>
        </div>

        {/* ردیف چهارم: رشته */}
        <div className="flex items-center gap-3 border-t border-dashed border-ink-100 pt-3">
          <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-bold text-ink-500 w-20">
            <Icon name="grad" className="size-4" />
            رشته:
          </span>
          <div className={chipsScrollContainer}>
            <Link href={buildHref(params, { category: undefined })} className="shrink-0">
              <Chip active={!category}>همه رشته‌ها</Chip>
            </Link>
            {CATEGORIES.map((item) => (
              <Link
                key={item.value}
                href={buildHref(params, { category: item.value })}
                className="shrink-0"
              >
                <Chip active={category === item.value}>
                  {item.emoji} {item.label}
                </Chip>
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* بخش نمایش کارت‌های کتاب */}
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
