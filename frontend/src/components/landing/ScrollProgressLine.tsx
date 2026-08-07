"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";

/** A thin fixed bar (top of viewport) that fills left-to-right as the visitor scrolls through the page. */
export function ScrollProgressLine() {
  const barRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const bar = barRef.current;
    if (!bar) return;

    const trigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        gsap.set(bar, { scaleX: self.progress });
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-40 h-[3px] bg-white/5">
      <div
        ref={barRef}
        className="h-full origin-left bg-coral"
        style={{ transform: "scaleX(0)", boxShadow: "0 0 8px 1px var(--coral)" }}
      />
    </div>
  );
}
