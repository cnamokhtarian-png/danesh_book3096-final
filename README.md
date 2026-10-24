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

## ساخت حساب مدیر

```bash
DATABASE_URL='postgresql://…' ADMIN_USERNAME='Sins1996' ADMIN_PASSWORD='Sina3096' npm run db:set-admin
```

اسکریپت فقط با جدول `users` کار می‌کند (insert/update روی همان ایمیل) و به هیچ جدول یا ستون دیگری دست نمی‌زند. پس از اجرا هم می‌توان با نام کاربری و هم با ایمیل کامل وارد شد.

اگر نمی‌توانید اسکریپت را اجرا کنید: با همان ایمیل به‌صورت عادی ثبت‌نام کنید و سپس فقط این یک دستور را اجرا کنید:

```sql
update users set role = 'admin' where email = 'sins1996@daneshbook.local';
```

## استقرار

- `DATABASE_URL` را در محیط هاست تنظیم کنید (نه در فایل کامیت‌شده).
- `NODE_ENV=production` باشد تا کوکی نشست `Secure` شود (نیازمند HTTPS).
- برای تغییر schema، به‌جای `db:push` از `db:generate` + مهاجرت بازبینی‌شده استفاده کنید تا داده‌ای حذف نشود.
- `/api/health` → `{ ok: true, configured: true }` با ۲۰۰؛ اگر دیتابیس در دسترس نباشد ۵۰۳.

## پیکربندی امنیتی

- هش رمز با `scrypt` و نمک تصادفی + مقایسه `timingSafeEqual`.
- نشست: توکن تصادفی ۳۲ بایتی، کوکی `httpOnly` + `SameSite=lax` + `Secure` در تولید، TTL سی روز، پاکسازی خودکار نشست‌های منقضی.
- محدودیت نرخ روی ورود، ثبت‌نام، ثبت آگهی، درخواست و فرم پشتیبانی (کلید: IP + شناسه).
- دسترسی مدیر فقط بر اساس ستون `role` (نه ایمیل).
- هدرهای امنیتی در `next.config.ts`.
- فونت‌ها خودمیزبان در `public/fonts` (بدون درخواست به Google Fonts).

گزارش کامل بررسی فنی و فهرست اصلاحات: [`REVIEW.md`](./REVIEW.md) و [`FIXES.md`](./FIXES.md).
