/**
 * درج داده ساختاریافته (schema.org) برای گوگل.
 *
 * JSON.stringify امن است چون داده از دیتابیس می‌آید؛ برای جلوگیری از بسته‌شدن
 * تگ script، کاراکترهای `<` و `>` escape می‌شوند.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
