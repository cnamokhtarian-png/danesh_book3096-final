import { db } from "@/db";
import { books } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { attachFileToBook, saveExternalLink } from "@/lib/files";
import { CATEGORIES, CONDITIONS, KINDS, OFFER_TYPES, mediumOfKind } from "@/lib/constants";
import { HttpError, jsonError, readJsonBody, str, toInt, withDb } from "@/lib/http";
import { listBooks } from "@/lib/queries";
import { createRateLimiter, rateKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** حداکثر ۱۵ آگهی جدید در ساعت برای هر کاربر — جلوگیری از spam. */
const createLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 15 });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const param = (name: string) => url.searchParams.get(name) ?? undefined;
  const { response } = await withDb(async () => {
    // قبلاً medium/offerType/audience جا افتاده بود و API با صفحه /books
    // رفتار یکسانی نداشت؛ اکنون همه فیلترهای listBooks پاس داده می‌شوند.
    const items = await listBooks({
      q: param("q"),
      kind: param("kind"),
      medium: param("medium"),
      offerType: param("offerType"),
      audience: param("audience"),
      category: param("category"),
      university: param("university"),
      sort: param("sort"),
      limit: toInt(param("limit"), 24),
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
  // «قابل تبادل» فقط وقتی روشن است که کاربر واقعاً آن را انتخاب کرده باشد؛
  // قبلاً برای همه آگهی‌ها true می‌شد و برچسب «قابل تبادل» روی همه می‌نشست.
  const isExchangeable =
    offerType === "request" ? false : body.isExchangeable === undefined
      ? offerType === "exchange"
      : body.isExchangeable === true;

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

  // فایل آگهی (اختیاری): یا فایل آپلودشده (fileId) یا لینک منبع (fileUrl).
  const fileId = toInt(body.fileId, 0);
  const rawFileUrl = str(body.fileUrl, 500);
  let fileUrl: string | null = null;
  if (rawFileUrl) {
    try {
      const parsed = new URL(rawFileUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return jsonError("لینک فایل باید با http یا https شروع شود.", 422);
      }
      fileUrl = parsed.toString();
    } catch {
      return jsonError("لینک فایل معتبر نیست.", 422);
    }
  }

  const userKey = rateKey(request, `user:${user.id}`);
  if (createLimiter.isLimited(userKey)) {
    return jsonError("تعداد آگهی‌های ثبت‌شده در این ساعت زیاد است. کمی بعد دوباره تلاش کنید.", 429);
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

    // اتصال فایل: اگر شناسه‌ی فایل آپلودشده آمده باشد همان، وگرنه لینک منبع.
    if (fileId > 0) {
      const attached = await attachFileToBook(fileId, created.id, user.id);
      if (!attached) {
        console.warn(
          `[daneshbook:books] file ${fileId} به آگهی ${created.id} وصل نشد (مالکیت یا فایل تکراری).`,
        );
      }
    } else if (fileUrl) {
      try {
        const link = await saveExternalLink({
          ownerId: user.id,
          fileName: title,
          externalUrl: fileUrl,
        });
        await attachFileToBook(link.id, created.id, user.id);
      } catch (error) {
        console.error("[daneshbook:books] external link failed:", (error as Error).message);
      }
    }

    createLimiter.register(userKey);
    return { book: created };
  });

  return response;
}
