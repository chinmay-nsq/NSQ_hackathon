"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";
import { MagneticButton } from "./MagneticButton";

export function CTASection() {
  const scope = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useGSAP(
    () => {
      const section = scope.current;
      if (!section) return;

      gsap.fromTo(
        ".cta-content > *",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: section, start: "top 70%" },
        }
      );

      return () => ScrollTrigger.getAll().forEach((t) => t.trigger === section && t.kill());
    },
    { scope }
  );

  return (
    <section
      ref={scope}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center sm:px-12"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,var(--gold-wash),transparent_70%)]" />

      <div className="cta-content relative flex max-w-2xl flex-col items-center gap-8">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-(--smoke)">Ready?</p>
        <h2 className="font-display text-[clamp(2.4rem,8vw,6rem)] leading-[0.9] text-(--ink)">
          BRING YOUR TEAM
          <br />
          INTO THE <span className="text-brand">GAME.</span>
        </h2>
        <MagneticButton
          onClick={() => router.push("/login")}
          className="rounded-full bg-brand px-10 py-5 text-lg font-semibold text-(--paper) hover:bg-(--brand-deep)"
        >
          Create your kingdom
        </MagneticButton>
        <p className="font-mono text-xs text-(--faint)">No credit card. Just your team.</p>
      </div>

      <footer className="absolute bottom-8 flex w-full max-w-5xl items-center justify-between px-6 font-mono text-[11px] uppercase tracking-widest text-(--faint) sm:px-0">
        <span>Skibidi-Sprint</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </section>
  );
}
