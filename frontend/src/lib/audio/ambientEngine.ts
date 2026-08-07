/**
 * Procedural sound-effects engine for the landing page — hover ticks, section
 * whooshes, the crystal charge-up hum, and the crystal-break crack. Does NOT
 * play any background music/drone; the real bg_music.mp3 track is handled by
 * musicEngine.ts.
 *
 * Must be started from a real user gesture (browser autoplay policy) — call
 * `ambientEngine.start()` from a click/keydown handler, not on mount.
 */

type EngineState = "uninitialized" | "running" | "muted";

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private state: EngineState = "uninitialized";

  // Lazily-created tremor oscillator, used for the hero crystal's charge-up hum.
  private chargeOsc: OscillatorNode | null = null;
  private chargeSub: OscillatorNode | null = null;
  private chargeFilter: BiquadFilterNode | null = null;
  private chargeGain: GainNode | null = null;
  private chargeLfo: OscillatorNode | null = null;
  private chargeLfoGain: GainNode | null = null;

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
    master.gain.value = 1;
    master.connect(ctx.destination);
    this.master = master;

    this.state = "running";
  }

  setMuted(muted: boolean) {
    if (!this.ctx || !this.master) return;
    const target = muted ? 0 : 1;
    this.master.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.4);
    this.state = muted ? "muted" : "running";
  }

  /** Fully tears down the engine — stops oscillators and closes the AudioContext. Call on unmount. */
  stop() {
    [this.chargeOsc, this.chargeSub, this.chargeLfo].forEach((osc) => {
      try {
        osc?.stop();
      } catch {
        // already stopped
      }
    });
    this.chargeOsc = null;
    this.chargeSub = null;
    this.chargeFilter = null;
    this.chargeGain = null;
    this.chargeLfo = null;
    this.chargeLfoGain = null;
    this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.state = "uninitialized";
  }

  /**
   * Drives a rising hum used for the hero crystal's charge-up as the visitor
   * scrolls toward the break point. `level` is 0 (silent) to 1 (peak, right
   * before explosion) — pitch, volume, and a gentle tremolo wobble all scale
   * with it. Uses filtered sine/triangle tones (not a raw sawtooth) so it
   * reads as a warm resonant hum rather than a harsh buzz.
   */
  setChargeIntensity(level: number) {
    if (!this.ctx || !this.master) return;
    const clamped = Math.max(0, Math.min(1, level));
    const ctx = this.ctx;

    if (clamped <= 0.001) {
      if (this.chargeGain) {
        this.chargeGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
      }
      return;
    }

    if (!this.chargeOsc) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 130;

      // An octave-down sine adds body without adding harshness.
      const sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.value = 65;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 500;
      filter.Q.value = 0.4;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      // A slow LFO modulating the gain creates a "vibrating" tremolo feel, not a flat tone.
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 5;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      osc.start();
      sub.start();
      lfo.start();

      this.chargeOsc = osc;
      this.chargeSub = sub;
      this.chargeFilter = filter;
      this.chargeGain = gain;
      this.chargeLfo = lfo;
      this.chargeLfoGain = lfoGain;
    }

    const now = ctx.currentTime;
    this.chargeGain!.gain.linearRampToValueAtTime(clamped * 0.07, now + 0.1);
    this.chargeOsc.frequency.linearRampToValueAtTime(130 + clamped * 50, now + 0.1);
    this.chargeSub!.frequency.linearRampToValueAtTime(65 + clamped * 25, now + 0.1);
    this.chargeFilter!.frequency.linearRampToValueAtTime(500 + clamped * 1400, now + 0.1);
    this.chargeLfo!.frequency.linearRampToValueAtTime(5 + clamped * 10, now + 0.1);
    this.chargeLfoGain!.gain.linearRampToValueAtTime(clamped * 0.035, now + 0.1);
  }

  /** Hard-stops the charge hum instantly (no fade tail) — call the moment the crystal breaks. */
  stopChargeIntensity() {
    if (!this.ctx || !this.chargeGain) return;
    const now = this.ctx.currentTime;
    // A very fast ramp instead of setValueAtTime — avoids an audible click
    // while still cutting the hum off well before the crack sound starts.
    this.chargeGain.gain.cancelScheduledValues(now);
    this.chargeGain.gain.setValueAtTime(this.chargeGain.gain.value, now);
    this.chargeGain.gain.linearRampToValueAtTime(0, now + 0.03);
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

  /** A sub-bass thump + sharp crack + secondary body crack + wide glass shimmer — used when a crystal breaks. `intensity` scales volume/duration for bigger breaks. */
  playCrystalCrack(intensity = 1) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const master = this.master;

    // Low sub-thump for weight/impact, arriving a beat before the crack.
    const thump = ctx.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(120, now);
    thump.frequency.exponentialRampToValueAtTime(30 / intensity, now + 0.18 * intensity);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(Math.min(0.11 * intensity, 0.22), now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22 * intensity);
    thump.connect(thumpGain);
    thumpGain.connect(master);
    thump.start(now);
    thump.stop(now + 0.25 * intensity);

    // Sharp high crack transient (the "snap").
    const crackDuration = 0.12;
    const bufferSize = ctx.sampleRate * crackDuration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const crackFilter = ctx.createBiquadFilter();
    crackFilter.type = "highpass";
    crackFilter.frequency.value = 1800;

    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.1, now + 0.05);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05 + crackDuration);

    noise.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(master);
    noise.start(now + 0.05);
    noise.stop(now + 0.05 + crackDuration);

    // Secondary lower-body crack, slightly delayed, for a two-stage "crack-crunch".
    const bodyBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const bodyData = bodyBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      bodyData[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const bodyNoise = ctx.createBufferSource();
    bodyNoise.buffer = bodyBuffer;
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = "bandpass";
    bodyFilter.frequency.value = 900;
    bodyFilter.Q.value = 0.8;
    const bodyGain = ctx.createGain();
    const bodyStart = now + 0.09;
    bodyGain.gain.setValueAtTime(0.07, bodyStart);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, bodyStart + 0.16);
    bodyNoise.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(master);
    bodyNoise.start(bodyStart);
    bodyNoise.stop(bodyStart + 0.18);

    // Wide shimmering sparkle spray for the shards flying apart.
    const sparkleFreqs = [3200, 2700, 2400, 2000, 1700, 1300];
    sparkleFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const start = now + 0.08 + i * 0.035;
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.55, start + 0.35);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.022, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);

      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + 0.45);
    });

    // Extra low rumble tail for big breaks (intensity > 1) — an explosion, not a snap.
    if (intensity > 1) {
      const rumbleDuration = 0.9 * intensity;
      const rumbleBufferSize = ctx.sampleRate * rumbleDuration;
      const rumbleBuffer = ctx.createBuffer(1, rumbleBufferSize, ctx.sampleRate);
      const rumbleData = rumbleBuffer.getChannelData(0);
      for (let i = 0; i < rumbleBufferSize; i++) {
        rumbleData[i] = (Math.random() * 2 - 1) * (1 - i / rumbleBufferSize);
      }
      const rumbleNoise = ctx.createBufferSource();
      rumbleNoise.buffer = rumbleBuffer;

      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = "lowpass";
      rumbleFilter.frequency.value = 220;

      const rumbleGain = ctx.createGain();
      const rumbleStart = now + 0.02;
      rumbleGain.gain.setValueAtTime(0.16 * Math.min(intensity, 2), rumbleStart);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, rumbleStart + rumbleDuration);

      rumbleNoise.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(master);
      rumbleNoise.start(rumbleStart);
      rumbleNoise.stop(rumbleStart + rumbleDuration);
    }
  }
}

export const ambientEngine = new AmbientEngine();
