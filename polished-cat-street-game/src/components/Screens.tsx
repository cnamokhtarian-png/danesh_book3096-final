import type { ReactNode } from "react";
import type { RunResult } from "../game/types";
import type { ScoreEntry } from "../hooks/useHighScores";
import { faNum } from "../utils/fa";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BellIcon,
  CatMark,
  CloseIcon,
  FishIcon,
  HelpIcon,
  PawIcon,
  PlayIcon,
  RestartIcon,
  SoundOffIcon,
  SoundOnIcon,
  SparkIcon,
  StarIcon,
  SwipeIcon,
  TrophyIcon,
  YarnIcon,
} from "./Icons";
import { Eyebrow, FishStat, formatNumber, Keycap, PanelHeader, RunStat, ScoreTable } from "./ui";

const controlHint = "flex items-center gap-1.5 text-[10px] font-medium text-sand/55";

/* ------------------------------------------------------------------ */
/* صفحه شروع                                                          */
/* ------------------------------------------------------------------ */

interface StartScreenProps {
  scores: ScoreEntry[];
  best: number;
  runs: number;
  highlightId?: string;
  onStart: () => void;
  onHowTo: () => void;
  onScores: () => void;
}

export function StartScreen({ scores, best, runs, highlightId, onStart, onHowTo, onScores }: StartScreenProps) {
  return (
    <section className="overlay-scroll absolute inset-0 z-30 animate-fade-in overflow-y-auto" aria-label="صفحه شروع">
      <div className="relative flex min-h-full w-full flex-col justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(260deg,rgba(7,10,16,0.82)_0%,rgba(7,10,16,0.72)_38%,rgba(7,10,16,0.34)_68%,rgba(7,10,16,0.04)_100%)]" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-[42rem] rounded-full bg-coral/12 blur-[90px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />

        {/* Warm moon above the scrim so the title scene keeps a light source. */}
        <div
          className="pointer-events-none absolute right-[8%] top-[6%] h-16 w-16 rounded-full sm:h-24 sm:w-24 md:right-[12%]"
          aria-hidden="true"
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle at 36% 32%, #fffaf0 0%, #f8edda 52%, #e8d8bd 100%)",
              boxShadow: "0 0 40px 14px rgba(255,229,189,0.16), 0 0 120px 60px rgba(255,205,150,0.09)",
            }}
          />
          <span className="absolute left-[24%] top-[30%] h-2.5 w-2.5 rounded-full bg-[#dcc9a9]/50 sm:h-4 sm:w-4" />
          <span className="absolute left-[58%] top-[58%] h-1.5 w-1.5 rounded-full bg-[#dcc9a9]/45 sm:h-2.5 sm:w-2.5" />
          <span className="absolute left-[46%] top-[16%] h-1 w-1 rounded-full bg-[#dcc9a9]/40 sm:h-1.5 sm:w-1.5" />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-5 px-5 pb-6 pt-20 sm:gap-8 sm:pb-9 sm:pt-28 md:px-8 lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:gap-14 lg:pt-24">
          <div className="min-w-0">
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-cream/12 bg-cream/[0.045] py-1.5 pe-3 ps-2 backdrop-blur-sm">
              <span className="animate-dot h-1.5 w-1.5 rounded-full bg-mint" />
              <span className="text-[10px] font-semibold text-cream/80">شب اول</span>
              <span className="h-2.5 w-px bg-cream/15" />
              <span className="text-[10px] font-medium text-sand/55">خیابان مولوی</span>
            </div>

            <div className="relative mt-3 animate-fade-up" style={{ animationDelay: "60ms" }}>
              <div className="flex items-end gap-1.5">
                <h1 className="title-glow mt-1 pb-2 font-display text-[clamp(4.2rem,13.5vw,7.4rem)] font-black leading-[1.22] tracking-normal text-cream">
                  بیژن
                </h1>
                <span className="mb-[0.7rem] block h-3.5 w-3.5 rounded-full bg-coral shadow-[0_0_24px_rgba(255,107,74,0.75)] sm:mb-5 sm:h-4 sm:w-4" />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="font-display text-[clamp(1.3rem,4.2vw,1.85rem)] font-bold leading-tight text-amber">
                  گربه‌ای در خیابان.
                </p>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber/25 bg-amber/10 px-2 py-0.5 text-[9px] font-semibold text-amber/90">
                  <StarIcon className="h-2.5 w-2.5" /> نُه جان
                </span>
              </div>
            </div>

            <p
              className="mt-4 max-w-[27rem] animate-fade-up text-balance text-[12.5px] leading-7 text-sand/70 sm:mt-5 sm:text-sm"
              style={{ animationDelay: "110ms" }}
            >
              شهر خواب ندارد؛ بیژن هم وقت ندارد. از ترافیک جا بمان، ماهی‌ها را بگیر و ببین نُه جانت چقدر دوام
              می‌آورد.
            </p>

            <div className="mt-5 flex animate-fade-up flex-wrap items-center gap-2.5" style={{ animationDelay: "160ms" }}>
              <button type="button" onClick={onStart} className="btn-primary group h-[3.25rem] flex-1 px-5 text-sm sm:flex-none sm:px-6">
                <PlayIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                شروع دویدن
                <span className="mr-2 hidden rounded-md border border-[#1a0d08]/20 bg-[#1a0d08]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#1a0d08]/65 sm:inline-flex">
                  فاصله
                </span>
              </button>
              <button type="button" onClick={onHowTo} className="btn-ghost h-[3.25rem] px-4 text-[12px]">
                <HelpIcon className="h-4 w-4 text-sand/70" />
                راهنمای بازی
              </button>
              <button type="button" onClick={onScores} className="btn-ghost h-[3.25rem] px-4 text-[12px] lg:hidden">
                <TrophyIcon className="h-4 w-4 text-amber/80" />
                رکوردها
              </button>
            </div>

            <div
              className="mt-6 flex animate-fade-up flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-cream/10 bg-[#0e141e]/90 px-4 py-3.5 backdrop-blur-sm"
              style={{ animationDelay: "210ms" }}
            >
              <div>
                <p className="text-[10px] font-semibold text-sand/55">بهترین رکورد</p>
                <p className="num mt-1 flex items-center gap-1.5 font-display text-lg font-bold leading-none text-amber">
                  <TrophyIcon className="h-3.5 w-3.5" />
                  {best > 0 ? formatNumber(best) : "بدون رکورد"}
                </p>
              </div>
              <div className="h-7 w-px bg-cream/10" />
              <div>
                <p className="text-[10px] font-semibold text-sand/55">اجراها</p>
                <p className="num mt-1 font-display text-lg font-bold leading-none text-cream">{formatNumber(runs)}</p>
              </div>
              <div className="hidden h-7 w-px bg-cream/10 sm:block" />
              <div className="hidden sm:block">
                <p className="text-[10px] font-semibold text-sand/55">مسیر</p>
                <p className="mt-1 font-display text-[13px] font-semibold leading-none text-cream/85">
                  مولوی · ۲ بامداد
                </p>
              </div>
            </div>

            <div className="mt-4 flex max-w-md flex-wrap items-center gap-x-4 gap-y-2 sm:mt-5">
              <span className={controlHint}>
                <ArrowUpIcon className="h-3.5 w-3.5 text-mint/80" /> پرش
                <Keycap className="mr-0.5">فاصله</Keycap>
              </span>
              <span className={controlHint}>
                <ArrowDownIcon className="h-3.5 w-3.5 text-coral/80" /> سُر
                <Keycap className="mr-0.5">↓</Keycap>
              </span>
              <span className={controlHint}>
                <SparkIcon className="h-3.5 w-3.5 text-amber/80" /> غوغا
                <Keycap className="mr-0.5">F</Keycap>
              </span>
            </div>
          </div>

          <div className="hidden animate-fade-up lg:block" style={{ animationDelay: "180ms" }}>
            <div className="relative overflow-hidden rounded-[1.4rem] border border-cream/12 bg-[#111723] p-5 shadow-[0_30px_90px_-25px_rgba(0,0,0,0.85)] backdrop-blur-md">
              <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-amber/10 blur-2xl" />
              <PanelHeader
                eyebrow="جدول محلی · مولوی"
                title="اهالی محل"
                action={
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber/25 bg-amber/10 text-amber">
                    <TrophyIcon className="h-4.5 w-4.5" />
                  </span>
                }
              />
              <div className="mt-4">
                <ScoreTable scores={scores} highlightId={highlightId} limit={5} />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-cream/8 pt-3.5">
                <p className="text-[9px] text-sand/60">فقط روی همین دستگاه ذخیره می‌شود.</p>
                <button
                  type="button"
                  onClick={onScores}
                  className="flex items-center gap-1 text-[10px] font-semibold text-mint/80 transition hover:text-mint"
                >
                  همه رکوردها <ArrowRightIcon className="h-3 w-3 rotate-180" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 px-1">
              <span className="flex items-center gap-1.5 text-[9px] font-medium text-sand/60">
                <PawIcon className="h-3 w-3" /> {faNum(runs)} اجرا ثبت شده
              </span>
              <span className="hidden text-[9px] font-medium text-sand/60 sm:block">خیابان همیشه حساب می‌کند</span>
            </div>
          </div>

          <div className="animate-fade-up lg:hidden" style={{ animationDelay: "240ms" }}>
            <div className="rounded-2xl border border-cream/12 bg-[#111723] p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber/25 bg-amber/10 text-amber">
                    <TrophyIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[9px] font-semibold text-sand/68">جدول محلی</p>
                    <p className="font-display text-sm font-semibold text-cream">اهالی محل</p>
                  </div>
                </div>
                <button type="button" onClick={onScores} className="text-[10px] font-semibold text-mint/80">
                  همه رکوردها
                </button>
              </div>
              <div className="mt-3">
                <ScoreTable scores={scores} highlightId={highlightId} limit={3} compact />
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-5 pb-4 md:px-8">
          <p className="text-[10px] font-medium text-sand/30">
            از ترافیک جا بمان · ماهی بگیر · شب را دنبال کن
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* پایان بازی                                                         */
/* ------------------------------------------------------------------ */

interface GameOverScreenProps {
  result: RunResult;
  scores: ScoreEntry[];
  highlightId?: string;
  rank: number;
  isBest: boolean;
  bestBefore: number;
  onRestart: () => void;
  onTitle: () => void;
  onHowTo: () => void;
}

const confetti = [
  { left: "8%", delay: "0s", color: "#ff6b4a", drift: "30px", rot: "20deg" },
  { left: "18%", delay: "0.35s", color: "#ffb35c", drift: "-20px", rot: "70deg" },
  { left: "27%", delay: "0.1s", color: "#9ee8c6", drift: "40px", rot: "10deg" },
  { left: "38%", delay: "0.55s", color: "#f7f1e5", drift: "-35px", rot: "45deg" },
  { left: "49%", delay: "0.2s", color: "#ff6b4a", drift: "20px", rot: "80deg" },
  { left: "61%", delay: "0.65s", color: "#ffb35c", drift: "-30px", rot: "15deg" },
  { left: "72%", delay: "0.05s", color: "#9ee8c6", drift: "45px", rot: "60deg" },
  { left: "82%", delay: "0.4s", color: "#f7f1e5", drift: "-15px", rot: "30deg" },
  { left: "92%", delay: "0.75s", color: "#ff6b4a", drift: "25px", rot: "70deg" },
];

export function GameOverScreen({
  result,
  scores,
  highlightId,
  rank,
  isBest,
  bestBefore,
  onRestart,
  onTitle,
  onHowTo,
}: GameOverScreenProps) {
  const topDistance = Math.max(result.distance, ...scores.map((entry) => entry.distance));

  return (
    <section
      className="overlay-scroll absolute inset-0 z-30 animate-fade-in overflow-y-auto bg-[linear-gradient(180deg,rgba(7,10,16,0.62)_0%,rgba(7,10,16,0.86)_38%,rgba(7,10,16,0.95)_100%)]"
      aria-label="پایان بازی"
    >
      <div className="flex min-h-full items-center justify-center px-4 py-20 sm:py-24">
        <div className="panel animate-pop-in relative w-full max-w-3xl overflow-hidden rounded-[1.6rem]">
          <div className="h-1 w-full bg-gradient-to-l from-coral via-amber to-mint" />
          {isBest && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {confetti.map((piece, index) => (
                <span
                  key={index}
                  className="absolute top-0 block h-2.5 w-1.5 rounded-[1px]"
                  style={{
                    left: piece.left,
                    background: piece.color,
                    animation: `confetti-fall 3.4s ${piece.delay} cubic-bezier(0.2, 0.6, 0.4, 1) infinite`,
                    ["--drift" as string]: piece.drift,
                    rotate: piece.rot,
                  }}
                />
              ))}
            </div>
          )}
          <div className="relative grid md:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="p-5 sm:p-7 md:p-8">
              {isBest ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber/35 bg-amber/12 px-2.5 py-1 text-[10px] font-bold text-amber">
                  <StarIcon className="h-3 w-3" /> رکورد شخصی تازه
                </div>
              ) : rank > 0 && rank <= 5 ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 text-[10px] font-bold text-mint">
                  <TrophyIcon className="h-3 w-3" /> بین پنج نفر اول · رتبه {faNum(rank)}
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-coral/30 bg-coral/10 px-2.5 py-1 text-[10px] font-bold text-coral">
                  <PawIcon className="h-3 w-3" /> پایان اجرا
                </div>
              )}

              <h2 className="mt-3 font-display text-[clamp(1.7rem,5vw,2.35rem)] font-extrabold leading-[1.25] text-cream">
                {isBest ? "این خیابان مال تو شد." : "ترافیک گرفتت."}
              </h2>
              <p className="mt-2 max-w-sm text-[12px] leading-6 text-sand/55">
                {isBest
                  ? "قلمرو تازه. اهالی محل دارند یادداشت برمی‌دارند؛ حالا رکورد را از دسترسشان خارج کن."
                  : "ماشین‌ها این دست را بردند. گرد و خاکت را بتکان، سیبیلت را مرتب کن و دوباره بپر."}
              </p>

              <div className="mt-5 flex items-end justify-between gap-4 rounded-2xl border border-cream/10 bg-ink/35 px-4 py-3.5">
                <div>
                  <p className="text-[9px] font-semibold text-sand/68">امتیاز نهایی</p>
                  <p className="num mt-1 font-display text-[2.6rem] font-extrabold leading-none text-cream sm:text-5xl">
                    {formatNumber(result.score)}
                  </p>
                </div>
                <div className="mb-1 flex flex-col items-end gap-1 text-right">
                  {rank > 0 ? (
                    <span className="rounded-full bg-cream/8 px-2 py-0.5 text-[9px] font-bold text-cream/70">
                      رتبه محلی {faNum(rank)}
                    </span>
                  ) : null}
                  <span className="text-[10px] text-sand/60">امتیاز</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-cream/8 bg-cream/[0.025] px-4 py-3">
                <RunStat label="مسافت" value={formatNumber(result.distance)} suffix="متر" />
                <div className="border-s border-cream/8 ps-3">
                  <p className="text-[9px] font-semibold text-sand/68">ماهی</p>
                  <p className="num mt-1 flex items-center gap-1.5 font-display text-xl font-bold leading-none text-cream">
                    <FishIcon className="h-3.5 w-3.5 text-coral" />
                    {formatNumber(result.fish)}
                  </p>
                </div>
                <div className="border-s border-cream/8 ps-3">
                  <p className="text-[9px] font-semibold text-sand/68">زنجیره</p>
                  <p dir="ltr" className="num mt-1 font-display text-xl font-bold leading-none text-mint">
                    ×{formatNumber(result.bestCombo)}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={onRestart} className="btn-primary group h-12 flex-1 px-5 text-sm">
                  <RestartIcon className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-180" />
                  دوباره بدو
                  <span className="mr-auto hidden rounded-md border border-[#1a0d08]/20 bg-[#1a0d08]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#1a0d08]/60 sm:inline-flex">
                    فاصله
                  </span>
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={onHowTo} className="btn-ghost h-12 flex-1 px-3 text-[12px] sm:flex-none">
                    <HelpIcon className="h-4 w-4 text-sand/60" />
                    کنترل‌ها
                  </button>
                  <button type="button" onClick={onTitle} className="btn-ghost h-12 px-3 text-[12px]">
                    <ArrowRightIcon className="h-4 w-4 text-sand/60" />
                    صفحه اصلی
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[9px] font-medium text-sand/68 sm:justify-start">
                <span>فاصله یا R · شروع دوباره</span>
                <span className="h-0.5 w-0.5 rounded-full bg-sand/40" />
                <span>M · صدا</span>
                <span className="h-0.5 w-0.5 rounded-full bg-sand/40" />
                <span>Esc · صفحه اصلی</span>
              </div>
              {isBest && bestBefore > 0 ? (
                <p className="mt-2 text-center text-[10px] font-medium text-amber/75 sm:text-right">
                  {formatNumber(result.score - bestBefore)} امتیاز بیشتر از رکورد قبلی.
                </p>
              ) : null}
            </div>

            <aside className="relative flex flex-col border-t border-cream/10 bg-[#111722]/95 p-5 md:border-s md:border-t-0 md:p-6">
              <PanelHeader
                eyebrow="جدول محلی · مولوی"
                title="اهالی محل"
                action={
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber/25 bg-amber/10 text-amber">
                    <TrophyIcon className="h-4 w-4" />
                  </span>
                }
              />
              <div className="mt-4">
                <ScoreTable scores={scores} highlightId={highlightId} limit={5} compact />
              </div>
              <div className="mt-4 rounded-xl border border-cream/8 bg-cream/[0.03] px-3 py-2.5">
                <p className="flex items-center justify-between text-[10px] text-sand/55">
                  <span>این اجرا</span>
                  <FishStat count={result.fish} />
                </p>
                <p className="mt-1.5 flex items-center justify-between text-[10px] text-sand/55">
                  <span>بیشترین مسافت</span>
                  <span className="num text-cream/80">{formatNumber(topDistance)} متر</span>
                </p>
              </div>
              <div className="mt-4 rounded-xl border border-mint/12 bg-mint/[0.05] p-3 md:mt-auto">
                <p className="flex items-center gap-1.5 text-[9px] font-bold text-mint/80">
                  <SparkIcon className="h-3 w-3" /> نکته خیابان
                </p>
                <p className="mt-1.5 text-[10px] leading-6 text-sand/55">
                  ماهی طلایی سه برابر حساب می‌شود و مخزن غوغا را پر می‌کند. غوغای پُر را برای داربست نگه دار — از
                  وسطش رد می‌شوی.
                </p>
                <p className="mt-2 flex items-center gap-1 text-[9px] text-sand/55">
                  <PawIcon className="h-2.5 w-2.5" />
                  <span>
                    ذخیره روی همین دستگاه · {formatNumber(scores.length)} اجرا به یاد مانده
                  </span>
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* توقف                                                               */
/* ------------------------------------------------------------------ */

interface PauseScreenProps {
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onToggleSound: () => void;
}

export function PauseScreen({ muted, onResume, onRestart, onQuit, onToggleSound }: PauseScreenProps) {
  return (
    <section
      className="absolute inset-0 z-30 flex animate-fade-in items-center justify-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-[5px]"
      aria-label="بازی متوقف شده"
    >
      <div className="panel animate-pop-in w-full max-w-[26rem] rounded-[1.5rem] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow className="text-mint/60">توقف · شیفت شب</Eyebrow>
            <h2 className="mt-1.5 font-display text-[1.8rem] font-extrabold leading-tight text-cream">
              همین‌جا بمان.
            </h2>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-mint/20 bg-mint/8 text-mint">
            <PawIcon className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-2.5 text-[12px] leading-6 text-sand/55">
          خیابان منتظر می‌ماند؛ زنجیره‌ات نه. یک نفس بگیر و برگرد.
        </p>

        <button type="button" onClick={onResume} className="btn-primary mt-5 h-12 w-full px-5 text-sm">
          <PlayIcon className="h-4 w-4" />
          ادامه بازی
          <Keycap className="mr-auto border-[#1a0d08]/20 bg-[#1a0d08]/10 text-[#1a0d08]/65">P</Keycap>
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={onRestart} className="btn-ghost h-11 text-[12px]">
            <RestartIcon className="h-3.5 w-3.5 text-sand/60" />
            شروع دوباره
          </button>
          <button type="button" onClick={onQuit} className="btn-ghost h-11 text-[12px]">
            <ArrowRightIcon className="h-3.5 w-3.5 text-sand/60" />
            پایان اجرا
          </button>
        </div>

        <div className="mt-5 space-y-2 rounded-2xl border border-cream/8 bg-cream/[0.025] p-3.5">
          <div className="flex items-center justify-between gap-2 text-[11px] text-sand/60">
            <span className="flex items-center gap-2">
              <ArrowUpIcon className="h-3.5 w-3.5 shrink-0 text-mint" /> پرش
              <span className="text-sand/30">(وسط هوا دوباره بزن)</span>
            </span>
            <Keycap>فاصله</Keycap>
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] text-sand/60">
            <span className="flex items-center gap-2">
              <ArrowDownIcon className="h-3.5 w-3.5 shrink-0 text-coral" /> سُر / سقوط سریع
            </span>
            <Keycap>↓</Keycap>
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] text-sand/60">
            <span className="flex items-center gap-2">
              <SparkIcon className="h-3.5 w-3.5 shrink-0 text-amber" /> غوغا وقتی پر شد
            </span>
            <Keycap>F</Keycap>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleSound}
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-cream/8 px-3.5 py-2.5 text-[11px] font-medium text-sand/60 transition hover:bg-cream/5"
        >
          <span className="flex items-center gap-2">
            {muted ? <SoundOffIcon className="h-4 w-4" /> : <SoundOnIcon className="h-4 w-4" />}
            {muted ? "صدا خاموش است" : "صدا روشن است"}
          </span>
          <span className="rounded-full border border-cream/12 px-2 py-0.5 text-[9px] text-sand/60">M</span>
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* پنجره‌ها                                                           */
/* ------------------------------------------------------------------ */

function Modal({
  title,
  eyebrow,
  onClose,
  children,
  footer,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-ink/80 p-3 backdrop-blur-sm sm:items-center sm:p-5"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="panel overlay-scroll max-h-[88dvh] w-full max-w-[30rem] animate-pop-in overflow-y-auto rounded-[1.5rem] p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <CatMark className="mt-0.5 h-9 w-9 shrink-0" />
            <div>
              <Eyebrow className="text-sand/68">{eyebrow}</Eyebrow>
              <h2 className="mt-1 font-display text-xl font-bold text-cream">{title}</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="icon-btn h-8 w-8 shrink-0" aria-label="بستن پنجره">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
}

const controlRows = [
  {
    icon: <ArrowUpIcon className="h-4 w-4" />,
    title: "پرش · پرش دوبل",
    desc: "وسط هوا دوباره بزن تا بالاتر بروی.",
    keys: "فاصله · ↑ · تپ",
    tone: "mint" as const,
  },
  {
    icon: <ArrowDownIcon className="h-4 w-4" />,
    title: "سُر · سقوط سریع",
    desc: "زیر داربست و کبوترها خودت را جمع کن.",
    keys: "↓ · S · سوایپ پایین",
    tone: "coral" as const,
  },
  {
    icon: <SparkIcon className="h-4 w-4" />,
    title: "غوغا",
    desc: "وقتی مخزن پر شد: شکست‌ناپذیر، آهنربای ماهی، امتیاز دوبرابر.",
    keys: "F · لمس مخزن",
    tone: "amber" as const,
  },
];

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="دفترچه بیژن"
      eyebrow="راهنمای بازی"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className="btn-primary h-11 w-full text-sm">
          <PlayIcon className="h-3.5 w-3.5" /> فهمیدم
        </button>
      }
    >
      <p className="text-[12px] leading-6 text-sand/60">
        تو بیژنی؛ یک گربه که جایی کار دارد. شب را بدو، از ترافیک بپر، زیر داربست سُر بخور و ماهی جمع کن تا
        ضریب امتیازت بالا برود. یک برخورد، پایان اجراست — مگر اینکه زنگ همراهت باشد.
      </p>

      <div className="mt-4 space-y-2">
        {controlRows.map((row) => (
          <div key={row.title} className="flex gap-3 rounded-xl border border-cream/8 bg-cream/[0.025] p-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cream/10 bg-ink/40 text-cream/80">
              {row.icon}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-[12px] font-semibold text-cream">{row.title}</p>
                <span className="rounded border border-cream/10 bg-ink/40 px-1.5 py-0.5 text-[8px] font-semibold text-sand/72">
                  {row.keys}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-6 text-sand/72">{row.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-semibold text-sand/60">در خیابان چه پیدا می‌شود</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="flex items-start gap-2 rounded-xl border border-cream/8 bg-cream/[0.02] p-2.5">
            <FishIcon className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
            <div>
              <p className="text-[11px] font-semibold text-cream">ماهی +۲۵</p>
              <p className="mt-0.5 text-[10px] leading-5 text-sand/68">هر چهار ماهی، ضریب را یک پله بالا می‌برد.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-cream/8 bg-cream/[0.02] p-2.5">
            <StarIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
            <div>
              <p className="text-[11px] font-semibold text-cream">ماهی طلایی +۸۰</p>
              <p className="mt-0.5 text-[10px] leading-5 text-sand/68">کمیاب و روشن؛ دو تا به زنجیره اضافه می‌کند.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-cream/8 bg-cream/[0.02] p-2.5">
            <YarnIcon className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
            <div>
              <p className="text-[11px] font-semibold text-cream">کاموا</p>
              <p className="mt-0.5 text-[10px] leading-5 text-sand/68">یک‌سوم مخزن غوغا را پر می‌کند.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-cream/8 bg-cream/[0.02] p-2.5">
            <BellIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
            <div>
              <p className="text-[11px] font-semibold text-cream">زنگ</p>
              <p className="mt-0.5 text-[10px] leading-5 text-sand/68">سپر نُه جان؛ یک برخورد را جذب می‌کند.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-mint/15 bg-mint/[0.055] p-3">
        <p className="flex items-center gap-1.5 text-[10px] font-bold text-mint">
          <SwipeIcon className="h-3.5 w-3.5" /> روی موبایل
        </p>
        <p className="mt-1 text-[11px] leading-6 text-sand/55">
          هرجای صفحه بزن تا بپری، انگشت را پایین بکش تا سُر بخوری، یا از دکمه‌های پایین استفاده کن. نوار پایین
          غوغا را فعال می‌کند.
        </p>
      </div>
    </Modal>
  );
}

export function ScoresModal({
  scores,
  highlightId,
  runs,
  onClose,
}: {
  scores: ScoreEntry[];
  highlightId?: string;
  runs: number;
  onClose: () => void;
}) {
  return (
    <Modal
      title="اهالی محل"
      eyebrow="جدول افتخارات محلی · مولوی"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] leading-5 text-sand/55">
            {faNum(runs)} اجرا روی این دستگاه ثبت شده.
          </p>
          <button type="button" onClick={onClose} className="btn-ghost h-10 px-4 text-[12px]">
            بستن
          </button>
        </div>
      }
    >
      <ScoreTable scores={scores} highlightId={highlightId} limit={10} />
    </Modal>
  );
}
