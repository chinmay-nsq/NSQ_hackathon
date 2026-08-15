const POOL_SIZE = 4;
let pool: HTMLAudioElement[] | null = null;
let nextIndex = 0;

/** A small pool of preloaded <audio> instances so rapid repeated strikes don't cut each other off. */
function getPool(): HTMLAudioElement[] | null {
  if (typeof window === "undefined") return null;
  if (!pool) {
    pool = Array.from({ length: POOL_SIZE }, () => {
      const el = new Audio("/lightning.mp3");
      el.preload = "auto";
      return el;
    });
  }
  return pool;
}

/** Plays the real lightning-strike audio asset, round-robining across a small pool so overlapping strikes don't clip each other. */
export function playSparkSound(): void {
  const instances = getPool();
  if (!instances) return;

  const el = instances[nextIndex];
  nextIndex = (nextIndex + 1) % instances.length;

  el.currentTime = 0;
  void el.play();
}
