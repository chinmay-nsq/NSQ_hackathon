/**
 * Procedural ambient audio engine for the landing page.
 *
 * A layered drone (3 detuned oscillators through a lowpass filter) that:
 *  - brightens (filter opens, gain rises slightly) as the visitor scrolls deeper
 *  - "lifts" in pitch on CTA hover, and resolves with a short chime on click
 *
 * Must be started from a real user gesture (browser autoplay policy) — call
 * `ambientEngine.start()` from a click/keydown handler, not on mount.
 */

type EngineState = "uninitialized" | "running" | "muted";

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private oscGains: GainNode[] = [];
  private state: EngineState = "uninitialized";
  private baseFreqs = [55, 55.5, 110]; // low drone root + slight detune + octave

  get isRunning() {
    return this.state === "running";
  }

  start() {
    if (this.ctx) {
      if (this.state === "muted") this.setMuted(false);
      return;
    }
    if (typeof window === "undefined") return;

    const AudioCtx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 1.2);
    this.master = master;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;
    filter.Q.value = 0.7;
    filter.connect(master);
    this.filter = filter;

    this.baseFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? "triangle" : "sawtooth";
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.value = i === 2 ? 0.35 : 0.5;

      osc.connect(gain);
      gain.connect(filter);
      osc.start();

      this.oscillators.push(osc);
      this.oscGains.push(gain);
    });

    this.state = "running";
  }

  setMuted(muted: boolean) {
    if (!this.ctx || !this.master) return;
    const target = muted ? 0 : 0.055;
    this.master.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.4);
    this.state = muted ? "muted" : "running";
  }

  /** progress: 0 (top of page) to 1 (bottom) — brightens the filter as the visitor scrolls deeper. */
  setScrollProgress(progress: number) {
    if (!this.ctx || !this.filter) return;
    const clamped = Math.max(0, Math.min(1, progress));
    const freq = 400 + clamped * 2200;
    this.filter.frequency.linearRampToValueAtTime(freq, this.ctx.currentTime + 0.3);
  }

  /** A subtle upward pitch "lift" while hovering an interactive element. */
  setHoverLift(active: boolean) {
    if (!this.ctx) return;
    const multiplier = active ? 1.015 : 1;
    this.oscillators.forEach((osc, i) => {
      const target = this.baseFreqs[i] * multiplier;
      osc.frequency.linearRampToValueAtTime(target, this.ctx!.currentTime + 0.25);
    });
  }

  /** A short bright confirmation chime, e.g. on CTA click. */
  playChime() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    [660, 880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.05, now + 0.02 + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6 + i * 0.05);

      osc.connect(gain);
      gain.connect(this.master!);
      osc.start(now + i * 0.05);
      osc.stop(now + 0.7 + i * 0.05);
    });
  }

  /** A soft, quiet tick for hover feedback on smaller interactive elements. */
  playTick() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 1040;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.03, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /** A soft filtered-noise whoosh — used on section-enter transitions during scroll. */
  playWhoosh(direction: "in" | "out" = "in") {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const duration = 0.7;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.9;
    const startFreq = direction === "in" ? 200 : 1800;
    const endFreq = direction === "in" ? 1800 : 200;
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.linearRampToValueAtTime(endFreq, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.035, now + duration * 0.3);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    noise.start(now);
    noise.stop(now + duration);
  }
}

export const ambientEngine = new AmbientEngine();
