"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { MagneticButton } from "./MagneticButton";
import { HeroCompanion } from "./HeroCompanion";
import { LightningBurst, type LightningBurstHandle } from "./LightningBurst";
import { THUNDERBOLT_ENABLED } from "@/lib/featureFlags";

export function HeroSection({ onEnter }: { onEnter: () => void }) {
  const scope = useRef<HTMLDivElement>(null);
  const burstRef = useRef<LightningBurstHandle>(null);
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  async function handleHowItWorks() {
    if (navigating) return;
    setNavigating(true);

    // Four bolt clusters converge inward from the screen's corners toward
    // center, rather than radiating out from the button itself.
    if (THUNDERBOLT_ENABLED) await burstRef.current?.fireConverge();
    router.push("/how-it-works");
  }

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
      {/* Ambient background: two faint accent washes over the app's own grid,
          so the page has depth without tinting the white ground. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_20%_15%,var(--brand-soft),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_50%_at_85%_60%,var(--pink-soft),transparent_70%)]" />
      <div className="bg-hero-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-8 lg:pr-6">
        <div className="min-w-0">
          <p className="hero-kicker font-mono text-xs uppercase tracking-[0.25em] text-(--smoke)">
            Skibidi-Sprint — Team Engagement, Reinvented
          </p>

          <h1 className="mt-4 font-display text-[clamp(2.6rem,7.5vw,6.5rem)] leading-[0.92] tracking-tight text-(--ink)">
            <span className="block overflow-hidden">
              <span className="hero-line block">Work feels</span>
            </span>
            <span className="block overflow-hidden">
              <span className="hero-line block text-brand">like a game</span>
            </span>
            <span className="block overflow-hidden">
              <span className="hero-line block">you want to play.</span>
            </span>
          </h1>

          <p className="hero-sub mt-8 max-w-md text-lg leading-relaxed text-(--ash)">
            Every task becomes an assignment. Every team, a crew. Every company, a
            world worth showing up for — powered by an AI that actually pays
            attention.
          </p>

          <div className="hero-cta mt-10 flex flex-wrap items-center gap-4">
            <MagneticButton
              onClick={onEnter}
              className="rounded-full bg-brand px-8 py-4 font-semibold text-(--paper) hover:bg-(--brand-deep)"
            >
              Start your first assignment
            </MagneticButton>
            <button
              type="button"
              data-cursor="magnetic"
              onClick={handleHowItWorks}
              disabled={navigating}
              className="font-mono text-sm uppercase tracking-widest text-(--smoke) transition-colors hover:text-(--ink) disabled:opacity-70"
            >
              See how it works
            </button>
          </div>
        </div>

        <HeroCompanion />
      </div>

      <LightningBurst ref={burstRef} />

      <div className="hero-scroll absolute bottom-10 left-6 flex items-center gap-3 text-(--smoke) sm:left-12">
        <span className="h-10 w-px bg-gradient-to-b from-(--line-strong) to-transparent" />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
          Scroll
        </span>
      </div>
    </section>
  );
}
