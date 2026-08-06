"use client";

import { useRef } from "react";
import { Swords, Users, Sparkles, Store } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";

const FEATURES = [
  {
    icon: Swords,
    kicker: "01 — Adventures",
    title: "Daily quests, written by AI",
    body: "Every morning, a fresh challenge shows up — solo or with your team. Finish it, earn XP and coin.",
  },
  {
    icon: Users,
    kicker: "02 — Teams",
    title: "Departments become guilds",
    body: "Engineering. Sales. Support. Each one a party with its own guardian, its own resources, its own reputation.",
  },
  {
    icon: Sparkles,
    kicker: "03 — Company",
    title: "One shared world to build",
    body: "Teams pool what they earn toward company-wide goals — real progress bars for real collective effort.",
  },
  {
    icon: Store,
    kicker: "04 — Rewards",
    title: "Coin that spends like coin",
    body: "Coffee. Lunch. A day off. Real rewards, redeemed with the coin your team actually earned.",
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

      gsap.to(track, {
        x: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance}`,
          scrub: 0.6,
          pin: true,
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
            className="flex h-[60vh] w-[86vw] shrink-0 flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:w-[48vw] sm:p-12 lg:w-[38vw]"
          >
            <f.icon className="size-9 text-coral" strokeWidth={1.5} />
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">{f.kicker}</p>
              <h3 className="mt-3 font-display text-3xl leading-tight text-white sm:text-4xl">{f.title}</h3>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-white/55">{f.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
