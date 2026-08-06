"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap/registerPlugins";

/**
 * A custom dot-and-ring cursor that follows the pointer with easing, and
 * grows/dims over anything marked `data-cursor="magnetic"`. Desktop only —
 * bails out on touch devices via a pointer:fine media check.
 */
export function MagneticCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const ringPos = { x: 0, y: 0 };
    let raf: number;

    const onMove = (e: MouseEvent) => {
      gsap.set(dot, { x: e.clientX, y: e.clientY });
      ringPos.x = e.clientX;
      ringPos.y = e.clientY;
    };

    const tick = () => {
      gsap.to(ring, { x: ringPos.x, y: ringPos.y, duration: 0.35, ease: "power3.out" });
      raf = requestAnimationFrame(tick);
    };

    const onOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('[data-cursor="magnetic"]');
      if (target) {
        gsap.to(ring, { scale: 2.4, opacity: 0.5, duration: 0.3, ease: "power2.out" });
        gsap.to(dot, { scale: 0, duration: 0.2 });
      }
    };

    const onOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('[data-cursor="magnetic"]');
      if (target) {
        gsap.to(ring, { scale: 1, opacity: 1, duration: 0.3, ease: "power2.out" });
        gsap.to(dot, { scale: 1, duration: 0.2 });
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mouseout", onOut);
    raf = requestAnimationFrame(tick);

    document.documentElement.classList.add("has-custom-cursor");

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        className="pointer-events-none fixed left-0 top-0 z-[100] size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 mix-blend-difference"
        aria-hidden
      />
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[100] size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white mix-blend-difference"
        aria-hidden
      />
    </>
  );
}
