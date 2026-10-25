import Link from "next/link";
import ShareButton from "@/components/ShareButton";
import { BookCardGrid } from "@/components/BookCard";
import BookMarketAnimation from "@/components/BookMarketAnimation";
import JsonLd from "@/components/JsonLd";
import GamePromoBanner from "@/components/GamePromoBanner";
import { SearchField } from "@/components/AppShell";
import { Icon, type IconName } from "@/components/Icon";
import { EmptyState, SectionHeading, StatTile } from "@/components/ui";
import { faNumber, MANAGEMENT_EMAIL } from "@/lib/constants";
import { getStats, listBooks } from "@/lib/queries";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

type SubLink = {
  href: string;
  title: string;
  desc: string;
  icon: IconName;
  count?: number;
  emoji: string;
};

export default async function HomePage() {
  const [stats, latest] = await Promise.all([getStats(), listBooks({ limit: 6 })]);

  const digital: SubLink[] = [
    {
      href: "/books?medium=digital&kind=slide",
      title: "پاورپوینت و اسلایدهای درسی",
      desc: "اسلایدهای اساتید برای مرور سریع قبل از امتحان",
      icon: "presentation",
      count: stats.slides,
      emoji: "📊",
    },
    {
      href: "/books?medium=digital&kind=note",
      title: "جزوه‌های دست‌نویس و تایپ‌شده",
      desc: "جزوه‌های کامل، خلاصه‌نویسی‌شده و کلاس‌برداری‌شده",
      icon: "note",
      count: stats.notes,
      emoji: "📝",
    },
    {
      href: "/books?medium=digital&kind=exam",
      title: "نمونه سوالات امتحانی",
      desc: "میان‌ترم، پایان‌ترم و سوالات سال‌های گذشته",
      icon: "exam",
      count: stats.exams,
      emoji: "❓",
    },
  ];

  const physical: SubLink[] = [
    {
      href: "/books?medium=physical&offerType=sell",
      title: "خرید و فروش کتاب دست‌دوم",
      desc: "کتاب‌های دانشگاهی نو و کارکرده با قیمت منصفانه",
      icon: "coin",
      count: stats.sell,
      emoji: "🛒",
    },
    {
      href: "/books?medium=physical&offerType=free",
      title: "واگذاری رایگان / نذری کتاب",
      desc: "کتاب خود را مجانی به دانشجوی بعدی هدیه بدهید",
      icon: "gift",
      count: stats.free,
      emoji: "🎁",
    },
    {
      href: "/books?medium=physical&offerType=request",
      title: "درخواست کتاب",
      desc: "کتابی که دنبالش هستید را اینجا ثبت کنید",
      icon: "bookmark",
      count: stats.wanted,
      emoji: "🎯",
    },
  ];

  // داده ساختاریافته صفحه اصلی: سازمان + سایت + جستجوی داخلی
  const siteSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE.url}/#organization`,
        name: SITE.name,
        url: SITE.url,
        logo: `${SITE.url}/images/og-cover.jpg`,
        email: SITE.email,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        url: SITE.url,
        name: SITE.name,
        inLanguage: "fa-IR",
        publisher: { "@id": `${SITE.url}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE.url}/books?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <div className="-mt-4 space-y-12">
      <JsonLd data={siteSchema} />

      {/* بازی، جست‌وجو و ثبت‌نام در ابتدای صفحه؛ سپس تصویرسازی و متن Hero */}
      <div className="space-y-2.5 sm:space-y-3">
        <GamePromoBanner />

        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <SearchField className="min-w-0 flex-1" />
          <Link
            href="/register"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-l from-brand-700 via-brand-600 to-brand-500 px-3 py-2.5 text-[12px] font-extrabold whitespace-nowrap text-white shadow-lg shadow-brand-500/25 transition hover:-translate-y-0.5 sm:px-4 sm:text-sm"
          >
            <Icon name="user" className="size-4" />
            ثبت‌نام رایگان
          </Link>
        </div>

        {/* ------------------------------- hero ------------------------------- */}
        <section className="animate-fade-up relative overflow-hidden rounded-[2rem] border border-ink-100 bg-white px-4 py-5 sm:px-8 sm:py-6 md:px-10 md:py-7">
          <div className="aurora-blob -end-24 -top-24 size-72 bg-brand-300" aria-hidden />
          <div
            className="aurora-blob -bottom-32 start-0 size-80 bg-accent-400/70"
            style={{ animationDelay: "-6s" }}
            aria-hidden
          />

          <div className="relative flex flex-col items-center gap-1.5">
            <div className="relative mx-auto w-full max-w-[320px] sm:max-w-[340px]">
              <BookMarketAnimation />
            </div>

            <div className="w-full max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-white/85 px-3 py-1 text-[10px] font-bold text-brand-700 shadow-sm sm:text-[11px]">
                <Icon name="sparkles" className="size-3.5" />
                بازار دانشجویی کتاب، جزوه و فایل‌های درسی
              </span>

              <h1 className="mt-2 text-[1.7rem] leading-[1.2] font-extrabold tracking-tight text-ink-900 sm:text-[2.4rem] sm:leading-[1.2]">
                هرچی برای درس لازم داری،{" "}
                <span className="bg-gradient-to-l from-brand-600 via-brand-500 to-accent-500 bg-clip-text text-transparent">
                  همین‌جاست.
                </span>
              </h1>

              <p className="mx-auto mt-2 max-w-xl text-[12px] leading-5 text-ink-600 sm:text-[14px] sm:leading-7">
                کتاب بخر یا بفروش، جزوه پیدا کن و مستقیم با دانشجوها گفت‌وگو کن.
              </p>

              <div className="mt-3 flex justify-center">
                <Link
                  href="/books"
                  className="inline-flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-5 py-2.5 text-[12px] font-bold text-ink-800 transition hover:border-brand-200 hover:text-brand-700 sm:text-sm"
                >
                  <Icon name="books" className="size-4.5" />
                  مرور همه آگهی‌ها
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ------------------------------ stats ------------------------------ */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon="books" label="کتاب فیزیکی" value={faNumber(stats.books)} />
        <StatTile icon="note" label="جزوه و اسلاید" value={faNumber(stats.notes + stats.slides)} tone="amber" />
        <StatTile icon="users" label="دانشجوی عضو" value={faNumber(stats.students)} tone="emerald" />
        <StatTile icon="crown" label="منابع ویژه کنکور" value={faNumber(stats.konkur)} tone="rose" />
      </section>

      {/* --------------------- section: digital files ---------------------- */}
      <section>
        <SectionHeading
          icon="presentation"
          title="بخش فایل‌های دیجیتال"
          subtitle="دانلود آنی جزوه، پاورپوینت و نمونه سوال — بدون نیاز به پست و مراجعه"
        />
        <div className="grid gap-4 md:grid-cols-3">
          {digital.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card-surface group relative overflow-hidden p-5 transition hover:-translate-y-1 hover:border-cyan-200"
            >
              <div
                className="absolute inset-x-0 -top-16 h-32 bg-gradient-to-b from-cyan-100/70 to-transparent"
                aria-hidden
              />
              <div className="relative flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-white text-2xl shadow-sm">
                  {item.emoji}
                </span>
                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-black text-cyan-700">
                  {faNumber(item.count ?? 0)} مورد
                </span>
              </div>
              <h3 className="relative mt-4 flex items-center gap-2 text-[15px] font-extrabold text-ink-900">
                <Icon name={item.icon} className="size-4.5 text-cyan-600" />
                {item.title}
              </h3>
              <p className="relative mt-2 text-[12.5px] leading-7 text-ink-400">{item.desc}</p>
              <span className="relative mt-4 inline-flex items-center gap-1 text-[12px] font-bold text-cyan-700">
                ورود به بخش
                <Icon name="back" className="size-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* -------------------- section: physical books ---------------------- */}
      <section>
        <SectionHeading
          icon="books"
          title="بخش کتاب‌های فیزیکی"
          subtitle="کتاب دست‌دوم بخر، بفروش، تبادل کن یا به‌صورت نذری واگذار کن"
        />
        <div className="grid gap-4 md:grid-cols-3">
          {physical.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card-surface group relative overflow-hidden p-5 transition hover:-translate-y-1 hover:border-brand-200"
            >
              <div
                className="absolute inset-x-0 -top-16 h-32 bg-gradient-to-b from-brand-100/80 to-transparent"
                aria-hidden
              />
              <div className="relative flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-white text-2xl shadow-sm">
                  {item.emoji}
                </span>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-black text-brand-700">
                  {faNumber(item.count ?? 0)} مورد
                </span>
              </div>
              <h3 className="relative mt-4 flex items-center gap-2 text-[15px] font-extrabold text-ink-900">
                <Icon name={item.icon} className="size-4.5 text-brand-600" />
                {item.title}
              </h3>
              <p className="relative mt-2 text-[12.5px] leading-7 text-ink-400">{item.desc}</p>
              <span className="relative mt-4 inline-flex items-center gap-1 text-[12px] font-bold text-brand-700">
                ورود به بخش
                <Icon name="back" className="size-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------ VIP konkur banner ------------------------ */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-bl from-[#2e1065] via-[#4c1d95] to-[#6d28d9] p-7 text-white sm:p-10">
        <div className="aurora-blob -top-16 start-10 size-64 bg-[#c026d3]" aria-hidden />
        <div className="aurora-blob -bottom-20 end-10 size-56 bg-[#38bdf8]" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11.5px] font-black tracking-wide backdrop-blur">
              <Icon name="crown" className="size-4" />
              بخش ویژه و اختصاصی کنکوری‌ها
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-[2rem] sm:leading-[1.4]">
              هاب کنکور؛ منابع، جزوات و تست‌های جمع‌بندی
            </h2>
            <p className="mt-3 text-[13.5px] leading-8 text-[#e9d5ff]">
              یک فضای کاملاً مجزا با رنگ‌بندی سلطنتی، مخصوص داوطلبان کنکور: کتاب‌های کمک‌درسی،
              جزوه‌های جمع‌بندی، بانک تست و نمونه سوال سال‌های گذشته.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11.5px] font-bold">
              {["کتاب کمک‌درسی", "جزوه جمع‌بندی", "بانک تست", "نمونه سوال"].map((tag) => (
                <span key={tag} className="rounded-full bg-white/12 px-3 py-1.5 backdrop-blur">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3">
            <Link
              href="/konkur"
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-black text-[#4c1d95] shadow-2xl transition hover:-translate-y-0.5"
            >
              <Icon name="crown" className="size-5" />
              ورود به هاب کنکور
            </Link>
            <span className="rounded-2xl border border-white/20 bg-white/5 px-4 py-2.5 text-center text-[11.5px] font-bold text-[#e9d5ff]">
              {faNumber(stats.konkur)} منبع ویژه ثبت شده است
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------ latest ----------------------------- */}
      <section>
        <SectionHeading
          icon="bolt"
          title="تازه‌ترین آگهی‌ها"
          subtitle="کتاب‌ها، جزوه‌ها و فایل‌هایی که همین چند روز گذشته منتشر شده‌اند"
          action={
            <Link
              href="/books"
              className="flex items-center gap-1.5 text-sm font-bold text-brand-600 transition hover:text-brand-700"
            >
              همه آگهی‌ها
              <Icon name="back" className="size-4" />
            </Link>
          }
        />
        {latest.length ? (
          <BookCardGrid books={latest} />
        ) : (
          <EmptyState
            icon="books"
            title="هنوز آگهی ثبت نشده است"
            description="اولین نفری باش که کتاب یا فایل درسی‌اش را در دانش‌بوک منتشر می‌کند."
            actionLabel="ثبت اولین آگهی"
            actionHref="/dashboard/new"
          />
        )}
      </section>

      {/* ---------------------------- support CTA -------------------------- */}
      <section className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
        <div className="card-surface p-6">
          <SectionHeading
            icon="headset"
            title="پیشنهادات و انتقادات شما"
            subtitle="نظرات شما مسیر توسعه دانش‌بوک را می‌سازد"
          />
          <p className="text-[13.5px] leading-8 text-ink-600">
            اگر ایده‌ای برای بهتر شدن بخش‌ها دارید، مشکلی دیدید یا به پشتیبانی نیاز دارید، از طریق
            فرم پیشنهادات برایمان بنویسید. همه پیام‌ها مستقیماً در پنل مدیریت ثبت و بررسی می‌شود.
          </p>
          <Link
            href="/support"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25"
          >
            <Icon name="send" className="size-4.5" />
            ارسال پیشنهاد
          </Link>
        </div>
        <div className="card-surface flex flex-col justify-center gap-3 p-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-ink-50 text-ink-500">
            <Icon name="mail" className="size-6" />
          </span>
          <p className="text-[12.5px] font-bold text-ink-800">ایمیل مدیریت</p>
          <a
            href={`mailto:${MANAGEMENT_EMAIL}`}
            dir="ltr"
            className="rounded-2xl bg-ink-50 px-3 py-2.5 text-[12px] font-bold text-brand-700 break-all"
          >
            {MANAGEMENT_EMAIL}
          </a>
        </div>
      </section>

      {/* --------------------------- growth: share -------------------------- */}
      <section className="card-surface flex flex-wrap items-center justify-between gap-5 p-6">
        <div className="min-w-0 max-w-xl">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-900">
            <span className="grid size-9 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Icon name="send" className="size-4.5" />
            </span>
            دانش‌بوک را به دوستت معرفی کن
          </h2>
          <p className="mt-2 text-[13px] leading-8 text-ink-500">
            هر دانشجویی که به دانش‌بوک اضافه می‌شود، شانس پیدا کردن کتاب و جزوه‌ی مناسب را
            برای همه بیشتر می‌کند. لینک سایت را در گروه کلاسی‌ات بفرست.
          </p>
        </div>
        <ShareButton title="دانش‌بوک؛ کتاب و جزوه" path="/" variant="inline" kind="site" />
      </section>
    </div>
  );
}
