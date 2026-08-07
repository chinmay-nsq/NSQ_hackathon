"use client";

import { useRef } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";
import { ambientEngine } from "@/lib/audio/ambientEngine";
import { CrystalScene } from "./CrystalScene";

const CRYSTAL_COLOR = "#ff5a36"; // matches --coral

/**
 * The hero's companion, encased in a real Three.js glass crystal (refractive
 * gem + glowing core + drifting particles). As the visitor scrolls past the
 * hero, the gem shakes with rising amplitude and brightens, then bursts once
 * fully scrolled through — releasing the pin so scrolling continues.
 */
export function HeroCrystal({ sectionRef }: { sectionRef: React.RefObject<HTMLElement | null> }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const sceneWrapRef = useRef<HTMLDivElement>(null);

  // Read every frame by CrystalScene — refs instead of state to stay at 60fps.
  const shakeRef = useRef(0);
  const intensityRef = useRef(0);
  const opacityRef = useRef(1);
  const explodedRef = useRef(false);

  useGSAP(
    () => {
      // sectionRef is owned by the parent (HeroSection) and only gets attached
      // to the DOM once the parent's own render commits — which happens AFTER
      // this child's layout effect runs, so sectionRef.current is still null
      // here. wrapRef, by contrast, is this component's own root and is always
      // attached by the time useGSAP's scope fires, so walk up from it instead.
      const wrap = wrapRef.current;
      const section = sectionRef.current ?? wrap?.closest("section");
      const imageWrap = imageWrapRef.current;
      const sceneWrap = sceneWrapRef.current;
      if (!section || !imageWrap || !sceneWrap) {
        return;
      }

      function explode() {
        if (explodedRef.current) return;
        explodedRef.current = true;

        ambientEngine.stopChargeIntensity();
        ambientEngine.playCrystalCrack(2.2);

        // The character lunges forward as the shell gives way. The gem itself
        // breaks apart as real 3D shard geometry inside CrystalScene, driven
        // by explodedRef — no DOM/CSS shard overlay needed anymore.
        gsap.to(imageWrap, { scale: 1.12, duration: 0.2, ease: "power2.out" });
        gsap.fromTo(sceneWrap, { scale: 1 }, { scale: 1.15, duration: 0.25, ease: "power2.out" });
      }

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=65%",
        pin: true,
        pinSpacing: true,
        scrub: 0.3,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (explodedRef.current) return;
          const p = self.progress; // 0 -> 1 across the pinned scroll distance
          intensityRef.current = p;
          shakeRef.current = p * 1.4;

          ambientEngine.setChargeIntensity(p);

          if (p >= 0.985) {
            explode();
          }
        },
      });

      // The pin's boundaries are measured at creation time, which can be wrong
      // if fonts/images/the WebGL canvas haven't finished settling layout yet
      // (this is what caused the crystal to "snap" into place on first scroll).
      // Re-measure once everything has actually loaded.
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener("load", refresh);
      const rafId = requestAnimationFrame(() => requestAnimationFrame(refresh));
      const timeoutId = window.setTimeout(refresh, 600);

      return () => {
        trigger.kill();
        window.removeEventListener("load", refresh);
        cancelAnimationFrame(rafId);
        window.clearTimeout(timeoutId);
      };
    },
    { scope: wrapRef, dependencies: [] }
  );

  return (
    <div
      ref={wrapRef}
      className="hero-companion relative mx-auto flex h-80 w-72 shrink-0 items-center justify-center sm:h-96 sm:w-80 lg:mx-0 lg:h-120 lg:w-104"
    >
      {/* Ambient backdrop glow behind everything */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full opacity-50 blur-3xl"
        style={{ background: `radial-gradient(circle, ${CRYSTAL_COLOR}aa, transparent 70%)` }}
      />

      {/* The character, dimmed while caged */}
      <div ref={imageWrapRef} className="relative h-[80%] w-[80%]">
        <Image
          src="/barb.png"
          alt="Weatherline's companion"
          width={1301}
          height={1599}
          priority
          onLoad={() => ScrollTrigger.refresh()}
          className="relative h-full w-full object-contain brightness-[0.65] saturate-50"
          style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))" }}
        />
      </div>

      {/* Real 3D refractive crystal, layered over the character */}
      <div ref={sceneWrapRef} className="pointer-events-none absolute inset-0">
        <CrystalScene
          shakeRef={shakeRef}
          intensityRef={intensityRef}
          opacityRef={opacityRef}
          explodedRef={explodedRef}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
