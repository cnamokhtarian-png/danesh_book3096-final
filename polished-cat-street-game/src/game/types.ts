export type Phase = "ready" | "playing" | "paused" | "dying" | "over";

export type ObstacleKind = "car" | "van" | "bin" | "scaffold" | "pigeon";

export type PickupKind = "fish" | "gold" | "yarn" | "bell";

export type ParticleKind = "spark" | "dust" | "ring" | "confetti" | "star";

export interface View {
  w: number;
  h: number;
  dpr: number;
  groundY: number;
  s: number;
}

export interface Cat {
  x: number;
  y: number;
  vy: number;
  jumps: number;
  slide: number;
  squash: number;
  buffer: number;
  grounded: boolean;
  runT: number;
  blink: number;
  blinkIn: number;
  rot: number;
  spin: number;
}

export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  seed: number;
  passed: boolean;
  dead: boolean;
}

export interface Pickup {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  baseY: number;
  seed: number;
  alive: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: ParticleKind;
  gravity: number;
  drag: number;
  rot: number;
  spin: number;
}

export interface FloatText {
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  text: string;
  color: string;
  size: number;
}

export interface AmbientCar {
  x: number;
  speed: number;
  kind: "car" | "van";
  seed: number;
}

export interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
}

export interface Background {
  far: HTMLCanvasElement;
  near: HTMLCanvasElement;
  farW: number;
  nearW: number;
  backdrop: HTMLCanvasElement;
  shade: HTMLCanvasElement;
}

export interface World {
  phase: Phase;
  t: number;
  view: View;
  bg: Background | null;
  scroll: number;
  distance: number;
  speed: number;
  score: number;
  fish: number;
  combo: number;
  bestCombo: number;
  comboTimer: number;
  energy: number;
  zoomies: number;
  shield: boolean;
  invuln: number;
  cat: Cat;
  obstacles: Obstacle[];
  pickups: Pickup[];
  particles: Particle[];
  texts: FloatText[];
  ambient: AmbientCar[];
  spawnIn: number;
  pickupIn: number;
  powerIn: number;
  ambientIn: number;
  lastKind: ObstacleKind | null;
  shake: number;
  flash: number;
  flashColor: string;
  hitStop: number;
  deathT: number;
  stars: Star[];
  runT: number;
  magnet: number;
  tutorial: boolean;
}

export interface HudSnapshot {
  score: number;
  combo: number;
  multiplier: number;
  energy: number;
  zoomies: boolean;
  zoomiesLeft: number;
  shield: boolean;
  distance: number;
  fish: number;
  phase: Phase;
}

export interface RunResult {
  score: number;
  distance: number;
  fish: number;
  bestCombo: number;
}

export interface EngineCallbacks {
  onHud: (hud: HudSnapshot) => void;
  onPhase: (phase: Phase) => void;
  onGameOver: (result: RunResult) => void;
}
