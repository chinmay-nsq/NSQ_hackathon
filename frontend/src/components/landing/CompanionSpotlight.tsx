"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";
import { CompanionViewer } from "@/components/companion3d/CompanionViewer";

const SPECIES = ["dragon", "robot", "fox", "owl", "panda"];

export function CompanionSpotlight() {
  const scope = useRef<HTMLDivElement>(null);
  const [species, setSpecies] = useState("dragon");

  useGSAP(
    () => {
      const section = scope.current;
      if (!section) return;

      gsap.fromTo(
        ".spotlight-content",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: section, start: "top 70%" },
        }
      );

      return () => ScrollTrigger.getAll().forEach((t) => t.trigger === section && t.kill());
    },
    { scope }
  );

  return (
    <section ref={scope} className="relative flex min-h-screen flex-col items-center justify-center px-6 sm:px-12">
      <div className="spotlight-content flex w-full max-w-5xl flex-col items-center gap-10 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/40">The Companion</p>
        <h2 className="max-w-2xl font-display text-[clamp(2rem,6vw,4rem)] leading-[0.95] text-white">
          An AI that&apos;s actually on your side.
        </h2>
        <p className="max-w-md text-lg leading-relaxed text-white/55">
          Coach, storyteller, and memory. It knows your streak, your team&apos;s goals, and exactly what
          to say on a Monday morning.
        </p>

        <div className="h-64 w-64 sm:h-80 sm:w-80">
          <CompanionViewer species={species} className="h-full w-full" />
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {SPECIES.map((s) => (
            <button
              key={s}
              type="button"
              data-cursor="magnetic"
              onClick={() => setSpecies(s)}
              className={`rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                species === s
                  ? "border-coral bg-coral/15 text-coral"
                  : "border-white/15 text-white/50 hover:border-white/30 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
