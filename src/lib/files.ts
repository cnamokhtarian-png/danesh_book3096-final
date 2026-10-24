/**
 * فایل‌های آگهی (PDF / پاورپوینت / نمونه سوال …)
 *
 * چرا در دیتابیس؟
 *  - روی Vercel فایل‌سیستم ماندگار نیست؛ هر فایلی که در پوشه `public` نوشته
 *    شود با دیپلوی بعدی پاک می‌شود.
 *  - سرویس ذخیره‌سازی خارجی نیازمند کلید و پیکربندی اضافه است؛ این راه بدون
 *    هیچ تنظیم تازه‌ای کار می‌کند و با Supabase هم سازگار است.
 *
 * سقف حجم عمداً محافظه‌کارانه است (۸ مگابایت) تا حجم دیتابیس و هزینه‌ی
 * پلن‌های رایگان از کنترل خارج نشود.
 *
 * جدول `bookFiles` خودکار ساخته می‌شود (مثل جدول بازیابی رمز) تا کاربر
 * مجبور به اجرای SQL دستی نباشد.
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookFiles } from "@/db/schema";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // ۸ مگابایت

/** پسوندهای مجاز + نوع MIME متناظر. */
export const ALLOWED_FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  zip: "application/zip",
  txt: "text/plain",
};

export const ALLOWED_EXTENSIONS_LABEL = "PDF، PowerPoint، Word، ZIP، TXT";

let schemaReady = false;
let schemaPromise: Promise<void> | null = null;

async function tableExists(): Promise<boolean> {
  try {
    const result = await db.execute(
      sql`select to_regclass('public."bookFiles"') is not null as ok`,
    );
    const rows = result.rows as Array<{ ok: boolean }>;
    return Boolean(rows[0]?.ok);
  } catch {
    return false;
  }
}

async function createFileTable(): Promise<void> {
  // همه دستورها IF NOT EXISTS هستند تا اجرای هم‌زمان یا تکراری خطا ندهد.
  await db.execute(sql`
    create table if not exists "bookFiles" (
      "id" serial primary key,
      "bookId" integer references "books"("id") on delete cascade,
      "ownerId" integer not null references "users"("id") on delete cascade,
      "fileName" varchar(180) not null,
      "mimeType" varchar(120) not null default 'application/octet-stream',
      "sizeBytes" integer not null default 0,
      "storage" varchar(12) not null default 'upload',
      "data" text,
      "externalUrl" text,
      "downloadCount" integer not null default 0,
      "createdAt" timestamp with time zone not null default now()
    )
  `);
  await db.execute(
    sql`create index if not exists "bookFiles_bookId_idx" on "bookFiles" ("bookId")`,
  );
  await db.execute(
    sql`create index if not exists "bookFiles_ownerId_idx" on "bookFiles" ("ownerId")`,
  );
}

/** ساخت جدول در اولین استفاده — بی‌صدا و یک‌بار برای هر process. */
export async function ensureFileSchema(): Promise<void> {
  if (schemaReady) return;

  if (!schemaPromise) {
    schemaPromise = createFileTable()
      .then(() => {
        schemaReady = true;
      })
      .catch(async (error) => {
        if (await tableExists()) {
          schemaReady = true;
          return;
        }
        throw error;
      })
      .finally(() => {
        schemaPromise = null;
      });
  }

  return schemaPromise;
}

export type BookFileMeta = {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storage: "upload" | "link";
  externalUrl: string | null;
  downloadCount: number;
};

const metaSelection = {
  id: bookFiles.id,
  fileName: bookFiles.fileName,
  mimeType: bookFiles.mimeType,
  sizeBytes: bookFiles.sizeBytes,
  storage: bookFiles.storage,
  externalUrl: bookFiles.externalUrl,
  downloadCount: bookFiles.downloadCount,
};

/** متادیتای فایل یک آگهی (بدون خواندن محتوای سنگین). */
export async function getBookFile(bookId: number): Promise<BookFileMeta | null> {
  try {
    await ensureFileSchema();
    const rows = await db
      .select(metaSelection)
      .from(bookFiles)
      .where(eq(bookFiles.bookId, bookId))
      .limit(1);
    return (rows[0] as BookFileMeta | undefined) ?? null;
  } catch (error) {
    console.error("[daneshbook:files] getBookFile failed:", (error as Error).message);
    return null;
  }
}

export type SaveUploadInput = {
  ownerId: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  base64: string;
};

/** ذخیره‌ی فایل آپلودشده (هنوز به آگهی وصل نشده). */
export async function saveUploadedFile(input: SaveUploadInput): Promise<BookFileMeta> {
  await ensureFileSchema();
  const [row] = await db
    .insert(bookFiles)
    .values({
      ownerId: input.ownerId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storage: "upload",
      data: input.base64,
    })
    .returning(metaSelection);
  return row as BookFileMeta;
}

/** ثبت «لینک منبع» به‌جای آپلود فایل. */
export async function saveExternalLink(input: {
  ownerId: number;
  fileName: string;
  externalUrl: string;
}): Promise<BookFileMeta> {
  await ensureFileSchema();
  const [row] = await db
    .insert(bookFiles)
    .values({
      ownerId: input.ownerId,
      fileName: input.fileName,
      mimeType: "text/uri-list",
      sizeBytes: 0,
      storage: "link",
      externalUrl: input.externalUrl,
    })
    .returning(metaSelection);
  return row as BookFileMeta;
}

/**
 * وصل کردن فایل به آگهی تازه‌ساخته‌شده.
 * فقط فایل خود کاربر و فقط فایلی که هنوز به آگهی وصل نشده پذیرفته می‌شود.
 */
export async function attachFileToBook(
  fileId: number,
  bookId: number,
  ownerId: number,
): Promise<boolean> {
  try {
    await ensureFileSchema();
    const updated = await db
      .update(bookFiles)
      .set({ bookId })
      .where(
        and(eq(bookFiles.id, fileId), eq(bookFiles.ownerId, ownerId), sql`${bookFiles.bookId} is null`),
      )
      .returning({ id: bookFiles.id });
    return updated.length > 0;
  } catch (error) {
    console.error("[daneshbook:files] attachFileToBook failed:", (error as Error).message);
    return false;
  }
}

/** محتوای فایل برای دانلود + شمارش دانلود. */
export async function readFileForDownload(
  id: number,
): Promise<{ fileName: string; mimeType: string; base64: string | null; externalUrl: string | null } | null> {
  try {
    await ensureFileSchema();
    const rows = await db
      .select({
        fileName: bookFiles.fileName,
        mimeType: bookFiles.mimeType,
        data: bookFiles.data,
        externalUrl: bookFiles.externalUrl,
      })
      .from(bookFiles)
      .where(eq(bookFiles.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return { ...row, base64: row.data ?? null };
  } catch (error) {
    console.error("[daneshbook:files] readFileForDownload failed:", (error as Error).message);
    return null;
  }
}

export async function countDownload(id: number): Promise<void> {
  try {
    await db
      .update(bookFiles)
      .set({ downloadCount: sql`${bookFiles.downloadCount} + 1` })
      .where(eq(bookFiles.id, id));
  } catch {
    /* شمارنده حیاتی نیست */
  }
}

/** بررسی امن بودن نام فایل برای هدر Content-Disposition. */
export function safeFileName(name: string): string {
  return name.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "file";
}

export function extensionOf(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function humanSize(bytes: number): string {
  if (bytes <= 0) return "لینک منبع";
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
}
