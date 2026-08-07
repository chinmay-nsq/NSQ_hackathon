import { gsap } from "./registerPlugins";

const COIN_TARGET_SELECTOR = "[data-coin-target]";

function spawnCoin(container: HTMLElement, x: number, y: number) {
  const coin = document.createElement("div");
  const size = 16 + Math.random() * 6;
  coin.style.cssText = `
    position:absolute; left:${x}px; top:${y}px;
    width:${size}px; height:${size}px; margin-left:${-size / 2}px; margin-top:${-size / 2}px;
    border-radius:50%; opacity:0; will-change:transform,opacity;
    background:radial-gradient(circle at 35% 30%, #ffe9a8, var(--currency) 55%, #a5730f 100%);
    box-shadow:0 0 8px 0 color-mix(in oklch, var(--currency) 70%, transparent), inset 0 1px 1px 0 rgba(255,255,255,0.6);
  `;
  container.appendChild(coin);
  return coin;
}

function pulseTarget(target: HTMLElement) {
  gsap.fromTo(target, { scale: 1 }, { scale: 1.18, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" });
}

/**
 * Spawns `count` small coin glyphs that arc between `from` and `to`
 * (viewport coords), shrinking and fading at whichever end they're flying
 * toward. Used for both directions: coins arriving at the balance (earning)
 * and coins leaving the balance (spending).
 */
function flyCoins(
  from: { x: number; y: number },
  to: { x: number; y: number },
  count: number,
  direction: "in" | "out",
  onArrive?: () => void
) {
  if (typeof document === "undefined") return;

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;";
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const startOffsetX = (Math.random() - 0.5) * 30;
    const startOffsetY = (Math.random() - 0.5) * 20;
    const startX = from.x + (direction === "in" ? startOffsetX : 0);
    const startY = from.y + (direction === "in" ? startOffsetY : 0);
    const coin = spawnCoin(container, startX, startY);

    const endOffsetX = direction === "out" ? (Math.random() - 0.5) * 30 : 0;
    const endOffsetY = direction === "out" ? (Math.random() - 0.5) * 20 : 0;
    const midX = from.x + (to.x - from.x) * (0.4 + Math.random() * 0.2);
    const midY = Math.min(from.y, to.y) - (80 + Math.random() * 60);
    const delay = i * 0.045 + Math.random() * 0.05;

    const tl = gsap.timeline({ delay });
    tl.to(coin, { opacity: 1, scale: 1, duration: 0.12, ease: "back.out(2)" })
      .to(coin, {
        left: midX,
        top: midY,
        rotation: (Math.random() - 0.5) * 180,
        duration: 0.35,
        ease: "power2.out",
      })
      .to(coin, {
        left: to.x + endOffsetX,
        top: to.y + endOffsetY,
        scale: direction === "in" ? 0.3 : 1,
        opacity: 0,
        rotation: (Math.random() - 0.5) * 360,
        duration: 0.3,
        ease: "power1.in",
        onComplete: onArrive,
      });
  }

  gsap.delayedCall(count * 0.045 + 1.2, () => container.remove());
}

/**
 * Coins fly FROM `origin` (e.g. an Approve button) TO the coin balance in
 * the top bar — the "gold collected" burst for earning coins. Falls back to
 * a no-op if no balance is mounted (e.g. a page without the shell chrome).
 *
 * `onCoinArrive` fires once per coin as it lands, so callers can bump a
 * counter in sync with the animation instead of jumping the number instantly.
 */
export function flyCoinsToBalance(origin: { x: number; y: number }, count = 8, onCoinArrive?: () => void) {
  const target = document.querySelector<HTMLElement>(COIN_TARGET_SELECTOR);
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const to = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

  flyCoins(origin, to, count, "in", () => {
    onCoinArrive?.();
    pulseTarget(target);
  });
}

/**
 * Coins fly FROM the coin balance in the top bar TO `destination` (e.g. a
 * Redeem button) — the spend counterpart, for purchases/redemptions. Falls
 * back to a no-op if no balance is mounted.
 */
export function flyCoinsFromBalance(destination: { x: number; y: number }, count = 8) {
  const source = document.querySelector<HTMLElement>(COIN_TARGET_SELECTOR);
  if (!source) return;

  const rect = source.getBoundingClientRect();
  const from = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

  pulseTarget(source);
  flyCoins(from, destination, count, "out");
}
