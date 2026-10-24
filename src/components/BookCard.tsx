import Link from "next/link";
import { Icon } from "@/components/Icon";
import {
  categoryEmoji,
  categoryLabel,
  conditionLabel,
  faNumber,
  formatPrice,
  kindEmoji,
  kindLabel,
  offerEmoji,
  offerLabel,
  timeAgo,
} from "@/lib/constants";
import type { BookCardData } from "@/lib/queries";

export function BookCard({ book }: { book: BookCardData }) {
  const isDigital = book.medium === "digital";
  const isKonkur = book.audience === "konkur";
  const isRequest = book.offerType === "request";

  return (
    <Link
      href={`/books/${book.id}`}
      className="group card-surface relative flex flex-col overflow-hidden p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_1px_2px_rgb(20_22_42/0.04),0_26px_50px_-28px_rgb(91_77_224/0.45)]"
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-14 shrink-0 place-items-center rounded-2xl text-2xl ${
            isDigital ? "bg-cyan-50" : isKonkur ? "bg-[#f3ecff]" : "bg-brand-50"
          }`}
        >
          {book.coverEmoji || kindEmoji(book.kind)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                isDigital ? "bg-cyan-100 text-cyan-700" : "bg-brand-100 text-brand-700"
              }`}
            >
              {kindLabel(book.kind)}
            </span>
            <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[10.5px] font-bold text-ink-600">
              {offerEmoji(book.offerType)} {offerLabel(book.offerType)}
            </span>
            {isKonkur && (
              <span className="rounded-full bg-gradient-to-l from-[#7c3aed] to-[#c026d3] px-2 py-0.5 text-[10px] font-black text-white">
                کنکور
              </span>
            )}
            {book.status === "exchanged" && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
                مبادله شد
              </span>
            )}
          </div>
          <h3 className="mt-1.5 truncate text-[15px] font-bold text-ink-900 group-hover:text-brand-700">
            {book.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-ink-400">
            {book.course ? `درس ${book.course}` : book.author ?? "بدون مشخصات درس"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-ink-600">
        <span className="rounded-xl bg-ink-50 px-2 py-1">
          {categoryEmoji(book.category)} {categoryLabel(book.category)}
        </span>
        <span className="rounded-xl bg-ink-50 px-2 py-1">{conditionLabel(book.condition)}</span>
        {book.university && (
          <span className="max-w-full truncate rounded-xl bg-ink-50 px-2 py-1">
            {book.university}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between border-t border-dashed border-ink-100 pt-3">
        <div>
          <p className="text-[11px] text-ink-400">{book.ownerEmoji} {book.ownerName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-400">
            <Icon name="clock" className="size-3.5" />
            {timeAgo(book.createdAt)}
          </p>
        </div>
        <div className="text-left">
          <p
            className={`text-sm font-extrabold ${
              book.price === 0 || isRequest ? "text-emerald-600" : "text-ink-900"
            }`}
          >
            {formatPrice(book.price, book.offerType)}
          </p>
          {book.isExchangeable && !isRequest && (
            <p className="flex items-center justify-end gap-1 text-[11px] font-semibold text-brand-600">
              <Icon name="exchange" className="size-3.5" />
              قابل تبادل
            </p>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 -bottom-1 h-1 scale-x-0 bg-gradient-to-l from-brand-500 to-accent-500 transition-transform duration-300 group-hover:scale-x-100" />
      <span className="absolute end-3 top-3 flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-ink-400 opacity-0 transition group-hover:opacity-100">
        <Icon name="eye" className="size-3" />
        {faNumber(book.views)}
      </span>
    </Link>
  );
}

export function BookCardGrid({ books }: { books: BookCardData[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
}
