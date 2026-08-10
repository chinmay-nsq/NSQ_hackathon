"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MessageCircle, Brain, Bell } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";
import { PETS } from "./petData";

const TRAITS = [
  { icon: MessageCircle, label: "Talks like a teammate, not a bot" },
  { icon: Brain, label: "Remembers what your team just shipped" },
  { icon: Bell, label: "Nudges at the right moment, never spams" },
];

const CYCLE_MS = 3200;

export function CompanionSpotlight() {
  const scope = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [petIndex, setPetIndex] = useState(0);
  const activePet = PETS[petIndex];

  useGSAP(
    () => {
      const section = scope.current;
      if (!section) return;

      gsap.fromTo(
        ".spotlight-content > *",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: section, start: "top 70%" },
        }
      );

      return () => ScrollTrigger.getAll().forEach((t) => t.trigger === section && t.kill());
    },
    { scope }
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setPetIndex((i) => (i + 1) % PETS.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, []);

  useGSAP(
    () => {
      if (!bubbleRef.current) return;
      gsap.fromTo(
        bubbleRef.current,
        { opacity: 0, y: 10, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" }
      );
    },
    { dependencies: [petIndex], scope }
  );

  return (
    <section ref={scope} className="relative flex min-h-screen flex-col items-center justify-center px-6 sm:px-12">
      <div className="spotlight-content flex w-full max-w-3xl flex-col items-center gap-10 text-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/40">The Companion</p>
          <h2 className="mt-3 max-w-2xl font-display text-[clamp(2rem,6vw,4rem)] leading-[0.95] text-white">
            An AI that&apos;s actually on your side.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-white/55">
            Coach, storyteller, and memory. It knows your streak, your team&apos;s goals, and exactly what
            to say on a Monday morning.
          </p>
        </div>

        <div className="flex w-full max-w-md items-start gap-4 text-left">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
            <Image src={activePet.image} alt={activePet.name} fill sizes="56px" className="object-contain p-1" />
          </div>
          <div
            ref={bubbleRef}
            className="relative min-h-18 flex-1 rounded-2xl rounded-tl-sm border border-white/10 bg-white/4 px-5 py-4"
          >
            <p className="font-mono text-[0.65rem] uppercase tracking-widest" style={{ color: activePet.color }}>
              {activePet.name}
            </p>
            <p className="mt-1 text-base leading-snug text-white/80">{activePet.quote}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {TRAITS.map((t) => (
            <div key={t.label} className="flex flex-col items-center gap-2 px-2">
              <t.icon className="size-5 text-coral" strokeWidth={1.5} />
              <span className="max-w-[18ch] text-sm text-white/50">{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
