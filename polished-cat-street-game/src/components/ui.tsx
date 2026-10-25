import type { ReactNode } from "react";
import type { ScoreEntry } from "../hooks/useHighScores";
import { faDate, faMeters, faNum } from "../utils/fa";
import { FishIcon, PawIcon, TrophyIcon } from "./Icons";

export function formatNumber(value: number) {
  return faNum(value);
}

export function formatDate(at: number) {
  return faDate(at);
}

export function Keycap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <kbd className={`keycap ${className}`}>{children}</kbd>;
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

export function IconTile({
  children,
  tone = "mint",
  className = "",
}: {
  children: ReactNode;
  tone?: "mint" | "coral" | "amber" | "slate";
  className?: string;
}) {
  const tones: Record<string, string> = {
    mint: "bg-mint/12 text-mint border-mint/25",
    coral: "bg-coral/12 text-coral border-coral/25",
    amber: "bg-amber/12 text-amber border-amber/25",
    slate: "bg-cream/6 text-cream/70 border-cream/12",
  };
  return (
    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function FishStat({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <FishIcon className="h-3.5 w-3.5 text-coral" />
      <span className="num">{faNum(count)}</span>
      <span className="text-sand/55">ماهی</span>
    </span>
  );
}

export function ScoreTable({
  scores,
  highlightId,
  limit = 5,
  compact = false,
  emptyLabel = "هنوز اجرایی ثبت نشده. خیابان ساکت است.",
}: {
  scores: ScoreEntry[];
  highlightId?: string;
  limit?: number;
  compact?: boolean;
  emptyLabel?: string;
}) {
  const rows = scores.slice(0, limit);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-cream/12 px-5 py-8 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/10 bg-cream/4 text-cream/35">
          <PawIcon className="h-5 w-5" />
        </span>
        <p className="max-w-[15rem] text-[12px] leading-6 text-sand/75">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ol className="space-y-1" aria-label="رکوردهای محلی">
      {rows.map((entry, index) => {
        const highlighted = entry.id === highlightId;
        return (
          <li
            key={entry.id}
            className={`grid grid-cols-[1.6rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border px-2.5 py-2 ${
              highlighted
                ? "border-coral/45 bg-coral/10"
                : index === 0
                  ? "border-amber/20 bg-amber/[0.055]"
                  : "border-transparent bg-cream/[0.025]"
            }`}
          >
            <span
              className={`num flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold ${
                index === 0
                  ? "bg-amber/15 text-amber"
                  : highlighted
                    ? "bg-coral/20 text-coral"
                    : "text-sand/68"
              }`}
            >
              {index === 0 ? <TrophyIcon className="h-3.5 w-3.5" /> : faNum(index + 1)}
            </span>
            <span className="min-w-0">
              <span className="num block truncate text-[13px] font-semibold leading-tight text-cream">
                {faNum(entry.score)}
                <span className="ms-1 text-[9px] font-medium text-sand/60">امتیاز</span>
              </span>
              {!compact && (
                <span className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-sand/72">
                  <span className="num">{faMeters(entry.distance)}</span>
                  <span className="h-0.5 w-0.5 rounded-full bg-sand/40" />
                  <span className="num">{faNum(entry.fish)} ماهی</span>
                  <span className="h-0.5 w-0.5 rounded-full bg-sand/40" />
                  <span>{faDate(entry.at)}</span>
                </span>
              )}
            </span>
            <span className="flex flex-col items-end gap-1">
              {highlighted ? (
                <span className="rounded-full bg-coral/20 px-1.5 py-0.5 text-[8px] font-bold text-coral">تازه</span>
              ) : index === 0 ? (
                <span className="rounded-full bg-amber/15 px-1.5 py-0.5 text-[8px] font-bold text-amber">بهترین</span>
              ) : null}
              <span className="flex items-center gap-1 text-[10px] text-sand/60">
                <FishIcon className="h-3 w-3" />
                {faNum(entry.fish)}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function RunStat({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-sand/75">{label}</p>
      <p className="num mt-1 font-display text-xl font-bold leading-none text-cream">
        {value}
        {suffix ? <span className="ms-1 text-[10px] font-medium text-sand/68">{suffix}</span> : null}
      </p>
    </div>
  );
}

export function PanelHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold text-sand/75">{eyebrow}</p>
        <h3 className="mt-1 font-display text-lg font-semibold text-cream">{title}</h3>
      </div>
      {action}
    </div>
  );
}
