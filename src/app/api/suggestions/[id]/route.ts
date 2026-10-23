import { eq } from "drizzle-orm";
import { db } from "@/db";
import { suggestions } from "@/db/schema";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { HttpError, jsonError, readJsonBody, str, toInt, withDb } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    return jsonError("این بخش فقط برای مدیر سایت در دسترس است.", 403);
  }

  const id = toInt((await ctx.params).id, 0);
  if (!id) return jsonError("شناسه پیام نامعتبر است.", 400);

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return jsonError((error as Error).message, 400);
  }

  const status = str(body.status, 16);
  const adminNote = str(body.adminNote, 600);
  if (!["new", "reviewing", "resolved"].includes(status)) {
    return jsonError("وضعیت انتخاب‌شده معتبر نیست.", 422);
  }

  const { response } = await withDb(async () => {
    const updated = await db
      .update(suggestions)
      .set({ status, adminNote: adminNote || null })
      .where(eq(suggestions.id, id))
      .returning();

    if (!updated.length) throw new HttpError("این پیام پیدا نشد.", 404);
    return { suggestion: updated[0] };
  });

  return response;
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    return jsonError("این بخش فقط برای مدیر سایت در دسترس است.", 403);
  }

  const id = toInt((await ctx.params).id, 0);
  if (!id) return jsonError("شناسه پیام نامعتبر است.", 400);

  const { response } = await withDb(async () => {
    const deleted = await db
      .delete(suggestions)
      .where(eq(suggestions.id, id))
      .returning({ id: suggestions.id });
    if (!deleted.length) throw new HttpError("این پیام پیدا نشد.", 404);
    return { deletedId: deleted[0].id };
  });

  return response;
}
