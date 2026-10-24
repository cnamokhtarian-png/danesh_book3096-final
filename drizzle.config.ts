import { defineConfig } from "drizzle-kit";

/**
 * پیکربندی drizzle-kit.
 *
 * نکته امنیتی: قبلاً رشته اتصال با رمز واقعی داخل drizzle.config.json کامیت
 * شده بود. اکنون فقط از متغیر محیطی DATABASE_URL خوانده می‌شود و هیچ رمزی در
 * مخزن نیست. این فایل عمداً .ts است چون drizzle-kit مقادیر داخل .json را
 * به‌عنوان رشته خام می‌خواند و process.env را جایگزین نمی‌کند.
 */
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL تنظیم نشده است. آن را در فایل .env (یا محیط هاست) قرار دهید؛ نمونه در .env.example موجود است.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
