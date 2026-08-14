"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { MagneticButton } from "./MagneticButton";
import { HeroCrystal } from "./HeroCrystal";
import { LightningWire } from "./LightningWire";

export function HeroSection({ onEnter }: { onEnter: () => void }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const lines = scope.current?.querySelectorAll(".hero-line");
      if (!lines) return;

      gsap.set(lines, { yPercent: 110 });
      gsap.set(
        ".hero-kicker, .hero-sub, .hero-cta, .hero-scroll, .hero-companion",
        {
          opacity: 0,
          y: 16,
        },
      );
      gsap.set(".hero-companion", { opacity: 0, scale: 0.8, y: 30 });

      const tl = gsap.timeline({ delay: 0.15 });
      tl.to(".hero-kicker", {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
      })
        .to(
          lines,
          { yPercent: 0, duration: 0.85, stagger: 0.07, ease: "power4.out" },
          "-=0.25",
        )
        .to(
          ".hero-companion",
          { opacity: 1, scale: 1, y: 0, duration: 1, ease: "back.out(1.4)" },
          "-=0.7",
        )
        .to(
          ".hero-sub",
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
          "-=0.5",
        )
        .to(
          ".hero-cta",
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
          "-=0.35",
        )
        .to(
          ".hero-scroll",
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
          "-=0.2",
        );

      // Ambient float loop for the companion, independent of scroll.
      gsap.to(".hero-companion", {
        y: "+=14",
        duration: 3.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: 1.2,
      });
    },
    { scope },
  );

  return (
    <section
      ref={scope}
      className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 sm:px-12"
    >
      {/* Ambient background: soft glow + faint grid, no flat void */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_20%_15%,rgba(255,90,54,0.16),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_50%_at_85%_60%,rgba(255,90,54,0.08),transparent)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-8 lg:pr-6">
        <div className="min-w-0">
          <p className="hero-kicker font-mono text-xs uppercase tracking-[0.25em] text-white/50">
            Skibidi-Sprint — Team Engagement, Reinvented
          </p>

          <h1 className="mt-4 font-display text-[clamp(2.6rem,7.5vw,6.5rem)] leading-[0.92] tracking-tight text-white">
            <span className="block overflow-hidden">
              <span className="hero-line block">WORK FEELS</span>
            </span>
            <span className="block overflow-hidden">
              <span className="hero-line block text-coral">LIKE A GAME</span>
            </span>
            <span className="block overflow-hidden">
              <span className="hero-line block">YOU WANT TO PLAY.</span>
            </span>
          </h1>

          <p className="hero-sub mt-8 max-w-md text-lg leading-relaxed text-white/60">
            Every task becomes a quest. Every team, a party. Every company, a
            world worth showing up for — powered by an AI that actually pays
            attention.
          </p>

          <div className="hero-cta mt-10 flex flex-wrap items-center gap-4">
            <MagneticButton
              onClick={onEnter}
              className="rounded-full bg-coral px-8 py-4 font-semibold text-white hover:bg-(--ember)"
            >
              Start your first quest
            </MagneticButton>
            <LightningWire autoStrikeDelay={2.3}>
              <a
                href="#solution"
                data-cursor="magnetic"
                className="font-mono text-sm uppercase tracking-widest text-white/50 transition-colors hover:text-white"
              >
                See how it works
              </a>
            </LightningWire>
          </div>
        </div>

        <HeroCrystal sectionRef={scope} />
      </div>

      <div className="hero-scroll absolute bottom-10 left-6 flex items-center gap-3 text-white/40 sm:left-12">
        <span className="h-10 w-px bg-gradient-to-b from-white/50 to-transparent" />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
          Scroll
        </span>
      </div>
    </section>
  );
}
