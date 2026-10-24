import { countDownload, readFileForDownload, safeFileName } from "@/lib/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * دریافت فایل آگهی.
 *
 * فایل‌های آپلودی به‌صورت استریم از دیتابیس خوانده می‌شوند؛ فایل‌های
 * «لینک منبع» به آدرس اصلی هدایت می‌شوند.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number.parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return new Response("شناسه فایل نامعتبر است.", { status: 400 });
  }

  const file = await readFileForDownload(id);
  if (!file) {
    return new Response("فایل پیدا نشد.", { status: 404 });
  }

  if (!file.base64) {
    if (file.externalUrl) {
      await countDownload(id);
      return Response.redirect(file.externalUrl, 302);
    }
    return new Response("فایلی برای این آگهی ثبت نشده است.", { status: 404 });
  }

  await countDownload(id);
  const bytes = Buffer.from(file.base64, "base64");
  const name = safeFileName(file.fileName);

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Length": String(bytes.byteLength),
      // inline تا PDF در مرورگر باز شود؛ نام فایل هم برای ذخیره‌سازی امن است.
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
