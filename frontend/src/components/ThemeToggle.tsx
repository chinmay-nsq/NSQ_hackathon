"use client";

import { useRef } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { cn } from "@/lib/utils";

const DAY_COLORS = ["#ffb35a", "#ffe9a8", "#ff8a3d", "#fff3d6"];
const NIGHT_COLORS = ["#8b7bff", "#4ac4d9", "#c9b8ff", "#5a4ecb"];

/** Spawns a ring of star/ray glyphs that fly outward from `origin` and self-destruct. */
function spawnBurst(origin: { x: number; y: number }, toDark: boolean) {
  if (typeof document === "undefined") return;

  const colors = toDark ? NIGHT_COLORS : DAY_COLORS;
  const count = 16;

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;";
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const distance = 90 + Math.random() * 160;
    const isRay = !toDark;
    const size = isRay ? 3 + Math.random() * 3 : 4 + Math.random() * 5;
    const color = colors[i % colors.length];

    const glyph = document.createElement("div");
    glyph.style.cssText = `
      position:absolute; left:${origin.x}px; top:${origin.y}px;
      width:${isRay ? size * 6 : size}px; height:${size}px;
      margin-left:${isRay ? 0 : -size / 2}px; margin-top:${-size / 2}px;
      border-radius:${isRay ? "999px" : "50%"};
      background:${color};
      box-shadow:0 0 ${size * 2.5}px 0 ${color};
      opacity:1; will-change:transform,opacity;
      transform-origin:left center;
      transform:rotate(${(angle * 180) / Math.PI}deg);
    `;
    container.appendChild(glyph);

    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    gsap.fromTo(
      glyph,
      { scale: 0, opacity: 1 },
      {
        scale: 1,
        x: isRay ? dx * 0.3 : dx,
        y: isRay ? dy * 0.3 : dy,
        opacity: 0,
        duration: 1.6 + Math.random() * 0.6,
        ease: "power2.out",
        delay: Math.random() * 0.2,
      }
    );
  }

  gsap.delayedCall(2.8, () => container.remove());
}

/** Expanding shockwave ring racing outward from the button, ahead of the page-wide color wipe. */
function spawnShockwave(origin: { x: number; y: number }, color: string) {
  if (typeof document === "undefined") return;

  const ring = document.createElement("div");
  const maxSize = Math.hypot(window.innerWidth, window.innerHeight) * 1.4;
  ring.style.cssText = `
    position:fixed; left:${origin.x}px; top:${origin.y}px;
    width:0; height:0; margin-left:0; margin-top:0;
    border-radius:50%; border:2px solid ${color};
    pointer-events:none; z-index:9998; opacity:0.8;
    box-shadow:0 0 40px 0 ${color};
  `;
  document.body.appendChild(ring);

  gsap.to(ring, {
    width: maxSize,
    height: maxSize,
    marginLeft: -maxSize / 2,
    marginTop: -maxSize / 2,
    duration: 2,
    ease: "power1.inOut",
    onComplete: () => ring.remove(),
  });
  gsap.to(ring, {
    opacity: 0,
    duration: 0.6,
    delay: 1.4,
    ease: "power1.in",
  });
}

/**
 * Theme toggle with the full spectacle: a shockwave ring + sun-ray/star burst
 * explode from the button, a 3D flip morphs sun into moon (or back), and the
 * page itself wipes to the new theme via an iris-style View Transitions clip
 * with overshoot. Falls back to burst + flip only, no page wipe, in browsers
 * without View Transitions. Only ever rendered post-auth (see AppShell), so
 * `resolvedTheme` is already client-resolved by the time this mounts.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const btnRef = useRef<HTMLButtonElement>(null);
  const sunRef = useRef<HTMLSpanElement>(null);
  const moonRef = useRef<HTMLSpanElement>(null);

  function flipIcon(toDark: boolean) {
    const outgoing = toDark ? sunRef.current : moonRef.current;
    const incoming = toDark ? moonRef.current : sunRef.current;
    if (!outgoing || !incoming) return;

    gsap.killTweensOf([outgoing, incoming]);
    gsap.to(outgoing, {
      rotateY: 100,
      scale: 0.2,
      opacity: 0,
      filter: "blur(4px)",
      duration: 0.75,
      ease: "power2.in",
    });
    gsap.fromTo(
      incoming,
      { rotateY: -100, scale: 0.2, opacity: 0, filter: "blur(4px)" },
      {
        rotateY: 0,
        scale: 1,
        opacity: 1,
        filter: "blur(0px)",
        duration: 1.1,
        delay: 0.35,
        ease: "back.out(2.4)",
      }
    );
  }

  function punchButton() {
    if (!btnRef.current) return;
    gsap.fromTo(
      btnRef.current,
      { scale: 0.75 },
      { scale: 1, duration: 1.1, ease: "elastic.out(1.1, 0.4)" }
    );
  }

  function toggleTheme() {
    const toDark = resolvedTheme !== "dark";
    const next = toDark ? "dark" : "light";
    const accent = toDark ? NIGHT_COLORS[0] : DAY_COLORS[0];

    punchButton();
    flipIcon(toDark);

    if (!btnRef.current) {
      setTheme(next);
      return;
    }

    const rect = btnRef.current.getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    spawnBurst(origin, toDark);
    spawnShockwave(origin, accent);

    if (!document.startViewTransition) {
      setTheme(next);
      return;
    }

    const maxRadius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y)
    );

    const transition = document.startViewTransition(() => {
      setTheme(next);
    });

    transition.ready
      .then(() => {
        document.documentElement.animate(
          [
            { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`, offset: 0 },
            { clipPath: `circle(${maxRadius * 1.04}px at ${origin.x}px ${origin.y}px)`, offset: 0.88 },
            { clipPath: `circle(${maxRadius}px at ${origin.x}px ${origin.y}px)`, offset: 1 },
          ],
          {
            duration: 2200,
            easing: "cubic-bezier(0.65, 0, 0.35, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      })
      .catch(() => {});
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={toggleTheme}
      aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      style={{ perspective: "200px" }}
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60",
        "text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <span
        ref={sunRef}
        className="absolute flex items-center justify-center"
        style={{
          transformStyle: "preserve-3d",
          opacity: resolvedTheme === "dark" ? 1 : 0,
          transform: resolvedTheme === "dark" ? "rotateY(0deg)" : "rotateY(-100deg)",
        }}
      >
        <Sun className="size-4" />
      </span>
      <span
        ref={moonRef}
        className="absolute flex items-center justify-center"
        style={{
          transformStyle: "preserve-3d",
          opacity: resolvedTheme === "dark" ? 0 : 1,
          transform: resolvedTheme === "dark" ? "rotateY(100deg)" : "rotateY(0deg)",
        }}
      >
        <Moon className="size-4" />
      </span>
    </button>
  );
}
