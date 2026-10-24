/**
 * محتوای نمونه برای پر کردن سایت در روزهای اول.
 *
 * چرا این فایل وجود دارد؟
 * یک بازار خالی هیچ‌وقت خریدار جذب نمی‌کند. این داده‌ها چند دانشجوی نمونه و
 * چند آگهی واقعیِ فایل (با لینک به منابع آزاد و رایگان) می‌سازند تا صفحه‌ی
 * بازار و بخش فایل‌های دیجیتال «زنده» به‌نظر برسد.
 *
 * نکات مهم:
 *  - همه‌ی آدرس‌ها به منابع آزاد (MIT OpenCourseWare و OpenStax) اشاره می‌کنند
 *    و در توضیح هر آگهی هم منبع ذکر شده؛ بنابراین هیچ محتوای کپی‌رایتی یا
 *    گمراه‌کننده‌ای ساخته نمی‌شود.
 *  - اجرای دوباره‌ی این تابع داده‌ی تکراری نمی‌سازد (بر اساس ایمیل کاربر و
 *    عنوان آگهی چک می‌کند).
 *  - هیچ جدول یا ردیف موجودی تغییر نمی‌کند؛ فقط INSERT است.
 */
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, inArray } from "drizzle-orm";
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
  /** لینک به فایل آزاد و رایگان (اختیاری) */
  file?: { url: string; label: string };
  /** چند روز قبل منتشر شده باشد (برای طبیعی‌بودن ترتیب) */
  daysAgo: number;
  views: number;
};

const DEMO_USERS: DemoUser[] = [
  {
    fullName: "سارا محمدی",
    email: "sara.mohammadi@daneshbook.local",
    university: "دانشگاه تهران",
    major: "مهندسی کامپیوتر",
    avatarEmoji: "👩‍💻",
    karmaPoints: 84,
    bio: "ترم ۵ کامپیوتر، جزوه‌هام رو مرتب می‌نویسم و دوست دارم به بقیه هم برسه.",
  },
  {
    fullName: "امیرحسین کریمی",
    email: "amirhossein.karimi@daneshbook.local",
    university: "دانشگاه صنعتی شریف",
    major: "مهندسی برق",
    avatarEmoji: "🧑‍🔧",
    karmaPoints: 61,
    bio: "برق — قدرت. کتاب‌های ترم‌های قبل رو می‌فروشم تا جای بیشتری برای کتاب‌های جدید باز بشه.",
  },
  {
    fullName: "نگار رضایی",
    email: "negar.rezaei@daneshbook.local",
    university: "دانشگاه علوم پزشکی تهران",
    major: "پزشکی",
    avatarEmoji: "🩺",
    karmaPoints: 47,
    bio: "پزشکی، ترم ۳. بیشتر جزوه و نمونه سوال آپلود می‌کنم.",
  },
  {
    fullName: "محمدرضا احمدی",
    email: "mohammadreza.ahmadi@daneshbook.local",
    university: "دانشگاه فردوسی مشهد",
    major: "ریاضی کاربردی",
    avatarEmoji: "🧑‍🏫",
    karmaPoints: 39,
    bio: "ریاضی و آمار؛ حل‌التمرین و جزوه‌های تمرین‌محور.",
  },
  {
    fullName: "الهام صادقی",
    email: "elham.sadeghi@daneshbook.local",
    university: "دانشگاه علامه طباطبایی",
    major: "مدیریت بازرگانی",
    avatarEmoji: "👩‍🎓",
    karmaPoints: 28,
    bio: "مدیریت؛ خلاصه‌ی درس‌ها و اسلایدهای ارائه.",
  },
];

/**
 * آگهی‌های نمونه. همه‌ی لینک‌ها به منابع آموزشی آزاد اشاره می‌کنند و منبع در
 * توضیح آگهی ذکر شده است.
 */
const DEMO_LISTINGS: DemoListing[] = [
  {
    ownerEmail: "sara.mohammadi@daneshbook.local",
    title: "جزوه‌ی ساختمان داده و الگوریتم (کامل، ۲۴ جلسه)",
    kind: "note",
    category: "engineering",
    course: "ساختمان داده‌ها",
    author: "MIT OpenCourseWare",
    university: "دانشگاه تهران",
    price: 0,
    offerType: "free",
    coverEmoji: "📝",
    description:
      "جزوه‌ی مرتب و کامل درس ساختمان داده‌ها؛ از پیچیدگی زمانی و مرتب‌سازی تا درخت‌ها، هش، گراف و برنامه‌نویسی پویا.\n\nاین نسخه بر اساس جزوه‌ی آزاد و رایگان درس 6.006 دانشگاه MIT تنظیم شده و برای آمادگی امتحان پایان‌ترم و مصاحبه‌های فنی عالی است.\n\nمنبع اصلی: MIT OpenCourseWare (رایگان و قابل استفاده با ذکر منبع).",
    file: {
      url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/pages/lecture-notes/",
      label: "جزوه‌ی ساختمان داده — MIT OCW",
    },
    daysAgo: 2,
    views: 37,
  },
  {
    ownerEmail: "mohammadreza.ahmadi@daneshbook.local",
    title: "فیزیک ۱ — کتاب مرجع آزاد دانشگاهی (جلد مکانیک)",
    kind: "note",
    category: "basic",
    course: "فیزیک عمومی ۱",
    author: "OpenStax",
    university: "دانشگاه فردوسی مشهد",
    price: 0,
    offerType: "free",
    coverEmoji: "⚛️",
    description:
      "کتاب درسی فیزیک عمومی ۱ با پوشش کامل مکانیک، نوسان و موج — همراه با مثال‌های حل‌شده و تمرین پایان فصل.\n\nمناسب دانشجویان فنی و علوم پایه که دنبال یک مرجع انگلیسیِ ساده و تصویری هستند.\n\nمنبع اصلی: OpenStax University Physics Volume 1 (لایسنس آزاد CC BY).",
    file: {
      url: "https://d3bxy9euw4e147.cloudfront.net/oscms-prodcms/media/documents/UniversityPhysicsVolume1-LR.pdf",
      label: "University Physics Vol. 1 — OpenStax",
    },
    daysAgo: 4,
    views: 52,
  },
  {
    ownerEmail: "sara.mohammadi@daneshbook.local",
    title: "اسلایدهای هوش مصنوعی: از شبکه عصبی تا ترانسفورمر",
    kind: "slide",
    category: "engineering",
    course: "هوش مصنوعی",
    author: "Vaswani et al.",
    university: "دانشگاه تهران",
    price: 0,
    offerType: "free",
    coverEmoji: "📊",
    description:
      "ارائه‌ی کلاسی درس هوش مصنوعی درباره‌ی معماری ترانسفورمر؛ مناسب برای کنفرانس درس و درک پایه‌ی مدل‌های زبانی امروزی.\n\nدر کنارش مقاله‌ی اصلی و رایگان «Attention Is All You Need» را هم می‌توانید بخوانید (لینک داخل همین آگهی).\n\nمنبع: arXiv (دسترسی آزاد).",
    file: {
      url: "https://arxiv.org/pdf/1706.03762",
      label: "Attention Is All You Need — arXiv",
    },
    daysAgo: 6,
    views: 41,
  },
  {
    ownerEmail: "negar.rezaei@daneshbook.local",
    title: "نمونه سوال‌های ریاضی عمومی ۱ با پاسخ تشریحی",
    kind: "exam",
    category: "basic",
    course: "ریاضی عمومی ۱",
    university: "دانشگاه علوم پزشکی تهران",
    price: 0,
    offerType: "free",
    coverEmoji: "❓",
    description:
      "مجموعه تمرین و نمونه سوال ریاضی عمومی ۱، دسته‌بندی‌شده بر اساس فصل: حد و پیوستگی، مشتق، کاربردهای مشتق و انتگرال.\n\nبرای شب امتحان، اول تمرین‌های بی‌پاسخ را بزنید و بعد پاسخ‌ها را چک کنید.\n\nمنبع: تمرین‌های آزاد درس 18.01 MIT OpenCourseWare.",
    file: {
      url: "https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/",
      label: "تمرین‌های حساب یک‌متغیره — MIT OCW",
    },
    daysAgo: 8,
    views: 63,
  },
  {
    ownerEmail: "mohammadreza.ahmadi@daneshbook.local",
    title: "جبر خطی — جزوه‌ی کامل گیلبرت استرنگ",
    kind: "note",
    category: "basic",
    course: "جبر خطی",
    author: "Gilbert Strang",
    university: "دانشگاه فردوسی مشهد",
    price: 0,
    offerType: "free",
    coverEmoji: "🔢",
    description:
      "جزوه و ویدیوهای درس جبر خطی پروفسور گیلبرت استرنگ: بردارها، فضای برداری، دستگاه معادلات، دترمینان، مقدار و بردار ویژه.\n\nاگر جبر خطی برایتان مبهم است، این دوره بهترین شروع رایگان است؛ ترتیب مطالعه پیشنهادی: جلسه ۱ تا ۱۰ و بعد فصل مقدار ویژه.\n\nمنبع: MIT OpenCourseWare 18.06 (آزاد).",
    file: {
      url: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/",
      label: "Linear Algebra 18.06 — MIT OCW",
    },
    daysAgo: 10,
    views: 78,
  },
  {
    ownerEmail: "elham.sadeghi@daneshbook.local",
    title: "حساب دیفرانسیل و انتگرال — جلد اول (کتاب آزاد)",
    kind: "note",
    category: "basic",
    course: "ریاضی عمومی ۲",
    author: "OpenStax",
    university: "دانشگاه علامه طباطبایی",
    price: 0,
    offerType: "free",
    coverEmoji: "📐",
    description:
      "جلد اول حساب دیفرانسیل و انتگرال OpenStax؛ توضیح ساده، شکل‌های زیاد و تمرین‌های فراوان.\n\nبرای دانشجویانی که کتاب فارسی را می‌خوانند و می‌خواهند مسئله‌های بیشتری حل کنند، مکمل خوبی است.\n\nمنبع: OpenStax Calculus Volume 1 (لایسنس CC BY-NC-SA).",
    file: {
      url: "https://openstax.org/details/books/calculus-volume-1",
      label: "Calculus Volume 1 — OpenStax",
    },
    daysAgo: 13,
    views: 34,
  },
  {
    ownerEmail: "negar.rezaei@daneshbook.local",
    title: "آمار و احتمال — کتاب آزاد مقدماتی + جدول‌های آماری",
    kind: "note",
    category: "medicine",
    course: "آمار زیستی",
    author: "OpenStax",
    university: "دانشگاه علوم پزشکی تهران",
    price: 0,
    offerType: "free",
    coverEmoji: "📈",
    description:
      "کتاب آمار مقدماتی برای رشته‌های علوم پزشکی: توصیف داده، توزیع نرمال، فاصله اطمینان و آزمون فرض.\n\nبخش آزمون فرضش برای درس آمار زیستی و تحلیل مقاله‌های پزشکی واقعاً کاربردی است.\n\nمنبع: OpenStax Introductory Statistics (لایسنس آزاد).",
    file: {
      url: "https://openstax.org/details/books/introductory-statistics-2e",
      label: "Introductory Statistics — OpenStax",
    },
    daysAgo: 15,
    views: 29,
  },
  {
    ownerEmail: "amirhossein.karimi@daneshbook.local",
    title: "مدارهای الکتریکی — کتاب دست دوم، سالم",
    kind: "book",
    category: "engineering",
    course: "مدارهای الکتریکی ۱",
    author: "نلسون",
    university: "دانشگاه صنعتی شریف",
    price: 420_000,
    offerType: "sell",
    isExchangeable: true,
    condition: "good",
    coverEmoji: "📘",
    description:
      "کتاب مدارهای الکتریکی نلسون، چاپ داخل، بدون خط‌خوردگی و بدون پارگی.\n\nجلد کمی اثر میز دارد ولی داخل کاملاً تمیز است. تحویل حضوری در دانشگاه شریف یا ارسال با پست.",
    daysAgo: 3,
    views: 44,
  },
  {
    ownerEmail: "sara.mohammadi@daneshbook.local",
    title: "مبانی برنامه‌نویسی C — قابل تبادل با کتاب پایتون",
    kind: "book",
    category: "engineering",
    course: "مبانی کامپیوتر",
    author: "دیتل",
    university: "دانشگاه تهران",
    price: 0,
    offerType: "exchange",
    isExchangeable: true,
    condition: "good",
    coverEmoji: "📗",
    description:
      "کتاب مبانی برنامه‌نویسی C (دیتل) — ترم اول خریدم و دیگر لازمش ندارم.\n\nدوست دارم با یک کتاب آموزش پایتون یا ساختمان داده تبادل کنم. حضوری در دانشگاه تهران.",
    daysAgo: 5,
    views: 31,
  },
  {
    ownerEmail: "elham.sadeghi@daneshbook.local",
    title: "اصول مدیریت و حسابداری — دو جلد",
    kind: "book",
    category: "management",
    course: "اصول حسابداری ۱",
    university: "دانشگاه علامه طباطبایی",
    price: 260_000,
    offerType: "sell",
    condition: "new",
    coverEmoji: "📙",
    description:
      "دو جلد اصول حسابداری، تقریباً نو (فقط فصل‌های اول خوانده شده).\n\nهمراهش جزوه‌ی دست‌نویس خودم از کلاس را هم می‌دهم. تحویل در تهران.",
    daysAgo: 7,
    views: 18,
  },
  {
    ownerEmail: "amirhossein.karimi@daneshbook.local",
    title: "فیزیک هالیدی جلد ۱ — دست دوم",
    kind: "book",
    category: "basic",
    course: "فیزیک ۱",
    author: "هالیدی، رزنیک، واکر",
    university: "دانشگاه صنعتی شریف",
    price: 380_000,
    offerType: "sell",
    isExchangeable: true,
    condition: "good",
    coverEmoji: "📕",
    description:
      "فیزیک هالیدی جلد اول، ترجمه‌ی فارسی، چاپ خوب.\n\nچند صفحه اول با مداد زیر خط دارد که با پاک‌کن تمیز می‌شود. بقیه سالم است.",
    daysAgo: 9,
    views: 26,
  },
  {
    ownerEmail: "negar.rezaei@daneshbook.local",
    title: "آناتومی — درخواست کتاب دست دوم",
    kind: "book",
    category: "medicine",
    course: "آناتومی",
    university: "دانشگاه علوم پزشکی تهران",
    price: 0,
    offerType: "free",
    condition: "good",
    coverEmoji: "🩺",
    description:
      "دنبال یک نسخه‌ی دست دوم آناتومی (مثلاً گری یا اسنل) هستم، ترجیحاً تهران.\n\nاگر کسی در ترم آخر کتابش را نمی‌خواهد، پیام بدهد.",
    daysAgo: 11,
    views: 9,
  },
];

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
        fileName: listing.file.label,
        externalUrl: listing.file.url,
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
