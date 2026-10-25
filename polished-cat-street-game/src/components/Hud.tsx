import type { RefObject } from "react";
import type { Phase } from "../game/types";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CatMark,
  FishIcon,
  HelpIcon,
  PauseIcon,
  PlayIcon,
  ShieldIcon,
  SoundOffIcon,
  SoundOnIcon,
  SparkIcon,
} from "./Icons";
import { Keycap } from "./ui";

export interface HudRefs {
  score: HTMLElement | null;
  comboWrap: HTMLElement | null;
  comboValue: HTMLElement | null;
  distance: HTMLElement | null;
  fish: HTMLElement | null;
  shield: HTMLElement | null;
  energyBtn: HTMLButtonElement | null;
  energyFill: HTMLElement | null;
  energyText: HTMLElement | null;
}

export function createHudRefs(): HudRefs {
  return {
    score: null,
    comboWrap: null,
    comboValue: null,
    distance: null,
    fish: null,
    shield: null,
    energyBtn: null,
    energyFill: null,
    energyText: null,
  };
}

interface TopBarProps {
  phase: Phase;
  muted: boolean;
  hudRef: RefObject<HudRefs>;
  onToggleSound: () => void;
  onHelp: () => void;
  onPauseToggle: () => void;
}

export function TopBar({ phase, muted, hudRef, onToggleSound, onHelp, onPauseToggle }: TopBarProps) {
  const inRun = phase === "playing" || phase === "paused" || phase === "dying";
  const paused = phase === "paused";

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 pb-4 pt-[max(0.8rem,env(safe-area-inset-top))] md:px-7 md:pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <CatMark className="h-9 w-9 shrink-0 drop-shadow-[0_6px_14px_rgba(255,107,74,0.25)] md:h-10 md:w-10" />
          <div className="min-w-0 leading-none">
            <div className="font-display text-[22px] font-black leading-none tracking-tight text-cream md:text-[26px]">
              بیژن<span className="text-coral">.</span>
            </div>
            <div className="mt-1.5 hidden text-[8px] font-semibold text-sand/55 sm:block">گربه‌ای در خیابان</div>
          </div>
        </div>

        {inRun && (
          <div className="pointer-events-none absolute left-1/2 top-[max(0.7rem,env(safe-area-inset-top))] -translate-x-1/2 text-center">
            <p className="text-[8px] font-semibold text-cream/50 md:text-[9px]">امتیاز</p>
            <div className="mt-0.5 flex items-baseline justify-center gap-1.5">
              <span
                ref={(el) => {
                  hudRef.current.score = el;
                }}
                className="num font-display text-[26px] font-extrabold leading-none text-cream drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] md:text-[38px]"
              >
                ۰
              </span>
              <span
                ref={(el) => {
                  hudRef.current.comboWrap = el;
                }}
                dir="ltr"
                className="mb-0.5 inline-flex items-center rounded-full border border-mint/35 bg-mint/12 px-1.5 py-0.5 font-display text-[10px] font-bold leading-none text-mint opacity-0 transition-all duration-200 md:text-xs"
              >
                ×
                <span
                  ref={(el) => {
                    hudRef.current.comboValue = el;
                  }}
                >
                  ۱
                </span>
              </span>
            </div>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] font-medium text-sand/65 md:text-[10px]">
              <span
                ref={(el) => {
                  hudRef.current.distance = el;
                }}
                className="num"
              >
                ۰ متر
              </span>
              <span className="h-0.5 w-0.5 rounded-full bg-sand/40" />
              <FishIcon className="h-3 w-3 text-coral/80" />
              <span
                ref={(el) => {
                  hudRef.current.fish = el;
                }}
                className="num"
              >
                ۰
              </span>
              <span
                ref={(el) => {
                  hudRef.current.shield = el;
                }}
                className="ms-0.5 text-amber opacity-25 transition-opacity duration-200"
                title="سپر نُه جان"
              >
                <ShieldIcon className="h-3 w-3" />
              </span>
            </div>
          </div>
        )}

        <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleSound}
            aria-label={muted ? "روشن کردن صدا" : "قطع صدا"}
            title={muted ? "صدا خاموش است" : "صدا روشن است"}
          >
            {muted ? <SoundOffIcon className="h-4.5 w-4.5" /> : <SoundOnIcon className="h-4.5 w-4.5" />}
          </button>
          {!inRun ? (
            <button type="button" className="icon-btn" onClick={onHelp} aria-label="راهنمای بازی" title="راهنمای بازی">
              <HelpIcon className="h-4.5 w-4.5" />
            </button>
          ) : null}
          {inRun ? (
            <button
              type="button"
              className="icon-btn"
              onClick={onPauseToggle}
              aria-label={paused ? "ادامه بازی" : "توقف بازی"}
              title={paused ? "ادامه بازی (P)" : "توقف بازی (P)"}
            >
              {paused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

interface ControlsProps {
  phase: Phase;
  hudRef: RefObject<HudRefs>;
  showTutorial: boolean;
  onJump: () => void;
  onSlide: () => void;
  onZoomies: () => void;
}

export function GameControls({ phase, hudRef, showTutorial, onJump, onSlide, onZoomies }: ControlsProps) {
  if (phase !== "playing") return null;

  const press = (fn: () => void) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
  const keyPress = (fn: () => void) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-x-0 top-[4.9rem] z-20 flex justify-center transition-opacity duration-500 md:hidden ${
          showTutorial ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="glass rounded-full px-3 py-1.5 text-[9px] font-semibold text-cream/80">
          بزن تا بپری <span className="mx-1 text-coral">·</span> برای سُر خوردن انگشت را پایین بکش
        </div>
      </div>

      <div
        dir="ltr"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end gap-2.5 px-3.5 pb-[max(0.9rem,env(safe-area-inset-bottom))] md:justify-center md:gap-0 md:px-6 md:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <button
          type="button"
          onPointerDown={press(onSlide)}
          onKeyDown={keyPress(onSlide)}
          className="pointer-events-auto flex h-16 w-16 shrink-0 touch-none select-none flex-col items-center justify-center gap-1 rounded-full border border-cream/20 bg-night/75 text-cream shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-md transition active:scale-95 active:bg-cream/15 md:hidden"
          aria-label="سُر خوردن"
        >
          <ArrowDownIcon className="h-5 w-5" />
          <span className="text-[8px] font-semibold text-cream/70">سُر</span>
        </button>

        <div className="flex flex-1 justify-center md:flex-none">
          <button
            type="button"
            ref={(el) => {
              hudRef.current.energyBtn = el;
            }}
            data-state="charging"
            dir="rtl"
            onPointerDown={press(onZoomies)}
            onKeyDown={keyPress(onZoomies)}
            aria-label="فعال‌کردن غوغا وقتی مخزن پر است"
            className="zoom-btn pointer-events-auto relative flex h-12 w-full max-w-[12.5rem] touch-none select-none items-center justify-center gap-2 overflow-hidden rounded-full border border-mint/25 bg-night/80 px-4 text-mint shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md transition md:w-[13.5rem] data-[state=active]:border-coral/50 data-[state=active]:text-coral data-[state=ready]:border-mint/60 data-[state=ready]:text-mint"
            title="غوغا (F)"
          >
            <span
              className="zoom-btn-fill absolute inset-y-0 start-0 w-0 opacity-30 transition-[width] duration-100"
              ref={(el) => {
                hudRef.current.energyFill = el;
              }}
              style={{ background: "linear-gradient(90deg, #5fcba0, #9ee8c6)" }}
            />
            <span className="relative z-10 flex items-center gap-1.5">
              <SparkIcon className="h-4 w-4" />
              <span className="font-display text-[11px] font-bold">غوغا</span>
            </span>
            <span
              ref={(el) => {
                hudRef.current.energyText = el;
              }}
              className="num relative z-10 rounded-full bg-ink/45 px-1.5 py-0.5 text-[9px] font-bold"
            >
              ۰٪
            </span>
            <span className="relative z-10 hidden md:block">
              <Keycap>F</Keycap>
            </span>
          </button>
        </div>

        <button
          type="button"
          onPointerDown={press(onJump)}
          onKeyDown={keyPress(onJump)}
          className="pointer-events-auto flex h-[4.4rem] w-[4.4rem] shrink-0 touch-none select-none flex-col items-center justify-center gap-1 rounded-full border border-white/30 bg-gradient-to-b from-[#ff8a67] to-coral text-[#1a0d08] shadow-[0_14px_34px_-10px_rgba(255,107,74,0.9)] transition active:scale-95 active:brightness-95 md:hidden"
          aria-label="پرش"
        >
          <ArrowUpIcon className="h-6 w-6" strokeWidth={2.2} />
          <span className="text-[8px] font-extrabold">بپر</span>
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 z-20 hidden items-center gap-3 md:flex">
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-sand/60">
          <Keycap>فاصله</Keycap> پرش
        </span>
        <span className="h-3 w-px bg-cream/10" />
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-sand/60">
          <Keycap>↓</Keycap> سُر
        </span>
        <span className="h-3 w-px bg-cream/10" />
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-sand/60">
          <Keycap>P</Keycap> توقف
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-6 z-20 hidden md:block">
        <span className="text-[9px] font-semibold text-sand/40">خیابان مولوی · شب اول</span>
      </div>
    </>
  );
}
