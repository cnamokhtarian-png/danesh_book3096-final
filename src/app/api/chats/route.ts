import { and, desc, eq, inArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { books, chatMessages, conversations, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { HttpError, jsonError, readJsonBody, toInt, withDb } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** گفتگوهای کاربر — هم دریافت‌شده و هم ارسال‌شده. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("برای دیدن گفتگوها ابتدا وارد حساب خود شوید.", 401);

  const { response } = await withDb(async () => {
    const buyer = alias(users, "chat_buyer");
    const rows = await db
      .select({
        id: conversations.id,
        bookId: conversations.bookId,
        buyerId: conversations.buyerId,
        ownerId: conversations.ownerId,
        updatedAt: conversations.updatedAt,
        bookTitle: books.title,
        ownerName: users.fullName,
        ownerEmoji: users.avatarEmoji,
        buyerName: buyer.fullName,
        buyerEmoji: buyer.avatarEmoji,
      })
      .from(conversations)
      .innerJoin(books, eq(books.id, conversations.bookId))
      .innerJoin(users, eq(users.id, conversations.ownerId))
      .innerJoin(buyer, eq(buyer.id, conversations.buyerId))
      .where(or(eq(conversations.buyerId, user.id), eq(conversations.ownerId, user.id)))
      .orderBy(desc(conversations.updatedAt))
      .limit(60);

    if (!rows.length) return { items: [] };
    const ids = rows.map((row) => row.id);
    const messages = await db
      .select({ conversationId: chatMessages.conversationId, body: chatMessages.body, createdAt: chatMessages.createdAt })
      .from(chatMessages)
      .where(inArray(chatMessages.conversationId, ids))
      .orderBy(desc(chatMessages.createdAt));
    const latest = new Map<number, (typeof messages)[number]>();
    for (const message of messages) if (!latest.has(message.conversationId)) latest.set(message.conversationId, message);

    return {
      items: rows.map((row) => ({
        id: row.id,
        bookId: row.bookId,
        bookTitle: row.bookTitle,
        partnerName: row.buyerId === user.id ? row.ownerName : row.buyerName,
        partnerEmoji: row.buyerId === user.id ? row.ownerEmoji : row.buyerEmoji,
        direction: row.buyerId === user.id ? "outgoing" : "incoming",
        updatedAt: row.updatedAt,
        latestMessage: latest.get(row.id)?.body ?? "گفتگو را با یک پیام آغاز کنید.",
      })),
    };
  });
  return response;
}

/** ایجاد یا بازیابی گفتگوی همین کاربر با آگهی‌دهنده. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("برای گفتگو ابتدا وارد حساب خود شوید.", 401);

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return jsonError((error as Error).message, 400);
  }
  const bookId = toInt(body.bookId, 0);
  if (!bookId) return jsonError("آگهی مورد نظر معتبر نیست.", 422);

  const { response } = await withDb(async () => {
    const [book] = await db.select({ id: books.id, ownerId: books.ownerId, status: books.status })
      .from(books).where(eq(books.id, bookId)).limit(1);
    if (!book) throw new HttpError("این آگهی پیدا نشد.", 404);
    if (book.ownerId === user.id) throw new HttpError("نمی‌توانید با خودتان گفتگو کنید.", 422);
    if (book.status !== "available") throw new HttpError("این آگهی دیگر فعال نیست.", 409);

    await db.insert(conversations).values({ bookId, buyerId: user.id, ownerId: book.ownerId })
      .onConflictDoNothing({ target: [conversations.bookId, conversations.buyerId] });
    const [conversation] = await db.select({ id: conversations.id }).from(conversations)
      .where(and(eq(conversations.bookId, bookId), eq(conversations.buyerId, user.id))).limit(1);
    if (!conversation) throw new HttpError("ساخت گفتگو انجام نشد. دوباره تلاش کنید.", 500);
    return { conversationId: conversation.id };
  });
  return response;
}
