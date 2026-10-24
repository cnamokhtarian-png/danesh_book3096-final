# بررسی فنی کامل پروژه دانش‌بوک (danesh_book3096-final)

> **به‌روزرسانی:** موارد بحرانی و بالا و اکثر موارد متوسط این گزارش اصلاح و روی یک
> دیتابیس PostgreSQL واقعی تست شده‌اند. خلاصه تغییرات و مراحل انتشار در
> [`FIXES.md`](./FIXES.md) آمده است. متن زیر گزارش اولیه (وضعیت قبل از اصلاح) است.

**تاریخ بررسی:** ۱۴۰۵/۰۸/۰۲ — **کامیت پایه:** `263bb0d` — **شاخه:** `arena/b41cc983-danesh-book3096-final`
**نوع پروژه:** Next.js 16 (App Router) + React 19 + TypeScript + Drizzle ORM + PostgreSQL/Supabase + Tailwind v4

---

## ۱. خلاصه مدیریتی

پروژه یک مارکت‌پلیس دانشجویی کامل و **از نظر ساختار مهندسی بالاتر از میانگین** است: تایپ‌استرینگ سخت‌گیرانه، بدون `any`، بدون `@ts-ignore`، بدون `console.log` باقی‌مانده، لایه دسترسی به داده منظم، و UI فارسی/RTL منسجم و تمیز. `build`، `lint` و `typecheck` هر سه بدون خطا پاس می‌شوند.

مشکل اصلی پروژه **در لایه «آماده‌سازی برای تولید» (production readiness) و «امنیت عملیاتی»** است، نه در معماری کد:

| حوزه | وضعیت | نمره (از ۱۰) |
|---|---|---|
| معماری و ساختار کد | خوب و منظم | ۸ |
| کیفیت کد TypeScript | بسیار خوب | ۸.۵ |
| UI/UX و RTL | خوب | ۸ |
| امنیت | چند ایراد جدی | ۴.۵ |
| پیکربندی و DevOps (env، migration، CI، git) | ضعیف | ۲.۵ |
| تست و پایش (observability) | وجود ندارد | ۱ |
| مستندسازی | وجود ندارد | ۱ |

**سه ریسک بحرانی که باید قبل از هر کار دیگری بسته شوند:**

1. **رمز واقعی دیتابیس Supabase در گیت کامیت شده است** (`drizzle.config.json`).
2. **هر کسی می‌تواند با ثبت‌نام با ایمیل ادمین، مدیر سایت شود** (نبود تأیید ایمیل + اعتماد به رشته ایمیل).
3. **رمز همه حساب‌های نمونه (از جمله ادمین) `123456` است** و رمز نمونه روی صفحه ورود به کاربر نمایش داده می‌شود.

---

## ۲. وضعیت فنی اندازه‌گیری‌شده

| بررسی | نتیجه |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | ✅ بدون خطا |
| `npm run lint` (`eslint .`) | ✅ بدون خطا و بدون هشدار |
| `next build` | ✅ موفق، ۲۳ مسیر (همه `ƒ` داینامیک) |
| `git ls-files` | ۵۶ فایل، بدون `node_modules` |
| حجم کد | ۶۳۱۸ خط در `src` و `scripts` |
| `npm audit --omit=dev` | ❌ **۳ آسیب‌پذیری: ۲ high و ۱ critical** (`next`, `sharp`, `postcss` داخلی Next) |
| تست خودکار | ❌ هیچ (بدون Vitest/Jest/Playwright) |
| CI/CD | ❌ هیچ (بدون `.github/workflows`) |
| `.gitignore` | ❌ **وجود ندارد** |
| `README` / `.env.example` | ❌ وجود ندارد |
| migrations دیتابیس | ❌ وجود ندارد (فقط `drizzle-kit push` دستی) |
| سرور واقعی (smoke test) | ✅ سایت با دیتابیس قطع، ۲۰۰ برمی‌گرداند (fallbackها کار می‌کنند) |

**نتیجه تست زمان اجرا (Next production server + دیتابیس خاموش):**

- `GET /` → ۲۰۰ با آمار صفر و EmptyState ✅
- `GET /books` → ۲۰۰ با «نتیجه‌ای پیدا نشد» ✅
- `GET /api/health` → `{"ok":false}` با کد ۵۰۰ ✅
- `POST /api/auth/login` → **۵۰۰ با پیام عمومی**، در حالی که انتظار می‌رفت ۵۰۳ با پیام فارسی «ارتباط با سرور دیتابیس برقرار نشد» ❌ (باگ شماره ۴)

---

## ۳. فهرست اولویت‌دار مشکلات

| # | شدت | عنوان | محل |
|---|---|---|---|
| ۱ | 🔴 بحرانی | رمز دیتابیس در گیت | `drizzle.config.json:5` |
| ۲ | 🔴 بحرانی | ارتقای سطح دسترسی به ادمین با ثبت‌نام با ایمیل ادمین | `src/lib/auth.ts:20,25` + `src/lib/constants.ts:3` |
| ۳ | 🔴 بحرانی | رمز پیش‌فرض `123456` برای همه کاربران نمونه + نمایش عمومی | `scripts/seed.mjs:106,172`، `src/app/login/page.tsx:60-66` |
| ۴ | 🟠 بالا | نگاشت خطاهای دیتابیس عملاً کار نمی‌کند (۵۰۰ جای ۵۰۳) | `src/lib/http.ts:195-254` |
| ۵ | 🟠 بالا | نبود `.gitignore` → خطر لو رفتن `.env` و کامیت `node_modules` | ریشه پروژه |
| ۶ | 🟠 بالا | کوکی نشست بدون `Secure` | `src/lib/auth.ts:81-88` |
| ۷ | 🟠 بالا | شمارش تلاش ناموفق ورود ناقص → user enumeration | `src/app/api/auth/login/route.ts:72-80` |
| ۸ | 🟠 بالا | ۳ آسیب‌پذیری شناخته‌شده در وابستگی‌ها | `package.json` |
| ۹ | 🟠 بالا | نبود تأیید ایمیل و بازیابی رمز عبور | کل جریان auth |
| ۱۰ | 🟠 بالا | نبود migration و اسکریپت‌های دیتابیس | `package.json:6-11` |
| ۱۱ | 🟠 بالا | کرش کامل اپ اگر `DATABASE_URL` تنظیم نشده باشد | `src/db/index.ts:14-18` |
| ۱۲ | 🟡 متوسط | `GET /api/books` فیلترهای `medium/offerType/audience` را نادیده می‌گیرد | `src/app/api/books/route.ts:13-23` |
| ۱۳ | 🟡 متوسط | Rate-limit با `Map` بدون پاکسازی (نشت حافظه) و کلید قابل جعل | `login/route.ts:13-32`، `suggestions/route.ts:11-32` |
| ۱۴ | 🟡 متوسط | `isExchangeable` عملاً همیشه `true` است | `NewBookForm.tsx:34` + `api/books/route.ts:54` |
| ۱۵ | 🟡 متوسط | افزایش بازدید در جریان رندر صفحه (شمارش ربات‌ها) | `books/[id]/page.tsx:38` |
| ۱۶ | 🟡 متوسط | نبود هدرهای امنیتی HTTP | `next.config.ts` |
| ۱۷ | 🟡 متوسط | فونت از Google Fonts با `@import` (در ایران مسدود/کند) | `src/app/globals.css:1` |
| ۱۸ | 🟡 متوسط | جدول `sessions` هرگز پاکسازی نمی‌شود | `src/db/schema.ts:46-57` |
| ۱۹ | 🟡 متوسط | `%` و `_` کاربر در جستجو به‌عنوان wildcard عمل می‌کند | `src/lib/queries.ts:76-83` |
| ۲۰ | 🟡 متوسط | بدون throttle روی register/books/requests | مسیرهای API |
| ۲۱ | 🟡 متوسط | پذیرش درخواست، وضعیت `available` آگهی را دوباره بررسی نمی‌کند | `api/requests/route.ts:143-172` |
| ۲۲ | 🟡 متوسط | متادیتای پکیج/مستندات نادرست یا غایب | `package.json:2` |
| ۲۳ | 🔵 کم | دسترس‌پذیری (a11y): toggle و drawer | `NewBookForm.tsx:258`، `AppShell.tsx` |
| ۲۴ | 🔵 کم | صفحات قوانین/حریم خصوصی، sitemap، robots، OG | کل سایت |
| ۲۵ | 🔵 کم | `target: ES2017` برای Next 16 | `tsconfig.json:3` |
| ۲۶ | 🔵 کم | «آگهی فعال» در پروفایل شامل آگهی‌های مبادله‌شده هم می‌شود | `src/app/profile/page.tsx:51` |

---

## ۴. جزئیات مشکلات بحرانی و بالا

### 🔴 ۱) رمز واقعی دیتابیس داخل گیت

```json
// drizzle.config.json
"url": "postgresql://postgres.offfncdvbsfyttmpytnv:****@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
```

**اثر:** هر کسی با دسترسی به ریپازیتوری (یا تاریخچه گیت، حتی بعد از حذف فایل) به دیتابیس کامل دسترسی دارد: خواندن ایمیل و هش رمز همه کاربران، تغییر/حذف داده، و در صورت لو رفتن کلید سرویس، هزینه مصرف.

**اقدام فوری (به ترتیب):**
1. رمز کاربر دیتابیس Supabase را **همین امروز rotate کنید** (Supabase → Settings → Database → Reset password). این کار الزامی است؛ حذف فایل کافی نیست چون در تاریخچه کامیت `263bb0d` باقی می‌ماند.
2. فایل را به شکل زیر بازنویسی کنید:

```jsonc
// drizzle.config.json  (یا بهتر: drizzle.config.ts)
{
  "dialect": "postgresql",
  "schema": "./src/db/schema.ts",
  "out": "./drizzle",
  "dbCredentials": { "url": "process.env.DATABASE_URL" }
}
```

> نکته: `drizzle-kit` مقدار `process.env.X` را در فایل JSON به‌صورت رشته خام می‌خواند و جایگزین نمی‌کند — پس فایل را به `drizzle.config.ts` تغییر دهید تا واقعاً از `process.env.DATABASE_URL` استفاده شود.

3. اگر ریپو عمومی است، پس از rotate، تاریخچه را با `git filter-repo` پاک کنید.

---

### 🔴 ۲) ارتقای سطح دسترسی به «مدیر» با ثبت‌نام با ایمیل مدیر

```ts
// src/lib/constants.ts:3
export const MANAGEMENT_EMAIL = "c.na.mokhtarian@gmail.com";

// src/lib/auth.ts:23-26
export function isAdminUser(user) {
  if (!user) return false;
  return user.role === "admin" || adminEmails().includes(user.email.toLowerCase());
}
```

`isAdminUser` به **رشته ایمیل** اعتماد می‌کند، و ثبت‌نام هیچ تأیید مالکیت ایمیلی ندارد (`register/route.ts` فقط regex چک می‌کند). روی یک دیتابیس تازه (قبل از اجرای seed) اولین کسی که با این ایمیل ثبت‌نام کند، بلافاصله دسترسی کامل پنل مدیریت می‌گیرد: دیدن ایمیل همه کاربران، تغییر و حذف پیام‌ها، دیدن آمار.

**راه‌حل:**
- منبع حقیقت فقط ستون `role` در دیتابیس باشد؛ لیست ایمیل ادمین را حذف کنید یا فقط برای bootstrap یک‌باره استفاده کنید.
- تأیید ایمیل (توکن یک‌بارمصرف) اضافه کنید و ادمین‌شدن را به آن گره بزنید.
- در محیط تولید، حساب ادمین را با یک اسکریپت امن (نه seed عمومی) بسازید.

---

### 🔴 ۳) رمز پیش‌فرض `123456` برای همه، از جمله ادمین

```js
// scripts/seed.mjs:106
hashPassword("123456"),
// scripts/seed.mjs:172
console.log("admin: c.na.mokhtarian@gmail.com / 123456 · student: sara@daneshbook.ir / 123456");
```

```tsx
// src/app/login/page.tsx:60-66 — نمایش عمومی رمز نمونه
<span className="font-extrabold">حساب نمونه برای تست سریع:</span>
sara@daneshbook.ir / 123456
```

**اثر:** اگر seed روی دیتابیس تولید اجرا شود، همه حساب‌ها با یک رمز عمومی و ضعیف باز می‌شوند (رمز ۶ کاراکتری، هیچ الزام پیچیدگی وجود ندارد). بلوک «حساب نمونه» هم در تولید به هر بازدیدکننده‌ای می‌گوید چه رمزی را امتحان کند.

**راه‌حل:** رمز seed را از `process.env.SEED_PASSWORD` بخوانید، و بلوک نمونه را داخل `if (process.env.NODE_ENV !== "production")` بگذارید.

---

### 🟠 ۴) نگاشت خطاهای دیتابیس کار نمی‌کند (باگ تأییدشده در اجرا)

```ts
// src/lib/http.ts:195-231
function describeDbError(error: unknown) {
  const err = error as { code?: string; message?: string } | null;
  if (err instanceof HttpError) …
  switch (err?.code) {
    case "ECONNREFUSED": … return { status: 503 }
```

Drizzle خطا را در `DrizzleQueryError` می‌پیچد؛ `code` روی آبجکت بیرونی **`undefined`** است و کد اصلی در `error.cause.code` قرار دارد. خروجی واقعی لاگ سرور:

```
[daneshbook:api] unexpected error: Error: Failed query: select … from "users" …
  [cause]: Error: connect ECONNREFUSED 127.0.0.1:5432   { code: 'ECONNREFUSED' }
```

و پاسخ API در تست: **۵۰۰ + «خطای غیرمنتظره‌ای رخ داد»** — یعنی همه آن پیام‌های فارسیِ خوبِ ۵۰۳/۵۰۴/۴۰۹ هرگز به کاربر نمی‌رسند.

**راه‌حل:**

```ts
function dbCode(error: unknown): string | undefined {
  let current = error as { code?: string; cause?: unknown } | null | undefined;
  for (let depth = 0; current && depth < 4; depth += 1) {
    if (typeof current.code === "string") return current.code;
    current = current.cause as typeof current;
  }
  return undefined;
}
// سپس در describeDbError: const code = dbCode(error); switch (code) { … }
```
و همین کار را برای پیام/`name` در بخش timeout انجام دهید (پیام خطای timeout نیز داخل `cause` است).

---

### 🟠 ۵) وجود نداشتن `.gitignore`

پروژه `.gitignore` ندارد. یک `git add .` ساده می‌تواند `node_modules/`، `.next/` و فایل `.env` با رمز دیتابیس را وارد گیت کند.

```gitignore
node_modules/
.next/
out/
build/
.env
.env*.local
*.log
.DS_Store
next-env.d.ts
```

همچنین `.env.example` با کلیدهای لازم بسازید:

```env
DATABASE_URL=postgresql://user:password@host:5432/db
ADMIN_EMAILS=
SEED_PASSWORD=
PG_POOL_MAX=5
```

---

### 🟠 ۶) کوکی نشست بدون `Secure`

```ts
// src/lib/auth.ts:81-88
store.set({ name, value: token, httpOnly: true, sameSite: "lax", path: "/", maxAge: … });
```

`httpOnly` و `sameSite=lax` درست تنظیم شده‌اند (خوب است)، اما در HTTPS کوکی بدون `Secure` هم ارسال می‌شود و در صورت کوچک‌ترین نشتی روی HTTP قابل سرقت است.

```ts
secure: process.env.NODE_ENV === "production",
```

پیشنهاد تکمیلی: نام کوکی در تولید `__Host-daneshbook_session` باشد (الزامات `__Host-` را همین تنظیمات برآورده می‌کند) و توکن نشست **به‌صورت هش‌شده** در جدول `sessions` ذخیره شود تا لو رفتن دیتابیس مستقیماً به takeover نشست منجر نشود.

---

### 🟠 ۷) شمارش تلاش ناموفق ورود ناقص است

```ts
// src/app/api/auth/login/route.ts:71-80
const found = rows[0];
if (!found) {
  throw new HttpError("حسابی با این ایمیل پیدا نشد. ابتدا ثبت‌نام کنید.", 401); // ❌ registerFailure صدا زده نمی‌شود
}
const valid = await verifyPassword(password, found.passwordHash);
if (!valid) { registerFailure(email); … }
```

**دو مشکل:**
1. **User enumeration:** پیام‌های «حساب پیدا نشد» و «رمز اشتباه» متفاوت‌اند و مورد اول اصلاً throttle نمی‌شود؛ مهاجم می‌تواند با سرعت بالا فهرست ایمیل‌های ثبت‌شده را استخراج کند.
2. **throttle فقط روی رمز اشتباه** — یعنی حدس زدن ایمیل نامحدود است.

**راه‌حل:** یک پیام یکسان برای هر دو حالت («ایمیل یا رمز عبور اشتباه است»)، و `registerFailure` را برای هر دو مسیر صدا بزنید. همچنین throttle را روی ترکیب `IP + email` بگذارید نه فقط ایمیل (در غیر این صورت مهاجم با چرخش ایمیل، قربانی را قفل می‌کند).

---

### 🟠 ۸) آسیب‌پذیری‌های وابستگی‌ها

```
3 vulnerabilities (2 high, 1 critical)
next  → postcss (خواندن فایل دلخواه / path traversal)
sharp → libvips / libheif / librsvg (CVE-2026-33327, -33328, -35590, -35591, …)
```

Next نصب‌شده `16.2.6` است و رفع در `16.4.3` ارائه شده. **اقدام:** `npm i next@^16.4.3` و اجرای مجدد `npm audit`، سپس build/تست‌های دود بررسی شود. اگر `sharp` فقط برای بهینه‌سازی تصویر Next لازم است، ارتقای Next معمولاً آن را هم می‌آورد.

---

### 🟠 ۹) نبود تأیید ایمیل و بازیابی رمز

هیچ‌کدام وجود ندارد؛ نه توکن تأیید، نه ارسال ایمیل، نه «رمز را فراموش کردم». پیامدها: حساب جعلی با ایمیل دیگران (و مستقیماً مشکل شماره ۲)، ناتوانی کاربر در بازیابی حساب، و نبود راهی برای اثبات اینکه کاربر دانشجوی همان دانشگاه است.

حداقلِ قابل قبول برای MVP: توکن یک‌بارمصرف در جدول `email_verifications` + سرویس ایمیل (Resend/Postmark) + جریان reset با TTL ۳۰ دقیقه.

---

### 🟠 ۱۰) نبود migration و اسکریپت‌های دیتابیس

`drizzle-kit` در `devDependencies` هست اما هیچ اسکریپتی در `package.json` برای push/generate/seed وجود ندارد و پوشه `drizzle/` (migrations) هم ساخته نشده. یعنی ساخت جداول ۱۰۰٪ دستی و تکرارنشدنی است و در تیم، schema drift قطعی است.

```json
"scripts": {
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:seed": "node scripts/seed.mjs"
}
```

---

### 🟠 ۱۱) کرش کل برنامه در نبود `DATABASE_URL`

```ts
// src/db/index.ts:14-18
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set. Add it to your .env file.");
```

این throw در زمان import ماژول رخ می‌دهد و کل زنجیره import (هر صفحه‌ای که `queries.ts` را می‌خواند) را می‌شکند. با اینکه همه توابع `queries.ts` try/catch دارند، این throw بیرون از آن‌ها رخ می‌دهد. برای یک اپ با ادعای «مقاوم»، بهتر است سرور با صفحه خطای فارسی بالا بیاید تا با استک‌تریس.

**راه‌حل سبک:** به‌جای throw، مقدار `null`/pool تنبل بسازید و در `getCurrentUser`/`listBooks` پیام فارسی برگردانید؛ یا حداقل `throw` را به یک `error.tsx`/`global-error.tsx` با متن فارسی گره بزنید. توجه: `next build` هم بدون این متغیر شکست می‌خورد — این را در مستندات راه‌اندازی ذکر کنید.

---

## ۵. جزئیات مشکلات متوسط

### 🟡 ۱۲) `GET /api/books` فیلترهای کلیدی را نادیده می‌گیرد

```ts
// src/app/api/books/route.ts:13-23
const items = await listBooks({
  q: …, kind: …, category: …, university: …, sort: …, limit: …,
  // ❌ medium, offerType, audience ارسال نمی‌شوند
});
```

در حالی که `listBooks` هر سه را پشتیبانی می‌کند (`queries.ts:86-92`). نتیجه: مصرف‌کننده API (اپ موبایل/فرانت دیگر) نمی‌تواند مثل صفحه `/books` فیلتر کند. یک باگ ناسازگاری است، نه کرش.

### 🟡 ۱۳) Rate-limit درون‌حافظه‌ای

```ts
// login/route.ts:10-32 و suggestions/route.ts:10-32
const attempts = new Map<string, { count: number; first: number }>();
```

- **نشت حافظه:** کلیدها هرگز با انقضا حذف نمی‌شوند (فقط وقتی همان کلید دوباره استفاده شود). با ایمیل/تماس تصادفی، Map بی‌نهایت رشد می‌کند.
- **قابل دور زدن در suggestions:** کلید = `contact` که خود مهاجم تعیین می‌کند → هر پیام با یک contact جدید، بدون محدودیت.
- **در محیط چندنمونه‌ای/serverless بی‌اثر است:** هر instance شمارنده جدا دارد.

**راه‌حل:** کلید را به `IP` (از هدر `x-forwarded-for`) گره بزنید و برای تولید از یک store مشترک (Upstash Redis / جدول PostgreSQL) استفاده کنید. برای نگهداری موقت، پاکسازی دوره‌ای Map را اضافه کنید.

### 🟡 ۱۴) `isExchangeable` عملاً همیشه `true`

```tsx
// NewBookForm.tsx:34
isExchangeable: true,   // مقدار پیش‌فرض فرم
// api/books/route.ts:54
const isExchangeable = offerType === "exchange" || body.isExchangeable === true;
```

کاربر برای خاموش‌کردن باید تودل را بزند، اما برای آگهی‌های `free`/`sell` مقدار پیش‌فرض `true` ارسال می‌شود؛ نتیجه: نشان «قابل تبادل» روی تقریباً همه آگهی‌ها. مقدار پیش‌فرض را `false` بگذارید یا آن را از `offerType` مشتق کنید.

### 🟡 ۱۵) افزایش بازدید در جریان رندر

```tsx
// src/app/books/[id]/page.tsx:38
await bumpViews(book.id);
```

- هر بار رندر (شامل prefetch لینک، ربات‌های خزش، بازدید خود صاحب آگهی) شمارنده را بالا می‌برد.
- نوشتن در دیتابیس داخل یک GET، اصول HTTP را نقض می‌کند و در رندر موازی Next می‌تواند مقادیر را بالا ببرد.

جایگزین: یک route کوچک `POST /api/books/[id]/view` با throttle ۲۴ ساعته بر اساس کوکی، یا شمارنده تجمعی خارج از رندر.

### 🟡 ۱۶) نبود هدرهای امنیتی

```ts
// next.config.ts
const nextConfig: NextConfig = {};
```

حداقل مجموعه پیشنهادی:

```ts
const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'" },
      ],
    }];
  },
};
```
> CSP را بعد از انتقال فونت به خودمیزبانی اعمال کنید (بند ۱۷) تا استثنا لازم نشود.

### 🟡 ۱۷) وابستگی فونت به Google Fonts — برای مخاطب ایرانی مسئله‌ساز

```css
/* src/app/globals.css:1 */
@import url("https://fonts.googleapis.com/css2?family=Vazirmatn…");
```

- دامنه‌های Google Fonts در ایران معمولاً **مسدود یا به‌شدت کند** هستند؛ نتیجه: FOIT/تأخیر در نمایش متن کل سایت.
- `@import` رندر را بلاک می‌کند (بدترین حالت بارگذاری CSS).
- یک درخواست third-party اضافه و مسئله GDPR/حریم خصوصی.

**راه‌حل:** `next/font/local` با فایل‌های `woff2` وزیرمتن در `public/fonts` (خودمیزبان + `font-display: swap` + preload).

### 🟡 ۱۸) جدول `sessions` پاکسازی نمی‌شود

نشست‌ها ۳۰ روزه‌اند و هیچ job/کدی ردیف‌های منقضی را حذف نمی‌کند. با گذر زمان جدول رشد بی‌رویه می‌کند (و ایندکس `token` پراکنده می‌شود). یک Cron (Supabase Scheduled Function یا `pg_cron`) با `delete from sessions where "expiresAt" < now()` کافی است.

### 🟡 ۱۹) wildcard در جستجو

```ts
// src/lib/queries.ts:76
const needle = `%${filters.q.trim()}%`;
if (search) conditions.push(search);   // ilike(books.title, needle)
```

ورودی کاربر escape نمی‌شود؛ `%` و `_` به‌عنوان کاراکتر وحشی تفسیر می‌شوند (تزریق SQL نیست، چون پارامترایز شده — فقط رفتار جستجو غلط می‌شود). `needle` را با `replace(/[\\%_]/g, "\\$&")` escape کنید.

### 🟡 ۲۰) نبود throttle روی مسیرهای عمومی

`register`، `POST /api/books`، `POST /api/requests` و `POST /api/suggestions` (بدون احراز هویت) هیچ محدودیت نرخی ندارند. `readJsonBody` هم سقف اندازه بدنه ندارد (بدنه‌های چند مگابایتی parse می‌شوند، بعد `str()` کوتاه می‌کند). حداقل: بررسی `content-length` و رد کردن بالای ~۱ مگابایت.

### 🟡 ۲۱) پذیرش درخواست، وضعیت آگهی را دوباره چک نمی‌کند

اگر صاحب آگهی هم‌زمان دو درخواست را بپذیرد، یا آگهی قبلاً «مبادله شد» باشد، کد فقط `status === "pending"` درخواست را بررسی می‌کند (`api/requests/route.ts:134`) و آگهی را دوباره مبادله‌شده می‌کند و کارما می‌دهد. بررسی `books.status === "available"` و قفل ردیف (`FOR UPDATE`) در تراکنش لازم است.

### 🟡 ۲۲) متادیتای پکیج و نبود مستندات

```json
"name": "nextjs-postgresql-template"
```
بدون `version`، `description`، `license`. همچنین README وجود ندارد: کسی که ریپو را باز می‌کند نمی‌داند `DATABASE_URL` لازم است، جداول با `drizzle-kit push` ساخته می‌شوند و `node scripts/seed.mjs` داده نمونه می‌ریزد. این تنها دلیل «کار نکردن» پروژه روی ماشین جدید است.

---

## ۶. نقاط قوت (که باید حفظ شوند)

1. **تایپ‌استرینگ تمیز:** صفر `any`، صفر `@ts-ignore`، صفر `eslint-disable`. این در پروژه‌های Next کم‌نظیر است.
2. **لایه‌بندی درست:** `lib/queries.ts` (داده) / `lib/http.ts` (اعتبارسنجی و خطا) / `lib/auth.ts` (هویت) / `api/*` (مرز HTTP). جداسازی مسئولیت‌ها رعایت شده.
3. **اعتبارسنجی سمت سرور واقعی:** هر route ورودی را با `str/toInt` نرمال می‌کند و مقادیر مجاز را با ثابت‌های `constants.ts` مقایسه می‌کند — نه صرفاً اتکا به فرم.
4. **هش رمز درست:** `scrypt` با salt تصادفی و مقایسه `timingSafeEqual`. (پیشنهاد: پارامترهای scrypt را صریح کنید و نسخه‌گذاری الگوریتم را نگه دارید.)
5. **جلسات امن:** توکن تصادفی ۳۲ بایتی، httpOnly، sameSite، TTL، کوئری با بررسی `expiresAt`.
6. **کنترل دسترسی در APIها:** مالکیت آگهی (`ownerId = user.id`) در PATCH/DELETE، بررسی `isAdminUser` در مسیرهای مدیریتی، منع درخواست روی آگهی خود. این مهم‌ترین و درست‌ترین بخش امنیتی پروژه است.
7. **پاسخ‌های خطای فارسی و قابل فهم:** الگوی `withDb` + `HttpError` + پیام‌های کاربرپسند، طراحی خوبی است (فقط بند ۴ آن را از کار انداخته).
8. **مقاومت در برابر قطعی دیتابیس:** همه کوئری‌های صفحه در try/catch با fallback؛ صفحه با EmptyState رندر می‌شود نه ۵۰۰ (در تست تأیید شد).
9. **UI فارسی/RTL منسجم:** استفاده از `start/end` منطقی به‌جای `left/right`، اعداد فارسی، `dir="rtl"`، طراحی موبایل‌محور با تب پایین و drawer.
10. **Client fetch محافظت‌شده:** `apiFetch` با timeout، پیام خطای شبکه و `credentials: same-origin`.
11. **ساختار داده قابل توسعه:** تفکیک `kind × medium × offerType × audience` (به‌ویژه بازار دیجیتال/فیزیکی و هاب کنکور) طراحی محصولی هوشمندانه‌ای است.
12. **صفر کد مرده:** همه کامپوننت‌ها استفاده می‌شوند؛ صفر TODO/FIXME.

---

## ۷. برنامه اقدام پیشنهادی (به ترتیب)

### همین امروز (ساعت‌ها، نه روزها)
- [ ] rotate رمز Supabase؛ انتقال پیکربندی به `drizzle.config.ts` + `process.env.DATABASE_URL`
- [ ] ساخت `.gitignore` و `.env.example`؛ بررسی اینکه `.env` هرگز کامیت نشده
- [ ] حذف اعتماد به ایمیل ادمین (`isAdminUser` فقط `role === "admin"`)
- [ ] حذف بلوک رمز نمونه از صفحه ورود در محیط تولید؛ رمز seed از env
- [ ] `secure: true` برای کوکی در تولید

### هفته اول
- [ ] رفع `describeDbError` با پیمایش `cause` (بند ۴) + تست دستی سناریوهای ۲۳۵۰۵/ECONNREFUSED/timeout
- [ ] یکسان‌سازی پیام خطای ورود + throttle روی ایمیل ناموجود
- [ ] ارتقای `next` به `^16.4.3` و پاکسازی `npm audit`
- [ ] اسکریپت‌های `db:generate/db:migrate/db:push/db:seed` + کامیت اولین migration
- [ ] افزودن هدرهای امنیتی و خودمیزبانی فونت وزیرمتن
- [ ] `README` با راه‌اندازی گام‌به‌گام

### هفته دوم
- [ ] Rate limiting مشترک (Redis/DB) روی login/register/books/requests/suggestions
- [ ] تأیید ایمیل + بازیابی رمز
- [ ] رفع ناسازگاری فیلترهای `GET /api/books` و `isExchangeable`
- [ ] پاکسازی دوره‌ای `sessions`؛ escape ورودی جستجو
- [ ] تست‌های پایه: Vitest برای `lib/*` + Playwright برای مسیر «ثبت‌نام → ثبت آگهی → درخواست → پذیرش»؛ GitHub Actions با `lint + typecheck + build`

### بعد از آن (کیفی)
- [ ] `error.tsx` سراسری با متن فارسی وقتی `DATABASE_URL` غایب است (بند ۱۱)
- [ ] صفحات قوانین/حریم خصوصی، `robots.txt`، `sitemap.ts`، OG/Twitter metadata، `metadataBase`
- [ ] دسترس‌پذیری: `role="switch"`/`aria-checked` برای تودل، focus trap و بستن با `Esc` برای drawer، جایگزینی `window.confirm`
- [ ] داشبورد ادمین: مدیریت کاربران (تعلیق/حذف)، حذف آگهی نامناسب
- [ ] پارامترهای scrypt صریح + نسخه‌بندی هش برای مهاجرت آینده

---

## ۸. جمع‌بندی

این پروژه یک **MVP محصولی با کیفیت کدِ خوب** است که مسیر «اجرا و نمایش درست» را طی کرده، اما مسیرهای **«چقدر امن است اگر واقعاً منتشر شود؟»** و **«چطور روی ماشین دیگری بالا بیاید؟»** را نه.

اگر تنها سه کار انجام شود، ریسک پروژه از «بالا» به «متوسط» می‌رسد:
۱. rotate رمز و پاکسازی پیکربندی، ۲. بستن مسیر ارتقای دسترسی ادمین، ۳. رفع نگاشت خطاها + `.gitignore` + README.

هیچ بازنویسی معماری لازم نیست؛ مشکلات همه نقطه‌ای و قابل رفع در چند روز کاری هستند.
