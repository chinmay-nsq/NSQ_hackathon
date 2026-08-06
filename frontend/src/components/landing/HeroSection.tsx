"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { MagneticButton } from "./MagneticButton";

export function HeroSection({ onEnter }: { onEnter: () => void }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const lines = scope.current?.querySelectorAll(".hero-line");
      if (!lines) return;

      gsap.set(lines, { yPercent: 110 });
      gsap.set(".hero-kicker, .hero-sub, .hero-cta, .hero-scroll", { opacity: 0, y: 16 });

      const tl = gsap.timeline({ delay: 0.15 });
      tl.to(".hero-kicker", { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" })
        .to(lines, { yPercent: 0, duration: 0.9, stagger: 0.08, ease: "power4.out" }, "-=0.25")
        .to(".hero-sub", { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.4")
        .to(".hero-cta", { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.35")
        .to(".hero-scroll", { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.2");
    },
    { scope }
  );

  return (
    <section
      ref={scope}
      className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 sm:px-12"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,90,54,0.14),transparent)]" />

      <p className="hero-kicker font-mono text-xs uppercase tracking-[0.25em] text-white/50">
        Weatherline — Team Engagement, Reinvented
      </p>

      <h1 className="mt-4 font-display text-[clamp(3.2rem,12vw,9.5rem)] leading-[0.86] tracking-tight text-white">
        <span className="block overflow-hidden">
          <span className="hero-line block">WORK FEELS</span>
        </span>
        <span className="block overflow-hidden">
          <span className="hero-line block text-coral">LIKE A GAME</span>
        </span>
        <span className="block overflow-hidden">
          <span className="hero-line block">YOU WANT</span>
        </span>
        <span className="block overflow-hidden">
          <span className="hero-line block">TO PLAY.</span>
        </span>
      </h1>

      <p className="hero-sub mt-8 max-w-md text-lg leading-relaxed text-white/60">
        Every task becomes a quest. Every team, a party. Every company, a world worth
        showing up for — powered by an AI that actually pays attention.
      </p>

      <div className="hero-cta mt-10 flex flex-wrap items-center gap-4">
        <MagneticButton
          onClick={onEnter}
          className="rounded-full bg-coral px-8 py-4 font-semibold text-white hover:bg-[var(--ember)]"
        >
          Start your first quest
        </MagneticButton>
        <a
          href="#solution"
          data-cursor="magnetic"
          className="font-mono text-sm uppercase tracking-widest text-white/50 transition-colors hover:text-white"
        >
          See how it works
        </a>
      </div>

      <div className="hero-scroll absolute bottom-10 left-6 flex items-center gap-3 text-white/40 sm:left-12">
        <span className="h-10 w-px bg-gradient-to-b from-white/50 to-transparent" />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em]">Scroll</span>
      </div>
    </section>
  );
}
