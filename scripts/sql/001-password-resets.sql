-- ---------------------------------------------------------------------------
-- جدول بازیابی رمز عبور — ایزوله و idempotent
--
-- این اسکریپت فقط یک جدول جدید می‌سازد و به هیچ جدول، ستون یا داده‌ی موجودی
-- دست نمی‌زند. اجرای چندباره‌اش هم بی‌خطر است (IF NOT EXISTS).
--
-- روش اجرا (یکی را انتخاب کنید):
--   ۱) Supabase → SQL Editor → کل این فایل را paste و Run کنید.
--   ۲) یا: npm run db:push
-- ---------------------------------------------------------------------------

create table if not exists "passwordResets" (
  "id"        serial primary key,
  "userId"    integer not null references "users"("id") on delete cascade,
  "tokenHash" varchar(64) not null,
  "expiresAt" timestamp with time zone not null,
  "usedAt"    timestamp with time zone,
  "createdAt" timestamp with time zone not null default now()
);

create unique index if not exists "passwordResets_tokenHash_unique"
  on "passwordResets" ("tokenHash");

create index if not exists "passwordResets_userId_idx"
  on "passwordResets" ("userId");

-- بررسی نهایی: باید یک ردیف با نام passwordResets برگرداند
select to_regclass('public."passwordResets"') as created_table;
