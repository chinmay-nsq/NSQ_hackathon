"use client";

import { useRef } from "react";
import { User, Users, Building2 } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";

const LOOP = [
  { label: "Employee", detail: "grows through daily quests", icon: User, metric: "+40 XP / quest" },
  { label: "Team", detail: "levels up together", icon: Users, metric: "4 resource types" },
  { label: "Company", detail: "unlocks new ground", icon: Building2, metric: "1 shared world" },
];

export function SolutionSection() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = scope.current;
      if (!section) return;

      gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=120%",
          scrub: 0.6,
          pin: true,
        },
      })
        .fromTo(".solution-head", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 })
        .fromTo(".solution-sub", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25 }, "-=0.1")
        .fromTo(
          ".loop-node",
          { opacity: 0, scale: 0.85, y: 20 },
          { opacity: 1, scale: 1, y: 0, duration: 0.35, stagger: 0.25 },
          "-=0.05"
        )
        .fromTo(
          ".loop-arrow",
          { scaleX: 0 },
          { scaleX: 1, duration: 0.3, stagger: 0.25, transformOrigin: "left center" },
          "<0.1"
        )
        .fromTo(
          ".loop-metric",
          { opacity: 0 },
          { opacity: 1, duration: 0.25, stagger: 0.25 },
          "<0.15"
        );

      return () => ScrollTrigger.getAll().forEach((t) => t.trigger === section && t.kill());
    },
    { scope }
  );

  return (
    <section
      id="solution"
      ref={scope}
      className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 sm:px-12"
    >
      <p className="solution-head font-mono text-xs uppercase tracking-[0.25em] text-coral">The Solution</p>
      <h2 className="solution-head mt-3 max-w-3xl font-display text-[clamp(2rem,6vw,4.2rem)] leading-[0.95] text-white">
        One loop. Everybody
        <br />
        wins together.
      </h2>
      <p className="solution-sub mt-5 max-w-lg text-base leading-relaxed text-white/50">
        No leaderboards pitting people against each other. Every level someone earns
        feeds directly into their team — and every team&apos;s progress feeds the company.
      </p>

      <div className="mt-16 flex flex-col items-start gap-6 sm:mt-20 sm:flex-row sm:items-center sm:gap-4">
        {LOOP.map((node, i) => (
          <div key={node.label} className="flex items-center gap-4">
            <div className="loop-node flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/3 px-7 py-6">
              <node.icon className="size-5 text-coral" strokeWidth={1.5} />
              <span className="font-display text-2xl text-white">{node.label}</span>
              <span className="max-w-[16ch] text-sm text-white/50">{node.detail}</span>
              <span className="loop-metric font-mono text-[11px] uppercase tracking-widest text-coral/70">
                {node.metric}
              </span>
            </div>
            {i < LOOP.length - 1 && (
              <span className="loop-arrow hidden h-px w-16 bg-gradient-to-r from-coral to-white/20 sm:block" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
