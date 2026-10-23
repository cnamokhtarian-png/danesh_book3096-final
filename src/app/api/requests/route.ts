import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { books, requests, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { HttpError, jsonError, readJsonBody, str, toInt, withDb } from "@/lib/http";
import { listUserRequests } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("ابتدا وارد حساب خود شوید.", 401);

  const { response } = await withDb(async () => {
    const items = await listUserRequests(user.id);
    return { items };
  });
  return response;
}

/** Create an exchange / purchase / borrow request for a book. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("برای ارسال درخواست ابتدا وارد حساب خود شوید.", 401);

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return jsonError((error as Error).message, 400);
  }

  const bookId = toInt(body.bookId, 0);
  const kindRaw = str(body.kind, 16) || "exchange";
  const kind = ["exchange", "buy", "borrow"].includes(kindRaw) ? kindRaw : "exchange";
  const message = str(body.message, 600);

  if (!bookId) return jsonError("کتاب مورد نظر مشخص نشده است.", 422);
  if (message && message.length < 5) {
    return jsonError("پیام شما کوتاه است؛ حداقل ۵ حرف بنویسید.", 422);
  }

  const { response } = await withDb(async () => {
    const [book] = await db
      .select({
        id: books.id,
        ownerId: books.ownerId,
        title: books.title,
        status: books.status,
      })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    if (!book) throw new HttpError("این آگهی حذف شده است.", 404);
    if (book.ownerId === user.id) {
      throw new HttpError("برای آگهی خودتان نمی‌توانید درخواست بفرستید.", 422);
    }
    if (book.status !== "available") {
      throw new HttpError("این آگهی دیگر فعال نیست.", 409);
    }

    const duplicate = await db
      .select({ id: requests.id })
      .from(requests)
      .where(
        and(
          eq(requests.bookId, bookId),
          eq(requests.userId, user.id),
          eq(requests.status, "pending"),
        ),
      )
      .limit(1);

    if (duplicate.length) {
      throw new HttpError("شما قبلاً برای این آگهی درخواست ثبت کرده‌اید.", 409);
    }

    const [created] = await db
      .insert(requests)
      .values({
        bookId,
        userId: user.id,
        ownerId: book.ownerId,
        kind,
        message: message || null,
        status: "pending",
      })
      .returning();

    return { request: created };
  });

  return response;
}

/** Accept or decline a request (owner only). Accepting awards karma to both sides. */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("ابتدا وارد حساب خود شوید.", 401);

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return jsonError((error as Error).message, 400);
  }

  const id = toInt(body.id, 0);
  const action = str(body.action, 16);
  if (!id) return jsonError("شناسه درخواست نامعتبر است.", 422);
  if (!["accept", "decline"].includes(action)) {
    return jsonError("عملیات درخواست معتبر نیست.", 422);
  }

  const { response } = await withDb(async () => {
    const [found] = await db
      .select({
        id: requests.id,
        bookId: requests.bookId,
        ownerId: requests.ownerId,
        userId: requests.userId,
        status: requests.status,
      })
      .from(requests)
      .where(eq(requests.id, id))
      .limit(1);

    if (!found) throw new HttpError("درخواست پیدا نشد.", 404);
    if (found.ownerId !== user.id) {
      throw new HttpError("فقط صاحب آگهی می‌تواند به این درخواست پاسخ دهد.", 403);
    }
    if (found.status !== "pending") {
      throw new HttpError("این درخواست قبلاً پاسخ داده شده است.", 409);
    }

    if (action === "decline") {
      await db.update(requests).set({ status: "declined" }).where(eq(requests.id, id));
      return { status: "declined" };
    }

    await db.transaction(async (tx) => {
      await tx.update(requests).set({ status: "accepted" }).where(eq(requests.id, id));

      await tx
        .update(requests)
        .set({ status: "declined" })
        .where(
          and(
            eq(requests.bookId, found.bookId),
            eq(requests.status, "pending"),
            ne(requests.id, id),
          ),
        );

      await tx
        .update(books)
        .set({ status: "exchanged", updatedAt: new Date() })
        .where(eq(books.id, found.bookId));

      // karma reward for both sides of a successful exchange
      await tx
        .update(users)
        .set({ karmaPoints: sql`${users.karmaPoints} + 5`, updatedAt: new Date() })
        .where(eq(users.id, found.ownerId));

      await tx
        .update(users)
        .set({ karmaPoints: sql`${users.karmaPoints} + 5`, updatedAt: new Date() })
        .where(eq(users.id, found.userId));
    });

    return { status: "accepted" };
  });

  return response;
}
