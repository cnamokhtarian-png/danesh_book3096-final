import Image from "next/image";
import { Icon } from "@/components/Icon";
import { GAME } from "@/lib/game";

/**
 * بنر باریک تبلیغ بازی — درست بالای بنر اصلی (hero) صفحه اصلی.
 * لینک به صفحهای که از همان دامنه دانش بوک سرو میشود (بدون سایت خارجی).
 * از `<a>` معمولی استفاده شده تا مرورگر یک ناوبری کامل به فایل استاتیک
 * HTML بازی انجام دهد و روتر Next.js دنبال RSC payload نگردد.
 */
export default function GamePromoBanner() {
  return (
    <a
      href={GAME.path}
      aria-label={`${GAME.name} — ${GAME.description}`}
      className="group relative block h-[76px] overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0a0d14] shadow-lg shadow-[#0a0d14]/15 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#ff6b4a]/10 sm:h-[84px]"
    >
      {/* فضای نئونی ملایم پشت محتوا */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_8%_50%,rgba(94,234,198,0.14),transparent_38%),radial-gradient(circle_at_88%_10%,rgba(255,107,74,0.18),transparent_45%)]"
        aria-hidden
      />
      <div
        className="absolute inset-y-0 start-0 w-1/3 bg-[linear-gradient(to_left,rgba(255,107,74,0.10),transparent)]"
        aria-hidden
      />

      <div className="relative flex h-full items-center gap-3 px-2.5 sm:gap-4 sm:px-4">
        {/* تصویر بازی */}
        <span className="relative block h-14 w-[92px] shrink-0 overflow-hidden rounded-xl border border-white/15 bg-[#111827] sm:h-16 sm:w-[132px]">
          <Image
            src={GAME.image}
            alt="گربه نارنجی بیژن در خیابان بارانی و نئونی شب"
            fill
            sizes="(max-width: 640px) 92px, 132px"
            className="object-cover object-left transition-transform duration-500 group-hover:scale-110"
          />
        </span>

        {/* متن تبلیغ */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[#ff6b4a]/25 bg-[#ff6b4a]/10 px-2 py-0.5 text-[10px] font-black text-[#ff9a7d] sm:inline-flex">
              <span className="size-1.5 animate-pulse rounded-full bg-[#ff6b4a]" />
              تازه رسید
            </span>
            <p className="truncate text-[12.5px] font-extrabold text-white sm:text-[15px]">
              بازی <span className="text-[#ffb35c]">بیژن</span> توی دانش بوکه!
            </p>
          </div>
          <p className="mt-1 truncate text-[10.5px] leading-5 text-slate-300/75 sm:text-[12px]">
            {GAME.tagline} · رکورد بزن، ماهی بگیر، از ترافیک جا بمون
          </p>
        </div>

        {/* دعوت به اقدام */}
        <span className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-[#ff6b4a] px-4 py-2.5 text-[12px] font-black text-[#180b07] shadow-lg shadow-[#ff6b4a]/25 transition group-hover:bg-[#ff8663] md:inline-flex">
          {GAME.cta}
          <Icon name="back" className="size-4" />
        </span>
        <span
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/15 text-[#ffb35c] md:hidden"
          aria-hidden
        >
          <Icon name="back" className="size-4.5" />
        </span>
      </div>
    </a>
  );
}
