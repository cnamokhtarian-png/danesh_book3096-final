# دانش‌بوک

بازار دانشجویی کتاب، جزوه، اسلاید و نمونه‌سوال — Next.js 16 (App Router) + React 19 + TypeScript + Drizzle ORM + PostgreSQL (Supabase) + Tailwind v4، کاملاً فارسی و RTL.

## راه‌اندازی سریع

```bash
cp .env.example .env      # سپس DATABASE_URL را پر کنید
npm install

npm run db:push           # ساخت جداول از روی src/db/schema.ts
npm run db:set-admin      # ساخت حساب مدیر (ADMIN_USERNAME / ADMIN_PASSWORD)
npm run dev
```

اپ روی <http://localhost:3000> بالا می‌آید.

### متغیرهای محیطی

| نام | الزامی | توضیح |
|---|---|---|
| `DATABASE_URL` | ✅ | رشته اتصال Postgres/Supabase |
| `PG_POOL_MAX` | — | حداکثر اتصال pool (پیش‌فرض ۵) |
| `ADMIN_USERNAME` | برای `db:set-admin` | نام کاربری مدیر (اگر `@` نداشته باشد، با `ADMIN_EMAIL_DOMAIN` به ایمیل تبدیل می‌شود) |
| `ADMIN_PASSWORD` | برای `db:set-admin` | رمز مدیر (حداقل ۸ کاراکتر) |
| `SEED_PASSWORD` | برای `db:seed` | رمز کاربران نمونه؛ بدون آن رمز تصادفی ساخته می‌شود |

> هیچ رمزی در مخزن نگه‌داری نمی‌شود. `.env` در `.gitignore` است.

## اسکریپت‌ها

| دستور | کار |
|---|---|
| `npm run dev` / `build` / `start` | اجرا و ساخت Next.js |
| `npm run lint` / `typecheck` | بررسی کد و انواع |
| `npm run db:push` | اعمال schema روی دیتابیس (برای راه‌اندازی اولیه) |
| `npm run db:generate` | تولید SQL مهاجرت در `drizzle/` (برای محیط تولید) |
| `npm run db:set-admin` | ساخت/ارتقای حساب مدیر — فقط یک ردیف را upsert می‌کند |
| `npm run db:seed` | داده نمونه برای توسعه (`ALLOW_SEED=1` برای محیط تولید) |
| `npm run reset-link -- <email>` | ساخت دستی لینک بازیابی رمز (وقتی سرویس ایمیل ندارید) |

## ساخت حساب مدیر

```bash
DATABASE_URL='postgresql://…' ADMIN_USERNAME='<نام-کاربری-مدیر>' ADMIN_PASSWORD='<رمز-قوی-مدیر>' npm run db:set-admin
```

> نام کاربری و رمز مدیر عمداً در این فایل‌ها نوشته نمی‌شوند. آن‌ها را در
> `.env` یا مدیر رمز عبور نگه دارید.

اسکریپت فقط با جدول `users` کار می‌کند (insert/update روی همان ایمیل) و به هیچ جدول یا ستون دیگری دست نمی‌زند. پس از اجرا هم می‌توان با نام کاربری و هم با ایمیل کامل وارد شد.

اگر نمی‌توانید اسکریپت را اجرا کنید: با همان ایمیل به‌صورت عادی ثبت‌نام کنید و سپس فقط این یک دستور را اجرا کنید:

```sql
update users set role = 'admin' where email = 'sins1996@daneshbook.local';
```

## بازیابی رمز عبور

مسیر کاربر: `/login` → «رمز عبور را فراموش کرده‌اید؟» → `/forgot-password` → ایمیل حاوی لینک → `/reset-password`.

- توکن ۳۲ بایتی تصادفی است و **فقط هش SHA-256 آن** در جدول `passwordResets` ذخیره می‌شود.
- یک‌بارمصرف و با اعتبار ۴۵ دقیقه؛ با هر درخواست جدید، لینک‌های قبلی باطل می‌شوند.
- بعد از تغییر رمز، همه نشست‌های کاربر حذف می‌شود (خروج از دستگاه‌های دیگر).
- پاسخ درخواست همیشه یکسان است تا وجود یا نبود ایمیل افشا نشود.
- محدودیت: ۳ درخواست / ۱۵ دقیقه به‌ازای هر ایمیل + ۱۰ به‌ازای هر IP.

### جدول بازیابی رمز

**نیازی به کار دستی نیست:** برنامه در اولین استفاده جدول `passwordResets` را خودش با
`CREATE TABLE IF NOT EXISTS` می‌سازد (افزایشی، بدون تغییر هیچ داده‌ای). اگر خواستید از قبل
یا با دسترسی محدود ساخته شود، یکی از دو راه:

**راه ۱ — SQL Editor سوپابیس (سریع‌ترین، بدون نصب):** محتوای
[`scripts/sql/001-password-resets.sql`](./scripts/sql/001-password-resets.sql) را paste و Run کنید.
این اسکریپت `IF NOT EXISTS` است، فقط همین یک جدول را می‌سازد و به هیچ داده‌ای دست نمی‌زند.

**راه ۲ — از خط فرمان:**

```bash
DATABASE_URL='postgresql://…' npm run db:push        # فقط جدول جدید را می‌سازد
# یا اجرای مستقیم همان SQL:
DATABASE_URL='postgresql://…' npm run db:create-reset-table
```

### فعال کردن ارسال ایمیل

```env
RESEND_API_KEY=re_...
MAIL_FROM=دانش‌بوک <no-reply@your-domain.com>
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

بدون این کلید، ارسال انجام نمی‌شود؛ در محیط توسعه لینک مستقیماً در پاسخ API/لاگ چاپ می‌شود و در تولید می‌توانید با دستور زیر لینک را دستی بسازید و به کاربر بدهید:

```bash
DATABASE_URL='postgresql://…' SITE_URL='https://your-domain.com' npm run reset-link -- user@example.com
```

## استقرار

- `DATABASE_URL` را در محیط هاست تنظیم کنید (نه در فایل کامیت‌شده).
- `NODE_ENV=production` باشد تا کوکی نشست `Secure` شود (نیازمند HTTPS).
- برای تغییر schema، به‌جای `db:push` از `db:generate` + مهاجرت بازبینی‌شده استفاده کنید تا داده‌ای حذف نشود.
- جدول `passwordResets` در اولین استفاده خودکار ساخته می‌شود (یا با `npm run db:create-reset-table`).
  اگر کاربر دیتابیس اجازه ساخت جدول نداشته باشد، یک بار آن را دستی بسازید.
- `/api/health` → `{ ok: true, configured: true }` با ۲۰۰؛ اگر دیتابیس در دسترس نباشد ۵۰۳.

## پیکربندی امنیتی

- هش رمز با `scrypt` و نمک تصادفی + مقایسه `timingSafeEqual`.
- نشست: توکن تصادفی ۳۲ بایتی، کوکی `httpOnly` + `SameSite=lax` + `Secure` در تولید، TTL سی روز، پاکسازی خودکار نشست‌های منقضی.
- محدودیت نرخ روی ورود، ثبت‌نام، ثبت آگهی، درخواست و فرم پشتیبانی (کلید: IP + شناسه).
- دسترسی مدیر فقط بر اساس ستون `role` (نه ایمیل).
- هدرهای امنیتی در `next.config.ts`.
- فونت‌ها خودمیزبان در `public/fonts` (بدون درخواست به Google Fonts).

گزارش کامل بررسی فنی و فهرست اصلاحات: [`REVIEW.md`](./REVIEW.md) و [`FIXES.md`](./FIXES.md).
