/**
 * Quiet looping background music for the landing page, backed by a real
 * audio file (public/bg_music.mp3). Routed through Web Audio so it shares
 * a graph with ambientEngine's SFX and can be gently filtered by scroll depth.
 *
 * Must be started from a real user gesture (browser autoplay policy).
 */

const TRACK_SRC = "/bg_music.mp3";
const TARGET_VOLUME = 0.16;

type MusicState = "uninitialized" | "running" | "muted";

class MusicEngine {
  private ctx: AudioContext | null = null;
  private element: HTMLAudioElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private state: MusicState = "uninitialized";

  get isRunning() {
    return this.state === "running";
  }

  start() {
    if (this.ctx) {
      if (this.state === "muted") this.setMuted(false);
      this.element?.play().catch(() => {});
      return;
    }
    if (typeof window === "undefined") return;

    const AudioCtx =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    const element = new Audio(TRACK_SRC);
    element.loop = true;
    element.crossOrigin = "anonymous";
    this.element = element;

    const source = ctx.createMediaElementSource(element);
    this.source = source;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(TARGET_VOLUME, ctx.currentTime + 2.5);
    this.master = master;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 4000;
    filter.Q.value = 0.3;
    filter.connect(master);
    this.filter = filter;

    source.connect(filter);

    element.play().catch(() => {});
    this.state = "running";
  }

  /** Fully tears down the engine — stops playback and closes the AudioContext. Call on unmount. */
  stop() {
    this.element?.pause();
    if (this.element) this.element.src = "";
    this.element = null;
    this.source = null;
    this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.filter = null;
    this.state = "uninitialized";
  }

  setMuted(muted: boolean) {
    if (!this.ctx || !this.master) return;
    const target = muted ? 0 : TARGET_VOLUME;
    this.master.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.6);
    this.state = muted ? "muted" : "running";
  }

  /** Brightens very subtly with scroll depth, mirroring ambientEngine but much subtler. */
  setScrollProgress(progress: number) {
    if (!this.ctx || !this.filter) return;
    const clamped = Math.max(0, Math.min(1, progress));
    const freq = 2200 + clamped * 3800;
    this.filter.frequency.linearRampToValueAtTime(freq, this.ctx.currentTime + 0.5);
  }
}

export const musicEngine = new MusicEngine();
