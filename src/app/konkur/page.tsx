import Link from "next/link";
import { BookCardGrid } from "@/components/BookCard";
import { Icon, type IconName } from "@/components/Icon";
import { EmptyState } from "@/components/ui";
import { faNumber, KINDS, OFFER_TYPES } from "@/lib/constants";
import { getStats, listBooks } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "هاب ویژه کنکور — منابع، جزوه و بانک تست",
  description:
    "بخش اختصاصی داوطلبان کنکور: کتاب کمک‌درسی، جزوه‌های جمع‌بندی، بانک تست و نمونه سوال سال‌های گذشته با امکان تبادل و واگذاری رایگان.",
  alternates: { canonical: "/konkur" },
  openGraph: {
    title: "هاب ویژه کنکور | دانش‌بوک",
    description: "منابع، جزوات جمع‌بندی، بانک تست و نمونه سوال کنکور.",
    url: "/konkur",
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const HUB_SECTIONS: { key: string; label: string; icon: IconName; patch: Record<string, string> }[] = [
  { key: "all", label: "همه منابع", icon: "crown", patch: {} },
  { key: "book", label: "کتاب کمک‌درسی", icon: "books", patch: { kind: "book" } },
  { key: "note", label: "جزوه جمع‌بندی", icon: "note", patch: { kind: "note" } },
  { key: "slide", label: "اسلاید و جزوه تایپی", icon: "presentation", patch: { kind: "slide" } },
  { key: "exam", label: "بانک تست و نمونه سوال", icon: "exam", patch: { kind: "exam" } },
  { key: "free", label: "واگذاری رایگان", icon: "gift", patch: { offerType: "free" } },
];

export default async function KonkurPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const kind = one(params.kind);
  const offerType = one(params.offerType);

  const [stats, resources] = await Promise.all([
    getStats(),
    listBooks({ audience: "konkur", kind, offerType, limit: 48 }),
  ]);

  const activeKey =
    kind === "book"
      ? "book"
      : kind === "note"
        ? "note"
        : kind === "slide"
          ? "slide"
          : kind === "exam"
            ? "exam"
            : offerType === "free"
              ? "free"
              : "all";

  return (
    <div className="space-y-8">
      {/* ------------------- full-bleed royal purple hero ------------------- */}
      <section className="relative -mx-4 -mt-8 overflow-hidden bg-gradient-to-bl from-[#1e1b4b] via-[#3b0764] to-[#5b21b6] px-4 py-10 text-white sm:-mx-6 sm:px-8 sm:py-12">
        <div className="aurora-blob -top-20 start-10 size-72 bg-[#a21caf]" aria-hidden />
        <div
          className="aurora-blob -bottom-24 end-10 size-64 bg-[#0ea5e9]"
          style={{ animationDelay: "-8s" }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#f0abfc]/40 bg-white/10 px-4 py-1.5 text-[12px] font-black tracking-wide backdrop-blur">
            <Icon name="crown" className="size-4 text-[#f0abfc]" />
            V.I.P HUB · ویژه کنکوری‌ها
          </span>

          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-[2.4rem] sm:leading-[1.35]">
            هاب اختصاصی{" "}
            <span className="bg-gradient-to-l from-[#f0abfc] via-[#c4b5fd] to-[#7dd3fc] bg-clip-text text-transparent">
              کنکور
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-8 text-[#ddd6fe]">
            همه منابع، جزوات، تست‌ها و نمونه سوالاتی که برای جمع‌بندی کنکور لازم داری، در یک فضای
            مجزا و آرام. این بخش کاملاً مستقل از بازار عمومی دانشگاه است.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "کل منابع ویژه", value: stats.konkur, icon: "crown" as const },
              { label: "جزوه جمع‌بندی", value: stats.notes, icon: "note" as const },
              { label: "نمونه سوال و تست", value: stats.exams, icon: "exam" as const },
              { label: "واگذاری رایگان", value: stats.free, icon: "gift" as const },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-white/15 bg-white/8 p-4 backdrop-blur"
              >
                <Icon name={item.icon} className="mx-auto size-5 text-[#f0abfc]" />
                <p className="mt-2 text-xl font-black">{faNumber(item.value)}</p>
                <p className="mt-0.5 text-[11px] font-bold text-[#ddd6fe]">{item.label}</p>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard/new"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-[#3b0764] shadow-2xl transition hover:-translate-y-0.5"
          >
            <Icon name="plus" className="size-4.5" />
            ثبت منبع کنکوری
          </Link>
        </div>
      </section>

      {/* -------------------------- section chips -------------------------- */}
      <section className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {HUB_SECTIONS.map((section) => {
          const search = new URLSearchParams({ audience: "konkur" });
          Object.entries(section.patch).forEach(([key, value]) => search.set(key, value));
          const href = section.key === "all" ? "/konkur" : `/konkur?${search.toString()}`;
          const active = activeKey === section.key;
          return (
            <Link
              key={section.key}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-[12.5px] font-bold transition ${
                active
                  ? "border-[#7c3aed] bg-[#5b21b6] text-white shadow-lg shadow-[#7c3aed]/30"
                  : "border-[#e9d5ff] bg-white text-[#6d28d9] hover:border-[#c084fc]"
              }`}
            >
              <Icon name={section.icon} className="size-4.5" />
              {section.label}
            </Link>
          );
        })}
      </section>

      {/* ---------------------------- resources ---------------------------- */}
      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-[#3b0764]">
              <Icon name="crown" className="size-5.5 text-[#7c3aed]" />
              منابع کنکور
            </h2>
            <p className="mt-1.5 text-sm text-ink-400">{faNumber(resources.length)} منبع فعال</p>
          </div>
          <div className="flex gap-2 text-[11.5px] font-bold">
            {KINDS.slice(1, 3).map((item) => (
              <span key={item.value} className="rounded-full bg-[#f5f0ff] px-3 py-1.5 text-[#6d28d9]">
                {item.emoji} {item.label}
              </span>
            ))}
            {OFFER_TYPES.slice(2, 3).map((item) => (
              <span key={item.value} className="rounded-full bg-[#f5f0ff] px-3 py-1.5 text-[#6d28d9]">
                {item.emoji} {item.label}
              </span>
            ))}
          </div>
        </div>

        {resources.length ? (
          <BookCardGrid books={resources} />
        ) : (
          <EmptyState
            icon="crown"
            title="هنوز منبعی در این بخش نیست"
            description="اولین جزوه جمع‌بندی یا بانک تست خود را برای کمک به کنکوری‌ها ثبت کن."
            actionLabel="ثبت منبع کنکوری"
            actionHref="/dashboard/new"
          />
        )}
      </section>

      {/* ------------------------- purple CTA strip ------------------------ */}
      <section className="rounded-[2rem] border border-[#e9d5ff] bg-gradient-to-l from-[#faf5ff] via-white to-[#f5f3ff] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-lg text-[13px] leading-8 text-[#5b21b6]">
            <span className="font-black">راهنما:</span> منابع کنکوری را با انتخاب گزینه «ویژه کنکور»
            در فرم ثبت آگهی منتشر کنید تا فقط در همین هاب نمایش داده شوند و در بازار عمومی شلوغی
            ایجاد نکنند.
          </p>
          <Link
            href="/books"
            className="flex items-center gap-1.5 rounded-2xl border border-[#ddd6fe] bg-white px-5 py-3 text-[13px] font-bold text-[#5b21b6] transition hover:border-[#a855f7]"
          >
            <Icon name="books" className="size-4.5" />
            بازار عمومی دانشگاه
          </Link>
        </div>
      </section>
    </div>
  );
}
