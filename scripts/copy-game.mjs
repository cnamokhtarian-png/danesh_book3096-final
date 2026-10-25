/**
 * خروجی تکفایل بازی (Vite + vite-plugin-singlefile) را به مسیری که Next.js
 * از public سرو میکند کپی میکند:
 *
 *   polished-cat-street-game/dist/index.html  ->  public/games/bijan/index.html
 *
 * این فایل داخل گیت نگهداری میشود چون هاست (مثلاً Vercel) فقط `npm run build`
 * اصلی را اجرا میکند و وابستگیهای زیرپروژه بازی را نصب نمیکند.
 * بعد از هر تغییر در سورس بازی: `npm run game:build` را بزنید.
 */
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "polished-cat-street-game", "dist", "index.html");
const destination = path.join(root, "public", "games", "bijan", "index.html");

let html;
try {
  html = await readFile(source, "utf8");
} catch {
  console.error(
    "❌ فایل بیلد بازی پیدا نشد. اول `npm ci --prefix polished-cat-street-game` و سپس `npm run game:build` را اجرا کنید.",
  );
  process.exit(1);
}

// vite-plugin-singlefile باید همه JS/CSS را inline کرده باشد؛ اگر asset خارجی
// باقی مانده باشد، صفحه داخل public سایت لود نخواهد شد.
const externalAsset = html.match(/<(?:script|link)\b[^>]*\b(?:src|href)="\/(?!\/)[^"]*\.(?:js|css)"/i);
if (externalAsset) {
  console.error("❌ خروجی بازی هنوز به asset خارجی اشاره میکند:", externalAsset[0]);
  process.exit(1);
}

await mkdir(path.dirname(destination), { recursive: true });
await copyFile(source, destination);
const { size } = await stat(destination);
console.log(`✅ بازی آماده شد: public/games/bijan/index.html (${(size / 1024).toFixed(0)} KB)`);
