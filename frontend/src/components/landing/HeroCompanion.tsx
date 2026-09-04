"use client";

import Image from "next/image";

const GLOW_COLOR = "#3b6ef5"; // matches --brand

/**
 * The hero's companions: the crew portrait sitting on a soft brand-coloured
 * wash. Entrance and float are driven by HeroSection's timeline through the
 * .hero-companion class.
 */
export function HeroCompanion() {
  return (
    <div className="hero-companion relative mx-auto flex h-80 w-full max-w-md shrink-0 items-center justify-center sm:h-96 lg:mx-0 lg:h-120">
      {/* Ambient backdrop glow behind the portrait */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle, ${GLOW_COLOR}88, transparent 70%)` }}
      />

      <Image
        src="/group.png"
        alt="The Skibidi-Sprint companions"
        width={1200}
        height={900}
        priority
        className="relative h-full w-full object-contain"
        style={{ filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.25))" }}
      />
    </div>
  );
}
