"use client";

import { useRef, useState } from "react";
import {
  LayoutDashboard,
  Swords,
  Users,
  Store,
  ArrowLeftRight,
  ClipboardCheck,
  Crown,
  ShieldAlert,
  UserCircle,
  Compass,
  ScrollText,
  MessageCircle,
  Bell,
  Layers,
  X,
  type LucideIcon,
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { cn } from "@/lib/utils";
import { ScatterText } from "./ScatterText";
import { LightningBurst, type LightningBurstHandle } from "./LightningBurst";

type Role = "employee" | "manager";

interface Feature {
  text: string;
  role: Role | "both";
}

/** "lg" areas get a bigger bento cell (2 cols on desktop) — the highest-impact surfaces. */
type Size = "lg" | "md";

interface Area {
  icon: LucideIcon;
  num: string;
  title: string;
  tagline: string;
  color: string;
  size: Size;
  features: Feature[];
}

const AREAS: Area[] = [
  {
    icon: LayoutDashboard,
    num: "01",
    title: "Dashboard",
    tagline: "The first thing you see, every time.",
    color: "#ff5a36",
    size: "md",
    features: [
      { text: "Live AI companion greeting, grounded in your real state", role: "both" },
      { text: "Level, XP, coins, and pending quests at a glance", role: "both" },
      { text: "Daily quiz auto-generates before you even ask", role: "both" },
      { text: "Extra checklist for guild-lead status + approvals", role: "manager" },
    ],
  },
  {
    icon: Swords,
    num: "02",
    title: "Adventures",
    tagline: "Every task, reframed as a quest.",
    color: "#ff5a36",
    size: "lg",
    features: [
      { text: "One AI-generated solo quest, every single day", role: "employee" },
      { text: "Assign work to your whole team at once", role: "manager" },
      { text: "\"Generate with AI\" from a teammate's real profile", role: "manager" },
      { text: "5-question quiz, instant lock-in, live score", role: "both" },
      { text: "Coins fly to your balance the moment you finish", role: "both" },
      { text: "Rejection notes visible right on the task", role: "both" },
    ],
  },
  {
    icon: Users,
    num: "03",
    title: "Teams",
    tagline: "Departments, reimagined as parties.",
    color: "#d4a537",
    size: "md",
    features: [
      { text: "One invite link, instant guild membership", role: "manager" },
      { text: "Four shared resources: Knowledge, Gold, Influence, Materials", role: "both" },
      { text: "Reputation climbs automatically as quests get approved", role: "both" },
      { text: "Teammates shown by companion identity, not personal details", role: "manager" },
    ],
  },
  {
    icon: Store,
    num: "04",
    title: "Rewards",
    tagline: "Coin that actually spends.",
    color: "#d4a537",
    size: "md",
    features: [
      { text: "Real rewards — coffee, lunch, a day off", role: "both" },
      { text: "Confirm-before-you-spend, every time", role: "both" },
      { text: "Coins visibly fly from balance to reward on redeem", role: "both" },
      { text: "Manager gets pinged the second you claim something", role: "employee" },
    ],
  },
  {
    icon: ArrowLeftRight,
    num: "05",
    title: "Trading Post",
    tagline: "Redeemed something you don't need? Resell it.",
    color: "#d4a537",
    size: "md",
    features: [
      { text: "Resell anything you've already redeemed", role: "both" },
      { text: "Price capped at what you originally paid — never a markup", role: "both" },
      { text: "Ownership transfers cleanly, re-listable by the new owner", role: "both" },
    ],
  },
  {
    icon: ClipboardCheck,
    num: "06",
    title: "Approvals",
    tagline: "The review queue that keeps everything honest.",
    color: "#ff5a36",
    size: "md",
    features: [
      { text: "One-click approve, instant XP + coin credit", role: "manager" },
      { text: "Reject sends work back with a clear note", role: "manager" },
      { text: "AI-generated quests skip the queue entirely", role: "both" },
    ],
  },
  {
    icon: Crown,
    num: "07",
    title: "Kingdom",
    tagline: "One shared world every guild builds together.",
    color: "#d4a537",
    size: "md",
    features: [
      { text: "Company-wide goals every guild's resources feed into", role: "both" },
      { text: "Real progress meters, per resource type", role: "both" },
      { text: "\"Unlocked\" the moment every threshold is met", role: "both" },
    ],
  },
  {
    icon: ShieldAlert,
    num: "08",
    title: "Admin",
    tagline: "The controls that keep the whole kingdom running.",
    color: "#ff5a36",
    size: "md",
    features: [
      { text: "Company-wide stats: people, teams, XP, approvals", role: "manager" },
      { text: "Promote or demote anyone, instantly", role: "manager" },
      { text: "Full people roster, one screen", role: "manager" },
    ],
  },
  {
    icon: UserCircle,
    num: "09",
    title: "Profile",
    tagline: "Your whole journey, in one place.",
    color: "#ff5a36",
    size: "md",
    features: [
      { text: "Level, XP, coins, all animated on load", role: "both" },
      { text: "Companion Bond Level — a second track that grows with every quest", role: "both" },
      { text: "Total reputation earned, front and center", role: "both" },
    ],
  },
  {
    icon: Compass,
    num: "10",
    title: "Onboarding",
    tagline: "From first login to your first quest.",
    color: "#d4a537",
    size: "lg",
    features: [
      { text: "Pick from seven AI companions, live preview", role: "both" },
      { text: "Real-time name uniqueness checking as you type", role: "both" },
      { text: "AI-suggested skills — just describe your role", role: "both" },
      { text: "Tag-based skills input, one-tap to add a suggestion", role: "both" },
      { text: "A personal welcome message before you ever enter the app", role: "both" },
    ],
  },
  {
    icon: ScrollText,
    num: "11",
    title: "Weekly Recap",
    tagline: "Your team's week, written as a story.",
    color: "#d4a537",
    size: "md",
    features: [
      { text: "AI-written narrative from real completed quests", role: "both" },
      { text: "One click to generate, typewriter reveal", role: "both" },
      { text: "Grouped by guild — your team gets its own thread", role: "both" },
    ],
  },
  {
    icon: MessageCircle,
    num: "12",
    title: "Companion Chat",
    tagline: "Not a mascot. A companion that actually acts.",
    color: "#ff5a36",
    size: "lg",
    features: [
      { text: "Ask it to create a task — it actually creates one", role: "both" },
      { text: "Ask it to take you anywhere — it actually navigates", role: "both" },
      { text: "\"Assign this to {name}\" — dictated in plain language", role: "manager" },
      { text: "\"List my team members\" — real names, live from your roster", role: "manager" },
      { text: "Full history saved, wiped clean on logout", role: "both" },
    ],
  },
  {
    icon: Bell,
    num: "13",
    title: "Notifications",
    tagline: "The right nudge, at the right moment.",
    color: "#d4a537",
    size: "md",
    features: [
      { text: "Instant alert the moment a reward gets claimed", role: "manager" },
      { text: "A gentle one-time nudge if onboarding stalls", role: "employee" },
    ],
  },
  {
    icon: Layers,
    num: "14",
    title: "Systems",
    tagline: "The mechanics that make it all feel fair.",
    color: "#ff5a36",
    size: "md",
    features: [
      { text: "100 XP per level, always — no surprises", role: "both" },
      { text: "One quiz per person, per day — enforced at the database level", role: "both" },
      { text: "AI work auto-approves; only hand-written tasks need review", role: "both" },
    ],
  },
];

function RoleTag({ role }: { role: Feature["role"] }) {
  if (role === "both") return null;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-widest",
        role === "manager" ? "border-gold/30 bg-gold/10 text-gold" : "border-coral/30 bg-coral/10 text-coral",
      )}
    >
      {role === "manager" ? "Lead" : "Member"}
    </span>
  );
}

function BentoCard({
  area,
  filter,
  onOpen,
}: {
  area: Area;
  filter: Role | "both";
  onOpen: (area: Area, cardEl: HTMLElement) => void;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const features = filter === "both" ? area.features : area.features.filter((f) => f.role === filter || f.role === "both");
  const capped = features.slice(0, area.size === "lg" ? 5 : 3);
  const hidden = features.length - capped.length;
  const dimmed = filter !== "both" && capped.length === 0;

  function handleMove(e: React.MouseEvent<HTMLButtonElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(el, {
      rotateY: px * 14,
      rotateX: -py * 14,
      duration: 0.4,
      ease: "power2.out",
      transformPerspective: 800,
    });
  }

  function handleLeave() {
    gsap.to(cardRef.current, { rotateY: 0, rotateX: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" });
  }

  return (
    <button
      ref={cardRef}
      type="button"
      data-cursor="magnetic"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={(e) => onOpen(area, e.currentTarget)}
      className={cn(
        "roadmap-card group relative flex flex-col justify-between overflow-hidden rounded-4xl border border-white/10 bg-white/3 p-6 text-left transition-opacity duration-300 will-change-transform sm:p-7",
        area.size === "lg" ? "min-h-88 sm:col-span-2" : "min-h-72",
        dimmed && "opacity-40",
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 -right-6 select-none font-display text-[7rem] leading-none opacity-[0.07] sm:text-[9rem]"
        style={{ color: area.color }}
      >
        {area.num}
      </div>

      <div className="relative">
        <div
          className="flex size-12 items-center justify-center rounded-2xl border transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
          style={{
            borderColor: `color-mix(in oklch, ${area.color} 30%, transparent)`,
            background: `color-mix(in oklch, ${area.color} 12%, transparent)`,
          }}
        >
          <area.icon className="size-5" strokeWidth={1.5} style={{ color: area.color }} />
        </div>
        <h3 className={cn("mt-4 font-display leading-[0.95] text-white", area.size === "lg" ? "text-3xl sm:text-4xl" : "text-2xl")}>
          {area.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-white/45">{area.tagline}</p>
      </div>

      <ul className="relative mt-5 flex flex-col gap-2">
        {capped.map((f) => (
          <li key={f.text} className="flex items-start gap-2 text-[13px] leading-snug text-white/70">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: area.color }} />
            <span className="flex-1">{f.text}</span>
            <RoleTag role={f.role} />
          </li>
        ))}
        {hidden > 0 && <li className="font-mono text-[10px] uppercase tracking-widest text-white/30">+{hidden} more — tap to see all</li>}
      </ul>

      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 100%, color-mix(in oklch, ${area.color} 12%, transparent), transparent)` }}
      />
    </button>
  );
}

function DetailModal({ area, filter, onClose }: { area: Area; filter: Role | "both"; onClose: () => void }) {
  const scope = useRef<HTMLDivElement>(null);
  const features = filter === "both" ? area.features : area.features.filter((f) => f.role === filter || f.role === "both");

  useGSAP(
    () => {
      gsap.fromTo(scope.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      gsap.fromTo(
        ".modal-panel",
        { opacity: 0, y: 40, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.6)" },
      );
      gsap.fromTo(
        ".modal-feature",
        { opacity: 0, x: -16 },
        { opacity: 1, x: 0, duration: 0.35, stagger: 0.04, delay: 0.15, ease: "power2.out" },
      );
    },
    { scope },
  );

  return (
    <div ref={scope} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm" onClick={onClose}>
      <div
        className="modal-panel relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-4xl border border-white/15 bg-(--ink) p-8 shadow-2xl sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-full border border-white/15 text-white/60 transition-colors hover:border-white/30 hover:text-white"
        >
          <X className="size-4" />
        </button>

        <div
          className="flex size-14 items-center justify-center rounded-2xl border"
          style={{ borderColor: `color-mix(in oklch, ${area.color} 30%, transparent)`, background: `color-mix(in oklch, ${area.color} 12%, transparent)` }}
        >
          <area.icon className="size-6" strokeWidth={1.5} style={{ color: area.color }} />
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">{area.num} — Feature area</p>
        <h3 className="mt-1 font-display text-4xl leading-[0.95] text-white">{area.title}</h3>
        <p className="mt-3 text-base leading-relaxed text-white/50">{area.tagline}</p>

        <ul className="mt-7 flex flex-col gap-1">
          {features.map((f) => (
            <li key={f.text} className="modal-feature flex items-start gap-3 border-b border-white/5 py-3 opacity-0">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: area.color }} />
              <span className="flex-1 text-[15px] leading-relaxed text-white/75">{f.text}</span>
              <RoleTag role={f.role} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function FeatureRoadmap() {
  const scope = useRef<HTMLDivElement>(null);
  const burstRef = useRef<LightningBurstHandle>(null);
  const [filter, setFilter] = useState<Role | "both">("both");
  const [activeArea, setActiveArea] = useState<Area | null>(null);

  useGSAP(
    () => {
      const section = scope.current;
      if (!section) return;

      gsap.fromTo(
        ".roadmap-intro > *",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: section, start: "top 75%" },
        },
      );

      gsap.fromTo(
        ".roadmap-card",
        { opacity: 0, y: 40, scale: 0.92 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.55,
          stagger: { each: 0.06, grid: "auto", from: "start" },
          ease: "power3.out",
          scrollTrigger: { trigger: ".roadmap-grid", start: "top 85%" },
        },
      );
    },
    { scope, dependencies: [filter] },
  );

  async function handleOpen(area: Area, cardEl: HTMLElement) {
    const rect = cardEl.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    const reach = Math.max(rect.width, rect.height) * 0.9;
    void burstRef.current?.fire(originX, originY, reach);
    setActiveArea(area);
  }

  return (
    <section ref={scope} className="relative px-6 py-24 sm:px-12">
      <LightningBurst ref={burstRef} />

      <div className="roadmap-intro mx-auto max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/40 opacity-0">The Full Roadmap</p>
        <ScatterText
          as="h2"
          scatterRadius={340}
          className="mt-3 block font-display text-[clamp(2.2rem,6.5vw,4.6rem)] leading-[0.92] text-white"
        >
          EVERY FEATURE. NOTHING HIDDEN.
        </ScatterText>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/50 opacity-0">
          Fourteen areas, tagged by who it&apos;s for. Tap any card to crack it open.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-2 opacity-0">
          {(
            [
              { key: "both", label: "Everything" },
              { key: "employee", label: "Team member" },
              { key: "manager", label: "Team lead" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              data-cursor="magnetic"
              onClick={() => setFilter(opt.key)}
              className={cn(
                "rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors",
                filter === opt.key
                  ? "border-coral bg-coral text-white"
                  : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/80",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="roadmap-grid mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2">
        {AREAS.map((area) => (
          <BentoCard key={area.title} area={area} filter={filter} onOpen={handleOpen} />
        ))}
      </div>

      {activeArea && <DetailModal area={activeArea} filter={filter} onClose={() => setActiveArea(null)} />}
    </section>
  );
}
