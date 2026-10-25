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

const MUSIC_BPM = 122;
const SIXTEENTH = 60 / MUSIC_BPM / 4;
const BASS_ROOTS = [110, 87.31, 130.81, 98]; // Am · F · C · G
const LEAD = [
  659.25, 0, 0, 783.99, 0, 0, 880, 0, 1046.5, 0, 0, 880, 0, 0, 783.99, 0,
  587.33, 0, 659.25, 0, 0, 0, 783.99, 0, 880, 0, 0, 783.99, 0, 0, 659.25, 0,
  659.25, 0, 0, 880, 0, 0, 1046.5, 0, 1174.66, 0, 0, 1046.5, 0, 0, 880, 0,
  783.99, 0, 659.25, 0, 0, 0, 587.33, 0, 659.25, 0, 0, 783.99, 0, 0, 880, 0,
];

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicNextTime = 0;
  private musicOrigin = 0;
  private musicRequested = false;
  private musicActive = false;
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
      if (!this.musicBus && this.ctx && this.master) {
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = 0;
        this.musicBus.connect(this.master);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      this.ctx = null;
      this.master = null;
      this.musicBus = null;
      this.musicActive = false;
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
    if (muted) {
      this.clearMusicTimer();
      this.musicActive = false;
      this.fadeMusicOut();
    } else {
      this.unlock();
      if (this.musicRequested) this.beginMusic();
    }
  }

  musicStart() {
    this.musicRequested = true;
    if (!this.muted) this.beginMusic();
  }

  musicStop() {
    this.musicRequested = false;
    this.clearMusicTimer();
    this.musicActive = false;
    this.fadeMusicOut();
  }

  private beginMusic() {
    if (this.muted || this.musicActive) return;
    this.unlock();
    const ctx = this.ctx;
    const bus = this.musicBus;
    if (!ctx || !bus) return;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(0.64, now + 0.55);
    this.musicStep = 0;
    this.musicNextTime = now + 0.12;
    this.musicOrigin = this.musicNextTime;
    this.musicActive = true;
    this.scheduleMusic();
    this.musicTimer = window.setInterval(this.scheduleMusic, 25);
  }

  private clearMusicTimer() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private fadeMusicOut() {
    if (!this.ctx || !this.musicBus) return;
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setTargetAtTime(0, now, 0.045);
  }

  private scheduleMusic = () => {
    const ctx = this.ctx;
    if (!ctx || !this.musicActive || this.muted) return;
    const horizon = ctx.currentTime + 0.12;
    while (this.musicNextTime < horizon) {
      this.scheduleMusicStep(this.musicStep, this.musicNextTime);
      this.musicStep = (this.musicStep + 1) % LEAD.length;
      this.musicNextTime += SIXTEENTH;
    }
  };

  private scheduleMusicStep(step: number, at: number) {
    const bus = this.musicBus;
    const ctx = this.ctx;
    if (!bus || !ctx) return;
    const delay = Math.max(0, at - ctx.currentTime);
    const beatStep = step % 16;
    const bar = Math.floor(step / 16);
    const root = BASS_ROOTS[bar] ?? BASS_ROOTS[0];

    // Four-on-the-floor pulse, soft offbeat hats and a clap on beats two and four.
    if (beatStep % 4 === 0) {
      this.tone({ freq: 132, to: 48, dur: 0.14, type: "sine", vol: 0.19, delay, attack: 0.003 }, bus);
      const beat = beatStep / 4;
      const bassRatio = beat === 1 ? 1.5 : beat === 3 ? 1.25 : 1;
      this.tone({ freq: root * bassRatio, to: root * bassRatio * 0.96, dur: 0.17, type: "triangle", vol: 0.11, delay: delay + 0.012, attack: 0.008 }, bus);
      if (beatStep === 4 || beatStep === 12) {
        this.noise(0.075, 0.035, 2600, delay, bus, "bandpass");
      }
    }
    if (beatStep % 2 === 0) {
      const hatVol = beatStep % 4 === 0 ? 0.012 : 0.022;
      this.noise(0.038, hatVol, 6800, delay, bus, "highpass");
    }

    // Warm chord stabs outline the Am–F–C–G loop; a bright pentatonic hook sits above it.
    if (beatStep === 0 || beatStep === 8) {
      const third = bar === 0 ? 2.4 : 2.52;
      const chord = [root * 2, root * third, root * 3];
      for (const freq of chord) {
        this.tone({ freq, dur: 0.27, type: "sine", vol: 0.026, delay, attack: 0.018 }, bus);
      }
    }
    const lead = LEAD[step];
    if (lead) {
      this.tone({ freq: lead, dur: 0.13, type: "triangle", vol: 0.085, delay, attack: 0.005 }, bus);
      this.tone({ freq: lead * 2, dur: 0.075, type: "sine", vol: 0.018, delay: delay + 0.012, attack: 0.003 }, bus);
    }
  }

  private rhythmAccent(double = false) {
    if (!this.musicActive || this.muted || !this.ctx || !this.musicBus) return;
    const now = this.ctx.currentTime;
    const beatDuration = 60 / MUSIC_BPM;
    const nearestBeat = Math.round((now - this.musicOrigin) / beatDuration);
    const beatAt = this.musicOrigin + nearestBeat * beatDuration;
    const offset = beatAt - now;
    // Keep jumping responsive: only nudge the musical accent when the beat is very close.
    const delay = offset > 0 && offset < 0.075 ? offset : 0;
    const notes = [783.99, 880, 1046.5, 1174.66];
    const note = notes[((nearestBeat % notes.length) + notes.length) % notes.length];
    this.tone({ freq: double ? note * 1.5 : note, to: double ? note * 1.9 : note * 1.16, dur: 0.13, type: "triangle", vol: double ? 0.09 : 0.065, delay, attack: 0.004 }, this.musicBus);
  }

  private tone({ freq, to, dur = 0.14, type = "sine", vol = 0.2, delay = 0, attack = 0.006 }: ToneOptions, destination: AudioNode | null = this.master) {
    if (this.muted || !this.ctx || !destination) return;
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
      gain.connect(destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    } catch {
      /* audio is a bonus, never break the game */
    }
  }

  private noise(
    dur = 0.2,
    vol = 0.14,
    frequency = 900,
    delay = 0,
    destination: AudioNode | null = this.master,
    filterType: BiquadFilterType = "lowpass",
  ) {
    if (this.muted || !this.ctx || !destination) return;
    try {
      const ctx = this.ctx;
      const start = ctx.currentTime + delay;
      const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = frequency;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      src.start(start);
    } catch {
      /* noop */
    }
  }

  jump() {
    this.tone({ freq: 320, to: 640, dur: 0.16, type: "triangle", vol: 0.13 });
    this.tone({ freq: 640, to: 880, dur: 0.1, type: "sine", vol: 0.06, delay: 0.02 });
    this.rhythmAccent();
  }

  doubleJump() {
    this.tone({ freq: 520, to: 980, dur: 0.18, type: "triangle", vol: 0.12 });
    this.tone({ freq: 1040, to: 1400, dur: 0.12, type: "sine", vol: 0.05, delay: 0.03 });
    this.rhythmAccent(true);
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
