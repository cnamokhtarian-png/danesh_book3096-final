import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { books } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { HttpError, jsonError, readJsonBody, str, toInt, withDb } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("ابتدا وارد حساب خود شوید.", 401);

  const id = toInt((await ctx.params).id, 0);
  if (!id) return jsonError("شناسه آگهی نامعتبر است.", 400);

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return jsonError((error as Error).message, 400);
  }

  const status = str(body.status, 16);
  if (!["available", "exchanged"].includes(status)) {
    return jsonError("وضعیت آگهی معتبر نیست.", 422);
  }

  const { response } = await withDb(async () => {
    const updated = await db
      .update(books)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(books.id, id), eq(books.ownerId, user.id)))
      .returning({ id: books.id, status: books.status });

    if (!updated.length) {
      throw new HttpError("آگهی پیدا نشد یا به شما تعلق ندارد.", 404);
    }
    return { book: updated[0] };
  });

  return response;
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("ابتدا وارد حساب خود شوید.", 401);

  const id = toInt((await ctx.params).id, 0);
  if (!id) return jsonError("شناسه آگهی نامعتبر است.", 400);

  const { response } = await withDb(async () => {
    const deleted = await db
      .delete(books)
      .where(and(eq(books.id, id), eq(books.ownerId, user.id)))
      .returning({ id: books.id });

    if (!deleted.length) {
      throw new HttpError("آگهی پیدا نشد یا به شما تعلق ندارد.", 404);
    }
    return { deletedId: deleted[0].id };
  });

  return response;
}
