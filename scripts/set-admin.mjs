/**
 * ساخت یا ارتقای حساب مدیر — بدون نیاز به پنل و بدون اجرای seed.
 *
 *   ADMIN_USERNAME='<نام-کاربری-مدیر>' ADMIN_PASSWORD='<رمز-قوی-مدیر>' npm run db:set-admin
 *
 * ورودی‌ها:
 *   ADMIN_USERNAME  (الزامی) شناسه ورود؛ اگر ایمیل نباشد، با پیشوند پیش‌فرض
 *                   ADMIN_EMAIL_DOMAIN به ایمیل معتبر تبدیل می‌شود.
 *   ADMIN_PASSWORD  (الزامی) رمز عبور؛ در تولید حتماً از یک رمز قوی استفاده کنید.
 *   ADMIN_FULL_NAME اختیاری (پیش‌فرض: «مدیر دانش‌بوک»)
 *   ADMIN_EMAIL_DOMAIN اختیاری (پیش‌فرض: daneshbook.local)
 *   DATABASE_URL    (الزامی) اتصال دیتابیس
 *
 * نکته مهم درباره «دیتابیس واقعی»: این اسکریپت فقط یک ردیف را upsert می‌کند
 * (insert ... on conflict (email) do update) و هیچ جدول/ستون دیگری را لمس
 * نمی‌کند؛ برای اجرا باید از قبل جداول با drizzle-kit ساخته شده باشند.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;
const username = (process.env.ADMIN_USERNAME ?? "").trim();
const password = process.env.ADMIN_PASSWORD ?? "";
const fullName = (process.env.ADMIN_FULL_NAME ?? "مدیر دانش‌بوک").trim();
const emailDomain = (process.env.ADMIN_EMAIL_DOMAIN ?? "daneshbook.local").trim();

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(value, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

if (!connectionString) {
  fail("DATABASE_URL تنظیم نشده است. مثال: DATABASE_URL=postgresql://... npm run db:set-admin");
}
if (!username) fail("ADMIN_USERNAME تنظیم نشده است.");
if (!password) fail("ADMIN_PASSWORD تنظیم نشده است.");
if (password.length < 8) fail("رمز عبور مدیر باید حداقل ۸ کاراکتر باشد.");

const email = username.includes("@")
  ? username.toLowerCase()
  : `${username.toLowerCase()}@${emailDomain}`.toLowerCase();

const client = new Client({ connectionString });

try {
  await client.connect();

  // بررسی وجود جداول — پیام روشن به‌جای خطای SQL خام.
  const tableCheck = await client.query(
    `select to_regclass('public.users') as users_table`,
  );
  if (!tableCheck.rows[0]?.users_table) {
    fail("جدول users وجود ندارد. ابتدا npm run db:push را اجرا کنید.");
  }

  const result = await client.query(
    `insert into users ("fullName", "email", "passwordHash", "studentCode", "university", "major", "bio", "avatarEmoji", "karmaPoints", "role")
     values ($1, $2, $3, null, null, null, $4, '🛡️', 100, 'admin')
     on conflict ("email") do update
        set "passwordHash" = excluded."passwordHash",
            "role" = 'admin',
            "fullName" = excluded."fullName",
            "updatedAt" = now()
     returning "id", "email", "role"`,
    [fullName, email, hashPassword(password), "مدیر و پشتیبان دانش‌بوک."],
  );

  const row = result.rows[0];
  console.log(`✔ حساب مدیر آماده است: ${row.email} (id=${row.id}, role=${row.role})`);
  if (username !== email) {
    console.log(`ℹ نام کاربری «${username}» برای ورود به ایمیل «${email}» نگاشت شد.`);
  }
} catch (error) {
  fail(`اجرای اسکریپت ناموفق بود: ${error.message}`);
} finally {
  await client.end().catch(() => {});
}
