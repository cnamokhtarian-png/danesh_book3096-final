import { useCallback, useRef, useState } from "react";
import type { RunResult } from "../game/types";

export interface ScoreEntry {
  id: string;
  score: number;
  distance: number;
  fish: number;
  bestCombo: number;
  at: number;
}

export interface RecordedRun {
  entry: ScoreEntry;
  rank: number;
  isBest: boolean;
  bestBefore: number;
}

const SCORES_KEY = "bijan:scores:v2";
const RUNS_KEY = "bijan:runs:v1";
const LEGACY_SCORES_KEY = "stray:scores:v2";
const LEGACY_RUNS_KEY = "stray:runs:v1";
const MAX_SAVED = 25;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isValidEntry(value: unknown): value is ScoreEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.score === "number" &&
    Number.isFinite(v.score) &&
    typeof v.at === "number"
  );
}

function loadScores(): ScoreEntry[] {
  try {
    const raw = safeParse<unknown>(
      localStorage.getItem(SCORES_KEY) ?? localStorage.getItem(LEGACY_SCORES_KEY),
      [],
    );
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(isValidEntry)
      .map((entry) => ({
        ...entry,
        distance: typeof entry.distance === "number" ? entry.distance : 0,
        fish: typeof entry.fish === "number" ? entry.fish : 0,
        bestCombo: typeof entry.bestCombo === "number" ? entry.bestCombo : 0,
      }))
      .sort((a, b) => b.score - a.score || b.distance - a.distance || a.at - b.at)
      .slice(0, MAX_SAVED);
  } catch {
    return [];
  }
}

function loadRuns(): number {
  try {
    const value = Number(localStorage.getItem(RUNS_KEY) ?? localStorage.getItem(LEGACY_RUNS_KEY) ?? "0");
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function persistScores(scores: ScoreEntry[]) {
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
  } catch {
    /* private mode / storage full */
  }
}

function persistRuns(runs: number) {
  try {
    localStorage.setItem(RUNS_KEY, String(runs));
  } catch {
    /* noop */
  }
}

function makeId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function useHighScores() {
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const [runs, setRuns] = useState<number>(() => loadRuns());
  const scoresRef = useRef(scores);
  const runsRef = useRef(runs);

  scoresRef.current = scores;
  runsRef.current = runs;

  const record = useCallback((result: RunResult): RecordedRun => {
    const before = scoresRef.current;
    const bestBefore = before[0]?.score ?? 0;
    const entry: ScoreEntry = {
      id: makeId(),
      score: Math.max(0, Math.floor(result.score)),
      distance: Math.max(0, Math.floor(result.distance)),
      fish: Math.max(0, Math.floor(result.fish)),
      bestCombo: Math.max(0, Math.floor(result.bestCombo)),
      at: Date.now(),
    };
    const next = [...before, entry]
      .sort((a, b) => b.score - a.score || b.distance - a.distance || a.at - b.at)
      .slice(0, MAX_SAVED);
    scoresRef.current = next;
    persistScores(next);
    setScores(next);

    const nextRuns = runsRef.current + 1;
    runsRef.current = nextRuns;
    persistRuns(nextRuns);
    setRuns(nextRuns);

    const index = next.findIndex((item) => item.id === entry.id);
    return {
      entry,
      rank: index >= 0 ? index + 1 : 0,
      isBest: entry.score > bestBefore || (before.length === 0 && entry.score > 0),
      bestBefore,
    };
  }, []);

  return {
    scores,
    runs,
    best: scores[0]?.score ?? 0,
    record,
  };
}
