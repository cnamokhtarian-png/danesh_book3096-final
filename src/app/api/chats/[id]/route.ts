import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { books, chatMessages, conversations, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { createRateLimiter, rateKey } from "@/lib/rate-limit";
import { HttpError, jsonError, readJsonBody, str, toInt, withDb } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const messageLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
type Props = { params: Promise<{ id: string }> };

async function getMembership(conversationId: number, userId: number) {
  const buyer = alias(users, "chat_buyer");
  const [row] = await db.select({
    id: conversations.id,
    buyerId: conversations.buyerId,
    ownerId: conversations.ownerId,
    bookId: conversations.bookId,
    bookTitle: books.title,
    ownerName: users.fullName,
    ownerEmoji: users.avatarEmoji,
    buyerName: buyer.fullName,
    buyerEmoji: buyer.avatarEmoji,
  }).from(conversations)
    .innerJoin(books, eq(books.id, conversations.bookId))
    .innerJoin(users, eq(users.id, conversations.ownerId))
    .innerJoin(buyer, eq(buyer.id, conversations.buyerId))
    .where(eq(conversations.id, conversationId)).limit(1);
  if (!row) throw new HttpError("این گفتگو پیدا نشد.", 404);
  if (row.buyerId !== userId && row.ownerId !== userId) throw new HttpError("دسترسی به این گفتگو ندارید.", 403);
  return row;
}

export async function GET(_request: Request, { params }: Props) {
  const user = await getCurrentUser();
  if (!user) return jsonError("برای دیدن پیام‌ها ابتدا وارد حساب خود شوید.", 401);
  const id = toInt((await params).id, 0);
  if (!id) return jsonError("شناسه گفتگو معتبر نیست.", 422);

  const { response } = await withDb(async () => {
    const conversation = await getMembership(id, user.id);
    const messages = await db.select({
      id: chatMessages.id,
      senderId: chatMessages.senderId,
      senderName: users.fullName,
      body: chatMessages.body,
      createdAt: chatMessages.createdAt,
    }).from(chatMessages)
      .innerJoin(users, eq(users.id, chatMessages.senderId))
      .where(eq(chatMessages.conversationId, id))
      .orderBy(desc(chatMessages.createdAt))
      .limit(100);
    messages.reverse();
    return {
      conversation: {
        id: conversation.id,
        bookId: conversation.bookId,
        bookTitle: conversation.bookTitle,
        partnerName: user.id === conversation.buyerId ? conversation.ownerName : conversation.buyerName,
        partnerEmoji: user.id === conversation.buyerId ? conversation.ownerEmoji : conversation.buyerEmoji,
      },
      messages,
    };
  });
  return response;
}

export async function POST(request: Request, { params }: Props) {
  const user = await getCurrentUser();
  if (!user) return jsonError("برای ارسال پیام ابتدا وارد حساب خود شوید.", 401);
  const id = toInt((await params).id, 0);
  if (!id) return jsonError("شناسه گفتگو معتبر نیست.", 422);
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return jsonError((error as Error).message, 400);
  }
  const message = str(body.message, 1000);
  if (message.length < 1) return jsonError("متن پیام را بنویسید.", 422);
  const key = rateKey(request, `chat:${user.id}`);
  if (messageLimiter.isLimited(key)) return jsonError("تعداد پیام‌های شما زیاد است؛ کمی بعد دوباره تلاش کنید.", 429);

  const { response } = await withDb(async () => {
    const conversation = await getMembership(id, user.id);
    const [created] = await db.insert(chatMessages).values({ conversationId: id, senderId: user.id, body: message }).returning();
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, id));
    messageLimiter.register(key);
    return { message: { ...created, senderName: user.fullName }, bookTitle: conversation.bookTitle };
  });
  return response;
}
