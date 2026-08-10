"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { ambientEngine } from "@/lib/audio/ambientEngine";
import { cn } from "@/lib/utils";
import { CrystalScene } from "./CrystalScene";
import { PETS, type PetProfile } from "./petData";

// Idle side-slot crystals never explode — a fixed ref satisfies CrystalScene's
// API without ever needing per-instance state.
const IDLE_SHAKE = { current: 0 };
const IDLE_INTENSITY = { current: 0.3 };
const IDLE_OPACITY = { current: 1 };
const IDLE_EXPLODED = { current: false };

function SideCrystal({
  pet,
  onSelect,
}: {
  pet: PetProfile;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-cursor="magnetic"
      onClick={onSelect}
      onMouseEnter={() => ambientEngine.playTick()}
      aria-label={`View ${pet.name}`}
      className="group relative flex size-20 shrink-0 items-center justify-center opacity-70 transition-opacity duration-300 hover:opacity-100 sm:size-24"
    >
      <div className="relative size-10 opacity-50 mix-blend-luminosity sm:size-12">
        <Image src={pet.image} alt="" fill sizes="48px" className="object-contain" />
      </div>
      <div className="pointer-events-none absolute inset-0">
        <CrystalScene
          color={pet.color}
          shakeRef={IDLE_SHAKE}
          intensityRef={IDLE_INTENSITY}
          opacityRef={IDLE_OPACITY}
          explodedRef={IDLE_EXPLODED}
          shardCount={0}
          className="h-full w-full"
        />
      </div>
    </button>
  );
}

export function PetCarousel() {
  const [centerIndex, setCenterIndex] = useState(0);
  const portraitRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  const centerPet = PETS[centerIndex];

  function goTo(index: number) {
    if (index === centerIndex) return;
    ambientEngine.playTick();
    setCenterIndex(((index % PETS.length) + PETS.length) % PETS.length);
  }

  useGSAP(
    () => {
      if (!portraitRef.current || !infoRef.current) return;
      gsap.fromTo(
        portraitRef.current,
        { opacity: 0, scale: 0.85, rotate: -6 },
        { opacity: 1, scale: 1, rotate: 0, duration: 0.5, ease: "back.out(1.8)" }
      );
      gsap.fromTo(
        infoRef.current.children,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power3.out", delay: 0.1 }
      );
    },
    { dependencies: [centerIndex] }
  );

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-center justify-center gap-2 sm:gap-4">
        <button
          type="button"
          data-cursor="magnetic"
          onClick={() => goTo(centerIndex - 1)}
          aria-label="Previous companion"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/50 transition-colors hover:border-white/30 hover:text-white"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex flex-1 items-center justify-center gap-1 overflow-hidden sm:gap-3">
          {PETS.map((pet, i) => {
            const offset = i - centerIndex;
            const isCenter = offset === 0;

            if (isCenter) {
              return (
                <div key={pet.species} ref={portraitRef} className="relative mx-1 flex flex-col items-center sm:mx-4">
                  <div
                    className="pointer-events-none absolute inset-0 rounded-full opacity-60 blur-3xl"
                    style={{ background: `radial-gradient(circle, ${pet.color}55, transparent 70%)` }}
                  />
                  <div className="relative size-40 sm:size-56">
                    <Image
                      src={pet.image}
                      alt={pet.name}
                      fill
                      sizes="(min-width: 640px) 224px, 160px"
                      priority
                      className="relative object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
                    />
                  </div>
                </div>
              );
            }

            // Only render the immediate neighbors' crystals — far-off pets
            // collapse to zero width instead of piling up off-screen.
            const visible = Math.abs(offset) <= 3;
            return (
              <div
                key={pet.species}
                className={cn(
                  "shrink-0 transition-all duration-300",
                  visible ? "w-20 opacity-100 sm:w-24" : "w-0 opacity-0"
                )}
              >
                {visible && <SideCrystal pet={pet} onSelect={() => goTo(i)} />}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          data-cursor="magnetic"
          onClick={() => goTo(centerIndex + 1)}
          aria-label="Next companion"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/50 transition-colors hover:border-white/30 hover:text-white"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div ref={infoRef} className="mt-8 flex max-w-xl flex-col items-center gap-3 text-center">
        <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: centerPet.color }}>
          {centerPet.title}
        </span>
        <h3 className="font-display text-3xl text-white sm:text-4xl">{centerPet.name}</h3>

        <div
          className="mt-1 flex items-center gap-2 rounded-full border px-4 py-1.5"
          style={{ borderColor: `${centerPet.color}44`, background: `${centerPet.color}14` }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: centerPet.color }}>
            Ability
          </span>
          <span className="text-sm font-medium text-white">{centerPet.ability}</span>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-white/50">{centerPet.abilityDescription}</p>

        <p className="mt-2 max-w-lg text-base leading-relaxed text-white/60">{centerPet.personality}</p>
        <p className="text-sm leading-relaxed text-white/40">{centerPet.specialty}</p>
        <blockquote
          className="mt-2 border-l-2 pl-4 font-display text-lg italic text-white/70"
          style={{ borderColor: centerPet.color }}
        >
          &ldquo;{centerPet.quote}&rdquo;
        </blockquote>

        <div className="mt-4 flex gap-1.5">
          {PETS.map((pet, i) => (
            <button
              key={pet.species}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to ${pet.name}`}
              className="size-1.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i === centerIndex ? centerPet.color : "rgba(255,255,255,0.2)",
                width: i === centerIndex ? "1.25rem" : "0.375rem",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
