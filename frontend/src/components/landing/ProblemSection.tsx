"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";
import { ambientEngine } from "@/lib/audio/ambientEngine";

const SYMPTOMS = [
  { text: "Surveys nobody reads the results of.", week: "Week 1" },
  { text: "Badges that stop meaning anything by week three.", week: "Week 3" },
  { text: "Leaderboards that only the top five care about.", week: "Week 5" },
  { text: "Recognition posts that scroll past in a feed.", week: "Week 8" },
];

export function ProblemSection() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = scope.current;
      if (!section) return;

      const rows = section.querySelectorAll(".symptom-row");

      ScrollTrigger.create({
        trigger: section,
        start: "top 60%",
        once: true,
        onEnter: () => ambientEngine.playWhoosh("in"),
      });

      gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=140%",
          scrub: 0.6,
          pin: true,
        },
      })
        .fromTo(".problem-head", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 })
        .fromTo(".problem-sub", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25 }, "-=0.1")
        .fromTo(
          rows,
          { opacity: 0, x: -30 },
          { opacity: 1, x: 0, duration: 0.35, stagger: 0.18 },
          "-=0.1"
        )
        .fromTo(
          ".decay-line",
          { scaleX: 0 },
          { scaleX: 1, duration: 0.6, ease: "power1.inOut", transformOrigin: "left center" },
          "-=0.4"
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
      <p className="problem-sub mt-5 max-w-lg text-base leading-relaxed text-white/50">
        They all follow the same curve: a burst of interest at launch, then a slow fade
        as the novelty wears off and the mechanics start feeling like homework.
      </p>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_260px] lg:items-start lg:gap-10">
        <div className="flex flex-col gap-5">
          {SYMPTOMS.map((s) => (
            <div key={s.text} className="symptom-row flex items-center gap-4 border-b border-white/10 pb-5">
              <span className="w-16 shrink-0 font-mono text-[11px] uppercase tracking-widest text-white/30">
                {s.week}
              </span>
              <span className="max-w-xl text-xl text-white/60 sm:text-2xl">{s.text}</span>
            </div>
          ))}
        </div>

        <div className="hidden flex-col gap-2 lg:flex">
          <span className="font-mono text-[11px] uppercase tracking-widest text-white/30">
            Typical engagement curve
          </span>
          <svg viewBox="0 0 200 100" className="h-32 w-full overflow-visible">
            <path
              className="decay-line"
              d="M4,10 C60,15 90,70 196,92"
              fill="none"
              stroke="var(--coral)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
