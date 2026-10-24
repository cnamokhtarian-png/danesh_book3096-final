import { readPhoto } from "@/lib/photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * نمایش عکس آگهی.
 *
 * عکس با Content-Type صحیح (تشخیص یافته از امضای بایت در زمان آپلود) و
 * Cache-Control طولانی بازگردانده می‌شود تا صفحات فهرست و گالری سریع بار شوند.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number.parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return new Response("شناسه عکس نامعتبر است.", { status: 400 });
  }

  const photo = await readPhoto(id);
  if (!photo) {
    return new Response("عکس پیدا نشد.", { status: 404 });
  }

  const bytes = Buffer.from(photo.base64, "base64");

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": photo.mimeType,
      "Content-Length": String(bytes.byteLength),
      // Kešización بلند: عکس‌ها تغییر نمی‌کنند (م nível immutable).
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
