"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";
import { ambientEngine } from "@/lib/audio/ambientEngine";
import { Crystal } from "./Crystal";
import { PETS } from "./petData";

export function PetGallery() {
  const scope = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [brokenSpecies, setBrokenSpecies] = useState<string[]>([]);
  const [openSpecies, setOpenSpecies] = useState<string | null>(null);

  useGSAP(
    () => {
      const section = scope.current;
      if (!section) return;

      ScrollTrigger.create({
        trigger: section,
        start: "top 60%",
        once: true,
        onEnter: () => {
          ambientEngine.playWhoosh("in");
          gsap.fromTo(
            ".gallery-head > *",
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" }
          );
          gsap.fromTo(
            ".crystal-slot",
            { opacity: 0, y: 30, scale: 0.85 },
            { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1, ease: "back.out(1.6)" }
          );
        },
      });

      return () => ScrollTrigger.getAll().forEach((t) => t.trigger === section && t.kill());
    },
    { scope }
  );

  function handleBreak(species: string) {
    setBrokenSpecies((prev) => (prev.includes(species) ? prev : [...prev, species]));
    setOpenSpecies(species);
  }

  function handleToggle(species: string) {
    setOpenSpecies((prev) => (prev === species ? null : species));
  }

  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel) return;
      if (openSpecies) {
        gsap.fromTo(
          panel,
          { opacity: 0, y: -16, height: 0 },
          { opacity: 1, y: 0, height: "auto", duration: 0.5, ease: "power3.out" }
        );
      }
    },
    { dependencies: [openSpecies] }
  );

  const openPet = PETS.find((p) => p.species === openSpecies);

  return (
    <section ref={scope} className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 py-24 sm:px-12">
      <div className="gallery-head mb-16 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/40">Meet the Party</p>
        <h2 className="mt-3 font-display text-[clamp(2rem,6vw,4.2rem)] leading-[0.95] text-white">
          Three companions. Break the crystal to meet yours.
        </h2>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-white/50">
          Every companion has its own voice, its own instincts, and its own way of showing up
          for you. Click a crystal to find out who&apos;s waiting inside.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
        {PETS.map((pet) => (
          <div key={pet.species} className="crystal-slot">
            <Crystal
              pet={pet}
              broken={brokenSpecies.includes(pet.species)}
              open={openSpecies === pet.species}
              onBreak={() => handleBreak(pet.species)}
              onToggle={() => handleToggle(pet.species)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-hidden">
        {openPet && (
          <div
            ref={panelRef}
            className="mx-auto flex max-w-2xl flex-col items-center gap-3 rounded-2xl border px-8 py-8 text-center"
            style={{ borderColor: `${openPet.color}33`, background: `${openPet.color}0d` }}
          >
            <span
              className="font-mono text-[11px] uppercase tracking-widest"
              style={{ color: openPet.color }}
            >
              {openPet.title}
            </span>
            <h3 className="font-display text-3xl text-white sm:text-4xl">{openPet.name}</h3>
            <p className="max-w-lg text-base leading-relaxed text-white/60">{openPet.personality}</p>
            <p className="text-sm leading-relaxed text-white/40">{openPet.specialty}</p>
            <blockquote
              className="mt-2 border-l-2 pl-4 font-display text-lg italic text-white/70"
              style={{ borderColor: openPet.color }}
            >
              &ldquo;{openPet.quote}&rdquo;
            </blockquote>
          </div>
        )}
      </div>
    </section>
  );
}
