"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { MessageCircle, Brain, Bell } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";
import { ambientEngine } from "@/lib/audio/ambientEngine";
import { PETS } from "./petData";

const TRAITS = [
  { icon: MessageCircle, label: "Talks like a teammate, not a bot" },
  { icon: Brain, label: "Remembers what your team just shipped" },
  { icon: Bell, label: "Nudges at the right moment, never spams" },
];

export function CompanionSpotlight() {
  const scope = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const [species, setSpecies] = useState(PETS[0].species);
  const activePet = PETS.find((p) => p.species === species) ?? PETS[0];

  useGSAP(
    () => {
      const section = scope.current;
      if (!section) return;

      ScrollTrigger.create({
        trigger: section,
        start: "top 60%",
        once: true,
        onEnter: () => ambientEngine.playWhoosh("in"),
      });

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

      gsap.to(".spotlight-emoji", {
        y: -10,
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      return () => ScrollTrigger.getAll().forEach((t) => t.trigger === section && t.kill());
    },
    { scope }
  );

  function handleSpeciesChange(s: string) {
    if (s === species) return;
    ambientEngine.playTick();
    if (emojiRef.current) {
      gsap.fromTo(
        emojiRef.current,
        { opacity: 0, scale: 0.7, rotate: -12 },
        { opacity: 1, scale: 1, rotate: 0, duration: 0.5, ease: "back.out(1.8)" }
      );
    }
    setSpecies(s);
  }

  return (
    <section ref={scope} className="relative flex min-h-screen flex-col items-center justify-center px-6 sm:px-12">
      <div className="spotlight-content flex w-full max-w-5xl flex-col items-center gap-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/40">The Companion</p>
        <h2 className="max-w-2xl font-display text-[clamp(2rem,6vw,4rem)] leading-[0.95] text-white">
          An AI that&apos;s actually on your side.
        </h2>
        <p className="max-w-md text-lg leading-relaxed text-white/55">
          Coach, storyteller, and memory. It knows your streak, your team&apos;s goals, and exactly what
          to say on a Monday morning.
        </p>

        <div
          ref={emojiRef}
          className="spotlight-emoji relative flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80"
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${activePet.color}44, transparent 70%)` }}
          />
          <Image
            src={activePet.image}
            alt={activePet.name}
            fill
            sizes="(min-width: 640px) 320px, 256px"
            className="relative object-contain"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {PETS.map((pet) => {
            const isActive = species === pet.species;
            return (
              <button
                key={pet.species}
                type="button"
                data-cursor="magnetic"
                onClick={() => handleSpeciesChange(pet.species)}
                onMouseEnter={() => ambientEngine.playTick()}
                className="rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors hover:border-white/30"
                style={{
                  borderColor: isActive ? pet.color : undefined,
                  backgroundColor: isActive ? `${pet.color}22` : undefined,
                  color: isActive ? pet.color : undefined,
                }}
              >
                <span className={isActive ? "" : "text-white/50"}>{pet.species}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
