/**
 * عکس‌های آگهی (bookPhotos)
 *
 * چرا در دیتابیس؟
 *  - روی Vercel فایل‌سیستم ماندگار نیست؛ هر فایلی که در پوشه `public` نوشته
 *    شود با دیپلوی بعدی پاک می‌شود.
 *  - سرویس ذخیره‌سازی خارجی نیازمند کلید و پیکربندی اضافه است؛ این راه بدون
 *    هیچ تنظیم تازه‌ای کار می‌کند و با Supabase هم سازگار است.
 *
 * سقف حجم عمداً محافظه‌کارانه است (۴ مگابایت هر عکس بعد از فشرده‌سازی)
 * تا حجم دیتابیس و هزینه‌ی پلن‌های رایگان از کنترل خارج نشود.
 *
 * جدول `bookPhotos` خودکار ساخته می‌شود (مثل جدول بازیابی رمز و فایل‌ها) تا
 * کاربر مجبور به اجرای SQL دستی نباشد.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookPhotos } from "@/db/schema";

export const MAX_PHOTOS_PER_BOOK = 3; // حداکثر تعداد عکس برای هر آگهی
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // ۴ مگابایت هر عکس

let schemaReady = false;
let schemaPromise: Promise<void> | null = null;

async function tableExists(): Promise<boolean> {
  try {
    const result = await db.execute(
      sql`select to_regclass('public."bookPhotos"') is not null as ok`,
    );
    const rows = result.rows as Array<{ ok: boolean }>;
    return Boolean(rows[0]?.ok);
  } catch {
    return false;
  }
}

async function createPhotoTable(): Promise<void> {
  // همه دستورها IF NOT EXISTS هستند تا اجرای هم‌زمان یا تکراری خطا ندهد.
  await db.execute(sql`
    create table if not exists "bookPhotos" (
      "id" serial primary key,
      "bookId" integer references "books"("id") on delete cascade,
      "ownerId" integer not null references "users"("id") on delete cascade,
      "mimeType" varchar(120) not null default 'image/jpeg',
      "sizeBytes" integer not null default 0,
      "data" text not null,
      "width" integer not null default 0,
      "height" integer not null default 0,
      "sortOrder" integer not null default 0,
      "createdAt" timestamp with time zone not null default now()
    )
  `);
  await db.execute(
    sql`create index if not exists "bookPhotos_bookId_idx" on "bookPhotos" ("bookId")`,
  );
  await db.execute(
    sql`create index if not exists "bookPhotos_ownerId_idx" on "bookPhotos" ("ownerId")`,
  );
}

/** ساخت جدول در اولین استفاده — بی‌صدا و یک‌بار برای هر process. */
export async function ensurePhotoSchema(): Promise<void> {
  if (schemaReady) return;

  if (!schemaPromise) {
    schemaPromise = createPhotoTable()
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

export type BookPhotoMeta = {
  id: number;
  bookId: number | null;
  ownerId: number;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  sortOrder: number;
  createdAt: Date;
};

const metaSelection = {
  id: bookPhotos.id,
  bookId: bookPhotos.bookId,
  ownerId: bookPhotos.ownerId,
  mimeType: bookPhotos.mimeType,
  sizeBytes: bookPhotos.sizeBytes,
  width: bookPhotos.width,
  height: bookPhotos.height,
  sortOrder: bookPhotos.sortOrder,
  createdAt: bookPhotos.createdAt,
};

/** متادیتای عکس‌های یک آگهی (بدون خواندن محتوای سنگین base64). */
export async function getBookPhotos(bookId: number): Promise<BookPhotoMeta[]> {
  try {
    await ensurePhotoSchema();
    const rows = await db
      .select(metaSelection)
      .from(bookPhotos)
      .where(eq(bookPhotos.bookId, bookId))
      .orderBy(bookPhotos.sortOrder, bookPhotos.id);
    return rows as BookPhotoMeta[];
  } catch (error) {
    console.error("[daneshbook:photos] getBookPhotos failed:", (error as Error).message);
    return [];
  }
}

/** متادیتای عکس‌های چندین آگهی به صورت کلیدی شده بر bookId. */
export async function getBookPhotosMap(
  bookIds: number[],
): Promise<Map<number, BookPhotoMeta[]>> {
  const map = new Map<number, BookPhotoMeta[]>();
  if (!bookIds.length) return map;
  try {
    await ensurePhotoSchema();
    const rows = await db
      .select(metaSelection)
      .from(bookPhotos)
      .where(inArray(bookPhotos.bookId, bookIds))
      .orderBy(bookPhotos.sortOrder, bookPhotos.id);
    for (const row of rows as BookPhotoMeta[]) {
      const list = map.get(row.bookId ?? 0);
      if (list) list.push(row);
      else map.set(row.bookId ?? 0, [row]);
    }
  } catch (error) {
    console.error("[daneshbook:photos] getBookPhotosMap failed:", (error as Error).message);
  }
  return map;
}

export type SaveUploadInput = {
  ownerId: number;
  mimeType: string;
  sizeBytes: number;
  base64: string;
  width: number;
  height: number;
};

/** ذخیره‌ی عکس آپلودشده (هنوز به آگهی وصل نشده). */
export async function saveUploadedPhoto(input: SaveUploadInput): Promise<BookPhotoMeta> {
  await ensurePhotoSchema();
  const [row] = await db
    .insert(bookPhotos)
    .values({
      ownerId: input.ownerId,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      data: input.base64,
      width: input.width,
      height: input.height,
    })
    .returning(metaSelection);
  return row as BookPhotoMeta;
}

/**
 * وصل کردن عکس‌ها به آگهی تازه‌ساخته‌شده، با حفظ ترتیب ارسالی.
 * فقط عکس‌های خود کاربر و فقط عکس‌هایی که هنوز به آگهی وصل نشده پذیرفته می‌شوند.
 * تعداد عکس‌های وصل‌شده را برمی‌گرداند.
 */
export async function attachPhotosToBook(
  photoIds: number[],
  bookId: number,
  ownerId: number,
): Promise<number> {
  if (!photoIds.length) return 0;
  try {
    await ensurePhotoSchema();
    let attached = 0;
    for (const [sortOrder, photoId] of photoIds.entries()) {
      const updated = await db
        .update(bookPhotos)
        .set({ bookId, sortOrder })
        .where(
          and(
            eq(bookPhotos.id, photoId),
            eq(bookPhotos.ownerId, ownerId),
            sql`${bookPhotos.bookId} is null`,
          ),
        )
        .returning({ id: bookPhotos.id });
      if (updated.length > 0) attached += 1;
    }
    return attached;
  } catch (error) {
    console.error("[daneshbook:photos] attachPhotosToBook failed:", (error as Error).message);
    return 0;
  }
}

/** محتوای عکس برای نمایش (سرveur-inline) + متادیتا. */
export async function readPhoto(
  id: number,
): Promise<{ mimeType: string; base64: string; sizeBytes: number } | null> {
  try {
    await ensurePhotoSchema();
    const rows = await db
      .select({
        mimeType: bookPhotos.mimeType,
        data: bookPhotos.data,
        sizeBytes: bookPhotos.sizeBytes,
      })
      .from(bookPhotos)
      .where(eq(bookPhotos.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return { mimeType: row.mimeType, base64: row.data, sizeBytes: row.sizeBytes };
  } catch (error) {
    console.error("[daneshbook:photos] readPhoto failed:", (error as Error).message);
    return null;
  }
}

export function humanSize(bytes: number): string {
  if (bytes <= 0) return "۰ بایت";
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
}
