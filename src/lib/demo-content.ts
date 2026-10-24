/**
 * محتوای نمونه برای پر کردن سایت در روزهای اول.
 *
 * یک بازار خالی هیچ‌وقت خریدار جذب نمی‌کند. این فایل ۲۰ دانشجوی نمونه و
 * ۲۳ آگهی می‌سازد که ۱۵ تای آن‌ها **فایل واقعی قابل دانلود** دارند:
 *
 *  - ۱۰ فایل PDF و ۵ فایل PowerPoint که در `public/samples/` خود سایت قرار
 *    گرفته‌اند (از دوره‌های آزاد و رایگان گرفته شده‌اند و منبعشان در توضیح
 *    هر آگهی ذکر شده است).
 *  - ۸ آگهی کتاب فیزیکی با قیمت و توضیح واقعی.
 *
 * نکات:
 *  - همه‌ی آگهی‌ها به نام یکی از همان ۲۰ کاربر ثبت می‌شوند.
 *  - اجرای دوباره‌ی این تابع داده‌ی تکراری نمی‌سازد (بر اساس ایمیل کاربر و
 *    عنوان آگهی چک می‌کند).
 *  - فقط INSERT است؛ هیچ ردیف یا جدول موجودی تغییر نمی‌کند.
 */
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { and, count, eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import { books, users } from "@/db/schema";
import { attachFileToBook, ensureFileSchema, saveExternalLink } from "@/lib/files";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

/** همان قالب hashPassword در src/lib/auth.ts (scrypt$salt$hex). */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

type DemoUser = {
  fullName: string;
  email: string;
  university: string;
  major: string;
  avatarEmoji: string;
  karmaPoints: number;
  bio: string;
};

type DemoListing = {
  ownerEmail: string;
  title: string;
  kind: "book" | "note" | "slide" | "exam";
  category: string;
  course?: string;
  author?: string;
  university?: string;
  price: number;
  offerType: "sell" | "exchange" | "free";
  isExchangeable?: boolean;
  condition?: string;
  coverEmoji: string;
  description: string;
  /** فایل واقعی داخل خود سایت (public/samples) */
  file?: { path: string; name: string; size: number; mime: string };
  daysAgo: number;
  views: number;
};

/* -------------------------------------------------------------------------- */
/*                                   کاربران                                  */
/* -------------------------------------------------------------------------- */

const DEMO_USERS: DemoUser[] = [
  {
    fullName: "سارا محمدی",
    email: "sara.mohammadi@daneshbook.local",
    university: "دانشگاه تهران",
    major: "مهندسی کامپیوتر",
    avatarEmoji: "👩",
    karmaPoints: 84,
    bio: "ترم ۵ کامپیوتر؛ جزوه‌هام رو مرتب می‌نویسم و دوست دارم به بقیه هم برسه.",
  },
  {
    fullName: "امیرحسین کریمی",
    email: "amirhossein.karimi@daneshbook.local",
    university: "دانشگاه صنعتی شریف",
    major: "مهندسی برق",
    avatarEmoji: "🧑",
    karmaPoints: 61,
    bio: "برق — قدرت. کتاب‌های ترم‌های قبل رو می‌فروشم تا جا برای کتاب‌های جدید باز بشه.",
  },
  {
    fullName: "نگار رضایی",
    email: "negar.rezaei@daneshbook.local",
    university: "دانشگاه علوم پزشکی تهران",
    major: "پزشکی",
    avatarEmoji: "👩",
    karmaPoints: 47,
    bio: "پزشکی، ترم ۳. بیشتر جزوه و نمونه سوال آپلود می‌کنم.",
  },
  {
    fullName: "محمدرضا احمدی",
    email: "mohammadreza.ahmadi@daneshbook.local",
    university: "دانشگاه فردوسی مشهد",
    major: "ریاضی کاربردی",
    avatarEmoji: "👨",
    karmaPoints: 39,
    bio: "ریاضی و آمار؛ جزوه‌های تمرین‌محور و حل‌التمرین.",
  },
  {
    fullName: "الهام صادقی",
    email: "elham.sadeghi@daneshbook.local",
    university: "دانشگاه علامه طباطبایی",
    major: "مدیریت بازرگانی",
    avatarEmoji: "👩",
    karmaPoints: 28,
    bio: "مدیریت؛ خلاصه‌ی درس‌ها و اسلایدهای ارائه.",
  },
  {
    fullName: "پارسا نیک‌نام",
    email: "parsa.niknam@daneshbook.local",
    university: "دانشگاه صنعتی امیرکبیر",
    major: "مهندسی کامپیوتر",
    avatarEmoji: "🧑",
    karmaPoints: 73,
    bio: "برنامه‌نویسی و ساختمان داده؛ تدریس خصوصی هم می‌کنم.",
  },
  {
    fullName: "زهرا موسوی",
    email: "zahra.mousavi@daneshbook.local",
    university: "دانشگاه الزهرا",
    major: "آمار",
    avatarEmoji: "👩",
    karmaPoints: 55,
    bio: "آمار و احتمال؛ عاشق خلاصه‌نویسی مرتب.",
  },
  {
    fullName: "کیان رستمی",
    email: "kian.rostami@daneshbook.local",
    university: "دانشگاه علم و صنعت",
    major: "مهندسی صنایع",
    avatarEmoji: "👨",
    karmaPoints: 34,
    bio: "مهندسی صنایع؛ تحلیل داده و بهینه‌سازی.",
  },
  {
    fullName: "مهسا شریفی",
    email: "mahsa.sharifi@daneshbook.local",
    university: "دانشگاه شهید بهشتی",
    major: "حقوق",
    avatarEmoji: "👩",
    karmaPoints: 41,
    bio: "حقوق؛ جزوه‌های متون فقه و حقوق مدنی.",
  },
  {
    fullName: "سینا فتحی",
    email: "sina.fathi@daneshbook.local",
    university: "دانشگاه صنعتی خواجه نصیر",
    major: "مهندسی مکانیک",
    avatarEmoji: "🧑",
    karmaPoints: 22,
    bio: "مکانیک — حرارت و سیالات.",
  },
  {
    fullName: "نیلوفر باقری",
    email: "niloofar.bagheri@daneshbook.local",
    university: "دانشگاه شیراز",
    major: "علوم کامپیوتر",
    avatarEmoji: "👩",
    karmaPoints: 66,
    bio: "علوم کامپیوتر؛ یادگیری ماشین و پایتون.",
  },
  {
    fullName: "علی صالحی",
    email: "ali.salehi@daneshbook.local",
    university: "دانشگاه تبریز",
    major: "مهندسی عمران",
    avatarEmoji: "👨",
    karmaPoints: 19,
    bio: "عمران؛ مقاومت مصالح و تحلیل سازه.",
  },
  {
    fullName: "فاطمه حسینی",
    email: "fatemeh.hosseini@daneshbook.local",
    university: "دانشگاه اصفهان",
    major: "شیمی",
    avatarEmoji: "👩",
    karmaPoints: 31,
    bio: "شیمی کاربردی؛ آزمایشگاه و شیمی آلی.",
  },
  {
    fullName: "آرمان یزدانی",
    email: "arman.yazdani@daneshbook.local",
    university: "دانشگاه تهران",
    major: "اقتصاد",
    avatarEmoji: "🧑",
    karmaPoints: 25,
    bio: "اقتصاد؛ آمار و اقتصاد سنجی.",
  },
  {
    fullName: "یاسمن کریمی",
    email: "yasaman.karimi@daneshbook.local",
    university: "دانشگاه گیلان",
    major: "معماری",
    avatarEmoji: "👩",
    karmaPoints: 37,
    bio: "معماری؛ اسلایدهای ارائه و جزوه‌های طراحی.",
  },
  {
    fullName: "حسین مرادی",
    email: "hossein.moradi@daneshbook.local",
    university: "دانشگاه ارومیه",
    major: "مهندسی برق",
    avatarEmoji: "👨",
    karmaPoints: 44,
    bio: "برق — الکترونیک و کنترل.",
  },
  {
    fullName: "رعنا تقوی",
    email: "rana.taghavi@daneshbook.local",
    university: "دانشگاه فردوسی مشهد",
    major: "ادبیات انگلیسی",
    avatarEmoji: "👩",
    karmaPoints: 29,
    bio: "ادبیات انگلیسی؛ زبان عمومی و تخصصی.",
  },
  {
    fullName: "بهنام اکبری",
    email: "behnam.akbari@daneshbook.local",
    university: "دانشگاه صنعتی اصفهان",
    major: "مهندسی مواد",
    avatarEmoji: "🧑",
    karmaPoints: 33,
    bio: "مهندسی مواد؛ متالورژی فیزیکی.",
  },
  {
    fullName: "شیدا نوری",
    email: "sheida.nouri@daneshbook.local",
    university: "دانشگاه علوم پزشکی ایران",
    major: "پرستاری",
    avatarEmoji: "👩",
    karmaPoints: 26,
    bio: "پرستاری؛ جزوه‌های فیزیولوژی و آناتومی.",
  },
  {
    fullName: "کاوه رحیمی",
    email: "kaveh.rahimi@daneshbook.local",
    university: "دانشگاه علامه طباطبایی",
    major: "حسابداری",
    avatarEmoji: "👨",
    karmaPoints: 21,
    bio: "حسابداری؛ اصول و حسابداری میانه.",
  },
];

const PDF_MIME = "application/pdf";
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const R_CREDIT = "منبع: مجموعه‌ی چیت‌شیت‌های آزاد Posit/RStudio (لایسنس CC BY 4.0) — نسخه‌ی اصلی در GitHub.";

/* -------------------------------------------------------------------------- */
/*                                   آگهی‌ها                                  */
/* -------------------------------------------------------------------------- */

const DEMO_LISTINGS: DemoListing[] = [
  /* ------------------------- ۱۰ آگهی PDF ------------------------- */
  {
    ownerEmail: "sara.mohammadi@daneshbook.local",
    title: "چیت‌شیت برنامه‌نویسی R — از صفر تا تحلیل داده",
    kind: "note",
    category: "engineering",
    course: "برنامه‌نویسی و تحلیل داده",
    author: "Posit / RStudio",
    university: "دانشگاه تهران",
    price: 0,
    offerType: "free",
    coverEmoji: "📝",
    description:
      "خلاصه‌ی دو صفحه‌ای و تصویری از همه‌ی دستورهای پایه‌ی R: ساختن بردار و دیتافریم، زیرمجموعه‌گیری، توابع، خواندن و نوشتن فایل.\n\nبرای کسی که تازه R را شروع کرده عالی است؛ کنار لپ‌تاپ بازش کن و همان‌جا تمرین کن.\n\n" +
      R_CREDIT,
    file: { path: "/samples/r-programming.pdf", name: "R-Cheatsheet.pdf", size: 204144, mime: PDF_MIME },
    daysAgo: 1,
    views: 46,
  },
  {
    ownerEmail: "kian.rostami@daneshbook.local",
    title: "خلاصه‌ی ورود و خواندن داده‌ها (Import Data) در R",
    kind: "note",
    category: "management",
    course: "تحلیل داده",
    author: "Posit / RStudio",
    university: "دانشگاه علم و صنعت",
    price: 0,
    offerType: "free",
    coverEmoji: "📊",
    description:
      "همه‌ی راه‌های خواندن داده: CSV، اکسل، دیتابیس و API — با جدول معادل‌ها و توضیح تنظیمات هر تابع readr.\n\nمشکل «فایل اکسل را چطور بیاورم» در پروژه‌های درسی با همین یک فایل حل می‌شود.\n\n" +
      R_CREDIT,
    file: { path: "/samples/data-import.pdf", name: "Data-Import-Cheatsheet.pdf", size: 416128, mime: PDF_MIME },
    daysAgo: 2,
    views: 33,
  },
  {
    ownerEmail: "zahra.mousavi@daneshbook.local",
    title: "تبدیل و پاک‌سازی داده با dplyr — خلاصه‌ی کاربردی",
    kind: "note",
    category: "basic",
    course: "آمار کاربردی",
    author: "Posit / RStudio",
    university: "دانشگاه الزهرا",
    price: 0,
    offerType: "free",
    coverEmoji: "🧮",
    description:
      "فیلتر، مرتب‌سازی، گروه‌بندی، خلاصه‌سازی و اتصال جدول‌ها با بسته‌ی dplyr — همه در یک صفحه‌ی مرجع.\n\nبرای درس آمار و هر پروژه‌ای که باید داده‌ی خام را آماده کند، بهترین مرجع سریع است.\n\n" +
      R_CREDIT,
    file: {
      path: "/samples/data-transformation.pdf",
      name: "Data-Transformation-Cheatsheet.pdf",
      size: 903999,
      mime: PDF_MIME,
    },
    daysAgo: 3,
    views: 58,
  },
  {
    ownerEmail: "elham.sadeghi@daneshbook.local",
    title: "مصورسازی داده با ggplot2 — راهنمای تصویری نمودارها",
    kind: "note",
    category: "management",
    course: "مصورسازی داده",
    author: "Posit / RStudio",
    university: "دانشگاه علامه طباطبایی",
    price: 0,
    offerType: "free",
    coverEmoji: "📈",
    description:
      "از نمودار نقطه‌ای و میله‌ای تا هیستوگرام، خطی و نقشه‌ی حرارتی؛ همراه با تنظیم رنگ، محور و برچسب.\n\nبرای تحلیل داده و ارائه‌ی پایان‌ترم، نمودار درست نصف نمره است.\n\n" +
      R_CREDIT,
    file: {
      path: "/samples/data-visualization.pdf",
      name: "Data-Visualization-Cheatsheet.pdf",
      size: 1109698,
      mime: PDF_MIME,
    },
    daysAgo: 4,
    views: 63,
  },
  {
    ownerEmail: "parsa.niknam@daneshbook.local",
    title: "گیت و گیت‌هاب برای پروژه‌های دانشگاهی",
    kind: "note",
    category: "engineering",
    course: "کارگاه نرم‌افزار",
    author: "Posit / RStudio",
    university: "دانشگاه صنعتی امیرکبیر",
    price: 0,
    offerType: "free",
    coverEmoji: "💻",
    description:
      "دستورهای ضروری گیت: init، clone، commit، branch، merge، push و pull — با توضیح کارهایی که سر پروژه‌ی گروهی خراب می‌شود.\n\nاگر استاد نمره‌ی پروژه را به مخزن گیت‌هاب می‌دهد، این فایل را از دست نده.\n\n" +
      R_CREDIT,
    file: { path: "/samples/git-github.pdf", name: "Git-GitHub-Cheatsheet.pdf", size: 264630, mime: PDF_MIME },
    daysAgo: 5,
    views: 71,
  },
  {
    ownerEmail: "niloofar.bagheri@daneshbook.local",
    title: "یادگیری ماشین با caret — خلاصه‌ی مدل‌سازی و ارزیابی",
    kind: "note",
    category: "engineering",
    course: "یادگیری ماشین",
    author: "Posit / RStudio",
    university: "دانشگاه شیراز",
    price: 0,
    offerType: "free",
    coverEmoji: "🧠",
    description:
      "آموزش مدل، تنظیم پارامتر، اعتبارسنجی متقابل و سنجش دقت با بسته‌ی caret در یک صفحه.\n\nمناسب کسانی که درس یادگیری ماشین دارند و می‌خواهند کدِ پروژه را از صفر شروع نکنند.\n\n" +
      R_CREDIT,
    file: { path: "/samples/ml-with-caret.pdf", name: "ML-with-caret.pdf", size: 74757, mime: PDF_MIME },
    daysAgo: 6,
    views: 39,
  },
  {
    ownerEmail: "parsa.niknam@daneshbook.local",
    title: "یادگیری عمیق با Keras — خلاصه‌ی شبکه‌های عصبی",
    kind: "note",
    category: "engineering",
    course: "یادگیری عمیق",
    author: "Posit / RStudio",
    university: "دانشگاه صنعتی امیرکبیر",
    price: 0,
    offerType: "free",
    coverEmoji: "🤖",
    description:
      "لایه‌ها، تابع فعال‌سازی، آموزش مدل، تنظیم نرخ یادگیری و جلوگیری از بیش‌برازش با Keras.\n\nبرای پروژه‌ی درس یادگیری عمیق و مسابقه‌های دانشجویی کاربردی است.\n\n" +
      R_CREDIT,
    file: {
      path: "/samples/deep-learning-keras.pdf",
      name: "Deep-Learning-Keras.pdf",
      size: 1195101,
      mime: PDF_MIME,
    },
    daysAgo: 7,
    views: 52,
  },
  {
    ownerEmail: "arman.yazdani@daneshbook.local",
    title: "پیش‌پردازش داده برای مدل‌های یادگیری ماشین",
    kind: "note",
    category: "management",
    course: "اقتصاد سنجی",
    author: "Posit / RStudio",
    university: "دانشگاه تهران",
    price: 0,
    offerType: "free",
    coverEmoji: "⚙️",
    description:
      "نرمال‌سازی، رمزگذاری متغیرهای دسته‌ای، مدیریت داده‌ی گم‌شده و متعادل‌سازی کلاس‌ها — مرحله‌ای که بیشترین اثر را روی دقت مدل دارد.\n\nمناسب درس اقتصاد سنجی و هر پروژه‌ی داده‌محور.\n\n" +
      R_CREDIT,
    file: { path: "/samples/ml-preprocessing.pdf", name: "ML-Preprocessing.pdf", size: 472174, mime: PDF_MIME },
    daysAgo: 8,
    views: 27,
  },
  {
    ownerEmail: "hossein.moradi@daneshbook.local",
    title: "کار با تاریخ و زمان در R (بسته‌ی lubridate)",
    kind: "note",
    category: "engineering",
    course: "تحلیل داده‌های زمانی",
    author: "Posit / RStudio",
    university: "دانشگاه ارومیه",
    price: 0,
    offerType: "free",
    coverEmoji: "⏱️",
    description:
      "تبدیل رشته به تاریخ، استخراج سال/ماه/روز، محاسبه‌ی فاصله‌ها و کار با منطقه‌های زمانی.\n\nهر پروژه‌ای که داده‌ی تاریخی دارد (فروش، ترافیک، بیمار) به این فایل نیاز پیدا می‌کند.\n\n" +
      R_CREDIT,
    file: { path: "/samples/dates-in-r.pdf", name: "Dates-in-R-Cheatsheet.pdf", size: 495069, mime: PDF_MIME },
    daysAgo: 9,
    views: 22,
  },
  {
    ownerEmail: "sina.fathi@daneshbook.local",
    title: "محاسبات موازی — خلاصه‌ی مفاهیم و کد",
    kind: "note",
    category: "engineering",
    course: "محاسبات عددی پیشرفته",
    author: "Posit / RStudio",
    university: "دانشگاه صنعتی خواجه نصیر",
    price: 0,
    offerType: "free",
    coverEmoji: "🔗",
    description:
      "تفاوت پردازش سری و موازی، هسته‌ها، بسته‌های parallel و foreach، و اینکه کِی موازی‌سازی واقعاً سرعت می‌دهد.\n\nبرای درس محاسبات عددی و پروژه‌های شبیه‌سازی سنگین.\n\n" +
      R_CREDIT,
    file: {
      path: "/samples/parallel-computing.pdf",
      name: "Parallel-Computation.pdf",
      size: 172641,
      mime: PDF_MIME,
    },
    daysAgo: 10,
    views: 18,
  },

  /* --------------------- ۵ آگهی پاورپوینت --------------------- */
  {
    ownerEmail: "negar.rezaei@daneshbook.local",
    title: "اسلایدهای آموزشی SQL: JOIN و ادغام جدول‌ها",
    kind: "slide",
    category: "engineering",
    course: "پایگاه داده",
    author: "ReDI School of Digital Integration",
    university: "دانشگاه علوم پزشکی تهران",
    price: 0,
    offerType: "free",
    coverEmoji: "📊",
    description:
      "یک ارائه‌ی کامل و آماده‌ی کلاس درباره‌ی انواع JOIN (inner، left، right، full) با شکل و مثال جدول‌های واقعی.\n\nبرای ارائه‌ی درس پایگاه داده یا مرور سریع قبل از امتحان مناسب است؛ قابل ویرایش with PowerPoint.\n\nمنبع: اسلایدهای دوره‌ی آزاد Data Analytics مدرسه‌ی ReDI (GitHub).",
    file: { path: "/samples/sql-joins.pptx", name: "SQL-Joins-Slides.pptx", size: 316574, mime: PPTX_MIME },
    daysAgo: 2,
    views: 41,
  },
  {
    ownerEmail: "yasaman.karimi@daneshbook.local",
    title: "اسلایدهای تفکر تحلیلی و ترسیم نمودار",
    kind: "slide",
    category: "art",
    course: "ارائه و مصورسازی",
    author: "ReDI School of Digital Integration",
    university: "دانشگاه گیلان",
    price: 0,
    offerType: "free",
    coverEmoji: "🎨",
    description:
      "از سؤال درست تا انتخاب نمودار مناسب: انواع نمودار، خطاهای رایج در ارائه‌ی داده و تمرین‌های کلاسی.\n\nبرای درس ارائه و هر سمیناری که باید داده نشان بدهید.\n\nمنبع: اسلایدهای دوره‌ی آزاد Data Analytics مدرسه‌ی ReDI (GitHub).",
    file: {
      path: "/samples/analytical-thinking-plotting.pptx",
      name: "Analytical-Thinking-and-Plotting.pptx",
      size: 2137908,
      mime: PPTX_MIME,
    },
    daysAgo: 3,
    views: 35,
  },
  {
    ownerEmail: "kian.rostami@daneshbook.local",
    title: "مرور مصورسازی و تحلیل اکتشافی داده (EDA)",
    kind: "slide",
    category: "management",
    course: "تحلیل داده",
    author: "ReDI School of Digital Integration",
    university: "دانشگاه علم و صنعت",
    price: 0,
    offerType: "free",
    coverEmoji: "🔍",
    description:
      "اسلایدهای مرور: توزیع داده، داده‌ی پرت، همبستگی و اینکه از دل نمودارها چه سؤالی دربیاوریم.\n\nمناسب جلسه‌ی مرور درس تحلیل داده و آماده‌سازی پروژه.\n\nمنبع: اسلایدهای دوره‌ی آزاد Data Analytics مدرسه‌ی ReDI (GitHub).",
    file: {
      path: "/samples/plotting-eda-review.pptx",
      name: "Plotting-and-EDA-Review.pptx",
      size: 1120579,
      mime: PPTX_MIME,
    },
    daysAgo: 5,
    views: 24,
  },
  {
    ownerEmail: "elham.sadeghi@daneshbook.local",
    title: "روایت‌گری با داده — اسلایدهای ارائه‌ی حرفه‌ای",
    kind: "slide",
    category: "management",
    course: "ارائه‌ی کسب‌وکار",
    author: "ReDI School of Digital Integration",
    university: "دانشگاه علامه طباطبایی",
    price: 0,
    offerType: "free",
    coverEmoji: "🗣️",
    description:
      "چطور داده را به یک داستان قابل‌فهم تبدیل کنیم: ساختار ارائه، انتخاب نمودار، تمرکز روی پیام و اشتباه‌های رایج.\n\nبرای ارائه‌ی پایان‌ترم و دفاع از پروژه واقعاً کمک می‌کند.\n\nمنبع: اسلایدهای دوره‌ی آزاد Data Analytics مدرسه‌ی ReDI (GitHub).",
    file: {
      path: "/samples/storytelling-with-data.pptx",
      name: "Storytelling-with-Data.pptx",
      size: 494402,
      mime: PPTX_MIME,
    },
    daysAgo: 6,
    views: 47,
  },
  {
    ownerEmail: "niloofar.bagheri@daneshbook.local",
    title: "مقدمه‌ی پردازش زبان طبیعی (NLP) — اسلایدهای کلاس",
    kind: "slide",
    category: "engineering",
    course: "پردازش زبان طبیعی",
    author: "Lighthouse Labs",
    university: "دانشگاه شیراز",
    price: 0,
    offerType: "free",
    coverEmoji: "💬",
    description:
      "اسلایدهای درس NLP: پیش‌پردازش متن، توکن‌سازی، بردارسازی، مدل‌های زبانی و کاربردها — با مثال‌های پایتون.\n\nبرای شروع درس پردازش زبان طبیعی و پروژه‌ی تحلیل متن.\n\nمنبع: اسلایدهای دوره‌ی آزاد Data Science (GitHub).",
    file: { path: "/samples/nlp-intro.pptx", name: "NLP-Introduction-Slides.pptx", size: 2693076, mime: PPTX_MIME },
    daysAgo: 8,
    views: 31,
  },

  /* --------------------- آگهی‌های کتاب فیزیکی --------------------- */
  {
    ownerEmail: "amirhossein.karimi@daneshbook.local",
    title: "مدارهای الکتریکی نلسون — دست دوم سالم",
    kind: "book",
    category: "engineering",
    course: "مدارهای الکتریکی ۱",
    author: "نلسون",
    university: "دانشگاه صنعتی شریف",
    price: 420_000,
    offerType: "sell",
    isExchangeable: true,
    coverEmoji: "📘",
    description:
      "کتاب مدارهای الکتریکی نلسون، چاپ داخل، بدون خط‌خوردگی و بدون پارگی.\n\nجلد کمی اثر میز دارد ولی داخل کاملاً تمیز است. تحویل حضوری در شریف یا ارسال با پست.",
    daysAgo: 3,
    views: 44,
  },
  {
    ownerEmail: "sara.mohammadi@daneshbook.local",
    title: "مبانی برنامه‌نویسی C — تبادل با کتاب پایتون",
    kind: "book",
    category: "engineering",
    course: "مبانی کامپیوتر",
    author: "دیتل",
    university: "دانشگاه تهران",
    price: 0,
    offerType: "exchange",
    isExchangeable: true,
    coverEmoji: "📗",
    description:
      "کتاب مبانی برنامه‌نویسی C (دیتل) — ترم اول خریدم و دیگر لازمش ندارم.\n\nدوست دارم با یک کتاب آموزش پایتون یا ساختمان داده تبادل کنم. حضوری در دانشگاه تهران.",
    daysAgo: 4,
    views: 31,
  },
  {
    ownerEmail: "ali.salehi@daneshbook.local",
    title: "مقاومت مصالح — جلد اول و دوم",
    kind: "book",
    category: "engineering",
    course: "مقاومت مصالح ۱",
    author: "بیرجانسون",
    university: "دانشگاه تبریز",
    price: 350_000,
    offerType: "sell",
    isExchangeable: true,
    condition: "good",
    coverEmoji: "📕",
    description:
      "دو جلد مقاومت مصالح، ترجمه‌ی فارسی، سالم و بدون پارگی.\n\nچند صفحه با مداد زیر خط دارد که پاک می‌شود. تحویل در تبریز.",
    daysAgo: 6,
    views: 19,
  },
  {
    ownerEmail: "fatemeh.hosseini@daneshbook.local",
    title: "شیمی آلی — کتاب مرجع + جزوه‌ی دست‌نویس",
    kind: "book",
    category: "basic",
    course: "شیمی آلی ۱",
    author: "واد",
    university: "دانشگاه اصفهان",
    price: 300_000,
    offerType: "sell",
    condition: "good",
    coverEmoji: "🧪",
    description:
      "کتاب شیمی آلی واد، همراه با جزوه‌ی دست‌نویس خودم از کلاس (تمیز و خوانا).\n\nبرای کسی که ترم بعد شیمی آلی دارد، مجموعه‌ی کاملی است.",
    daysAgo: 7,
    views: 23,
  },
  {
    ownerEmail: "mahsa.sharifi@daneshbook.local",
    title: "حقوق مدنی — جلد ۱ تا ۴ (کاتوزیان)",
    kind: "book",
    category: "humanities",
    course: "حقوق مدنی",
    author: "ناصر کاتوزیان",
    university: "دانشگاه شهید بهشتی",
    price: 600_000,
    offerType: "sell",
    condition: "good",
    coverEmoji: "📚",
    description:
      "چهار جلد حقوق مدنی کاتوزیان، چاپ‌های مختلف ولی همه سالم و بدون خط‌خوردگی.\n\nفروش به‌صورت مجموعه یا جداگانه. تحویل در تهران.",
    daysAgo: 9,
    views: 37,
  },
  {
    ownerEmail: "rana.taghavi@daneshbook.local",
    title: "دستور زبان انگلیسی (Advanced Grammar) — دست دوم",
    kind: "book",
    category: "language",
    course: "زبان تخصصی",
    author: "Martin Hewings",
    university: "دانشگاه فردوسی مشهد",
    price: 180_000,
    offerType: "sell",
    isExchangeable: true,
    coverEmoji: "🗣️",
    description:
      "Advanced Grammar in Use، چاپ اصلی، داخل تمیز. چند تمرین با مداد حل شده که با پاک‌کن تمیز می‌شود.\n\nمناسب آمادگی آزمون‌های زبان و درس زبان تخصصی.",
    daysAgo: 11,
    views: 15,
  },
  {
    ownerEmail: "behnam.akbari@daneshbook.local",
    title: "متالورژی فیزیکی — درخواست کتاب دست دوم",
    kind: "book",
    category: "engineering",
    course: "متالورژی فیزیکی",
    university: "دانشگاه صنعتی اصفهان",
    price: 0,
    offerType: "free",
    coverEmoji: "⚙️",
    description:
      "دنبال یک نسخه‌ی دست دوم و سالم از کتاب متالورژی فیزیکی هستم (ترجیحاً چاپ دانشگاهی).\n\nاگر کتاب را نمی‌خواهید، پیام بدهید؛ حضوری در اصفهان.",
    daysAgo: 12,
    views: 8,
  },
  {
    ownerEmail: "sheida.nouri@daneshbook.local",
    title: "فیزیولوژی گایتون — دست دوم",
    kind: "book",
    category: "medicine",
    course: "فیزیولوژی",
    author: "گایتون",
    university: "دانشگاه علوم پزشکی ایران",
    price: 550_000,
    offerType: "sell",
    isExchangeable: true,
    condition: "good",
    coverEmoji: "🩺",
    description:
      "فیزیولوژی گایتون، ترجمه‌ی فارسی، جلد سالم و صفحات بدون خط‌خوردگی.\n\nچند فصل اول با ماژیک فسفری علامت‌گذاری شده که برای مرور بعدی هم مفید است.",
    daysAgo: 13,
    views: 29,
  },
];

/** وضعیت فعلی محتوای نمونه (برای نمایش هشدار در پنل مدیریت). */
export async function demoContentStatus(): Promise<{ users: number; books: number }> {
  try {
    const [userRow] = await db
      .select({ value: count() })
      .from(users)
      .where(like(users.email, "%@daneshbook.local"));
    const [bookRow] = await db
      .select({ value: count() })
      .from(books)
      .where(like(books.description, "%چیت‌شیت%"));
    return { users: Number(userRow?.value ?? 0), books: Number(bookRow?.value ?? 0) };
  } catch {
    return { users: 0, books: 0 };
  }
}

export type SeedResult = {
  usersCreated: number;
  usersExisting: number;
  booksCreated: number;
  filesAttached: number;
};

/**
 * ساخت محتوای نمونه. idempotent است: اجرای دوباره چیزی را تکرار نمی‌کند.
 */
export async function seedDemoContent(): Promise<SeedResult> {
  await ensureFileSchema();

  const emails = DEMO_USERS.map((user) => user.email);
  const existingUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, emails));

  const byEmail = new Map(existingUsers.map((row) => [row.email, row.id]));
  let usersCreated = 0;

  const password = await hashPassword(randomBytes(24).toString("hex"));

  for (const demo of DEMO_USERS) {
    if (byEmail.has(demo.email)) continue;
    const [created] = await db
      .insert(users)
      .values({
        fullName: demo.fullName,
        email: demo.email,
        passwordHash: password,
        university: demo.university,
        major: demo.major,
        bio: demo.bio,
        avatarEmoji: demo.avatarEmoji,
        karmaPoints: demo.karmaPoints,
        role: "student",
      })
      .returning({ id: users.id });
    if (created) {
      byEmail.set(demo.email, created.id);
      usersCreated += 1;
    }
  }

  let booksCreated = 0;
  let filesAttached = 0;

  for (const listing of DEMO_LISTINGS) {
    const ownerId = byEmail.get(listing.ownerEmail);
    if (!ownerId) continue;

    const already = await db
      .select({ id: books.id })
      .from(books)
      .where(and(eq(books.ownerId, ownerId), eq(books.title, listing.title)))
      .limit(1);
    if (already.length > 0) continue;

    const createdAt = new Date(Date.now() - listing.daysAgo * 24 * 60 * 60 * 1000);
    const [created] = await db
      .insert(books)
      .values({
        ownerId,
        title: listing.title,
        kind: listing.kind,
        medium: listing.kind === "book" ? "physical" : "digital",
        offerType: listing.offerType,
        audience: "general",
        course: listing.course ?? null,
        author: listing.author ?? null,
        university: listing.university ?? null,
        category: listing.category,
        condition: listing.condition ?? "good",
        price: listing.offerType === "sell" ? listing.price : 0,
        isExchangeable: listing.isExchangeable ?? false,
        description: listing.description,
        coverEmoji: listing.coverEmoji,
        status: "available",
        views: listing.views,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: books.id });

    if (!created) continue;
    booksCreated += 1;

    if (listing.file) {
      const file = await saveExternalLink({
        ownerId,
        fileName: listing.file.name,
        externalUrl: listing.file.path,
        mimeType: listing.file.mime,
        sizeBytes: listing.file.size,
      });
      if (await attachFileToBook(file.id, created.id, ownerId)) filesAttached += 1;
    }
  }

  return {
    usersCreated,
    usersExisting: DEMO_USERS.length - usersCreated,
    booksCreated,
    filesAttached,
  };
}
