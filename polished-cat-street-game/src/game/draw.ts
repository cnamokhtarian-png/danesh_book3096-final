import type {
  AmbientCar,
  Background,
  FloatText,
  Obstacle,
  Particle,
  Star,
  View,
  World,
} from "./types";

const TAU = Math.PI * 2;
const CAT = {
  fur: "#f2a25f",
  furLight: "#ffc488",
  furDark: "#d97f43",
  cream: "#ffeede",
  pink: "#ff9f96",
  scarf: "#ff6b4a",
  scarfDark: "#d94c2f",
  eye: "#b8f4cd",
  pupil: "#15251e",
  stripe: "#c66f38",
};
const CAR_COLORS = ["#ff6b4a", "#e9c46a", "#6fcfba", "#a78bfa", "#81b6e8", "#f7f1e5"];
const NEON = ["#ff6b4a", "#9ee8c6", "#ffb35c", "#f7f1e5"];

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, points = 4) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? r : r * 0.34;
    const a = (i * Math.PI) / points - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
  }
  ctx.closePath();
}

/* ------------------------------------------------------------------ */
/* Background caches                                                   */
/* ------------------------------------------------------------------ */

function makeTile(view: View, near: boolean): HTMLCanvasElement {
  const tileW = near ? 1240 : 1560;
  const tileH = view.groundY;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(tileW * view.dpr));
  c.height = Math.max(1, Math.round(tileH * view.dpr));
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.scale(view.dpr, view.dpr);

  const baseY = tileH;
  let x = -40;
  let i = 0;

  if (near) {
    // Mid-rise storefront row.
    while (x < tileW + 80) {
      const bw = 124 + hash(i * 3.7) * 104;
      const bh = tileH * (0.34 + hash(i * 5.1) * 0.3);
      const top = baseY - bh;
      const tone = hash(i * 9.4);
      ctx.fillStyle = tone > 0.5 ? "#1b2231" : "#171e2b";
      ctx.fillRect(x, top, bw, bh);
      // Roofline trim
      ctx.fillStyle = "rgba(247,241,229,0.08)";
      ctx.fillRect(x, top, bw, 2);
      // Upper windows
      const cols = Math.max(2, Math.floor(bw / 34));
      const rows = Math.max(1, Math.floor(bh / 46));
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          const wx = x + 14 + col * ((bw - 24) / cols);
          const wy = top + 18 + r * 38;
          if (wy > baseY - 108) continue;
          const lit = hash(i * 19 + r * 7 + col * 3.3);
          if (lit > 0.52) {
            ctx.fillStyle = lit > 0.86 ? "rgba(255,179,92,0.72)" : "rgba(255,203,141,0.28)";
            ctx.fillRect(wx, wy, 14, 18);
          } else {
            ctx.fillStyle = "rgba(12,17,26,0.8)";
            ctx.fillRect(wx, wy, 14, 18);
          }
        }
      }
      // Storefront window
      const storeY = baseY - 92;
      const glass = ctx.createLinearGradient(0, storeY, 0, baseY - 16);
      glass.addColorStop(0, "rgba(255,186,112,0.2)");
      glass.addColorStop(1, "rgba(255,143,82,0.05)");
      ctx.fillStyle = glass;
      ctx.fillRect(x + 12, storeY, bw - 24, 66);
      ctx.strokeStyle = "rgba(247,241,229,0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 12, storeY, bw - 24, 66);
      // Door
      ctx.fillStyle = "rgba(10,14,21,0.7)";
      ctx.fillRect(x + bw - 42, baseY - 78, 26, 62);
      // Awning
      const awningColor = NEON[Math.floor(hash(i * 2.2) * 2)];
      ctx.fillStyle = awningColor;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(x + 6, storeY - 4);
      ctx.lineTo(x + bw - 6, storeY - 4);
      ctx.lineTo(x + bw - 16, storeY + 12);
      ctx.lineTo(x + 16, storeY + 12);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(10,13,20,0.5)";
      for (let s = 0; s < 5; s++) {
        ctx.fillRect(x + 20 + s * ((bw - 40) / 5), storeY - 4, 7, 16);
      }
      // Neon sign (cached so the glow is free at runtime)
      if (hash(i * 7.7) > 0.32) {
        const label = ["آش", "ماهی", "۲۴ ساعته", "پنجه", "جاز", "باز", "نان", "خشک‌شویی"][
          Math.floor(hash(i * 4.3) * 8)
        ];
        const neon = NEON[Math.floor(hash(i * 8.8) * 3)];
        const sx = x + 18;
        const sy = top + 12;
        ctx.save();
        ctx.direction = "rtl";
        ctx.font = "700 13px Vazirmatn, sans-serif";
        ctx.textAlign = "right";
        const labelW = ctx.measureText(label).width;
        ctx.shadowColor = neon;
        ctx.shadowBlur = 14;
        ctx.fillStyle = neon;
        ctx.globalAlpha = 0.9;
        ctx.fillText(label, sx + labelW, sy + 10);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = neon;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - 6, sy - 4, labelW + 12, 22);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      // Roof clutter
      if (hash(i * 11.2) > 0.55) {
        ctx.fillStyle = "#111823";
        ctx.fillRect(x + 20, top - 18, 22, 18);
        ctx.fillRect(x + 26, top - 30, 3, 14);
      }
      x += bw + 10 + hash(i * 6.2) * 16;
      i++;
    }
  } else {
    // Distant skyline.
    while (x < tileW + 100) {
      const bw = 66 + hash(i * 2.9) * 96;
      const bh = tileH * (0.3 + hash(i * 4.7) * 0.36);
      const top = baseY - bh;
      ctx.fillStyle = hash(i * 7.3) > 0.5 ? "#141b29" : "#111825";
      ctx.fillRect(x, top, bw, bh);
      const cols = Math.max(2, Math.floor(bw / 20));
      const rows = Math.max(2, Math.floor(bh / 26));
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          if (hash(i * 31 + r * 5.3 + col * 11.1) > 0.68) {
            ctx.fillStyle = hash(i + r + col) > 0.8 ? "#ffbe7d" : "#7b7468";
            ctx.globalAlpha = 0.3 + hash(i * r + col) * 0.3;
            ctx.fillRect(x + 8 + col * ((bw - 14) / cols), top + 12 + r * 22, 3, 5);
            ctx.globalAlpha = 1;
          }
        }
      }
      if (hash(i * 13.9) > 0.62) {
        ctx.fillStyle = "#0f1420";
        ctx.fillRect(x + bw * 0.3, top - 26, 2.5, 26);
        ctx.fillStyle = "#ff6b4a";
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x + bw * 0.3 - 2, top - 29, 6, 4);
        ctx.globalAlpha = 1;
      }
      x += bw + 4 + hash(i * 3.3) * 20;
      i++;
    }
  }

  // Base glow bleeding up from the street.
  const glow = ctx.createLinearGradient(0, baseY - 130, 0, baseY);
  glow.addColorStop(0, "rgba(255,107,74,0)");
  glow.addColorStop(0.72, "rgba(255,137,88,0.07)");
  glow.addColorStop(1, "rgba(255,179,92,0.16)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, baseY - 130, tileW, 130);
  return c;
}

function makeCanvas(view: View) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(view.w * view.dpr));
  canvas.height = Math.max(1, Math.round(view.h * view.dpr));
  return canvas;
}

/** Static sky, moon and haze — baked once per resize. */
function makeBackdrop(view: View): HTMLCanvasElement {
  const c = makeCanvas(view);
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.scale(view.dpr, view.dpr);
  const { w, h, groundY } = view;

  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, "#080c15");
  sky.addColorStop(0.42, "#0d1424");
  sky.addColorStop(0.74, "#172033");
  sky.addColorStop(1, "#34293c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, groundY + 2);

  const bloom = ctx.createRadialGradient(w * 0.78, groundY, 10, w * 0.78, groundY, Math.max(w * 0.6, groundY * 0.7));
  bloom.addColorStop(0, "rgba(255,124,82,0.24)");
  bloom.addColorStop(0.5, "rgba(255,107,74,0.09)");
  bloom.addColorStop(1, "rgba(255,107,74,0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, groundY);

  // The moon is painted at runtime (drawMoonLight) so shading can never dull it.
  void h;
  return c;
}

/** Static full-screen shading + vignette, composited on top of the scene. */
function makeShade(view: View): HTMLCanvasElement {
  const c = makeCanvas(view);
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.scale(view.dpr, view.dpr);
  const { w, h, groundY, s } = view;

  // Warm glow above the street.
  const haze = ctx.createLinearGradient(0, groundY - 180, 0, groundY);
  haze.addColorStop(0, "rgba(255,107,74,0)");
  haze.addColorStop(0.7, "rgba(255,120,74,0.05)");
  haze.addColorStop(1, "rgba(255,163,105,0.15)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, groundY - 180, w, 180);

  const top = ctx.createLinearGradient(0, 0, 0, h * 0.22);
  top.addColorStop(0, "rgba(7,10,16,0.6)");
  top.addColorStop(1, "rgba(7,10,16,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h * 0.22);

  const bottom = ctx.createLinearGradient(0, h - 150 * s, 0, h);
  bottom.addColorStop(0, "rgba(7,10,16,0)");
  bottom.addColorStop(1, "rgba(7,10,16,0.72)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, h - 150 * s, w, Math.min(150 * s, h));

  const vignette = ctx.createRadialGradient(
    w / 2,
    h * 0.52,
    Math.min(w, h) * 0.3,
    w / 2,
    h * 0.52,
    Math.max(w, h) * 0.78,
  );
  vignette.addColorStop(0, "rgba(6,9,15,0)");
  vignette.addColorStop(1, "rgba(6,9,15,0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // The moon is painted at runtime on top of this layer, so leave the shade alone here.
  return c;
}

export function buildBackground(view: View): Background {
  return {
    far: makeTile(view, false),
    near: makeTile(view, true),
    farW: 1560,
    nearW: 1240,
    backdrop: makeBackdrop(view),
    shade: makeShade(view),
  };
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export function drawScene(ctx: CanvasRenderingContext2D, world: World) {
  const { view } = world;
  const { w, groundY } = view;
  const bg = world.bg;

  if (bg) ctx.drawImage(bg.backdrop, 0, 0, w, view.h);
  drawStars(ctx, world);

  if (bg) {
    const farOff = -((world.scroll * 0.08) % bg.farW);
    for (let x = farOff; x < w; x += bg.farW) {
      ctx.drawImage(bg.far, x, 0, bg.farW, groundY);
    }
    const nearOff = -((world.scroll * 0.26) % bg.nearW);
    for (let x = nearOff; x < w; x += bg.nearW) {
      ctx.drawImage(bg.near, x, 0, bg.nearW, groundY);
    }
  }

  drawStreet(ctx, world);
  drawBackgroundProps(ctx, world);
  drawAmbient(ctx, world);
  drawPickups(ctx, world);
  drawObstacles(ctx, world);
  drawCatAndShadow(ctx, world);
  drawParticles(ctx, world);
  drawTexts(ctx, world);
  drawForeground(ctx, world);
  drawMoonLight(ctx, world);
}

/** Painted last so full-screen shading can never turn the moon into a dark disc. */
function drawMoonLight(ctx: CanvasRenderingContext2D, world: World) {
  // The title screen owns its own CSS moon, so skip the canvas moon there.
  if (world.phase === "ready") return;
  const { w, h, groundY } = world.view;
  const mx = w < 640 ? w * 0.74 : w * 0.8;
  const my = Math.min(h * 0.17, groundY * 0.28);
  const r = Math.min(w, h) * 0.055;

  const halo = ctx.createRadialGradient(mx, my, r * 0.4, mx, my, r * 3.6);
  halo.addColorStop(0, "rgba(255,238,200,0.2)");
  halo.addColorStop(0.4, "rgba(255,214,160,0.07)");
  halo.addColorStop(1, "rgba(255,214,160,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(mx - r * 3.6, my - r * 3.6, r * 7.2, r * 7.2);

  ctx.fillStyle = "#f8edda";
  ctx.beginPath();
  ctx.arc(mx, my, r, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "rgba(198,180,154,0.26)";
  ctx.beginPath();
  ctx.arc(mx - r * 0.3, my - r * 0.25, r * 0.19, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(mx + r * 0.28, my + r * 0.34, r * 0.12, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(mx + r * 0.1, my - r * 0.52, r * 0.08, 0, TAU);
  ctx.fill();
}



function drawStars(ctx: CanvasRenderingContext2D, world: World) {
  const { groundY } = world.view;
  for (const star of world.stars as Star[]) {
    const y = star.y * groundY * 0.72;
    const tw = 0.45 + Math.sin(world.t * 1.6 + star.phase) * 0.35;
    ctx.globalAlpha = Math.max(0.08, tw);
    ctx.fillStyle = "#f7f1e5";
    ctx.beginPath();
    ctx.arc(star.x * world.view.w, y, star.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawStreet(ctx: CanvasRenderingContext2D, world: World) {
  const { w, h, groundY, s } = world.view;
  const sidewalkTop = groundY - 20 * s;
  // Sidewalk
  const walk = ctx.createLinearGradient(0, sidewalkTop, 0, groundY);
  walk.addColorStop(0, "#232b3b");
  walk.addColorStop(1, "#171f2d");
  ctx.fillStyle = walk;
  ctx.fillRect(0, sidewalkTop, w, groundY - sidewalkTop);
  ctx.fillStyle = "rgba(247,241,229,0.16)";
  ctx.fillRect(0, sidewalkTop, w, 1.5 * s);
  // Sidewalk seams
  const seam = 92 * s;
  const seamOff = world.scroll * 0.7;
  ctx.strokeStyle = "rgba(8,12,18,0.5)";
  ctx.lineWidth = 1;
  for (let x = -(seamOff % seam); x < w + seam; x += seam) {
    ctx.beginPath();
    ctx.moveTo(x, sidewalkTop + 2);
    ctx.lineTo(x - 8 * s, groundY);
    ctx.stroke();
  }
  // Curb
  ctx.fillStyle = "#303a4c";
  ctx.fillRect(0, groundY - 4 * s, w, 5 * s);
  ctx.fillStyle = "rgba(247,241,229,0.12)";
  ctx.fillRect(0, groundY - 4 * s, w, 1);
  // Asphalt
  const road = ctx.createLinearGradient(0, groundY, 0, h);
  road.addColorStop(0, "#141a26");
  road.addColorStop(0.5, "#101520");
  road.addColorStop(1, "#090d15");
  ctx.fillStyle = road;
  ctx.fillRect(0, groundY, w, h - groundY);

  // Lane dashes
  const laneY = groundY + (h - groundY) * 0.56;
  const dash = 54 * s;
  const gap = 42 * s;
  const off = world.scroll % (dash + gap);
  ctx.fillStyle = "rgba(247,241,229,0.13)";
  for (let x = -off; x < w + dash; x += dash + gap) {
    roundRect(ctx, x, laneY, dash, 3.5 * s, 2);
    ctx.fill();
  }
  // Thin center dashes
  ctx.fillStyle = "rgba(247,241,229,0.06)";
  const off2 = (world.scroll * 1.12) % (dash * 0.8 + gap);
  for (let x = -off2; x < w + dash; x += dash * 0.8 + gap) {
    ctx.fillRect(x, groundY + (h - groundY) * 0.22, dash * 0.55, 2 * s);
  }

  // Puddles reflecting neon
  for (let i = 0; i < 6; i++) {
    const seed = i * 17.3;
    const period = w + 320;
    let px = (hash(seed) * period - world.scroll * 0.8) % period;
    if (px < 0) px += period;
    px -= 160;
    const py = groundY + 20 * s + hash(seed + 2) * Math.max(30, h - groundY - 50);
    const rw = (34 + hash(seed + 4) * 66) * s;
    const rh = (5 + hash(seed + 6) * 8) * s;
    const color = NEON[i % NEON.length];
    // Layered translucent ellipses read as a wet reflection without the cost
    // of building a fresh radial gradient for every puddle, every frame.
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(px, py, rw, rh, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.07;
    ctx.beginPath();
    ctx.ellipse(px, py, rw * 0.66, rh * 0.7, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(247,241,229,0.1)";
    ctx.beginPath();
    ctx.ellipse(px - rw * 0.3, py - rh * 0.2, rw * 0.16, rh * 0.16, 0, 0, TAU);
    ctx.fill();
  }

  // Gravel specks
  ctx.fillStyle = "rgba(247,241,229,0.1)";
  for (let i = 0; i < 18; i++) {
    const px = (hash(i * 4.7) * w - world.scroll * 0.9) % w;
    const x = px < 0 ? px + w : px;
    const py = groundY + 10 + hash(i * 8.1) * (h - groundY - 14);
    ctx.globalAlpha = 0.18 + hash(i) * 0.25;
    ctx.fillRect(x, py, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawBackgroundProps(ctx: CanvasRenderingContext2D, world: World) {
  const { w, groundY, s } = world.view;
  const spacing = 350 * s;
  const off = (world.scroll * 0.62) % spacing;
  ctx.save();
  for (let i = -1; i < Math.ceil(w / spacing) + 2; i++) {
    const seed = i + Math.floor(world.scroll / spacing);
    const x = i * spacing - off;
    const kind = Math.floor(hash(seed * 3.1) * 3);
    if (kind === 0) {
      // Street lamp
      const top = groundY - 225 * s;
      const glow = ctx.createRadialGradient(x, top + 8, 2, x, top + 8, 120 * s);
      glow.addColorStop(0, "rgba(255,196,120,0.35)");
      glow.addColorStop(0.35, "rgba(255,179,92,0.1)");
      glow.addColorStop(1, "rgba(255,179,92,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - 120 * s, top - 112 * s, 240 * s, 240 * s);
      ctx.strokeStyle = "#0b1018";
      ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x, top);
      ctx.quadraticCurveTo(x, top - 16 * s, x + 26 * s, top - 16 * s);
      ctx.stroke();
      ctx.fillStyle = "#ffe2ae";
      ctx.beginPath();
      ctx.ellipse(x + 27 * s, top - 10 * s, 8 * s, 4.5 * s, 0, 0, TAU);
      ctx.fill();
    } else if (kind === 1) {
      // Hydrant
      ctx.fillStyle = "#2b3546";
      ctx.fillRect(x, groundY - 26 * s, 12 * s, 26 * s);
      ctx.fillStyle = "#3b4a5e";
      roundRect(ctx, x - 4 * s, groundY - 30 * s, 20 * s, 8 * s, 3 * s);
      ctx.fill();
    } else {
      // Bench / planter
      ctx.fillStyle = "#202a39";
      roundRect(ctx, x - 26 * s, groundY - 20 * s, 54 * s, 10 * s, 3 * s);
      ctx.fill();
      ctx.fillRect(x - 20 * s, groundY - 10 * s, 5 * s, 10 * s);
      ctx.fillRect(x + 18 * s, groundY - 10 * s, 5 * s, 10 * s);
      ctx.fillStyle = "#233a33";
      ctx.beginPath();
      ctx.ellipse(x - 4 * s, groundY - 26 * s, 22 * s, 10 * s, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawAmbient(ctx: CanvasRenderingContext2D, world: World) {
  if (world.phase !== "ready" && world.phase !== "over") return;
  for (const car of world.ambient as AmbientCar[]) {
    const h = (car.kind === "van" ? 72 : 50) * world.view.s;
    const w = (car.kind === "van" ? 148 : 122) * world.view.s;
    const y = world.view.groundY - h;
    ctx.globalAlpha = 0.9;
    drawCar(ctx, car.x, y, w, h, car.seed, car.kind, world.view.s);
    ctx.globalAlpha = 1;
  }
}

/* ------------------------------------------------------------------ */
/* Vehicles & obstacles                                                */
/* ------------------------------------------------------------------ */

function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  kind: "car" | "van",
  s: number,
) {
  const color = CAR_COLORS[Math.floor(hash(seed) * CAR_COLORS.length)];
  const wheelR = h * 0.17;
  const base = y + h;

  // headlight beam
  const beam = ctx.createLinearGradient(x, y + h * 0.45, x - w * 1.25, y + h * 0.9);
  beam.addColorStop(0, "rgba(255,236,190,0.22)");
  beam.addColorStop(1, "rgba(255,236,190,0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + h * 0.42);
  ctx.lineTo(x - w * 1.2, y + h * 0.1);
  ctx.lineTo(x - w * 1.2, base + 6 * s);
  ctx.lineTo(x + 4, y + h * 0.8);
  ctx.closePath();
  ctx.fill();

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, base + 2, w * 0.48, 6 * s, 0, 0, TAU);
  ctx.fill();

  if (kind === "van") {
    roundRect(ctx, x, y + h * 0.08, w, h * 0.82, 9 * s);
    ctx.fillStyle = color;
    ctx.fill();
    // roof rack
    ctx.fillStyle = "rgba(10,13,20,0.55)";
    roundRect(ctx, x + w * 0.3, y - 2 * s, w * 0.42, h * 0.14, 3 * s);
    ctx.fill();
    // windscreen
    ctx.fillStyle = "#8fd6c5";
    ctx.globalAlpha = 0.5;
    roundRect(ctx, x + w * 0.06, y + h * 0.2, w * 0.28, h * 0.3, 5 * s);
    ctx.fill();
    ctx.globalAlpha = 1;
    // side window / panel
    ctx.fillStyle = "rgba(9,14,22,0.4)";
    roundRect(ctx, x + w * 0.4, y + h * 0.2, w * 0.38, h * 0.3, 4 * s);
    ctx.fill();
    // stripe
    ctx.fillStyle = "rgba(10,13,20,0.42)";
    ctx.fillRect(x, y + h * 0.58, w, 5 * s);
    ctx.save();
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(247,241,229,0.85)";
    ctx.font = `700 ${10 * s}px Vazirmatn, sans-serif`;
    ctx.fillText("ماهی", x + w * 0.59, y + h * 0.4);
    ctx.restore();
  } else {
    // Cabin
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.46);
    ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.02, x + w * 0.5, y + h * 0.02);
    ctx.quadraticCurveTo(x + w * 0.7, y + h * 0.03, x + w * 0.82, y + h * 0.44);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    // glass
    ctx.fillStyle = "#9ee0cf";
    ctx.globalAlpha = 0.38;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.38);
    ctx.quadraticCurveTo(x + w * 0.36, y + h * 0.1, x + w * 0.5, y + h * 0.1);
    ctx.lineTo(x + w * 0.62, y + h * 0.1);
    ctx.lineTo(x + w * 0.6, y + h * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // body
    roundRect(ctx, x, y + h * 0.4, w, h * 0.42, 8 * s);
    const body = ctx.createLinearGradient(0, y, 0, base);
    body.addColorStop(0, color);
    body.addColorStop(1, "rgba(10,13,20,0.55)");
    ctx.fillStyle = body;
    ctx.fill();
    // racing stripe
    ctx.fillStyle = "rgba(247,241,229,0.35)";
    ctx.fillRect(x + w * 0.3, y + h * 0.42, w * 0.34, 3 * s);
    // taxi sign
    if (Math.floor(hash(seed * 2.1) * 3) === 0) {
      ctx.fillStyle = "#ffb35c";
      roundRect(ctx, x + w * 0.42, y - 4 * s, w * 0.17, 6 * s, 2 * s);
      ctx.fill();
    }
  }

  // Wheels
  for (const wx of [x + w * 0.2, x + w * 0.79]) {
    ctx.fillStyle = "#0a0e15";
    ctx.beginPath();
    ctx.arc(wx, base - wheelR * 0.65, wheelR, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#3f4a5c";
    ctx.beginPath();
    ctx.arc(wx, base - wheelR * 0.65, wheelR * 0.42, 0, TAU);
    ctx.fill();
  }

  // Headlight (facing left toward the cat)
  const hl = ctx.createRadialGradient(x + 4, y + h * 0.55, 1, x + 4, y + h * 0.55, 26 * s);
  hl.addColorStop(0, "rgba(255,244,206,0.95)");
  hl.addColorStop(0.25, "rgba(255,220,150,0.5)");
  hl.addColorStop(1, "rgba(255,220,150,0)");
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.arc(x + 4, y + h * 0.55, 26 * s, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#fff4cf";
  ctx.beginPath();
  ctx.ellipse(x + 3, y + h * 0.55, 4 * s, 3 * s, 0, 0, TAU);
  ctx.fill();
  // Tail light
  ctx.fillStyle = "rgba(255,107,74,0.9)";
  ctx.fillRect(x + w - 3, y + h * 0.55, 3, 3.5 * s);

  // Exhaust puffs
  ctx.fillStyle = "rgba(247,241,229,0.06)";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + w + 8 + i * 9 * s, base - 5 * s - i * 4 * s, (5 + i * 3) * s, 0, TAU);
    ctx.fill();
  }
}

function drawPigeon(ctx: CanvasRenderingContext2D, o: Obstacle, t: number) {
  const cx = o.x + o.w / 2;
  const cy = o.y + o.h / 2 + Math.sin(t * 9 + o.seed) * 3;
  const wing = Math.sin(t * 17 + o.seed) * 0.7;
  const s = o.w / 56;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  // motion streaks
  ctx.strokeStyle = "rgba(247,241,229,0.16)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(20 + i * 6, -8 + i * 7);
    ctx.lineTo(40 + i * 6, -8 + i * 7);
    ctx.stroke();
  }
  // far wing
  ctx.fillStyle = "#5e7284";
  ctx.beginPath();
  ctx.ellipse(2, -6 + wing * 8, 13, 6, -0.5 + wing * 0.3, 0, TAU);
  ctx.fill();
  // body
  ctx.fillStyle = "#8a9bab";
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 11, -0.06, 0, TAU);
  ctx.fill();
  // head
  ctx.fillStyle = "#b3c1cd";
  ctx.beginPath();
  ctx.arc(-15, -7, 7.5, 0, TAU);
  ctx.fill();
  // neck sheen
  ctx.fillStyle = "rgba(158,232,198,0.65)";
  ctx.beginPath();
  ctx.ellipse(-12, -4, 7, 8, 0.3, 0, TAU);
  ctx.fill();
  // beak
  ctx.fillStyle = "#e7b875";
  ctx.beginPath();
  ctx.moveTo(-22, -7);
  ctx.lineTo(-29, -4);
  ctx.lineTo(-22, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#131a22";
  ctx.beginPath();
  ctx.arc(-16.5, -9, 1.7, 0, TAU);
  ctx.fill();
  // near wing
  ctx.fillStyle = "#6d8296";
  ctx.beginPath();
  ctx.ellipse(3, 2, 15, 7, 0.32 - wing * 0.5, 0, TAU);
  ctx.fill();
  // tail
  ctx.fillStyle = "#5c7083";
  ctx.beginPath();
  ctx.moveTo(16, -3);
  ctx.lineTo(29, -9);
  ctx.lineTo(27, 1);
  ctx.lineTo(16, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawObstacles(ctx: CanvasRenderingContext2D, world: World) {
  const s = world.view.s;
  for (const o of world.obstacles) {
    if (o.x > world.view.w + 300 || o.x + o.w < -300) continue;
    if (o.kind === "car" || o.kind === "van") {
      drawCar(ctx, o.x, o.y, o.w, o.h, o.seed, o.kind, s);
      continue;
    }
    if (o.kind === "pigeon") {
      drawPigeon(ctx, o, world.t);
      continue;
    }
    if (o.kind === "bin") {
      drawBins(ctx, o, s);
      continue;
    }
    drawScaffold(ctx, o, s, world.t);
  }
}

function drawBins(ctx: CanvasRenderingContext2D, o: Obstacle, s: number) {
  const base = o.y + o.h;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(o.x + o.w / 2, base + 2, o.w * 0.56, 5 * s, 0, 0, TAU);
  ctx.fill();
  const bagColor = ["#232d3b", "#2a3545", "#1d2733"][Math.floor(hash(o.seed) * 3)];
  // bin
  ctx.fillStyle = "#33414f";
  roundRect(ctx, o.x + o.w * 0.5, o.y + o.h * 0.06, o.w * 0.46, o.h * 0.94, 5 * s);
  ctx.fill();
  ctx.fillStyle = "#1d2733";
  ctx.fillRect(o.x + o.w * 0.5, o.y + o.h * 0.3, o.w * 0.46, 3 * s);
  ctx.fillStyle = "#4a5a68";
  ctx.fillRect(o.x + o.w * 0.55, o.y + o.h * 0.12, o.w * 0.36, 3 * s);
  // bags
  ctx.fillStyle = bagColor;
  ctx.beginPath();
  ctx.ellipse(o.x + o.w * 0.26, base - o.h * 0.34, o.w * 0.32, o.h * 0.36, -0.1, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(o.x + o.w * 0.52, base - o.h * 0.22, o.w * 0.26, o.h * 0.25, 0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(158,232,198,0.14)";
  ctx.beginPath();
  ctx.ellipse(o.x + o.w * 0.2, base - o.h * 0.48, o.w * 0.12, o.h * 0.1, -0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#ffb35c";
  ctx.beginPath();
  ctx.arc(o.x + o.w * 0.64, base - o.h * 0.55, 3 * s, 0, TAU);
  ctx.fill();
}

function drawScaffold(ctx: CanvasRenderingContext2D, o: Obstacle, s: number, t: number) {
  const left = o.x + 4 * s;
  const right = o.x + o.w - 4 * s;
  const bottom = o.y + o.h;
  const top = o.y;
  ctx.strokeStyle = "#3b465a";
  ctx.lineWidth = 7 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(left, top);
  ctx.moveTo(right, bottom);
  ctx.lineTo(right, top);
  ctx.stroke();
  // cross brace
  ctx.strokeStyle = "rgba(120,138,158,0.6)";
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(right, top + 16 * s);
  ctx.stroke();
  // Caution beam
  ctx.save();
  roundRect(ctx, o.x, bottom - 18 * s, o.w, 18 * s, 3 * s);
  ctx.clip();
  ctx.fillStyle = "#ff6b4a";
  ctx.fillRect(o.x, bottom - 18 * s, o.w, 18 * s);
  ctx.fillStyle = "#f7e8cf";
  for (let i = -2; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(o.x + i * 20 * s, bottom);
    ctx.lineTo(o.x + i * 20 * s + 11 * s, bottom - 18 * s);
    ctx.lineTo(o.x + i * 20 * s + 20 * s, bottom - 18 * s);
    ctx.lineTo(o.x + i * 20 * s + 9 * s, bottom);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Hanging sign
  const flicker = 0.84 + Math.sin(t * 8 + o.seed) * 0.12;
  const signW = o.w * 0.74;
  const signX = o.x + (o.w - signW) / 2;
  const signY = top + 18 * s;
  ctx.fillStyle = "#141c28";
  roundRect(ctx, signX, signY, signW, 42 * s, 5 * s);
  ctx.fill();
  ctx.strokeStyle = "#ffb35c";
  ctx.globalAlpha = flicker;
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.direction = "rtl";
  ctx.fillStyle = `rgba(255,179,92,${flicker})`;
  ctx.font = `700 ${12 * s}px Vazirmatn, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("خم شو!", signX + signW / 2, signY + 19 * s);
  ctx.font = `500 ${7.5 * s}px Vazirmatn, sans-serif`;
  ctx.fillStyle = "rgba(247,241,229,0.6)";
  ctx.fillText("ارتفاع کم", signX + signW / 2, signY + 32 * s);
  ctx.restore();
  // hanging warning light
  ctx.fillStyle = "#ffb35c";
  ctx.beginPath();
  ctx.arc(o.x + o.w / 2, bottom - 26 * s, 3.5 * s, 0, TAU);
  ctx.fill();
}

/* ------------------------------------------------------------------ */
/* Pickups                                                             */
/* ------------------------------------------------------------------ */

function drawPickups(ctx: CanvasRenderingContext2D, world: World) {
  const s = world.view.s;
  for (const p of world.pickups) {
    if (p.x < -80 || p.x > world.view.w + 300) continue;
    const bob = Math.sin(world.t * 3 + p.seed * 6) * 4 * s;
    if (p.kind === "fish" || p.kind === "gold") {
      drawFish(ctx, p.x, p.baseY + bob, 24 * s, world.t, p.seed, p.kind === "gold");
    } else if (p.kind === "yarn") {
      drawYarn(ctx, p.x, p.baseY + bob, 18 * s, world.t);
    } else {
      drawBell(ctx, p.x, p.baseY + bob, 17 * s, world.t);
    }
  }
}

function drawFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  t: number,
  seed: number,
  gold: boolean,
) {
  const pulse = 0.65 + Math.sin(t * 4 + seed * 9) * 0.35;
  const glowColor = gold ? "255,179,92" : "255,107,74";
  const glow = ctx.createRadialGradient(x, y, 2, x, y, r * 2.4);
  glow.addColorStop(0, `rgba(${glowColor},${0.24 * pulse + 0.08})`);
  glow.addColorStop(1, `rgba(${glowColor},0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 2.2 + seed) * 0.14);
  // tail
  ctx.fillStyle = gold ? "#ffd694" : "#ffa06a";
  ctx.beginPath();
  ctx.moveTo(r * 0.55, 0);
  ctx.lineTo(r * 1.32, -r * 0.62);
  ctx.lineTo(r * 1.2, r * 0.6);
  ctx.closePath();
  ctx.fill();
  // body
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  if (gold) {
    grad.addColorStop(0, "#ffe9b8");
    grad.addColorStop(0.5, "#ffbe63");
    grad.addColorStop(1, "#e7973e");
  } else {
    grad.addColorStop(0, "#ffc08f");
    grad.addColorStop(0.5, "#ff7f57");
    grad.addColorStop(1, "#e2573b");
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.62, 0, 0, TAU);
  ctx.fill();
  // fin
  ctx.fillStyle = gold ? "#fff1cf" : "#ffd2b1";
  ctx.beginPath();
  ctx.moveTo(-r * 0.25, -r * 0.48);
  ctx.lineTo(r * 0.16, -r * 0.95);
  ctx.lineTo(r * 0.36, -r * 0.3);
  ctx.closePath();
  ctx.fill();
  // shine
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, -2.4, -1.3);
  ctx.stroke();
  // eye
  ctx.fillStyle = "#16211b";
  ctx.beginPath();
  ctx.arc(-r * 0.5, -r * 0.12, r * 0.14, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-r * 0.53, -r * 0.17, r * 0.05, 0, TAU);
  ctx.fill();
  ctx.restore();

  // sparkle
  const sp = 0.5 + Math.sin(t * 5 + seed * 4) * 0.5;
  ctx.fillStyle = gold ? "#fff3d2" : "#ffe8d5";
  ctx.globalAlpha = 0.35 + sp * 0.55;
  starPath(ctx, x + r * 0.8, y - r * 0.9, r * 0.3 + sp * r * 0.12, 4);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawYarn(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  const glow = ctx.createRadialGradient(x, y, 2, x, y, r * 2.4);
  glow.addColorStop(0, "rgba(158,232,198,0.35)");
  glow.addColorStop(1, "rgba(158,232,198,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 2 + x) * 0.25);
  ctx.fillStyle = "#7ddcb6";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(16,44,35,0.5)";
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.85, r * 0.34, (i * Math.PI) / 3, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = "#d9fff0";
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.35, r * 0.22, 0, TAU);
  ctx.fill();
  // wavering thread
  ctx.strokeStyle = "rgba(158,232,198,0.7)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(r * 0.8, r * 0.5);
  ctx.bezierCurveTo(r * 1.8, r * 0.9, r * 1.2, r * 1.8, r * 2.1, r * 1.7);
  ctx.stroke();
  ctx.restore();
}

function drawBell(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  const glow = ctx.createRadialGradient(x, y, 2, x, y, r * 2.5);
  glow.addColorStop(0, "rgba(255,179,92,0.38)");
  glow.addColorStop(1, "rgba(255,179,92,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.5, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 2.5 + x * 0.1) * 0.18);
  ctx.fillStyle = "#ffcf82";
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.55);
  ctx.quadraticCurveTo(-r * 0.9, -r * 0.7, 0, -r * 0.85);
  ctx.quadraticCurveTo(r * 0.9, -r * 0.7, r, r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffe9bd";
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.8, r * 0.22, r * 0.16, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#c98733";
  ctx.beginPath();
  ctx.arc(0, r * 0.66, r * 0.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#ffb35c";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, -r * 0.1, r * 0.55, 0.4, 2.6);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Cat                                                                 */
/* ------------------------------------------------------------------ */

function catRect(world: World) {
  const s = world.view.s;
  const slide = world.cat.slide > 0 && world.cat.grounded;
  const h = (slide ? 34 : 72) * s;
  return {
    x: world.cat.x - 32 * s,
    y: world.cat.y - h,
    w: 62 * s,
    h,
  };
}

/** The low caution beam is the only solid part of the scaffolding. */
function obstacleRect(world: World, kind: Obstacle["kind"], x: number, y: number, w: number, h: number) {
  const s = world.view.s;
  if (kind === "scaffold") {
    return { x: x + 4 * s, y: y + h - 46 * s, w: w - 8 * s, h: 46 * s };
  }
  return {
    x: x + 5 * s,
    y: y + 4 * s,
    w: w - 10 * s,
    h: h - 5 * s,
  };
}

function drawCatAndShadow(ctx: CanvasRenderingContext2D, world: World) {
  const { view, cat } = world;
  const s = view.s;
  const ready = world.phase === "ready";
  const over = world.phase === "over";

  // Shadow
  const heightAbove = Math.max(0, view.groundY - cat.y);
  const shrink = clamp(1 - heightAbove / (420 * s), 0.35, 1);
  if (!ready && !over) {
    ctx.fillStyle = `rgba(0,0,0,${0.32 * shrink})`;
    ctx.beginPath();
    ctx.ellipse(cat.x, view.groundY + 5 * s, 30 * s * shrink, 7 * s * shrink, 0, 0, TAU);
    ctx.fill();
  }

  const catScale = s * 1.34;
  if (ready) {
    // Title scene: an oversized cat waiting on a crate.
    // Park the mascot in the empty lower corner so the UI cards stay unobstructed.
    const cx = view.w < 768 ? view.w * 0.78 : Math.max(112 * s, view.w * 0.085);
    const crateY = view.groundY + 4 * s;
    const titleScale = view.w < 768 ? 1.32 : 1.52;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, crateY + 2 * s, 92 * s, 14 * s, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#2c3a4a";
    roundRect(ctx, cx - 70 * s, crateY - 48 * s, 140 * s, 48 * s, 4 * s);
    ctx.fill();
    ctx.fillStyle = "rgba(247,241,229,0.12)";
    ctx.fillRect(cx - 70 * s, crateY - 40 * s, 140 * s, 2 * s);
    ctx.fillRect(cx - 70 * s, crateY - 20 * s, 140 * s, 2 * s);
    ctx.save();
    ctx.translate(cx, crateY - 46 * s);
    drawCatFigure(ctx, {
      pose: "sit",
      scale: titleScale * s,
      t: world.t,
      runT: world.t,
      squash: 1,
      rot: 0,
      blink: cat.blink,
      zoom: false,
    });
    ctx.restore();
    drawDizzyStars(ctx, cx + 30 * s, crateY - 150 * s * titleScale, world.t, false);
    return;
  }

  if (over) {
    ctx.save();
    ctx.translate(cat.x, view.groundY);
    drawCatFigure(ctx, {
      pose: "sit",
      scale: 1.5 * s,
      t: world.t,
      runT: 0,
      squash: 1,
      rot: 0,
      blink: 1,
      zoom: false,
    });
    ctx.restore();
    drawDizzyStars(ctx, cat.x + 14 * s, view.groundY - 104 * s, world.t, true);
    return;
  }

  if (world.zoomies > 0) {
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.1 - i * 0.02;
      ctx.fillStyle = i % 2 === 0 ? "#9ee8c6" : "#ffb35c";
      ctx.beginPath();
      ctx.ellipse(
        cat.x - (i + 1) * 20 * s,
        cat.y - 30 * s + Math.sin(world.t * 9 + i) * 4 * s,
        30 * s,
        20 * s,
        0,
        0,
        TAU,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const aura = ctx.createRadialGradient(cat.x, cat.y - 30 * s, 4, cat.x, cat.y - 30 * s, 100 * s);
    aura.addColorStop(0, "rgba(158,232,198,0.2)");
    aura.addColorStop(1, "rgba(158,232,198,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cat.x, cat.y - 30 * s, 100 * s, 0, TAU);
    ctx.fill();
  }

  const pose: "run" | "air" | "slide" =
    world.phase === "dying"
      ? "air"
      : cat.slide > 0 && cat.grounded
        ? "slide"
        : !cat.grounded
          ? "air"
          : "run";

  const catPivot = 38 * catScale;
  ctx.save();
  ctx.translate(cat.x, cat.y);
  if (cat.rot) {
    ctx.translate(0, -catPivot);
    ctx.rotate(cat.rot);
    ctx.translate(0, catPivot);
  }
  drawCatFigure(ctx, {
    pose,
    scale: catScale,
    t: world.t,
    runT: cat.runT,
    squash: cat.squash,
    rot: 0,
    blink: cat.blink,
    zoom: world.zoomies > 0,
  });
  ctx.restore();

  if (world.shield) {
    const pulse = 0.75 + Math.sin(world.t * 5) * 0.25;
    const sy = cat.y - 38 * catScale;
    ctx.strokeStyle = `rgba(255,211,137,${0.4 + pulse * 0.35})`;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.ellipse(cat.x + 6 * s, sy, 50 * s, 54 * s, 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,211,137,${0.04 + pulse * 0.04})`;
    ctx.beginPath();
    ctx.ellipse(cat.x + 6 * s, sy, 50 * s, 54 * s, 0, 0, TAU);
    ctx.fill();
  }

  if (world.phase === "dying") drawDizzyStars(ctx, cat.x, cat.y - 90 * catScale, world.t, true);
}

function drawDizzyStars(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, active: boolean) {
  if (!active) return;
  for (let i = 0; i < 3; i++) {
    const a = t * 2.6 + (i * TAU) / 3;
    const px = x + Math.cos(a) * 22;
    const py = y + Math.sin(a) * 6;
    ctx.fillStyle = i === 0 ? "#ffb35c" : i === 1 ? "#9ee8c6" : "#f7f1e5";
    ctx.globalAlpha = 0.85;
    starPath(ctx, px, py, 4.2, 5);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

interface CatDrawOptions {
  pose: "run" | "air" | "slide" | "sit";
  scale: number;
  t: number;
  runT: number;
  squash: number;
  rot: number;
  blink: number;
  zoom: boolean;
}

function drawCatFigure(ctx: CanvasRenderingContext2D, o: CatDrawOptions) {
  const sy = o.squash;
  const sx = 1 + (1 - sy) * 0.45;
  ctx.save();
  ctx.scale(o.scale * sx, o.scale * sy);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const run = o.runT * 14;
  if (o.pose === "run") drawRunCat(ctx, run, o);
  else if (o.pose === "air") drawAirCat(ctx, o);
  else if (o.pose === "slide") drawSlideCat(ctx, o);
  else drawSitCat(ctx, o);

  ctx.restore();
}

function drawEarsAndHead(
  ctx: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  o: CatDrawOptions,
  earBack: number,
  eyeWide = false,
  faceRight = true,
) {
  const dir = faceRight ? 1 : -1;
  ctx.save();
  ctx.translate(headX, headY);
  ctx.scale(dir, 1);
  // ears
  ctx.fillStyle = CAT.fur;
  ctx.beginPath();
  ctx.moveTo(-13, 4);
  ctx.lineTo(-17 + earBack * 7, -18 + earBack * 4);
  ctx.lineTo(-1, -7);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -6);
  ctx.lineTo(15 + earBack * 6, -19 + earBack * 3);
  ctx.lineTo(15, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CAT.pink;
  ctx.beginPath();
  ctx.moveTo(-11, 2);
  ctx.lineTo(-14 + earBack * 5, -13 + earBack * 3);
  ctx.lineTo(-4, -5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(7, -5);
  ctx.lineTo(14 + earBack * 4, -14 + earBack * 2);
  ctx.lineTo(13, 0);
  ctx.closePath();
  ctx.fill();
  // head
  const grad = ctx.createLinearGradient(0, -14, 0, 16);
  grad.addColorStop(0, CAT.furLight);
  grad.addColorStop(1, CAT.fur);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 14.5, 0, 0, TAU);
  ctx.fill();
  // forehead stripes
  ctx.strokeStyle = CAT.stripe;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-3, -12);
  ctx.lineTo(-2, -6);
  ctx.moveTo(3, -13);
  ctx.lineTo(3, -7);
  ctx.stroke();
  // muzzle
  ctx.fillStyle = CAT.cream;
  ctx.beginPath();
  ctx.ellipse(9, 5, 9, 6.5, 0.06, 0, TAU);
  ctx.fill();
  // eye
  if (o.blink > 0.45) {
    ctx.strokeStyle = CAT.pupil;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(4, -1, 4.5, 0.25, Math.PI - 0.25);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#20352b";
    ctx.beginPath();
    ctx.ellipse(4, -1, eyeWide ? 5.6 : 4.6, eyeWide ? 6.4 : 5.4, -0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = CAT.eye;
    ctx.beginPath();
    ctx.ellipse(4.4, -0.6, eyeWide ? 4.2 : 3.4, eyeWide ? 5 : 4.1, -0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = CAT.pupil;
    ctx.beginPath();
    ctx.ellipse(5, -0.5, 1.4, eyeWide ? 4 : 3.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(3, -2.6, 1.25, 0, TAU);
    ctx.fill();
  }
  // nose + mouth
  ctx.fillStyle = CAT.pink;
  ctx.beginPath();
  ctx.moveTo(14, 2.2);
  ctx.lineTo(18, 2.2);
  ctx.lineTo(16, 4.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(88,52,35,0.7)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(16, 4.8);
  ctx.quadraticCurveTo(14, 7.4, 11.5, 6.6);
  ctx.moveTo(16, 4.8);
  ctx.quadraticCurveTo(18, 7.2, 20, 6.2);
  ctx.stroke();
  // whiskers
  ctx.strokeStyle = "rgba(255,240,220,0.85)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(15, 4 + i * 1.2);
    ctx.quadraticCurveTo(25, 2 + i * 3.4, 32, -1 + i * 4.4);
    ctx.stroke();
  }
  ctx.restore();

  // scarf around neck, with a little wind flutter
  const flutter = o.pose === "sit" ? Math.sin(o.t * 2.4) * 1.4 : Math.sin(o.runT * 22) * 3.2;
  const scarfGrad = ctx.createLinearGradient(headX - 20, headY + 10, headX + 18, headY + 16);
  scarfGrad.addColorStop(0, CAT.scarfDark);
  scarfGrad.addColorStop(1, CAT.scarf);
  ctx.fillStyle = scarfGrad;
  ctx.beginPath();
  ctx.ellipse(headX - 4, headY + 13, 15, 4.6, -0.08, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(headX - 10, headY + 13);
  ctx.quadraticCurveTo(headX - 22, headY + 16 + flutter, headX - 30, headY + 12 + flutter * 1.5);
  ctx.lineTo(headX - 16, headY + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CAT.scarfDark;
  ctx.beginPath();
  ctx.moveTo(headX - 18, headY + 10);
  ctx.lineTo(headX - 28, headY + 8 + flutter);
  ctx.lineTo(headX - 23, headY + 16 + flutter);
  ctx.closePath();
  ctx.fill();
}

function drawRunCat(ctx: CanvasRenderingContext2D, run: number, o: CatDrawOptions) {
  const step = Math.sin(run);
  const step2 = Math.sin(run + Math.PI);
  const bob = Math.abs(Math.cos(run)) * 1.6;
  ctx.translate(0, -bob);
  const tailWave = Math.sin(o.runT * 7) * 7;

  // Tail
  ctx.strokeStyle = CAT.furDark;
  ctx.lineWidth = 8.5;
  ctx.beginPath();
  ctx.moveTo(-22, -32);
  ctx.bezierCurveTo(-40, -40, -50 + tailWave, -54, -37 + tailWave, -67);
  ctx.stroke();
  ctx.strokeStyle = CAT.fur;
  ctx.lineWidth = 5.6;
  ctx.beginPath();
  ctx.moveTo(-22, -32);
  ctx.bezierCurveTo(-40, -40, -50 + tailWave, -54, -37 + tailWave, -67);
  ctx.stroke();
  ctx.strokeStyle = CAT.stripe;
  ctx.lineWidth = 5.6;
  for (const p of [0.45, 0.7, 0.9]) {
    const tx = -22 + (-37 + tailWave + 22) * p;
    const ty = -32 + -35 * p + Math.sin(p * 4) * 4;
    ctx.beginPath();
    ctx.moveTo(tx - 3, ty);
    ctx.lineTo(tx + 3, ty + 1);
    ctx.stroke();
  }

  // Back legs
  ctx.strokeStyle = CAT.furDark;
  ctx.lineWidth = 7.5;
  leg(ctx, -19, -25, -19 + step * 9, -3, -0.4);
  leg(ctx, -11, -24, -11 + step2 * 8, -3, 0.4);

  // Body
  const bodyGrad = ctx.createLinearGradient(0, -48, 0, -16);
  bodyGrad.addColorStop(0, CAT.furLight);
  bodyGrad.addColorStop(0.7, CAT.fur);
  bodyGrad.addColorStop(1, CAT.furDark);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(-1, -34, 29, 16, -0.04, 0, TAU);
  ctx.fill();
  ctx.fillStyle = CAT.cream;
  ctx.beginPath();
  ctx.ellipse(4, -26, 17, 7.5, -0.08, 0, TAU);
  ctx.fill();
  // stripes
  ctx.strokeStyle = CAT.stripe;
  ctx.lineWidth = 2.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-15 + i * 9, -30, 10, -2.3, -1.15);
    ctx.stroke();
  }

  // Front legs
  ctx.strokeStyle = CAT.fur;
  ctx.lineWidth = 7;
  leg(ctx, 14, -27, 14 + step2 * 9, -3, 0.4);
  leg(ctx, 21, -27, 21 + step * 9, -3, -0.3);
  ctx.fillStyle = CAT.cream;
  ctx.beginPath();
  ctx.arc(14 + step2 * 9, -2.4, 3.6, 0, TAU);
  ctx.arc(21 + step * 9, -2.4, 3.6, 0, TAU);
  ctx.fill();

  drawEarsAndHead(ctx, 24, -50, o, 0, false);
}

function leg(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, bend: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo((x1 + x2) / 2 + bend * 9, (y1 + y2) / 2, x2, y2);
  ctx.stroke();
}

function drawAirCat(ctx: CanvasRenderingContext2D, o: CatDrawOptions) {
  const up = Math.sin(o.runT * 30) * 1.5;
  ctx.translate(0, up);
  const tailWave = Math.sin(o.runT * 9) * 6;
  // Tail up
  ctx.strokeStyle = CAT.furDark;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-20, -36);
  ctx.bezierCurveTo(-36, -52, -46 + tailWave, -66, -30 + tailWave, -76);
  ctx.stroke();
  ctx.strokeStyle = CAT.fur;
  ctx.lineWidth = 5.2;
  ctx.beginPath();
  ctx.moveTo(-20, -36);
  ctx.bezierCurveTo(-36, -52, -46 + tailWave, -66, -30 + tailWave, -76);
  ctx.stroke();
  // back legs tucked
  ctx.strokeStyle = CAT.furDark;
  ctx.lineWidth = 7.5;
  leg(ctx, -18, -28, -27, -12, 0.8);
  leg(ctx, -10, -26, -17, -9, 0.5);
  // body
  const bodyGrad = ctx.createLinearGradient(0, -50, 0, -16);
  bodyGrad.addColorStop(0, CAT.furLight);
  bodyGrad.addColorStop(1, CAT.fur);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, -36, 30, 15, -0.12, 0, TAU);
  ctx.fill();
  ctx.fillStyle = CAT.cream;
  ctx.beginPath();
  ctx.ellipse(6, -28, 17, 7, -0.1, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = CAT.stripe;
  ctx.lineWidth = 2.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-14 + i * 9, -32, 10, -2.3, -1.3);
    ctx.stroke();
  }
  // front legs forward
  ctx.strokeStyle = CAT.fur;
  ctx.lineWidth = 7;
  leg(ctx, 14, -32, 33, -28, -0.5);
  leg(ctx, 19, -29, 37, -23, -0.2);
  ctx.fillStyle = CAT.cream;
  ctx.beginPath();
  ctx.arc(33, -28, 3.5, 0, TAU);
  ctx.arc(37, -23, 3.5, 0, TAU);
  ctx.fill();
  // belly fluff
  ctx.fillStyle = CAT.cream;
  ctx.beginPath();
  ctx.ellipse(2, -25, 12, 5, 0.05, 0, TAU);
  ctx.fill();
  drawEarsAndHead(ctx, 26, -49, o, -0.6, true);
}

function drawSlideCat(ctx: CanvasRenderingContext2D, o: CatDrawOptions) {
  const wiggle = Math.sin(o.t * 22) * 1.2;
  // Tail straight back
  ctx.strokeStyle = CAT.furDark;
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.moveTo(-24, -14);
  ctx.bezierCurveTo(-42, -12, -52, -22 + wiggle, -60, -14);
  ctx.stroke();
  ctx.strokeStyle = CAT.fur;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-24, -14);
  ctx.bezierCurveTo(-42, -12, -52, -22 + wiggle, -60, -14);
  ctx.stroke();
  // Body pancake
  const bodyGrad = ctx.createLinearGradient(0, -26, 0, 0);
  bodyGrad.addColorStop(0, CAT.furLight);
  bodyGrad.addColorStop(1, CAT.fur);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(-2, -14, 32, 13, -0.02, 0, TAU);
  ctx.fill();
  ctx.fillStyle = CAT.cream;
  ctx.beginPath();
  ctx.ellipse(2, -8, 19, 5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = CAT.stripe;
  ctx.lineWidth = 2.6;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(-15 + i * 12, -12, 9, -2.3, -1.2);
    ctx.stroke();
  }
  // tucked legs
  ctx.strokeStyle = CAT.fur;
  ctx.lineWidth = 6.5;
  leg(ctx, 12, -12, 28, -5, -0.4);
  ctx.fillStyle = CAT.cream;
  ctx.beginPath();
  ctx.arc(28, -4.5, 3.4, 0, TAU);
  ctx.fill();
  // Dust
  ctx.fillStyle = "rgba(247,241,229,0.16)";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-34 - i * 10, -4 - i * 3, 4 + i * 1.5, 0, TAU);
    ctx.fill();
  }
  drawEarsAndHead(ctx, 30, -22, o, 0.75, true);
}

function drawSitCat(ctx: CanvasRenderingContext2D, o: CatDrawOptions) {
  const breathe = Math.sin(o.t * 2) * 1.2;
  // tail curling around
  ctx.strokeStyle = CAT.furDark;
  ctx.lineWidth = 8.5;
  ctx.beginPath();
  ctx.moveTo(-20, -14);
  ctx.bezierCurveTo(-38, -4, -28, 4, -2, 1);
  ctx.bezierCurveTo(16, -1, 24, 0, 30, 2);
  ctx.stroke();
  ctx.strokeStyle = CAT.fur;
  ctx.lineWidth = 5.8;
  ctx.beginPath();
  ctx.moveTo(-20, -14);
  ctx.bezierCurveTo(-38, -4, -28, 4, -2, 1);
  ctx.bezierCurveTo(16, -1, 24, 0, 30, 2);
  ctx.stroke();
  // haunch
  const bodyGrad = ctx.createLinearGradient(0, -48, 0, 0);
  bodyGrad.addColorStop(0, CAT.furLight);
  bodyGrad.addColorStop(1, CAT.fur);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(-4, -18 + breathe * 0.3, 22, 19, 0, 0, TAU);
  ctx.fill();
  // chest
  ctx.beginPath();
  ctx.ellipse(6, -32 + breathe * 0.3, 15, 20, -0.1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = CAT.cream;
  ctx.beginPath();
  ctx.ellipse(10, -28 + breathe * 0.3, 8.5, 14, -0.1, 0, TAU);
  ctx.fill();
  // front paws
  ctx.fillStyle = CAT.fur;
  roundRect(ctx, 13, -12, 8, 12, 3.5);
  ctx.fill();
  roundRect(ctx, 2, -12, 8, 12, 3.5);
  ctx.fill();
  ctx.fillStyle = CAT.cream;
  roundRect(ctx, 14, -4, 7, 4.5, 2);
  ctx.fill();
  roundRect(ctx, 3, -4, 7, 4.5, 2);
  ctx.fill();
  // stripes
  ctx.strokeStyle = CAT.stripe;
  ctx.lineWidth = 2.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-16 + i * 5, -30, 11, -2.5, -1.4);
    ctx.stroke();
  }
  drawEarsAndHead(ctx, 11, -52 + breathe * 0.4, o, 0, false);
}

/* ------------------------------------------------------------------ */
/* Particles, text, foreground                                         */
/* ------------------------------------------------------------------ */

function drawParticles(ctx: CanvasRenderingContext2D, world: World) {
  for (const p of world.particles as Particle[]) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.kind === "ring") {
      ctx.globalAlpha = a * 0.7;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, 3 * a);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.4 - a), 0, TAU);
      ctx.stroke();
      continue;
    }
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.kind === "star") {
      starPath(ctx, p.x, p.y, p.size * (0.6 + a * 0.7), 5);
      ctx.fill();
    } else if (p.kind === "confetti") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.kind === "dust" ? 1.2 - a * 0.4 : a + 0.35), 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx: CanvasRenderingContext2D, world: World) {
  const s = world.view.s;
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  for (const t of world.texts as FloatText[]) {
    const a = clamp(t.life / t.max, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = `800 ${t.size * s}px Vazirmatn, sans-serif`;
    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = "rgba(8,11,17,0.7)";
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawForeground(ctx: CanvasRenderingContext2D, world: World) {
  const { w, h, groundY, s } = world.view;

  if (world.zoomies > 0) {
    ctx.save();
    for (let i = 0; i < 14; i++) {
      const seed = i * 4.13;
      const y = hash(seed + 2) * groundY;
      const x = (hash(seed) * w - (world.scroll * (1.4 + hash(seed + 5))) % w + w) % w;
      const len = (40 + hash(seed + 9) * 130) * s;
      const color = i % 3 === 0 ? "255,179,92" : "158,232,198";
      ctx.strokeStyle = `rgba(${color},${0.1 + hash(seed + 3) * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - len, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Baked shading: bottom fade, top readability gradient and vignette.
  const shade = world.bg?.shade;
  if (shade) {
    ctx.drawImage(shade, 0, 0, w, h);
  } else {
    const bottom = ctx.createLinearGradient(0, h - 150 * s, 0, h);
    bottom.addColorStop(0, "rgba(7,10,16,0)");
    bottom.addColorStop(1, "rgba(7,10,16,0.72)");
    ctx.fillStyle = bottom;
    ctx.fillRect(0, h - 150 * s, w, 150 * s);
  }
  void groundY;
}

export { catRect, obstacleRect };
