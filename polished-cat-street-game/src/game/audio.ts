/**
 * Tiny synthesized sound kit — no audio assets, zero network cost.
 * The context is created lazily on the first user gesture.
 */

type ToneOptions = {
  freq: number;
  to?: number;
  dur?: number;
  type?: OscillatorType;
  vol?: number;
  delay?: number;
  attack?: number;
};

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  unlock() {
    if (this.muted) return;
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      this.ctx = null;
      this.master = null;
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
    if (!muted) this.unlock();
  }

  private tone({ freq, to, dur = 0.14, type = "sine", vol = 0.2, delay = 0, attack = 0.006 }: ToneOptions) {
    if (this.muted || !this.ctx || !this.master) return;
    try {
      const ctx = this.ctx;
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(24, freq), start);
      if (to !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(24, to), start + dur);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(vol, start + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    } catch {
      /* audio is a bonus, never break the game */
    }
  }

  private noise(dur = 0.2, vol = 0.14, lowpass = 900) {
    if (this.muted || !this.ctx || !this.master) return;
    try {
      const ctx = this.ctx;
      const frames = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = lowpass;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start();
    } catch {
      /* noop */
    }
  }

  jump() {
    this.tone({ freq: 320, to: 640, dur: 0.16, type: "triangle", vol: 0.13 });
    this.tone({ freq: 640, to: 880, dur: 0.1, type: "sine", vol: 0.06, delay: 0.02 });
  }

  doubleJump() {
    this.tone({ freq: 520, to: 980, dur: 0.18, type: "triangle", vol: 0.12 });
    this.tone({ freq: 1040, to: 1400, dur: 0.12, type: "sine", vol: 0.05, delay: 0.03 });
  }

  slide() {
    this.noise(0.18, 0.1, 1500);
    this.tone({ freq: 220, to: 140, dur: 0.16, type: "sine", vol: 0.06 });
  }

  land(hard = false) {
    this.tone({ freq: hard ? 140 : 180, to: 90, dur: 0.1, type: "sine", vol: hard ? 0.14 : 0.07 });
    if (hard) this.noise(0.1, 0.06, 700);
  }

  collect(step = 0) {
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
    const note = scale[Math.min(scale.length - 1, step)];
    this.tone({ freq: note, dur: 0.11, type: "triangle", vol: 0.12 });
    this.tone({ freq: note * 2, dur: 0.08, type: "sine", vol: 0.04, delay: 0.01 });
  }

  gold() {
    this.tone({ freq: 880, to: 1320, dur: 0.16, type: "triangle", vol: 0.13 });
    this.tone({ freq: 1320, to: 1760, dur: 0.18, type: "sine", vol: 0.08, delay: 0.07 });
  }

  power() {
    this.tone({ freq: 392, to: 784, dur: 0.22, type: "sine", vol: 0.13 });
    this.tone({ freq: 587, to: 1175, dur: 0.26, type: "triangle", vol: 0.07, delay: 0.06 });
  }

  shield() {
    this.tone({ freq: 660, dur: 0.12, type: "sine", vol: 0.1 });
    this.tone({ freq: 990, dur: 0.2, type: "sine", vol: 0.09, delay: 0.09 });
  }

  shieldBreak() {
    this.noise(0.18, 0.12, 2400);
    this.tone({ freq: 880, to: 300, dur: 0.22, type: "square", vol: 0.07 });
  }

  zoomies() {
    [523, 659, 784, 1046].forEach((freq, i) =>
      this.tone({ freq, dur: 0.18, type: "triangle", vol: 0.1, delay: i * 0.06 }),
    );
  }

  smash() {
    this.noise(0.14, 0.14, 1100);
    this.tone({ freq: 160, to: 70, dur: 0.14, type: "sawtooth", vol: 0.06 });
  }

  hit() {
    this.noise(0.32, 0.24, 700);
    this.tone({ freq: 190, to: 52, dur: 0.4, type: "sawtooth", vol: 0.14 });
    this.tone({ freq: 96, to: 44, dur: 0.5, type: "sine", vol: 0.16, delay: 0.03 });
  }

  over() {
    [392, 329.63, 261.63, 196].forEach((freq, i) =>
      this.tone({ freq, dur: 0.32, type: "triangle", vol: 0.09, delay: 0.12 + i * 0.13 }),
    );
  }

  start() {
    [330, 440, 554, 660].forEach((freq, i) =>
      this.tone({ freq, dur: 0.14, type: "triangle", vol: 0.08, delay: i * 0.055 }),
    );
  }

  ui() {
    this.tone({ freq: 560, to: 700, dur: 0.06, type: "sine", vol: 0.05 });
  }
}

export const sfx = new Sfx();
