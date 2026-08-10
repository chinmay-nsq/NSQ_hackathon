"use client";

import { useRef } from "react";
import { UserPlus, Sparkles, ClipboardList, Swords, Users, Gift, type LucideIcon } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";

interface Step {
  icon: LucideIcon;
  kicker: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: UserPlus,
    kicker: "Step 1",
    title: "Join your team",
    body: "Sign up with your team lead's invite link and you're dropped straight into their guild — no setup, no waiting for approval.",
  },
  {
    icon: Sparkles,
    kicker: "Step 2",
    title: "Choose your companion",
    body: "Pick one of seven AI companions and give it a name. It's the voice that coaches you from here on out.",
  },
  {
    icon: ClipboardList,
    kicker: "Step 3",
    title: "Tell it what you do",
    body: "Your role, level, and skills — so every quest it writes actually fits the work you do, not a generic checklist.",
  },
  {
    icon: Swords,
    kicker: "Step 4",
    title: "Run daily quests",
    body: "Each day brings a fresh solo or team quest from your companion. Finish it, earn XP and coins, level up your title.",
  },
  {
    icon: Users,
    kicker: "Step 5",
    title: "Grow the team, then the company",
    body: "Your XP feeds your guild's resources. Guilds pool those resources into shared company-wide goals everyone can watch fill up.",
  },
  {
    icon: Gift,
    kicker: "Step 6",
    title: "Spend what you earn",
    body: "Coins redeem for real rewards in the marketplace — coffee, lunch, a day off — approved by your lead, claimed by you.",
  },
];

export function HowItWorks() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = scope.current;
      if (!section) return;

      ScrollTrigger.create({
        trigger: section,
        start: "top 65%",
        once: true,
        onEnter: () => {
          gsap.fromTo(
            ".how-head > *",
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" }
          );
          gsap.fromTo(
            ".how-step",
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power3.out", delay: 0.15 }
          );
        },
      });

      return () => ScrollTrigger.getAll().forEach((t) => t.trigger === section && t.kill());
    },
    { scope }
  );

  return (
    <section ref={scope} className="relative flex min-h-screen flex-col justify-center px-6 py-24 sm:px-12">
      <div className="how-head mb-16 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/40">How It Works</p>
        <h2 className="mt-3 font-display text-[clamp(2rem,6vw,4.2rem)] leading-[0.95] text-white">
          From invite link to
          <br />
          your first quest.
        </h2>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-white/50">
          Six steps, most of them one click. Here&apos;s the whole path from getting invited to
          spending what you&apos;ve earned.
        </p>
      </div>

      <div className="relative grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={step.title} className="how-step relative flex flex-col gap-4 bg-(--ink) p-8">
            <div className="flex items-center justify-between">
              <step.icon className="size-7 text-coral" strokeWidth={1.5} />
              <span className="font-mono text-[11px] uppercase tracking-widest text-white/30">
                {step.kicker}
              </span>
            </div>
            <div>
              <h3 className="font-display text-2xl leading-tight text-white">{step.title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55">{step.body}</p>
            </div>
            {i < STEPS.length - 1 && (
              <span className="pointer-events-none absolute -right-px top-1/2 hidden h-px w-6 -translate-y-1/2 bg-linear-to-r from-coral/60 to-transparent sm:block lg:-right-px" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
