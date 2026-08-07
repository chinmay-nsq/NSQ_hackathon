"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { ambientEngine } from "@/lib/audio/ambientEngine";
import { CrystalScene } from "./CrystalScene";
import type { PetProfile } from "./petData";

export function Crystal({
  pet,
  broken,
  open,
  onBreak,
  onToggle,
}: {
  pet: PetProfile;
  broken: boolean;
  open: boolean;
  onBreak: () => void;
  onToggle: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const imageRevealRef = useRef<HTMLDivElement>(null);

  // Read every frame by CrystalScene — refs instead of state to stay at 60fps.
  const shakeRef = useRef(0);
  const intensityRef = useRef(0);
  const opacityRef = useRef(1);
  const explodedRef = useRef(false);
  const [breaking, setBreaking] = useState(false);

  useGSAP(
    () => {
      if (broken || !breaking) return;
      const imageWrap = imageWrapRef.current;
      if (!imageWrap) return;

      // A quick charge-up: shake amplitude ramps up over ~0.5s, then the gem bursts.
      const tl = gsap.timeline();
      tl.to(intensityRef, {
        current: 1,
        duration: 0.55,
        ease: "power2.in",
        onUpdate: () => {
          shakeRef.current = intensityRef.current * 1.4;
        },
      }).call(() => {
        explodedRef.current = true;
        gsap.to(imageWrap, { scale: 1.12, duration: 0.2, ease: "power2.out" });
        gsap.delayedCall(0.75, () => {
          onBreak();
        });
      });

      return () => {
        tl.kill();
      };
    },
    { scope: wrapRef, dependencies: [breaking, broken] }
  );

  useGSAP(
    () => {
      if (!broken || !imageRevealRef.current) return;
      gsap.fromTo(
        imageRevealRef.current,
        { scale: 0, rotate: -20, opacity: 0 },
        { scale: 1, rotate: 0, opacity: 1, duration: 0.6, ease: "back.out(2.2)" }
      );
    },
    { scope: wrapRef, dependencies: [broken] }
  );

  function handleClick() {
    if (broken) {
      onToggle();
      return;
    }
    if (breaking) return;
    setBreaking(true);
  }

  return (
    <div ref={wrapRef} className="relative flex flex-col items-center gap-4">
      <button
        type="button"
        data-cursor="magnetic"
        onClick={handleClick}
        onMouseEnter={() => !broken && ambientEngine.playTick()}
        className="group relative flex size-28 items-center justify-center sm:size-32"
        aria-label={broken ? `${pet.name}, revealed — toggle details` : `Reveal ${pet.name}`}
        aria-expanded={broken ? open : undefined}
      >
        {!broken && (
          <>
            <div
              ref={imageWrapRef}
              className="relative size-14 opacity-60 mix-blend-luminosity transition-all duration-300 group-hover:opacity-85 sm:size-16"
            >
              <Image src={pet.image} alt="" fill sizes="64px" className="object-contain" />
            </div>
            <div className="pointer-events-none absolute inset-0">
              <CrystalScene
                color={pet.color}
                shakeRef={shakeRef}
                intensityRef={intensityRef}
                opacityRef={opacityRef}
                explodedRef={explodedRef}
                shardCount={12}
                className="h-full w-full"
              />
            </div>
          </>
        )}
        {broken && (
          <div ref={imageRevealRef} className="relative size-24 sm:size-28">
            <Image src={pet.image} alt={pet.name} fill sizes="112px" className="object-contain" />
          </div>
        )}
      </button>
      <span
        className="font-mono text-xs uppercase tracking-widest transition-colors"
        style={{ color: broken ? pet.color : undefined }}
      >
        {broken ? pet.name : "???"}
      </span>
    </div>
  );
}
