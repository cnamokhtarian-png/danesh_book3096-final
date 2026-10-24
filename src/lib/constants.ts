import type { IconName } from "@/components/Icon";

export const MANAGEMENT_EMAIL = "c.na.mokhtarian@gmail.com";

/* ---------------------------------------------------------------------------
 * TAXONOMY — kind × medium × offerType × audience
 * ------------------------------------------------------------------------- */

export const KINDS = [
  { value: "book", label: "کتاب فیزیکی", emoji: "📘", medium: "physical" },
  { value: "note", label: "جزوه", emoji: "📝", medium: "digital" },
  { value: "slide", label: "پاورپوینت / اسلاید", emoji: "📊", medium: "digital" },
  { value: "exam", label: "نمونه سوال امتحانی", emoji: "❓", medium: "digital" },
] as const;

export const MEDIUMS = [
  { value: "digital", label: "فایل‌های دیجیتال", emoji: "💾", hint: "دانلود آنی" },
  { value: "physical", label: "کتاب‌های فیزیکی", emoji: "📚", hint: "دست‌دوم و نو" },
] as const;

export const OFFER_TYPES = [
  { value: "sell", label: "خرید و فروش", emoji: "🛒" },
  { value: "exchange", label: "تبادل کتاب", emoji: "🔄" },
  { value: "free", label: "واگذاری رایگان / نذری", emoji: "🎁" },
  { value: "request", label: "درخواست کتاب", emoji: "🎯" },
] as const;

export const AUDIENCES = [
  { value: "general", label: "عمومی دانشگاهی" },
  { value: "konkur", label: "کنکور" },
] as const;

export const SUGGESTION_STATUSES = [
  { value: "new", label: "جدید", tone: "amber" as const },
  { value: "reviewing", label: "در حال بررسی", tone: "brand" as const },
  { value: "resolved", label: "رسیدگی شد", tone: "emerald" as const },
];

/* ------------------------------ derived labels ---------------------------- */

export function kindLabel(value: string): string {
  return KINDS.find((k) => k.value === value)?.label ?? "کتاب";
}

export function kindEmoji(value: string): string {
  return KINDS.find((k) => k.value === value)?.emoji ?? "📘";
}

export function mediumOfKind(value: string): "physical" | "digital" {
  return KINDS.find((k) => k.value === value)?.medium === "digital" ? "digital" : "physical";
}

export function mediumLabel(value: string): string {
  return MEDIUMS.find((m) => m.value === value)?.label ?? "فیزیکی";
}

export function offerLabel(value: string): string {
  return OFFER_TYPES.find((o) => o.value === value)?.label ?? "تبادل";
}

export function offerEmoji(value: string): string {
  return OFFER_TYPES.find((o) => o.value === value)?.emoji ?? "🔄";
}

export function suggestionStatusMeta(value: string) {
  return SUGGESTION_STATUSES.find((s) => s.value === value) ?? SUGGESTION_STATUSES[0];
}

/* ------------------------------ navigation map ---------------------------- */

export type NavLink = {
  href: string;
  label: string;
  icon: IconName;
  badge?: string;
  authOnly?: boolean;
  adminOnly?: boolean;
};

export const NAV_GROUPS: { title: string; icon: string; items: NavLink[] }[] = [
  {
    title: "بخش‌های اصلی",
    icon: "home",
    items: [
      { href: "/", label: "صفحه اصلی", icon: "home" },
      { href: "/books", label: "جستجوی همه آگهی‌ها", icon: "books" },
      { href: "/konkur", label: "بخش ویژه کنکور", icon: "crown", badge: "VIP" },
    ],
  },
  {
    title: "فایل‌های دیجیتال",
    icon: "presentation",
    items: [
      { href: "/books?medium=digital&kind=slide", label: "پاورپوینت و اسلایدها", icon: "presentation" },
      { href: "/books?medium=digital&kind=note", label: "جزوه‌های دست‌نویس و تایپی", icon: "note" },
      { href: "/books?medium=digital&kind=exam", label: "نمونه سوالات امتحانی", icon: "exam" },
    ],
  },
  {
    title: "کتاب‌های فیزیکی",
    icon: "books",
    items: [
      { href: "/books?medium=physical&offerType=sell", label: "خرید و فروش دست‌دوم", icon: "coin" },
      { href: "/books?medium=physical&offerType=free", label: "واگذاری رایگان (نذری)", icon: "gift" },
      { href: "/books?medium=physical&offerType=request", label: "درخواست کتاب", icon: "bookmark" },
    ],
  },
  {
    title: "حساب کاربری",
    icon: "user",
    items: [
      { href: "/dashboard", label: "داشبورد من", icon: "dashboard", authOnly: true },
      { href: "/dashboard/new", label: "ثبت آگهی جدید", icon: "plus" },
      { href: "/profile", label: "پروفایل", icon: "user", authOnly: true },
      { href: "/support", label: "پیشنهادات و پشتیبانی", icon: "headset" },
      { href: "/admin", label: "پنل مدیریت", icon: "shield", adminOnly: true },
    ],
  },
];

export const MOBILE_TABS: NavLink[] = [
  { href: "/", label: "خانه", icon: "home" },
  { href: "/books", label: "کتاب‌ها", icon: "books" },
  { href: "/konkur", label: "کنکور", icon: "crown" },
  { href: "/dashboard/new", label: "ثبت آگهی", icon: "plus" },
];

/* --------------------------------- misc ---------------------------------- */

export const CATEGORIES = [
  { value: "engineering", label: "فنی و مهندسی", emoji: "⚙️" },
  { value: "medicine", label: "پزشکی", emoji: "🩺" },
  { value: "basic", label: "علوم پایه", emoji: "🧪" },
  { value: "humanities", label: "علوم انسانی", emoji: "📚" },
  { value: "management", label: "مدیریت و اقتصاد", emoji: "📈" },
  { value: "art", label: "هنر و معماری", emoji: "🎨" },
  { value: "language", label: "زبان و ادبیات", emoji: "🗣️" },
  { value: "general", label: "عمومی", emoji: "🎒" },
] as const;

export const CONDITIONS = [
  { value: "new", label: "نو / دست‌نخورده" },
  { value: "good", label: "خوب" },
  { value: "used", label: "کارکرده" },
  { value: "worn", label: "کهنه ولی خوانا" },
] as const;

export const KONKUR_SUBJECTS = [
  { value: "konkur-math", label: "ریاضیات", emoji: "➗" },
  { value: "konkur-physics", label: "فیزیک", emoji: "🧲" },
  { value: "konkur-chemistry", label: "شیمی", emoji: "⚗️" },
  { value: "konkur-biology", label: "زیست‌شناسی", emoji: "🧬" },
  { value: "konkur-literature", label: "ادبیات و عربی", emoji: "✍️" },
  { value: "konkur-english", label: "زبان انگلیسی", emoji: "🔤" },
  { value: "konkur-general", label: "منابع عمومی", emoji: "🎯" },
] as const;

export const UNIVERSITIES = [
  "دانشگاه علوم پزشکی اصفهان",
  "دانشگاه تهران",
  "دانشگاه نجف آباد",
  "دانشکده فنی و حرفه ای",
  "دانشگاه صنعتی شریف",
  "دانشگاه امیرکبیر",
  "دانشگاه علم و صنعت",
  "دانشگاه شهید بهشتی",
  "دانشگاه علامه طباطبایی",
  "دانشگاه الزهرا",
  "دانشگاه خواجه نصیرالدین طوسی",
  "دانشگاه تربیت مدرس",
  "دانشگاه فردوسی مشهد",
  "دانشگاه اصفهان",
  "دانشگاه تبریز",
  "دانشگاه شیراز",
  "سایر",
] as const;

export const EMOJI_CHOICES = [
  "📘", "📗", "📕", "📙", "📓", "📔", "📐", "🧮", "🔬", "🩺",
  "🎨", "💻", "⚡", "🌍", "🧠", "✍️", "📊", "❓", "🎁", "🎯",
] as const;

export const AVATAR_CHOICES = ["🎓", "🧑‍🎓", "👩‍🔬", "👨‍💻", "🧑‍🏫", "📚", "🚀", "🌟"] as const;

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? "عمومی";
}

export function categoryEmoji(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.emoji ?? "🎒";
}

export function konkurSubjectLabel(value: string): string {
  return KONKUR_SUBJECTS.find((s) => s.value === value)?.label ?? "منابع عمومی";
}

export function konkurSubjectEmoji(value: string): string {
  return KONKUR_SUBJECTS.find((s) => s.value === value)?.emoji ?? "🎯";
}

/** گرادiente کاور پیش‌فرض بر اساس دسته‌بندی (هنگامی که آگهی عکس ندارد). */
export const COVER_GRADIENTS: Record<string, string> = {
  engineering: "from-blue-500 via-cyan-600 to-blue-700",
  medicine: "from-emerald-400 via-teal-600 to-emerald-700",
  basic: "from-amber-400 via-orange-600 to-amber-700",
  humanities: "from-indigo-500 via-purple-600 to-indigo-700",
  management: "from-rose-500 via-orange-400 to-rose-600",
  art: "from-fuchsia-500 via-violet-600 to-fuchsia-700",
  language: "from-cyan-400 via-blue-600 to-cyan-700",
  general: "from-brand-600 via-accent-500 to-brand-700",
};

export function coverGradient(category: string): string {
  return COVER_GRADIENTS[category] ?? COVER_GRADIENTS.general;
}

export function conditionLabel(value: string): string {
  return CONDITIONS.find((c) => c.value === value)?.label ?? "خوب";
}

export function requestKindLabel(value: string): string {
  if (value === "buy") return "خرید";
  if (value === "borrow") return "امانت‌گیری";
  return "تبادل";
}

export function statusLabel(value: string): string {
  if (value === "accepted") return "پذیرفته شد";
  if (value === "declined") return "رد شد";
  if (value === "exchanged") return "مبادله شد";
  return "در انتظار پاسخ";
}

export function formatPrice(price: number, offerType = "sell"): string {
  if (offerType === "free") return "واگذاری رایگان";
  if (offerType === "request") return "درخواست کتاب";
  if (!price) return "رایگان";
  return `${price.toLocaleString("fa-IR")} تومان`;
}

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return "—";
  }
}

export function timeAgo(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes.toLocaleString("fa-IR")} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours.toLocaleString("fa-IR")} ساعت پیش`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days.toLocaleString("fa-IR")} روز پیش`;
  return formatDate(date);
}

export function faNumber(value: number): string {
  return value.toLocaleString("fa-IR");
}
