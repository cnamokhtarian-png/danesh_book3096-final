/**
 * ساخت دستی لینک بازیابی رمز عبور — برای وقتی سرویس ایمیل تنظیم نشده است.
 *
 *   DATABASE_URL='postgresql://…' SITE_URL='https://example.com' \
 *     npm run reset-link -- user@example.com
 *
 * خروجی یک لینک یک‌بارمصرف (۴۵ دقیقه اعتبار) است که می‌توانید آن را از طریق
 * پیام مستقیم یا پشتیبانی به کاربر بدهید. توکن فقط به‌صورت هش در دیتابیس
 * ذخیره می‌شود، مانند مسیر عادی بازیابی.
 */
import { createHash, randomBytes } from "node:crypto";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;
const email = (process.argv[2] ?? "").trim().toLowerCase();
const site = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const ttlMinutes = 45;

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

if (!connectionString) fail("DATABASE_URL تنظیم نشده است.");
if (!email) fail("ایمیل کاربر را بدهید: npm run reset-link -- user@example.com");

const client = new Client({ connectionString });

try {
  await client.connect();

  // ساخت خودکار جدول در صورت نبود (افزایشی و idempotent؛ هیچ داده‌ای تغییر نمی‌کند)
  await client.query(`
    create table if not exists "passwordResets" (
      "id"        serial primary key,
      "userId"    integer not null references "users"("id") on delete cascade,
      "tokenHash" varchar(64) not null,
      "expiresAt" timestamp with time zone not null,
      "usedAt"    timestamp with time zone,
      "createdAt" timestamp with time zone not null default now()
    )
  `);
  await client.query(
    'create unique index if not exists "passwordResets_tokenHash_unique" on "passwordResets" ("tokenHash")',
  );
  await client.query(
    'create index if not exists "passwordResets_userId_idx" on "passwordResets" ("userId")',
  );

  const found = await client.query('select "id", "fullName" from users where email = $1', [email]);
  const user = found.rows[0];
  if (!user) fail(`کاربری با ایمیل ${email} پیدا نشد.`);

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const tx = await client.query("begin");
  void tx;
  await client.query('delete from "passwordResets" where "userId" = $1', [user.id]);
  await client.query(
    'insert into "passwordResets" ("userId", "tokenHash", "expiresAt") values ($1, $2, $3)',
    [user.id, tokenHash, expiresAt],
  );
  await client.query("commit");

  console.log(`✔ لینک بازیابی برای ${user.fullName} (${email}) ساخته شد:`);
  console.log(`${site}/reset-password?token=${token}`);
  console.log(`⏱ اعتبار: ${ttlMinutes} دقیقه · یک‌بارمصرف`);
} catch (error) {
  fail(`اجرای اسکریپت ناموفق بود: ${error.message}`);
} finally {
  await client.end().catch(() => {});
}
