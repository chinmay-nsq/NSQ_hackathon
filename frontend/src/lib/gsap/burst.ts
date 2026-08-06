import { gsap } from "./registerPlugins";

const BURST_COLORS = [
  "var(--primary)",
  "var(--currency)",
  "var(--success)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Spawns a short-lived particle burst centered on `origin` (viewport coords) and cleans itself up. */
export function celebrationBurst(origin: { x: number; y: number }, count = 18) {
  if (typeof document === "undefined") return;

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;";
  document.body.appendChild(container);

  const particles: HTMLDivElement[] = [];
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    const size = 6 + Math.random() * 6;
    p.style.cssText = `
      position:absolute; left:${origin.x}px; top:${origin.y}px;
      width:${size}px; height:${size}px; border-radius:${Math.random() > 0.5 ? "50%" : "3px"};
      background:${BURST_COLORS[i % BURST_COLORS.length]};
      opacity:1; will-change:transform,opacity;
    `;
    container.appendChild(p);
    particles.push(p);
  }

  particles.forEach((p) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 140;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 40;

    gsap.to(p, {
      x: dx,
      y: dy,
      rotation: Math.random() * 360,
      opacity: 0,
      duration: 0.9 + Math.random() * 0.4,
      ease: "power2.out",
    });
  });

  gsap.delayedCall(1.6, () => container.remove());
}
