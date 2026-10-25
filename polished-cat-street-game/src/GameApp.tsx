import { useCallback, useEffect, useRef, useState } from "react";
import { createHudRefs, GameControls, TopBar, type HudRefs } from "./components/Hud";
import { GameOverScreen, HelpModal, PauseScreen, ScoresModal, StartScreen } from "./components/Screens";
import { sfx } from "./game/audio";
import { GameEngine } from "./game/engine";
import type { HudSnapshot, Phase, RunResult } from "./game/types";
import { useHighScores, type RecordedRun } from "./hooks/useHighScores";
import { faNum, faPercent, faSeconds } from "./utils/fa";

const MUTE_KEY = "bijan:muted:v1";
const LEGACY_MUTE_KEY = "stray:muted:v1";

function loadMuted() {
  try {
    return (localStorage.getItem(MUTE_KEY) ?? localStorage.getItem(LEGACY_MUTE_KEY)) === "1";
  } catch {
    return false;
  }
}

function isEditable(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

interface LastRun {
  result: RunResult;
  recorded: RecordedRun;
}

export default function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const hudRef = useRef<HudRefs>(createHudRefs());
  const previousMultiplier = useRef(1);
  const tutorialTimer = useRef<number | null>(null);

  const { scores, runs, best, record } = useHighScores();
  const recordRef = useRef(record);
  useEffect(() => {
    recordRef.current = record;
  }, [record]);

  const [phase, setPhase] = useState<Phase>("ready");
  const [muted, setMuted] = useState<boolean>(() => loadMuted());
  const [modal, setModal] = useState<"help" | "scores" | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [lastRun, setLastRun] = useState<LastRun | null>(null);

  const paintHud = useCallback((hud: HudSnapshot) => {
    const refs = hudRef.current;
    if (refs.score) refs.score.textContent = faNum(hud.score);
    if (refs.distance) refs.distance.textContent = `${faNum(hud.distance)} متر`;
    if (refs.fish) refs.fish.textContent = faNum(hud.fish);
    if (refs.comboValue) refs.comboValue.textContent = faNum(hud.multiplier);
    if (refs.comboWrap) {
      const show = hud.multiplier >= 2 && !hud.zoomies;
      refs.comboWrap.style.opacity = show ? "1" : "0";
      refs.comboWrap.style.transform = show ? "translateY(0)" : "translateY(3px)";
      if (show && hud.multiplier !== previousMultiplier.current) {
        refs.comboWrap.classList.remove("combo-pop");
        void refs.comboWrap.offsetWidth;
        refs.comboWrap.classList.add("combo-pop");
      }
    }
    if (refs.shield) refs.shield.style.opacity = hud.shield ? "1" : "0.25";
    if (refs.score) refs.score.style.color = hud.zoomies ? "#f7e9c8" : "";

    const button = refs.energyBtn;
    if (button) {
      const state = hud.zoomies ? "active" : hud.energy >= 100 ? "ready" : "charging";
      button.dataset.state = state;
      button.setAttribute(
        "aria-label",
        hud.zoomies
          ? `غوغا فعال است، ${faSeconds(Math.ceil(hud.zoomiesLeft))} مانده`
          : hud.energy >= 100
            ? "فعال‌کردن غوغا"
            : `مخزن غوغا ${faPercent(hud.energy)} پر شده`,
      );
    }
    if (refs.energyFill) {
      refs.energyFill.style.width = `${hud.zoomies ? (hud.zoomiesLeft / 6.4) * 100 : hud.energy}%`;
      refs.energyFill.style.background = hud.zoomies
        ? "linear-gradient(90deg, #ff6b4a, #ffb35c)"
        : "linear-gradient(90deg, #5fcba0, #9ee8c6)";
    }
    if (refs.energyText) {
      refs.energyText.textContent = hud.zoomies
        ? faSeconds(Math.ceil(hud.zoomiesLeft))
        : hud.energy >= 100
          ? "آماده"
          : faPercent(hud.energy);
    }
    previousMultiplier.current = hud.multiplier;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameEngine(canvas, {
      onHud: paintHud,
      onPhase: (next) => {
        setPhase(next);
        if (next !== "playing") setShowTutorial(false);
      },
      onGameOver: (result) => {
        const recorded = recordRef.current(result);
        setLastRun({ result, recorded });
      },
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [paintHud]);

  useEffect(() => {
    sfx.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* noop */
    }
  }, [muted]);

  useEffect(
    () => () => {
      if (tutorialTimer.current) window.clearTimeout(tutorialTimer.current);
    },
    [],
  );

  const beginTutorial = useCallback(() => {
    setShowTutorial(true);
    if (tutorialTimer.current) window.clearTimeout(tutorialTimer.current);
    tutorialTimer.current = window.setTimeout(() => setShowTutorial(false), 5400);
  }, []);

  const startRun = useCallback(() => {
    setModal(null);
    sfx.unlock();
    engineRef.current?.start();
    beginTutorial();
  }, [beginTutorial]);

  const goToTitle = useCallback(() => {
    setModal(null);
    setShowTutorial(false);
    engineRef.current?.toTitle();
  }, []);

  const pauseToggle = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (phase === "playing") engine.pause();
    else if (phase === "paused") engine.resume();
  }, [phase]);

  const toggleSound = useCallback(() => {
    const next = !muted;
    setMuted(next);
    sfx.setMuted(next);
    if (!next) sfx.ui();
  }, [muted]);

  const resumeAfterHelp = useRef(false);

  const closeModal = useCallback(() => {
    setModal(null);
    if (resumeAfterHelp.current) {
      resumeAfterHelp.current = false;
      engineRef.current?.resume();
    }
  }, []);

  const openHelp = useCallback(() => {
    resumeAfterHelp.current = false;
    if (phase === "playing") {
      engineRef.current?.pause();
      resumeAfterHelp.current = true;
    }
    sfx.ui();
    setModal("help");
  }, [phase]);

  const openScores = useCallback(() => {
    sfx.ui();
    setModal("scores");
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || isEditable(event.target)) return;
      const code = event.code;

      if (code === "KeyM") {
        toggleSound();
        return;
      }

      if (event.key === "Escape") {
        if (modal) {
          event.preventDefault();
          closeModal();
          return;
        }
        if (phase === "playing") {
          event.preventDefault();
          engineRef.current?.pause();
        } else if (phase === "paused") {
          event.preventDefault();
          engineRef.current?.resume();
        } else if (phase === "over") {
          event.preventDefault();
          goToTitle();
        }
        return;
      }

      if (modal) return;

      // Let a focused button handle its own activation instead of double-firing.
      if ((code === "Space" || code === "Enter" || code === "NumpadEnter") && event.target instanceof HTMLButtonElement) {
        return;
      }

      if (code === "KeyP") {
        if (phase === "playing" || phase === "paused") {
          event.preventDefault();
          pauseToggle();
        }
        return;
      }

      if (phase === "ready" && (code === "Space" || code === "Enter" || code === "NumpadEnter")) {
        event.preventDefault();
        startRun();
      } else if (phase === "over" && (code === "Space" || code === "KeyR" || code === "Enter" || code === "NumpadEnter")) {
        event.preventDefault();
        startRun();
      } else if (phase === "paused" && (code === "Space" || code === "Enter")) {
        event.preventDefault();
        engineRef.current?.resume();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeModal, goToTitle, modal, pauseToggle, phase, startRun, toggleSound]);

  const lastRunId = lastRun?.recorded.entry.id;

  return (
    <main className="grain relative h-[100dvh] w-full select-none overflow-hidden bg-ink">
      <canvas
        ref={canvasRef}
        className="game-canvas absolute inset-0 block h-full w-full"
        role="img"
        aria-label="بیژن، گربه‌ای در خیابان نئونی شب. او از ترافیک می‌گذرد و ماهی جمع می‌کند."
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-ink/55 to-transparent" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_50%_45%,transparent_55%,rgba(5,7,12,0.5)_100%)]" />

      <TopBar
        phase={phase}
        muted={muted}
        hudRef={hudRef}
        onToggleSound={toggleSound}
        onHelp={openHelp}
        onPauseToggle={pauseToggle}
      />

      {phase === "ready" && (
        <StartScreen
          scores={scores}
          best={best}
          runs={runs}
          highlightId={lastRunId}
          onStart={startRun}
          onHowTo={openHelp}
          onScores={openScores}
        />
      )}

      {phase === "paused" && (
        <PauseScreen
          muted={muted}
          onResume={() => engineRef.current?.resume()}
          onRestart={startRun}
          onQuit={goToTitle}
          onToggleSound={toggleSound}
        />
      )}

      {phase === "over" && lastRun && (
        <GameOverScreen
          result={lastRun.result}
          scores={scores}
          highlightId={lastRun.recorded.entry.id}
          rank={lastRun.recorded.rank}
          isBest={lastRun.recorded.isBest}
          bestBefore={lastRun.recorded.bestBefore}
          onRestart={startRun}
          onTitle={goToTitle}
          onHowTo={openHelp}
        />
      )}

      <GameControls
        phase={phase}
        hudRef={hudRef}
        showTutorial={showTutorial}
        onJump={() => engineRef.current?.jump()}
        onSlide={() => engineRef.current?.slide()}
        onZoomies={() => engineRef.current?.activateZoomies()}
      />

      {modal === "help" && <HelpModal onClose={closeModal} />}
      {modal === "scores" && (
        <ScoresModal scores={scores} highlightId={lastRunId} runs={runs} onClose={() => setModal(null)} />
      )}
    </main>
  );
}
