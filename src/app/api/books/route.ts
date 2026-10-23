import { db } from "@/db";
import { books } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES, CONDITIONS, KINDS, OFFER_TYPES, mediumOfKind } from "@/lib/constants";
import { HttpError, jsonError, readJsonBody, str, toInt, withDb } from "@/lib/http";
import { listBooks } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { response } = await withDb(async () => {
    const items = await listBooks({
      q: url.searchParams.get("q") ?? undefined,
      kind: url.searchParams.get("kind") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      university: url.searchParams.get("university") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      limit: toInt(url.searchParams.get("limit"), 24),
    });
    return { items };
  });
  return response;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("برای ثبت آگهی ابتدا وارد حساب خود شوید.", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return jsonError((error as Error).message, 400);
  }

  const title = str(body.title, 160);
  const kind = str(body.kind, 12) || "book";
  const course = str(body.course, 140);
  const author = str(body.author, 140);
  const university = str(body.university, 140);
  const category = str(body.category, 32) || "general";
  const condition = str(body.condition, 20) || "good";
  const description = str(body.description, 1200);
  const offerTypeRaw = str(body.offerType, 12) || (kind === "book" ? "sell" : "free");
  const offerType = OFFER_TYPES.some((o) => o.value === offerTypeRaw) ? offerTypeRaw : "exchange";
  const audience = str(body.audience, 12) === "konkur" ? "konkur" : "general";
  const coverEmoji =
    str(body.coverEmoji, 12) || KINDS.find((k) => k.value === kind)?.emoji || "📘";
  const price = Math.max(0, Math.min(toInt(body.price, 0), 100_000_000));
  const isExchangeable = offerType === "exchange" || body.isExchangeable === true;

  if (title.length < 3) {
    return jsonError("عنوان آگهی باید حداقل ۳ حرف باشد.", 422);
  }
  if (!KINDS.some((k) => k.value === kind)) {
    return jsonError("نوع آگهی نامعتبر است.", 422);
  }
  if (!CATEGORIES.some((c) => c.value === category)) {
    return jsonError("دسته‌بندی انتخاب‌شده معتبر نیست.", 422);
  }
  if (!CONDITIONS.some((c) => c.value === condition)) {
    return jsonError("وضعیت انتخاب‌شده معتبر نیست.", 422);
  }
  if (offerType === "sell" && price === 0 && kind === "book") {
    return jsonError("برای فروش کتاب، قیمت را وارد کنید یا نوع معامله را رایگان انتخاب کنید.", 422);
  }
  if (offerType === "request" && price > 0) {
    return jsonError("درخواست کتاب نیاز به قیمت ندارد.", 422);
  }

  const { response } = await withDb(async () => {
    const [created] = await db
      .insert(books)
      .values({
        ownerId: user.id,
        title,
        kind,
        course: course || null,
        author: author || null,
        university: university || user.university || null,
        category,
        condition,
        price,
        medium: mediumOfKind(kind),
        offerType,
        audience,
        isExchangeable,
        description: description || null,
        coverEmoji,
        status: "available",
      })
      .returning();

    if (!created) throw new HttpError("ثبت آگهی انجام نشد. دوباره تلاش کنید.", 500);
    return { book: created };
  });

  return response;
}
