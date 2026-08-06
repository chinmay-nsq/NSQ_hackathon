"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";

const SYMPTOMS = [
  "Surveys nobody reads the results of.",
  "Badges that stop meaning anything by week three.",
  "Leaderboards that only the top five care about.",
  "Recognition posts that scroll past in a feed.",
];

export function ProblemSection() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = scope.current;
      if (!section) return;

      const rows = section.querySelectorAll(".symptom-row");

      gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=120%",
          scrub: 0.6,
          pin: true,
        },
      })
        .fromTo(
          ".problem-head",
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.3 }
        )
        .fromTo(
          rows,
          { opacity: 0, x: -30 },
          { opacity: 1, x: 0, duration: 0.35, stagger: 0.18 },
          "-=0.1"
        )
        .to(rows, { opacity: 0.25, duration: 0.3 }, "+=0.3");

      return () => ScrollTrigger.getAll().forEach((t) => t.trigger === section && t.kill());
    },
    { scope }
  );

  return (
    <section ref={scope} className="relative flex min-h-screen flex-col justify-center px-6 sm:px-12">
      <p className="problem-head font-mono text-xs uppercase tracking-[0.25em] text-white/40">
        The Problem
      </p>
      <h2 className="problem-head mt-3 max-w-3xl font-display text-[clamp(2rem,6vw,4.2rem)] leading-[0.95] text-white">
        Most engagement tools engage nobody.
      </h2>

      <div className="mt-14 flex flex-col gap-5">
        {SYMPTOMS.map((s) => (
          <div key={s} className="symptom-row flex items-center gap-4 border-b border-white/10 pb-5">
            <span className="text-2xl text-white/20">—</span>
            <span className="max-w-xl text-xl text-white/60 sm:text-2xl">{s}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
