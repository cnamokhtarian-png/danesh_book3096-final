import { faNum } from "../utils/fa";
import { sfx } from "./audio";
import { buildBackground, catRect, drawScene, obstacleRect } from "./draw";
import type {
  EngineCallbacks,
  HudSnapshot,
  Obstacle,
  ObstacleKind,
  Phase,
  Pickup,
  PickupKind,
  RunResult,
  Star,
  View,
  World,
} from "./types";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const isEditable = (el: EventTarget | null) => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

const SPARK_COLORS = ["#ffcf82", "#ff8463", "#9ee8c6", "#f7f1e5", "#ffb35c"];

function makeStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.5 + Math.random() * 1.3,
    phase: Math.random() * Math.PI * 2,
  }));
}

function measure(canvas: HTMLCanvasElement): View {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(320, Math.round(rect.width || window.innerWidth || 800));
  const h = Math.max(300, Math.round(rect.height || window.innerHeight || 600));
  const rawDpr = Math.max(1, window.devicePixelRatio || 1);
  const dpr = Math.min(w < 640 ? 1.35 : 1.5, rawDpr);
  const groundY = Math.round(h * (h < 540 ? 0.78 : 0.8));
  const s = clamp(Math.min(h / 860, w / 560), 0.68, 1.22);
  return { w, h, dpr, groundY, s };
}

function createWorld(view: View): World {
  return {
    phase: "ready",
    t: 0,
    view,
    bg: null,
    scroll: 0,
    distance: 0,
    speed: 0,
    score: 0,
    fish: 0,
    combo: 0,
    bestCombo: 0,
    comboTimer: 0,
    energy: 0,
    zoomies: 0,
    shield: false,
    invuln: 0,
    cat: {
      x: view.w * 0.25,
      y: view.groundY,
      vy: 0,
      jumps: 0,
      slide: 0,
      squash: 1,
      buffer: 0,
      grounded: true,
      runT: 0,
      blink: 0,
      blinkIn: rand(1.5, 4),
      rot: 0,
      spin: 0,
    },
    obstacles: [],
    pickups: [],
    particles: [],
    texts: [],
    ambient: [],
    spawnIn: 2,
    pickupIn: 1,
    powerIn: 10,
    ambientIn: 1,
    lastKind: null,
    shake: 0,
    flash: 0,
    flashColor: "#ff6b4a",
    hitStop: 0,
    deathT: 0,
    stars: makeStars(72),
    runT: 0,
    magnet: 0,
    tutorial: true,
  };
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private world: World;
  private raf = 0;
  private last = 0;
  private nextId = 1;
  private hudAcc = 0;
  private disposed = false;
  private abort = new AbortController();
  private observer: ResizeObserver | null = null;
  private pointer: { id: number; startY: number; startX: number; moved: boolean; started: number } | null = null;
  private tapTimer = 0;
  private lastFoot = -1;

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D is not supported in this browser.");
    this.ctx = ctx;
    this.cb = callbacks;
    this.world = createWorld(measure(canvas));
    this.applySize(true);
    this.bind();
    this.emitHud(true);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);

    if (typeof document !== "undefined" && "fonts" in document) {
      void document.fonts.ready.then(() => {
        if (!this.disposed) this.world.bg = buildBackground(this.world.view);
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Lifecycle                                                        */
  /* ---------------------------------------------------------------- */

  start = () => {
    sfx.unlock();
    const w = this.world;
    const keep = {
      view: w.view,
      bg: w.bg,
      stars: w.stars,
      t: w.t,
    };
    this.world = {
      ...createWorld(keep.view),
      bg: keep.bg,
      stars: keep.stars,
      t: keep.t,
    };
    const fresh = this.world;
    fresh.phase = "playing";
    fresh.cat.x = fresh.view.w * (fresh.view.w < 640 ? 0.27 : 0.24);
    fresh.cat.y = fresh.view.groundY;
    fresh.speed = this.baseSpeed();
    fresh.spawnIn = 2.5;
    fresh.pickupIn = 0.45;
    fresh.powerIn = 6.2;
    this.seedOpeningFish();
    this.last = performance.now();
    this.hudAcc = 0;
    this.cb.onPhase("playing");
    this.emitHud(true);
    sfx.start();
  };

  pause = () => {
    if (this.world.phase !== "playing") return;
    this.world.phase = "paused";
    this.cb.onPhase("paused");
    sfx.ui();
  };

  resume = () => {
    if (this.world.phase !== "paused") return;
    this.world.phase = "playing";
    this.last = performance.now();
    this.cb.onPhase("playing");
    sfx.ui();
  };

  toTitle = () => {
    const w = this.world;
    w.phase = "ready";
    w.obstacles = [];
    w.pickups = [];
    w.particles = [];
    w.texts = [];
    w.ambient = [];
    w.score = 0;
    w.fish = 0;
    w.combo = 0;
    w.energy = 0;
    w.zoomies = 0;
    w.shield = false;
    w.invuln = 0;
    w.distance = 0;
    w.cat.y = w.view.groundY;
    w.cat.x = w.view.w * 0.25;
    w.cat.grounded = true;
    w.cat.rot = 0;
    w.ambientIn = 0.6;
    this.cb.onPhase("ready");
    this.emitHud(true);
  };

  destroy() {
    this.disposed = true;
    window.clearTimeout(this.tapTimer);
    cancelAnimationFrame(this.raf);
    this.abort.abort();
    this.observer?.disconnect();
    this.observer = null;
  }

  /* ---------------------------------------------------------------- */
  /* Input                                                            */
  /* ---------------------------------------------------------------- */

  private bind() {
    const opts = { signal: this.abort.signal };
    window.addEventListener("keydown", this.onKeyDown, opts);
    this.canvas.addEventListener("pointerdown", this.onPointerDown, opts);
    this.canvas.addEventListener("pointerup", this.onPointerUp, opts);
    this.canvas.addEventListener("pointermove", this.onPointerMove, opts);
    this.canvas.addEventListener("pointercancel", this.onPointerCancel, opts);
    document.addEventListener("visibilitychange", this.onVisibility, opts);
    window.addEventListener("orientationchange", this.handleResize, opts);
    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(this.handleResize);
      this.observer.observe(this.canvas);
    } else {
      window.addEventListener("resize", this.handleResize, opts);
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.world.phase !== "playing" || isEditable(e.target)) return;
    switch (e.code) {
      case "Space":
      case "ArrowUp":
      case "KeyW":
        e.preventDefault();
        if (!e.repeat) this.jump();
        break;
      case "ArrowDown":
      case "KeyS":
        e.preventDefault();
        if (!e.repeat) this.slide();
        break;
      case "KeyF":
      case "KeyE":
        e.preventDefault();
        if (!e.repeat) this.activateZoomies();
        break;
      default:
        break;
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.world.phase !== "playing") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.pointer = {
      id: e.pointerId,
      startY: e.clientY,
      startX: e.clientX,
      moved: false,
      started: performance.now(),
    };
    // If the touch stays put, jump without waiting for the finger to lift.
    window.clearTimeout(this.tapTimer);
    this.tapTimer = window.setTimeout(() => {
      const active = this.pointer;
      if (!active || active.moved || this.world.phase !== "playing") return;
      active.moved = true;
      this.pointer = null;
      this.jump();
    }, 72);
  };

  private onPointerMove = (e: PointerEvent) => {
    const p = this.pointer;
    if (!p || p.id !== e.pointerId || p.moved) return;
    const dy = e.clientY - p.startY;
    if (dy > 32) {
      p.moved = true;
      window.clearTimeout(this.tapTimer);
      this.slide();
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    const p = this.pointer;
    window.clearTimeout(this.tapTimer);
    this.pointer = null;
    if (!p || p.id !== e.pointerId || this.world.phase !== "playing") return;
    const dy = e.clientY - p.startY;
    const dx = e.clientX - p.startX;
    if (dy > 32 && Math.abs(dy) > Math.abs(dx)) this.slide();
    else if (!p.moved) this.jump();
  };

  private onPointerCancel = () => {
    window.clearTimeout(this.tapTimer);
    this.pointer = null;
  };

  private onVisibility = () => {
    if (document.hidden && this.world.phase === "playing") this.pause();
  };

  jump = () => {
    const w = this.world;
    if (w.phase !== "playing") return;
    const { cat } = w;
    const s = w.view.s;
    if (cat.grounded) {
      cat.vy = -1120 * s;
      cat.grounded = false;
      cat.jumps = 1;
      cat.slide = 0;
      cat.squash = 1.18;
      cat.buffer = 0;
      this.dust(cat.x, w.view.groundY, 7);
      sfx.jump();
      this.addShake(1.4);
    } else if (cat.jumps < 2) {
      cat.vy = -1000 * s;
      cat.jumps = 2;
      cat.squash = 1.14;
      cat.buffer = 0;
      this.ring(cat.x, cat.y - 16 * s, "#9ee8c6", 34 * s);
      this.burst(cat.x, cat.y - 12 * s, 8, ["#9ee8c6", "#f7f1e5", "#ffcf82"], 0.6);
      sfx.doubleJump();
    } else {
      cat.buffer = 0.14;
    }
  };

  slide = () => {
    const w = this.world;
    if (w.phase !== "playing") return;
    const { cat } = w;
    if (cat.slide < 0.16) {
      cat.slide = 0.56;
      if (!cat.grounded) cat.vy = Math.max(cat.vy, 1500 * w.view.s);
      this.dust(cat.x - 12 * w.view.s, cat.y, 5);
      sfx.slide();
    }
  };

  activateZoomies = () => {
    const w = this.world;
    if (w.phase !== "playing" || w.energy < 100 || w.zoomies > 0) return;
    w.energy = 0;
    w.zoomies = 6.4;
    w.invuln = 6.4;
    w.flash = 0.4;
    w.flashColor = "#9ee8c6";
    this.addShake(7);
    this.ring(w.cat.x, w.cat.y - 30 * w.view.s, "#9ee8c6", 90 * w.view.s);
    this.burst(w.cat.x, w.cat.y - 30 * w.view.s, 34, ["#9ee8c6", "#ffcf82", "#f7f1e5", "#ffb35c"], 1.2, "star");
    this.addText("غوغا!", w.cat.x, w.cat.y - 96 * w.view.s, "#9ee8c6", 24);
    sfx.zoomies();
  };

  /* ---------------------------------------------------------------- */
  /* Sizing                                                           */
  /* ---------------------------------------------------------------- */

  private handleResize = () => {
    if (this.disposed) return;
    this.applySize(false);
  };

  private applySize(initial: boolean) {
    const view = measure(this.canvas);
    const prev = this.world.view;
    this.canvas.width = Math.round(view.w * view.dpr);
    this.canvas.height = Math.round(view.h * view.dpr);
    this.world.view = view;
    this.world.bg = buildBackground(view);
    const cat = this.world.cat;
    if (initial) {
      cat.x = view.w * 0.25;
      cat.y = view.groundY;
    } else {
      const xRatio = cat.x / Math.max(1, prev.w);
      cat.x = Math.round((xRatio || 0.25) * view.w);
      cat.x = clamp(cat.x, view.w * 0.2, view.w * 0.32);
      if (cat.grounded || this.world.phase === "ready") cat.y = view.groundY;
      else cat.y = Math.min(cat.y, view.groundY - 20);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Frame                                                            */
  /* ---------------------------------------------------------------- */

  private frame = (now: number) => {
    if (this.disposed) return;
    const dt = clamp((now - this.last) / 1000, 0, 0.045);
    this.last = now;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.frame);
  };

  private baseSpeed() {
    const w = this.world;
    const { w: width, s } = w.view;
    return (430 + Math.min(width, 1400) * 0.055 + Math.min(200, w.distance * 0.012)) * clamp(s, 0.68, 1.2);
  }

  private multiplier() {
    return 1 + Math.min(4, Math.floor(this.world.combo / 4));
  }

  private meters() {
    return Math.max(0, Math.round(this.world.distance / (24 * this.world.view.s)));
  }

  private update(dt: number) {
    const w = this.world;
    w.t += dt;
    w.shake = Math.max(0, w.shake - (w.shake * 8 + 1.5) * dt);
    w.flash = Math.max(0, w.flash - dt * 3.2);

    if (w.phase === "paused") {
      this.emitHud();
      return;
    }

    this.updateIdleCat(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);

    if (w.phase === "ready" || w.phase === "over") {
      w.scroll += (w.phase === "ready" ? 44 : 18) * w.view.s * dt;
      this.updateAmbient(dt, w.phase === "ready" ? 1 : 0.55);
      this.emitHud();
      return;
    }

    if (w.hitStop > 0) {
      w.hitStop = Math.max(0, w.hitStop - dt);
      this.emitHud();
      return;
    }

    if (w.phase === "dying") {
      this.updateDying(dt);
      this.emitHud();
      return;
    }

    // ---- Playing ----
    w.runT += dt;
    w.speed = this.baseSpeed() * (w.zoomies > 0 ? 1.24 : 1);
    w.distance += w.speed * dt;
    w.scroll += w.speed * dt;
    w.score += w.speed * dt * 0.1 * (w.zoomies > 0 ? 2 : 1);
    w.invuln = Math.max(0, w.invuln - dt);
    w.tutorial = w.distance < 900 * w.view.s;

    if (w.zoomies > 0) {
      w.zoomies = Math.max(0, w.zoomies - dt);
      if (w.zoomies === 0) {
        w.invuln = Math.max(w.invuln, 0.7);
        this.addText("خرخر...", w.cat.x, w.cat.y - 86 * w.view.s, "#cfc4b2", 13);
      }
    }

    if (w.combo > 0) {
      w.comboTimer -= dt;
      if (w.comboTimer <= 0) {
        w.combo = 0;
        w.comboTimer = 0;
      }
    }

    // Spawning
    w.spawnIn -= dt;
    if (w.spawnIn <= 0) this.spawnObstacle();
    w.pickupIn -= dt;
    if (w.pickupIn <= 0) this.spawnFishCluster();
    w.powerIn -= dt;
    if (w.powerIn <= 0) this.spawnPower();

    this.updateCat(dt);
    this.moveEntities(dt);
    this.checkPickups();
    this.checkCollisions();
    this.checkPassed();

    if (w.phase === "playing" && this.hudAcc >= 0.05) {
      this.hudAcc = 0;
      this.emitHud();
    }
    this.hudAcc += dt;
  }

  private updateIdleCat(dt: number) {
    const cat = this.world.cat;
    cat.blinkIn -= dt;
    if (cat.blinkIn <= 0) {
      cat.blink = 1;
      cat.blinkIn = rand(2.2, 5.2);
    }
    if (cat.blink > 0) cat.blink = Math.max(0, cat.blink - dt * 5);
  }

  private updateCat(dt: number) {
    const w = this.world;
    const { cat } = w;
    const s = w.view.s;
    cat.runT += dt * (0.8 + w.speed / (900 * s));
    cat.blinkIn -= dt;
    if (cat.blinkIn <= 0) {
      cat.blink = 1;
      cat.blinkIn = rand(1.8, 4.4);
    }
    if (cat.blink > 0) cat.blink = Math.max(0, cat.blink - dt * 5);
    cat.slide = Math.max(0, cat.slide - dt);
    cat.buffer = Math.max(0, cat.buffer - dt);
    cat.squash += (1 - cat.squash) * Math.min(1, dt * 8);

    if (cat.grounded && w.phase === "playing") {
      const step = Math.floor(cat.runT * 7.5);
      if (step !== this.lastFoot) {
        this.lastFoot = step;
        w.particles.push({
          x: cat.x - rand(10, 24) * s,
          y: w.view.groundY - rand(0, 3),
          vx: rand(-95, -35) * s,
          vy: rand(-55, -8) * s,
          life: rand(0.18, 0.36),
          max: 0.36,
          size: rand(1.2, 2.8) * s,
          color: Math.random() > 0.55 ? "rgba(255,179,92,0.5)" : "rgba(207,196,178,0.32)",
          kind: "dust",
          gravity: 60,
          drag: 2,
          rot: 0,
          spin: 0,
        });
      }
    }

    if (!cat.grounded) {
      cat.vy += 3600 * s * dt;
      cat.y += cat.vy * dt;
      if (cat.y >= w.view.groundY) {
        const impact = cat.vy;
        cat.y = w.view.groundY;
        cat.vy = 0;
        cat.grounded = true;
        cat.jumps = 0;
        cat.squash = 0.8;
        if (impact > 900 * s) {
          this.dust(cat.x, cat.y, 10);
          this.addShake(1.1);
        } else {
          this.dust(cat.x, cat.y, 5);
        }
        sfx.land(impact > 1100 * s);
        if (cat.buffer > 0) {
          cat.buffer = 0;
          this.jump();
        }
      }
    }
    if (w.phase === "playing" && cat.grounded) cat.y = w.view.groundY;
  }

  private moveEntities(dt: number) {
    const w = this.world;
    for (let i = w.obstacles.length - 1; i >= 0; i--) {
      const o = w.obstacles[i];
      o.x -= (w.speed + o.vx) * dt;
      if (o.x + o.w < -220 || o.dead) w.obstacles.splice(i, 1);
    }
    for (let i = w.pickups.length - 1; i >= 0; i--) {
      const p = w.pickups[i];
      p.x -= w.speed * dt;
      if (w.zoomies > 0) {
        const dx = w.cat.x - p.x;
        const dy = w.cat.y - 28 * w.view.s - p.baseY;
        const dist = Math.hypot(dx, dy);
        if (dist < 210 * w.view.s && dist > 1) {
          p.x += (dx / dist) * 620 * w.view.s * dt;
          p.baseY += (dy / dist) * 620 * w.view.s * dt;
        }
      }
      if (p.x < -100) w.pickups.splice(i, 1);
    }
  }

  private updateAmbient(dt: number, rate = 1) {
    const w = this.world;
    w.ambientIn -= dt * rate;
    if (w.ambientIn <= 0) {
      w.ambientIn = rand(2.6, 5.2);
      w.ambient.push({
        x: w.view.w + 160 * w.view.s,
        speed: rand(130, 230) * w.view.s,
        kind: Math.random() > 0.72 ? "van" : "car",
        seed: Math.random() * 100,
      });
    }
    for (let i = w.ambient.length - 1; i >= 0; i--) {
      w.ambient[i].x -= w.ambient[i].speed * dt;
      if (w.ambient[i].x < -260) w.ambient.splice(i, 1);
    }
  }

  private updateDying(dt: number) {
    const w = this.world;
    const { cat } = w;
    const s = w.view.s;
    w.deathT += dt;
    w.speed *= Math.max(0, 1 - dt * 2.4);
    w.scroll += w.speed * dt * 0.25;
    cat.vy += 2500 * s * dt;
    cat.y += cat.vy * dt;
    cat.rot += cat.spin * dt;
    cat.squash += (1 - cat.squash) * Math.min(1, dt * 6);
    if (cat.y > w.view.groundY) {
      cat.y = w.view.groundY;
      if (Math.abs(cat.vy) > 380 * s) {
        cat.vy = -Math.abs(cat.vy) * 0.3;
        cat.spin *= 0.55;
        this.dust(cat.x, cat.y, 10);
        this.addShake(2);
      } else {
        cat.vy = 0;
        cat.spin = 0;
        cat.rot *= 0.98;
      }
    }
    for (const o of w.obstacles) o.x -= w.speed * dt * 0.25;
    if (w.deathT > 1.1) this.finishRun();
  }

  private finishRun() {
    const w = this.world;
    if (w.phase !== "dying") return;
    w.phase = "over";
    const result: RunResult = {
      score: Math.floor(w.score),
      distance: this.meters(),
      fish: w.fish,
      bestCombo: w.bestCombo,
    };
    this.cb.onGameOver(result);
    this.cb.onPhase("over");
    this.emitHud(true);
    sfx.over();
  }

  /* ---------------------------------------------------------------- */
  /* Spawning                                                         */
  /* ---------------------------------------------------------------- */

  private seedOpeningFish() {
    const w = this.world;
    const s = w.view.s;
    const startX = w.view.w * 0.64;
    const base = w.view.groundY - 66 * s;
    for (let i = 0; i < 5; i++) {
      w.pickups.push({
        id: this.nextId++,
        kind: i === 4 ? "gold" : "fish",
        x: startX + i * 60 * s,
        y: base - Math.sin((i / 4) * Math.PI) * 30 * s,
        baseY: base - Math.sin((i / 4) * Math.PI) * 30 * s,
        seed: Math.random() * 10,
        alive: true,
      });
    }
  }

  private isClear(x: number, y: number, r: number) {
    const w = this.world;
    for (const o of w.obstacles) {
      const nx = clamp(x, o.x, o.x + o.w);
      const ny = clamp(y, o.y, o.y + o.h);
      if (Math.hypot(x - nx, y - ny) < r + 26 * w.view.s) return false;
    }
    return true;
  }

  private spawnObstacle() {
    const w = this.world;
    const s = w.view.s;
    const distanceFactor = clamp(w.distance / 12000, 0, 1);
    let kind: ObstacleKind;
    const roll = Math.random();
    if (roll < 0.32) kind = "car";
    else if (roll < 0.5) kind = "bin";
    else if (roll < 0.7) kind = "scaffold";
    else if (roll < 0.88) kind = "pigeon";
    else kind = "van";

    if (kind === w.lastKind && (kind === "scaffold" || kind === "van")) {
      kind = pick<ObstacleKind>(["car", "bin", "pigeon", "car"]);
    }
    if (w.lastKind === "scaffold" && kind === "pigeon") kind = "car";
    if (distanceFactor < 0.15 && kind === "van") kind = "car";

    const x = w.view.w + 130 * s + rand(0, 90) * s;
    let o: Omit<Obstacle, "id" | "seed" | "passed" | "dead">;
    switch (kind) {
      case "van":
        o = { kind, x, y: w.view.groundY - 98 * s, w: 210 * s, h: 98 * s, vx: 0 };
        break;
      case "car":
        o = { kind, x, y: w.view.groundY - 64 * s, w: rand(162, 190) * s, h: 64 * s, vx: 0 };
        break;
      case "bin":
        o = { kind, x, y: w.view.groundY - 58 * s, w: 96 * s, h: 58 * s, vx: 0 };
        break;
      case "scaffold":
        o = {
          kind,
          x,
          y: w.view.groundY - 262 * s,
          w: 138 * s,
          h: 216 * s,
          vx: 0,
        };
        break;
      default:
        o = { kind: "pigeon", x, y: w.view.groundY - 88 * s, w: 56 * s, h: 34 * s, vx: 70 * s };
        break;
    }
    w.obstacles.push({
      ...o,
      id: this.nextId++,
      seed: Math.random() * 100,
      passed: false,
      dead: false,
    });
    w.lastKind = kind;

    const gapBase = clamp(590 - w.distance * 0.012, 330, 590) * s;
    const gapPx = gapBase + w.speed * 0.33 + rand(0, 80) * s;
    w.spawnIn = gapPx / Math.max(120, w.speed);
  }

  private spawnFishCluster() {
    const w = this.world;
    const s = w.view.s;
    const count = Math.random() < 0.32 ? 3 : Math.random() < 0.68 ? 2 : 1;
    const baseHeight = rand(70, 168) * s;
    const baseY = w.view.groundY - baseHeight;
    const startX = w.view.w + 80 * s + rand(0, 70) * s;
    for (let i = 0; i < count; i++) {
      const x = startX + i * 58 * s;
      const y = baseY - Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 26 * s;
      if (!this.isClear(x, y, 22 * s)) continue;
      const gold = count === 1 && Math.random() < 0.11;
      w.pickups.push({
        id: this.nextId++,
        kind: gold ? "gold" : "fish",
        x,
        y,
        baseY: y,
        seed: Math.random() * 10,
        alive: true,
      });
    }
    w.pickupIn = rand(0.55, 0.98);
  }

  private spawnPower() {
    const w = this.world;
    const s = w.view.s;
    const bell = !w.shield && Math.random() < 0.32;
    const kind: PickupKind = bell ? "bell" : "yarn";
    const y = w.view.groundY - rand(82, 148) * s;
    const x = w.view.w + 150 * s;
    if (this.isClear(x, y, 24 * s)) {
      w.pickups.push({ id: this.nextId++, kind, x, y, baseY: y, seed: Math.random() * 10, alive: true });
    }
    w.powerIn = rand(9, 14.5);
  }

  /* ---------------------------------------------------------------- */
  /* Maths & collisions                                               */
  /* ---------------------------------------------------------------- */

  private checkPickups() {
    const w = this.world;
    const s = w.view.s;
    const cx = w.cat.x - 2 * s;
    const cy = w.cat.y - (w.cat.slide > 0 && w.cat.grounded ? 18 : 40) * s;
    const reach = 54 * s;
    for (let i = w.pickups.length - 1; i >= 0; i--) {
      const p = w.pickups[i];
      if (Math.hypot(cx - p.x, cy - p.baseY) > reach) continue;
      w.pickups.splice(i, 1);
      this.collect(p);
    }
  }

  private collect(p: Pickup) {
    const w = this.world;
    const s = w.view.s;
    const fishy = p.kind === "fish" || p.kind === "gold";
    if (fishy) {
      w.fish += p.kind === "gold" ? 3 : 1;
      w.combo += p.kind === "gold" ? 2 : 1;
      w.bestCombo = Math.max(w.bestCombo, w.combo);
      w.comboTimer = 3.6;
      if (w.zoomies <= 0) w.energy = Math.min(100, w.energy + (p.kind === "gold" ? 16 : 8));
    }
    const level = this.multiplier();
    let pts = 0;
    let color = "#ffcf82";
    if (p.kind === "fish") {
      pts = 25 * level;
      color = "#ffb35c";
      sfx.collect(w.combo);
    } else if (p.kind === "gold") {
      pts = 80 * level;
      color = "#ffe4a6";
      sfx.gold();
    } else if (p.kind === "yarn") {
      pts = 50;
      color = "#9ee8c6";
      w.energy = w.zoomies > 0 ? w.energy : Math.min(100, w.energy + 38);
      sfx.power();
      this.addText("انرژی!", p.x, p.y - 44 * s, "#9ee8c6", 12);
    } else {
      pts = 60;
      color = "#ffd589";
      w.shield = true;
      sfx.shield();
      this.addText("نُه جان", p.x, p.y - 44 * s, "#ffd589", 13);
    }
    if (p.kind === "yarn" || p.kind === "bell") w.comboTimer = Math.max(w.comboTimer, 1.2);
    if (w.zoomies > 0 && fishy) pts *= 2;
    w.score += pts;
    if (fishy) w.score += 0;
    this.addText(`+${faNum(pts)}`, p.x, p.y - 20 * s, color, fishy ? 16 : 14);
    this.burst(p.x, p.y, p.kind === "gold" ? 18 : 9, SPARK_COLORS, 0.55, p.kind === "gold" ? "star" : "spark");
    if (fishy && w.energy >= 100 && w.zoomies <= 0) {
      this.addText("غوغا آماده است", w.cat.x + 24 * s, w.cat.y - 104 * s, "#9ee8c6", 13);
      this.ring(w.cat.x, w.cat.y - 34 * s, "#9ee8c6", 52 * s);
    }
    if (fishy && w.bestCombo > 0 && w.bestCombo === w.combo && [4, 8, 12, 16].includes(w.combo)) {
      this.addText(`×${faNum(this.multiplier())}`, w.cat.x + 30 * s, w.cat.y - 98 * s, "#9ee8c6", 22);
      this.ring(w.cat.x, w.cat.y - 38 * s, "#9ee8c6", 46 * s);
      this.addShake(1.2);
    }
    this.emitHud(true);
  }

  private checkCollisions() {
    const w = this.world;
    if (w.phase !== "playing") return;
    const s = w.view.s;
    const cat = catRect(w);
    for (const o of w.obstacles) {
      if (o.dead) continue;
      const hit = obstacleRect(w, o.kind, o.x, o.y, o.w, o.h);
      const overlaps = cat.x < hit.x + hit.w && cat.x + cat.w > hit.x && cat.y < hit.y + hit.h && cat.y + cat.h > hit.y;
      if (!overlaps) continue;

      if (w.zoomies > 0) {
        o.dead = true;
        w.score += 25 * this.multiplier() * 2;
        this.burst(o.x + o.w / 2, o.y + o.h / 2, 16, ["#ffb35c", "#f7f1e5", "#ff6b4a"], 0.9, "confetti");
        this.addShake(3);
        w.hitStop = 0.025;
        sfx.smash();
        continue;
      }
      if (w.invuln > 0) continue;
      if (w.shield) {
        w.shield = false;
        w.invuln = 1.6;
        o.dead = true;
        w.flash = 0.6;
        w.flashColor = "#ffcf82";
        this.addShake(10);
        this.ring(w.cat.x, w.cat.y - 30 * s, "#ffcf82", 72 * s);
        this.burst(o.x + o.w / 2, o.y + o.h / 2, 22, ["#ffcf82", "#f7f1e5", "#ff6b4a"], 1, "star");
        this.addText("نجات!", w.cat.x, w.cat.y - 98 * s, "#ffcf82", 20);
        sfx.shieldBreak();
        w.hitStop = 0.05;
        continue;
      }
      this.die();
      return;
    }
  }

  private checkPassed() {
    const w = this.world;
    const s = w.view.s;
    for (const o of w.obstacles) {
      if (!o.passed && !o.dead && o.x + o.w < w.cat.x - 20 * s) {
        o.passed = true;
        w.score += 8 * this.multiplier();
        if (Math.random() < 0.22) {
          this.burst(w.cat.x - 6 * s, w.cat.y - 18 * s, 3, ["#f7f1e5", "#9ee8c6"], 0.35, "spark");
        }
      }
    }
  }

  private die() {
    const w = this.world;
    const s = w.view.s;
    w.phase = "dying";
    w.deathT = 0;
    w.hitStop = 0.07;
    w.shake = 19;
    w.flash = 0.85;
    w.flashColor = "#ff6b4a";
    w.cat.vy = -840 * s;
    w.cat.grounded = false;
    w.cat.spin = (Math.random() > 0.5 ? 1 : -1) * rand(7, 10);
    w.cat.rot = 0;
    w.cat.slide = 0;
    this.burst(w.cat.x, w.cat.y - 30 * s, 30, ["#ff6b4a", "#ffb35c", "#f7f1e5", "#9ee8c6"], 1.25, "star");
    this.ring(w.cat.x, w.cat.y - 30 * s, "#ff6b4a", 80 * s);
    this.addText("آخ!", w.cat.x, w.cat.y - 105 * s, "#ff8a70", 24);
    sfx.hit();
    this.cb.onPhase("dying");
  }

  /* ---------------------------------------------------------------- */
  /* Effects                                                          */
  /* ---------------------------------------------------------------- */

  private addShake(amount: number) {
    this.world.shake = Math.min(26, this.world.shake + amount);
  }

  private particle(
    x: number,
    y: number,
    color: string,
    kind: "spark" | "dust" | "star" | "confetti" | "ring",
    power = 1,
    angle = Math.random() * Math.PI * 2,
  ) {
    const w = this.world;
    if (w.particles.length > 300) w.particles.shift();
    const speed = rand(30, 230) * power;
    w.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(0, 90) * power,
      life: rand(0.3, 0.85),
      max: 0.85,
      size: kind === "confetti" ? rand(3, 7) : rand(1.5, 4.5),
      color,
      kind,
      gravity: kind === "star" || kind === "confetti" ? 620 : 240,
      drag: 1.8,
      rot: Math.random() * Math.PI,
      spin: rand(-8, 8),
    });
  }

  private burst(x: number, y: number, count: number, colors: string[], power = 0.8, kind: "spark" | "star" | "confetti" = "spark") {
    for (let i = 0; i < count; i++) {
      this.particle(x, y, pick(colors), kind, power);
    }
  }

  private dust(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const p = this.world;
      const angle = Math.PI + Math.random() * Math.PI * 0.85;
      p.particles.push({
        x: x + rand(-12, 12) * p.view.s,
        y: y - rand(0, 6),
        vx: Math.cos(angle) * rand(20, 110) * p.view.s,
        vy: rand(-80, -10) * p.view.s,
        life: rand(0.25, 0.55),
        max: 0.55,
        size: rand(2, 5) * p.view.s,
        color: Math.random() > 0.5 ? "rgba(207,196,178,0.55)" : "rgba(247,241,229,0.4)",
        kind: "dust",
        gravity: 320,
        drag: 2.4,
        rot: 0,
        spin: 0,
      });
    }
  }

  private ring(x: number, y: number, color: string, size: number) {
    const w = this.world;
    w.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.42,
      max: 0.42,
      size,
      color,
      kind: "ring",
      gravity: 0,
      drag: 0,
      rot: 0,
      spin: 0,
    });
  }

  private addText(text: string, x: number, y: number, color: string, size = 15) {
    const w = this.world;
    w.texts.push({ x, y, vy: -52, life: 0.85, max: 0.85, text, color, size });
    if (w.texts.length > 12) w.texts.shift();
  }

  private updateParticles(dt: number) {
    const w = this.world;
    for (let i = w.particles.length - 1; i >= 0; i--) {
      const p = w.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        w.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= Math.max(0, 1 - p.drag * dt);
      p.rot += p.spin * dt;
    }
  }

  private updateTexts(dt: number) {
    const w = this.world;
    for (let i = w.texts.length - 1; i >= 0; i--) {
      const t = w.texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= Math.max(0, 1 - dt * 2);
      if (t.life <= 0) w.texts.splice(i, 1);
    }
  }

  private emitHud(force = false) {
    if (this.disposed) return;
    if (!force && this.world.phase === "paused") return;
    const w = this.world;
    const snap: HudSnapshot = {
      score: Math.floor(w.score),
      combo: w.combo,
      multiplier: this.multiplier(),
      energy: Math.round(w.energy),
      zoomies: w.zoomies > 0,
      zoomiesLeft: w.zoomies,
      shield: w.shield,
      distance: this.meters(),
      fish: w.fish,
      phase: w.phase,
    };
    this.cb.onHud(snap);
  }

  private render() {
    const ctx = this.ctx;
    const { w, h } = this.world.view;
    ctx.setTransform(this.world.view.dpr, 0, 0, this.world.view.dpr, 0, 0);
    ctx.fillStyle = "#0a0d14";
    ctx.fillRect(0, 0, w, h);

    const shake = this.world.shake;
    ctx.save();
    if (shake > 0.1) {
      // Slight overscan keeps translated edges filled during screen shake.
      const overscan = 1 + (shake / Math.max(1, h)) * 1.8;
      ctx.translate(w / 2, h / 2);
      ctx.scale(overscan, overscan);
      ctx.translate(-w / 2, -h / 2);
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    drawScene(ctx, this.world);
    ctx.restore();

    if (this.world.flash > 0.01) {
      ctx.globalAlpha = this.world.flash * 0.5;
      ctx.fillStyle = this.world.flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }
}

export type { Phase };
