"use client";

import { useRef, useState } from "react";
import {
  UserPlus,
  Sparkles,
  ClipboardList,
  Swords,
  Users,
  Gift,
  ShieldPlus,
  Link2,
  UserCog,
  CheckCheck,
  type LucideIcon,
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/registerPlugins";
import { cn } from "@/lib/utils";

interface Step {
  icon: LucideIcon;
  kicker: string;
  title: string;
  body: string;
}

type Persona = "employee" | "lead";

const EMPLOYEE_STEPS: Step[] = [
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

const LEAD_STEPS: Step[] = [
  {
    icon: ShieldPlus,
    kicker: "Step 1",
    title: "Create your team",
    body: "Sign up as a team lead and start your guild — you're set as its manager automatically, no separate setup step.",
  },
  {
    icon: Link2,
    kicker: "Step 2",
    title: "Invite your people",
    body: "Share one link. Anyone who signs up with it lands straight in your guild — no approval queue, no manual adding.",
  },
  {
    icon: UserCog,
    kicker: "Step 3",
    title: "Assign work, your way",
    body: "Hand-write a task or let AI generate one from a member's real profile, and assign it to one person or your whole team at once.",
  },
  {
    icon: CheckCheck,
    kicker: "Step 4",
    title: "Review and approve",
    body: "See what's assigned and what's been submitted in one queue. Approve to credit XP and coins, or send it back.",
  },
  {
    icon: Users,
    kicker: "Step 5",
    title: "Watch the team grow",
    body: "Every approved task feeds your guild's resources and reputation — visible progress you and your team both see.",
  },
  {
    icon: Sparkles,
    kicker: "Step 6",
    title: "See real people, not just tasks",
    body: "You see your team by companion identity, not personal details — recognition without the awkwardness of a name on every review.",
  },
];

const PERSONA_COPY: Record<Persona, { eyebrow: string; heading: React.ReactNode; sub: string }> = {
  employee: {
    eyebrow: "How It Works — Employees",
    heading: (
      <>
        From invite link to
        <br />
        your first quest.
      </>
    ),
    sub: "Six steps, most of them one click. Here's the whole path from getting invited to spending what you've earned.",
  },
  lead: {
    eyebrow: "How It Works — Team Leads",
    heading: (
      <>
        From new guild to
        <br />
        a team that runs itself.
      </>
    ),
    sub: "Six steps to stand up your team, hand out real work, and keep it moving — without ever seeing a personal detail you don't need.",
  },
};

export function HowItWorks() {
  const scope = useRef<HTMLDivElement>(null);
  const [persona, setPersona] = useState<Persona>("employee");
  const steps = persona === "employee" ? EMPLOYEE_STEPS : LEAD_STEPS;
  const copy = PERSONA_COPY[persona];

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

  useGSAP(
    () => {
      gsap.fromTo(
        ".how-step",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power3.out" }
      );
    },
    { scope, dependencies: [persona] }
  );

  return (
    <section ref={scope} className="relative flex min-h-screen flex-col justify-center px-6 py-24 sm:px-12">
      <div className="how-head mb-12 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/40">{copy.eyebrow}</p>
        <h2 className="mt-3 font-display text-[clamp(2rem,6vw,4.2rem)] leading-[0.95] text-white">
          {copy.heading}
        </h2>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-white/50">{copy.sub}</p>
      </div>

      <div className="how-head mb-10 inline-flex w-fit items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1">
        {(["employee", "lead"] as const).map((p) => (
          <button
            key={p}
            type="button"
            data-cursor="magnetic"
            onClick={() => setPersona(p)}
            className={cn(
              "rounded-full px-5 py-2 font-mono text-xs tracking-widest uppercase transition-colors",
              persona === p ? "bg-coral text-white" : "text-white/50 hover:text-white/80"
            )}
          >
            {p === "employee" ? "I'm an employee" : "I'm a team lead"}
          </button>
        ))}
      </div>

      <div className="relative grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, i) => (
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
            {i < steps.length - 1 && (
              <span className="pointer-events-none absolute -right-px top-1/2 hidden h-px w-6 -translate-y-1/2 bg-linear-to-r from-coral/60 to-transparent sm:block lg:-right-px" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
