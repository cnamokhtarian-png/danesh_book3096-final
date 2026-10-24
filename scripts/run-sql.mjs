/**
 * اجرای یک فایل SQL روی دیتابیس.
 *
 *   DATABASE_URL='postgresql://…' npm run db:create-reset-table
 *
 * برای مهاجرت‌های کوچک و افزایشی است (مثل ساخت جدول passwordResets) تا لازم
 * نباشد کاربر drizzle-kit نصب/اجرا کند. فایل‌های SQL پروژه idempotent هستند.
 */
import { readFileSync } from "node:fs";
import { Client } from "pg";

const file = process.argv[2];
const connectionString = process.env.DATABASE_URL;

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

if (!connectionString) fail("DATABASE_URL تنظیم نشده است.");
if (!file) fail("مسیر فایل SQL را بدهید. مثال: npm run db:create-reset-table");

let sql;
try {
  sql = readFileSync(file, "utf8");
} catch {
  fail(`فایل ${file} پیدا نشد.`);
}

const client = new Client({ connectionString });

try {
  await client.connect();
  await client.query(sql);
  console.log(`✔ ${file} با موفقیت اجرا شد.`);
} catch (error) {
  fail(`اجرای SQL ناموفق بود: ${error.message}`);
} finally {
  await client.end().catch(() => {});
}
