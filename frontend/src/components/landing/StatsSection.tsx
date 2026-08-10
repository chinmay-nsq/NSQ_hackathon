"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";

const STATS = [
  { value: 5, suffix: "", label: "AI companion species" },
  { value: 100, suffix: "%", label: "of adventures AI-generated" },
  { value: 4, suffix: "", label: "resource types teams grow" },
  { value: 1, suffix: "", label: "shared world per company" },
];

export function StatsSection() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = scope.current;
      if (!section) return;

      const counters = section.querySelectorAll<HTMLElement>(".stat-value");

      ScrollTrigger.create({
        trigger: section,
        start: "top 65%",
        once: true,
        onEnter: () => {
          gsap.fromTo(".stats-head", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });

          counters.forEach((el, i) => {
            const target = Number(el.dataset.value);
            const obj = { val: 0 };
            gsap.to(obj, {
              val: target,
              duration: 1.4,
              delay: i * 0.1,
              ease: "power2.out",
              onUpdate: () => {
                el.textContent = Math.round(obj.val).toString();
              },
            });
          });
          gsap.fromTo(
            ".stat-card",
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out" }
          );
        },
      });

      return () => ScrollTrigger.getAll().forEach((t) => t.trigger === section && t.kill());
    },
    { scope }
  );

  return (
    <section ref={scope} className="relative flex min-h-[70vh] flex-col justify-center px-6 sm:px-12">
      <p className="stats-head font-mono text-xs uppercase tracking-[0.25em] text-white/40">By the numbers</p>
      <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-10">
        {STATS.map((s) => (
          <div key={s.label} className="stat-card flex flex-col gap-1">
            <span className="font-display text-5xl text-white sm:text-6xl">
              <span className="stat-value" data-value={s.value}>
                0
              </span>
              {s.suffix}
            </span>
            <span className="max-w-[16ch] text-sm text-white/50">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
