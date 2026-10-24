/**
 * دانش‌بوک seed script — safe to run multiple times (idempotent).
 *
 *   SEED_PASSWORD='یک-رمز-قوی' node scripts/seed.mjs
 *
 * هشدار: این اسکریپت برای محیط توسعه است. روی دیتابیس تولید اجرا نکنید؛
 * برای ساخت حساب مدیر از `npm run db:set-admin` استفاده کنید.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("✖ DATABASE_URL تنظیم نشده است. مثال: DATABASE_URL=postgresql://... node scripts/seed.mjs");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "1") {
  console.error(
    "✖ اجرای seed در محیط تولید مسدود است. اگر واقعاً لازم است ALLOW_SEED=1 را تنظیم کنید.",
  );
  process.exit(1);
}

// رمز کاربران نمونه: از محیط خوانده می‌شود؛ در نبود آن یک رمز تصادفی ساخته
// می‌شود تا هرگز رمز ثابت و ضعیف ۱۲۳۴۵۶ روی دیتابیس ننشیند.
const seedPassword =
  process.env.SEED_PASSWORD ?? randomBytes(9).toString("base64url");
if (seedPassword.length < 8) {
  console.error("✖ SEED_PASSWORD باید حداقل ۸ کاراکتر باشد.");
  process.exit(1);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

const USERS = [
  {
    fullName: "مدیر دانش‌بوک",
    email: "c.na.mokhtarian@gmail.com",
    studentCode: null,
    university: "دانشگاه تهران",
    major: "مدیریت سیستم‌های اطلاعاتی",
    bio: "مدیر و پشتیبان دانش‌بوک.",
    avatarEmoji: "🛡️",
    karmaPoints: 100,
    role: "admin",
  },
  {
    fullName: "سارا محمدی",
    email: "sara@daneshbook.ir",
    studentCode: "401234567",
    university: "دانشگاه صنعتی شریف",
    major: "مهندسی کامپیوتر",
    bio: "دانشجوی ترم ششم؛ علاقه‌مند به کتاب‌های الگوریتم و هوش مصنوعی.",
    avatarEmoji: "👩‍🔬",
    karmaPoints: 45,
    role: "student",
  },
  {
    fullName: "امیرحسین رضایی",
    email: "amir@daneshbook.ir",
    studentCode: "401998877",
    university: "دانشگاه تهران",
    major: "مهندسی برق",
    bio: "کتاب‌های مدار و کنترل را جمع می‌کنم و تبادل می‌کنم.",
    avatarEmoji: "👨‍💻",
    karmaPoints: 30,
    role: "student",
  },
  {
    fullName: "نگار کریمی",
    email: "negar@daneshbook.ir",
    studentCode: "401556677",
    university: "دانشگاه علامه طباطبایی",
    major: "روانشناسی",
    bio: "جزوه‌نویس حرفه‌ای؛ جزوه‌های روانشناسی اجتماعی را رایگان به اشتراک می‌گذارم.",
    avatarEmoji: "🧑‍🏫",
    karmaPoints: 60,
    role: "student",
  },
];

const BOOKS = [
  // owner, title, kind, offerType, audience, course, author, category, condition, price, emoji, description
  ["sara@daneshbook.ir", "مدارهای الکتریکی — نلسون", "book", "sell", "general", "مدارهای الکتریکی", "چارلز نلسون", "engineering", "good", 380000, "📘", "ویرایش پنجم، صفحات سالم و بدون خط و خش خاص."],
  ["sara@daneshbook.ir", "جزوه کامل ساختمان داده (تایپ‌شده)", "note", "free", "general", "ساختمان داده", "دکتر علینقیان", "engineering", "new", 0, "📝", "جزوه ۱۲۰ صفحه‌ای تایپ‌شده شامل حل تمرین‌های میان‌ترم و پایان‌ترم."],
  ["sara@daneshbook.ir", "اسلایدهای درس معماری کامپیوتر", "slide", "free", "general", "معماری کامپیوتر", "دکتر رستمی", "engineering", "new", 0, "📊", "مجموعه ۱۴ اسلاید فصل‌به‌فصل به‌همراه نمودارهای رنگی."],
  ["sara@daneshbook.ir", "نمونه سوالات امتحان ساختمان داده", "exam", "free", "general", "ساختمان داده", "گروه درس", "engineering", "new", 0, "❓", "سوالات میان‌ترم و پایان‌ترم سه سال گذشته با پاسخ تشریحی."],
  ["sara@daneshbook.ir", "الگوریتم‌ها — کلید حل تمرین‌ها", "book", "exchange", "general", "طراحی الگوریتم", "کورمن", "engineering", "used", 520000, "📗", "چاپ محدود؛ مناسب آمادگی درس طراحی الگوریتم."],
  ["amir@daneshbook.ir", "ریاضی مهندسی — کریسزیگ", "book", "sell", "general", "ریاضی مهندسی", "کریسزیگ", "basic", "good", 450000, "📕", "جلد کمی آسیب دیده اما صفحات کاملاً سالم است."],
  ["amir@daneshbook.ir", "جزوه دست‌نویس سیگنال و سیستم", "note", "free", "general", "سیگنال و سیستم", "دکتر میرحسینی", "engineering", "new", 0, "📐", "جزوه دست‌نویس مرتب با حل مثال‌های کتاب اوپنهایم."],
  ["amir@daneshbook.ir", "کتاب کنترل خطی — اوگاتا (نذری)", "book", "free", "general", "کنترل خطی", "اوگاتا", "engineering", "worn", 0, "📙", "این کتاب را به‌صورت نذری به دانشجوی بعدی واگذار می‌کنم."],
  ["amir@daneshbook.ir", "درخواست کتاب الکترونیک قدرت", "book", "request", "general", "الکترونیک قدرت", "رشید", "engineering", "new", 0, "🎯", "دنبال ویرایش جدید کتاب الکترونیک قدرت رشید هستم؛ نو یا کارکرده."],
  ["negar@daneshbook.ir", "روانشناسی اجتماعی — مایرز", "book", "sell", "general", "روانشناسی اجتماعی", "دیوید مایرز", "humanities", "good", 610000, "🧠", "ترجمه فارسی، نوبت چاپ هفتم."],
  ["negar@daneshbook.ir", "جزوه آمار و احتمال + نمونه سوال", "note", "free", "general", "آمار و احتمال مهندسی", "دکتر صادقی", "basic", "new", 0, "🧮", "خلاصه‌نویسی دقیق با فرمول‌های مهم و نمونه سوال حل‌شده."],
  ["negar@daneshbook.ir", "جزوه اناتومی و فیزیولوژی", "note", "exchange", "general", "آناتومی", "دکتر شریفی", "medicine", "good", 0, "🔬", "شامل نقشه‌های رنگی و جدول‌های مقایسه‌ای."],
  ["negar@daneshbook.ir", "درخواست کتاب روانشناسی رشد", "book", "request", "general", "روانشناسی رشد", "لورا برک", "humanities", "good", 0, "🎯", "اگر این کتاب را دارید و نیازی به آن ندارید، لطفاً اطلاع دهید."],

  // ------------------------- منابع ویژه کنکور -------------------------
  ["sara@daneshbook.ir", "کتاب ریاضیات جامع کنکور — انتشارات خیلی سبز", "book", "sell", "konkur", "ریاضیات کنکور", "خیلی سبز", "general", "good", 480000, "📘", "شامل حل کامل تست‌های سال‌های ۹۸ تا ۱۴۰۳."],
  ["sara@daneshbook.ir", "جزوه جمع‌بندی ریاضیات کنکور", "note", "free", "konkur", "ریاضیات کنکور", "جمع‌بندی استاد کاظمی", "general", "new", 0, "📝", "جزوه ۶۰ صفحه‌ای جمع‌بندی فرمول‌ها و تکنیک‌های تست‌زنی."],
  ["sara@daneshbook.ir", "بانک تست فیزیک کنکور (تایپ‌شده)", "exam", "free", "konkur", "فیزیک کنکور", "گروه تست", "general", "new", 0, "❓", "بیش از ۸۰۰ تست طبقه‌بندی‌شده بر اساس مبحث با پاسخ تشریحی."],
  ["amir@daneshbook.ir", "جزوه جمع‌بندی شیمی کنکور", "note", "sell", "konkur", "شیمی کنکور", "استاد امیری", "general", "new", 120000, "⚗️", "جمع‌بندی کامل کنکور شیمی با نکته‌های تست‌زنی."],
  ["amir@daneshbook.ir", "اسلایدهای جمع‌بندی زیست‌شناسی", "slide", "free", "konkur", "زیست‌شناسی کنکور", "استاد نادری", "general", "new", 0, "📊", "مرور تصویری فصل‌های مهم زیست با نمودار و مقایسه."],
  ["amir@daneshbook.ir", "کتاب تست ادبیات و عربی (نذری)", "book", "free", "konkur", "ادبیات کنکور", "انتشارات گاج", "general", "used", 0, "🎁", "کتاب تست ادبیات را بعد از قبولی به‌صورت نذری می‌دهم."],
  ["negar@daneshbook.ir", "جزوه جمع‌بندی زبان انگلیسی کنکور", "note", "free", "konkur", "زبان کنکور", "استاد صادقی", "general", "new", 0, "🔤", "واژگان پرتکرار، گرامر کلیدی و تکنیک ریدینگ."],
  ["negar@daneshbook.ir", "نمونه سوال کنکور سال‌های گذشته (عمومی)", "exam", "free", "konkur", "کنکور سراسری", "سازمان سنجش", "general", "new", 0, "❓", "دوره‌های ۹۹ تا ۱۴۰۳ با پاسخ‌نامه تشریحی."],
];

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const ids = new Map();
    for (const user of USERS) {
      const result = await client.query(
        `insert into users ("fullName", "email", "passwordHash", "studentCode", "university", "major", "bio", "avatarEmoji", "karmaPoints", "role")
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         on conflict ("email") do update set "fullName" = excluded."fullName", "role" = excluded."role"
         returning "id"`,
        [
          user.fullName,
          user.email,
          hashPassword(seedPassword),
          user.studentCode,
          user.university,
          user.major,
          user.bio,
          user.avatarEmoji,
          user.karmaPoints,
          user.role ?? "student",
        ],
      );
      ids.set(user.email, result.rows[0].id);
    }

    const existing = await client.query("select count(*)::int as count from books");
    if (existing.rows[0].count === 0) {
      for (const [
        email, title, kind, offerType, audience, course, author, category, condition, price, coverEmoji, description,
      ] of BOOKS) {
        const ownerId = ids.get(email);
        const medium = kind === "book" ? "physical" : "digital";
        await client.query(
          `insert into books ("ownerId", "title", "kind", "medium", "offerType", "audience", "course", "author", "university", "category", "condition", "price", "isExchangeable", "description", "coverEmoji", "status", "views")
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'available',$16)`,
          [
            ownerId,
            title,
            kind,
            medium,
            offerType,
            audience,
            course,
            author,
            USERS.find((user) => user.email === email)?.university ?? null,
            category,
            condition,
            price,
            offerType === "exchange",
            description,
            coverEmoji,
            Math.floor(Math.random() * 120) + 5,
          ],
        );
      }
      console.log(`seeded ${BOOKS.length} books`);
    } else {
      console.log("books already present — skipped");
    }

    const sugCount = await client.query("select count(*)::int as count from suggestions");
    if (sugCount.rows[0].count === 0) {
      const SUGGESTIONS = [
        ["سارا محمدی", "sara@daneshbook.ir", "پیشنهاد بخش یا قابلیت جدید", "سلام! اگر امکان دانلود مستقیم فایل‌های دیجیتال به صفحه جزوه اضافه شود خیلی عالی می‌شود.", "new"],
        ["امیرحسین رضایی", "amir@daneshbook.ir", "انتقاد به طراحی سایت", "فونت بخش کنکور کمی کوچک است؛ بزرگ‌تر شدن عنوان‌ها خوانایی را بالا می‌برد.", "reviewing"],
        ["نگار کریمی", "negar@daneshbook.ir", "گزارش مشکل فنی", "در فیلتر نوع معامله، گزینه واگذاری رایگان روی موبایل کامل نمایش داده نمی‌شود.", "new"],
        ["مهدی توکلی", "mehdi@example.com", "پشتیبانی حساب کاربری", "ایمیل بازیابی رمز عبور برایم ارسال نشد. لطفاً بررسی کنید.", "resolved"],
      ];
      for (const [fullName, contact, subject, message, status] of SUGGESTIONS) {
        await client.query(
          `insert into suggestions ("fullName", "contact", "subject", "message", "status")
           values ($1, $2, $3, $4, $5)`,
          [fullName, contact, subject, message, status],
        );
      }
      console.log(`seeded ${SUGGESTIONS.length} suggestions`);
    }

    console.log("✔ seed کامل شد.");
    console.log("  حساب‌های نمونه: c.na.mokhtarian@gmail.com و sara@daneshbook.ir و …");
    if (process.env.SEED_PASSWORD) {
      console.log("  رمز: مقدار SEED_PASSWORD که تنظیم کردید.");
    } else {
      console.log(`  رمز تصادفی این اجرا (فقط برای محیط توسعه): ${seedPassword}`);
      console.log("  برای انتخاب رمز دلخواه، SEED_PASSWORD را تنظیم کنید.");
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("seed failed:", error.message);
  process.exit(1);
});
