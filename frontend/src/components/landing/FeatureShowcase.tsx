"use client";

import { useRef } from "react";
import { Swords, Users, Sparkles, Store, ArrowRight } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";
import { ambientEngine } from "@/lib/audio/ambientEngine";

const FEATURES = [
  {
    icon: Swords,
    kicker: "01 — Adventures",
    title: "Daily quests, written by AI",
    body: "Every morning, a fresh challenge shows up — solo or with your team. Finish it, earn XP and coin.",
    stat: "New quest every 24h",
  },
  {
    icon: Users,
    kicker: "02 — Teams",
    title: "Departments become guilds",
    body: "Engineering. Sales. Support. Each one a party with its own guardian, its own resources, its own reputation.",
    stat: "Unlimited members",
  },
  {
    icon: Sparkles,
    kicker: "03 — Company",
    title: "One shared world to build",
    body: "Teams pool what they earn toward company-wide goals — real progress bars for real collective effort.",
    stat: "4 resource types",
  },
  {
    icon: Store,
    kicker: "04 — Rewards",
    title: "Coin that spends like coin",
    body: "Coffee. Lunch. A day off. Real rewards, redeemed with the coin your team actually earned.",
    stat: "Redeemable anytime",
  },
];

export function FeatureShowcase() {
  const scope = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = scope.current;
      const track = trackRef.current;
      if (!section || !track) return;

      const distance = track.scrollWidth - window.innerWidth;
      if (distance <= 0) return;

      ScrollTrigger.create({
        trigger: section,
        start: "top 60%",
        once: true,
        onEnter: () => ambientEngine.playWhoosh("in"),
      });

      const cards = Array.from(track.querySelectorAll<HTMLElement>(".feature-card"));

      gsap.to(track, {
        x: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance}`,
          scrub: 0.6,
          pin: true,
          onUpdate: (self) => {
            const idx = Math.round(self.progress * (cards.length - 1));
            cards.forEach((card, i) => {
              card.style.opacity = i === idx ? "1" : "0.45";
              card.style.transform = i === idx ? "scale(1)" : "scale(0.96)";
            });
          },
        },
      });

      return () => ScrollTrigger.getAll().forEach((t) => t.trigger === section && t.kill());
    },
    { scope }
  );

  return (
    <section ref={scope} className="relative flex min-h-screen flex-col justify-center overflow-hidden">
      <p className="absolute left-6 top-10 font-mono text-xs uppercase tracking-[0.25em] text-white/40 sm:left-12">
        The Product
      </p>
      <div ref={trackRef} className="flex items-center gap-6 px-6 will-change-transform sm:gap-10 sm:px-12">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="feature-card flex h-[60vh] w-[86vw] shrink-0 flex-col justify-between rounded-3xl border border-white/10 bg-white/3 p-8 transition-[opacity,transform] duration-300 sm:w-[48vw] sm:p-12 lg:w-[38vw]"
          >
            <div className="flex items-center justify-between">
              <f.icon className="size-9 text-coral" strokeWidth={1.5} />
              <span className="font-mono text-[11px] uppercase tracking-widest text-white/30">{f.stat}</span>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">{f.kicker}</p>
              <h3 className="mt-3 font-display text-3xl leading-tight text-white sm:text-4xl">{f.title}</h3>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-white/55">{f.body}</p>
            </div>
          </div>
        ))}

        <div className="feature-card flex h-[60vh] w-[86vw] shrink-0 flex-col items-start justify-center gap-4 rounded-3xl border border-coral/25 bg-coral/[0.06] p-8 sm:w-[48vw] sm:p-12 lg:w-[38vw]">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral/70">Meet the companion</p>
          <h3 className="font-display text-3xl leading-tight text-white sm:text-4xl">
            And it&apos;s all guided by one AI.
          </h3>
          <p className="flex items-center gap-2 font-mono text-sm text-white/50">
            Keep scrolling <ArrowRight className="size-4" />
          </p>
        </div>
      </div>
    </section>
  );
}
