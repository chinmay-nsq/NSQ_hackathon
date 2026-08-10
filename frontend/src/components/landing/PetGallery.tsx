"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";
import { PetCarousel } from "./PetCarousel";

export function PetGallery() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = scope.current;
      if (!section) return;

      ScrollTrigger.create({
        trigger: section,
        start: "top 60%",
        once: true,
        onEnter: () => {
          gsap.fromTo(
            ".gallery-head > *",
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" }
          );
          gsap.fromTo(
            ".gallery-carousel",
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
          );
        },
      });

      return () => ScrollTrigger.getAll().forEach((t) => t.trigger === section && t.kill());
    },
    { scope }
  );

  return (
    <section
      ref={scope}
      className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 py-24 sm:px-12"
    >
      <div className="gallery-head mb-16 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/40">Meet the Party</p>
        <h2 className="mt-3 font-display text-[clamp(2rem,6vw,4.2rem)] leading-[0.95] text-white">
          Seven companions. Find yours.
        </h2>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-white/50">
          Every companion has its own voice, its own instincts, and its own way of showing up
          for you. Browse the crystals to meet each one.
        </p>
      </div>

      <div className="gallery-carousel">
        <PetCarousel />
      </div>
    </section>
  );
}
