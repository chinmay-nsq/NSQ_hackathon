"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Maximize, X, Swords, Users, ClipboardCheck, MessageCircle, Store, Crown, type LucideIcon } from "lucide-react";
import "../landing.css";
import { gsap, MorphSVGPlugin, SplitText } from "@/lib/gsap/registerPlugins";
import { AmbientParticles } from "@/components/landing/AmbientParticles";
import { LightningBurst, type LightningBurstHandle } from "@/components/landing/LightningBurst";
import { PETS } from "@/components/landing/petData";

/** Two path definitions sharing a compatible point count so MorphSVGPlugin can tween cleanly between them without auto-inserting extra points mid-animation (kept simple/manual for predictable results). */
const MORPH_SHAPES = {
  checklist: "M20,20 L60,20 L60,30 L20,30 Z M20,45 L60,45 L60,55 L20,55 Z M20,70 L60,70 L60,80 L20,80 Z",
  sword: "M50,10 L56,50 L50,90 L44,50 Z M30,55 L70,55 L70,62 L30,62 Z M40,70 L60,70 L60,90 L40,90 Z",
};
const MORPH_SHAPES_2 = {
  boxes:
    "M10,10 L45,10 L45,45 L10,45 Z M55,10 L90,10 L90,45 L55,45 Z M10,55 L45,55 L45,90 L10,90 Z M55,55 L90,55 L90,90 L55,90 Z",
  banner: "M50,6 L88,20 L88,60 L50,94 L12,60 L12,20 Z",
};

function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function enter() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen can be denied (permissions policy, iframe, etc.) — the
      // deck still works windowed, so this is a soft failure, not fatal.
    }
  }

  async function exit() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  }

  return { isFullscreen, enter, exit };
}

function GateScreen({ onEnter }: { onEnter: () => void }) {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const split = SplitText.create(".gate-title", { type: "chars" });
    gsap.set(split.chars, { display: "inline-block" });
    gsap.fromTo(
      split.chars,
      { opacity: 0, y: 40, rotateX: -90 },
      { opacity: 1, y: 0, rotateX: 0, duration: 0.7, stagger: 0.02, ease: "back.out(1.6)", delay: 0.2 },
    );
    gsap.fromTo(".gate-sub, .gate-btn", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, delay: 0.7, ease: "power3.out" });

    gsap.to(".gate-orbit", { rotate: 360, duration: 40, ease: "none", repeat: -1 });

    return () => split.revert();
  }, []);

  return (
    <div ref={scope} className="landing-page relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <AmbientParticles />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(255,90,54,0.14),transparent)]" />

      <div className="gate-orbit pointer-events-none absolute inset-0" aria-hidden>
        {PETS.map((pet, i) => {
          const angle = (360 / PETS.length) * i;
          return (
            <div
              key={pet.species}
              className="absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 opacity-20 sm:size-20"
              style={{ transform: `rotate(${angle}deg) translate(0, -46vh) rotate(-${angle}deg)` }}
            >
              <Image src={pet.image} alt="" width={80} height={80} className="h-full w-full object-contain" />
            </div>
          );
        })}
      </div>

      <p className="relative font-mono text-sm uppercase tracking-[0.3em] text-white/40">Skibidi-Sprint — Live Presentation</p>
      <h1 className="gate-title relative mt-4 font-display text-[clamp(2.8rem,8vw,6.5rem)] leading-[0.92] text-white">
        THE PITCH DECK
      </h1>
      <p className="gate-sub relative mt-6 max-w-lg text-xl text-white/50 opacity-0">
        Full screen. Arrow keys, spacebar, or click to advance. Speaker notes on every slide.
      </p>
      <button
        type="button"
        onClick={onEnter}
        className="gate-btn glow-primary relative mt-9 flex items-center gap-2.5 rounded-full bg-coral px-8 py-4 font-mono text-sm font-semibold uppercase tracking-widest text-white opacity-0 transition-transform hover:scale-105"
      >
        <Maximize className="size-4" />
        Enter full screen
      </button>
    </div>
  );
}

interface SlideDef {
  id: string;
  kicker: string;
  /** What the presenter should actually say — shown as a persistent bar on every slide, not read by the audience but visible to whoever's presenting. */
  notes: string;
  render: () => React.ReactNode;
}

const FEATURE_HIGHLIGHTS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Swords, title: "Adventures", body: "A fresh AI-written quest lands every single day — solo, or for the whole guild. Managers can hand-write and assign work too, to one person or the whole team at once." },
  { icon: Users, title: "Guilds", body: "Every department becomes a guild with four shared resources — Knowledge, Gold, Influence, Materials — and a reputation score that climbs automatically as the team ships." },
  { icon: ClipboardCheck, title: "Approvals", body: "Managers review submitted work in one queue — approve credits XP and coins instantly, reject sends it back with a note. AI-generated quests skip this entirely." },
  { icon: MessageCircle, title: "Companion Chat", body: "A real, persistent conversation with your companion. Ask it to create a task, assign work, or take you anywhere in the app — and it actually does it, live." },
  { icon: Store, title: "Rewards Marketplace", body: "Coins redeem for real perks — coffee, lunch, a day off — with a confirm-before-you-spend dialog and a full purchase history." },
  { icon: Crown, title: "Kingdom", body: "Every guild's resources feed into shared, company-wide project goals — visible progress everyone can watch fill up together." },
];

const SLIDES: SlideDef[] = [
  {
    id: "cover",
    kicker: "00",
    notes: "Open with energy. This is the one-line pitch — say it, then pause. Let the tagline land before moving on.",
    render: () => (
      <div className="flex h-full flex-col items-start justify-center">
        <p className="slide-eyebrow font-mono text-sm uppercase tracking-[0.3em] text-coral">Skibidi-Sprint</p>
        <h2 className="slide-title mt-5 font-display text-[clamp(3.2rem,9vw,7.5rem)] leading-[0.88] text-white">
          WORK, AS AN
          <br />
          <span className="text-coral">ADVENTURE.</span>
        </h2>
        <p className="slide-body mt-8 max-w-2xl text-2xl leading-snug text-white/60">
          A workplace engagement platform that turns real tasks into quests, real teams into guilds, and gives every
          employee an AI companion that actually knows what&apos;s going on.
        </p>
      </div>
    ),
  },
  {
    id: "problem",
    kicker: "01 — The Problem",
    notes: "This is the setup. Walk through each line slowly — the point is that every engagement tool follows the same decay curve. Land hard on \"Silence.\"",
    render: () => (
      <div className="flex h-full flex-col justify-center">
        <h2 className="slide-title font-display text-[clamp(2.4rem,5.5vw,4.4rem)] leading-[0.95] text-white">
          Engagement dies by week three.
        </h2>
        <p className="slide-body mt-5 max-w-2xl text-xl text-white/50">
          Every workplace gamification tool follows the same curve — a burst of interest at launch, then a slow fade
          as the novelty wears off and the mechanics start feeling like homework.
        </p>
        <div className="slide-body mt-8 flex flex-col gap-4 max-w-2xl">
          {[
            ["Week 1", "A survey nobody reads the results of."],
            ["Week 3", "Badges that stop meaning anything."],
            ["Week 5", "A leaderboard only the top five check."],
            ["Week 8", "Silence."],
          ].map(([week, line]) => (
            <p key={week} className="slide-row flex items-baseline gap-4 border-b border-white/10 pb-4 text-2xl text-white/70">
              <span className="w-24 shrink-0 font-mono text-sm uppercase tracking-widest text-white/30">{week}</span>
              {line}
            </p>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "morph-tasks",
    kicker: "02 — The Shift",
    notes: "This is the turn — the core idea of the whole product in one image. Let the shape actually morph before you keep talking; don't rush past it.",
    render: () => (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <h2 className="slide-title font-display text-[clamp(2.4rem,5.5vw,4.4rem)] leading-[0.95] text-white">
          Tasks become <span className="text-coral">quests.</span>
        </h2>
        <svg viewBox="0 0 100 100" className="morph-stage mt-10 h-64 w-64 sm:h-80 sm:w-80">
          <path id="morph-path-a" d={MORPH_SHAPES.checklist} fill="var(--coral)" />
        </svg>
        <p className="slide-body mt-8 max-w-xl text-xl text-white/55">
          A checklist. Watch it become a weapon. Every real task — a manager&apos;s request, a piece of onboarding, a
          daily skill check — gets the same treatment: framed, rewarded, and made to feel like it matters.
        </p>
      </div>
    ),
  },
  {
    id: "morph-org",
    kicker: "03 — Real Org Chart",
    notes: "Reassure the room this isn't a gimmick layered on top — it's the real org chart underneath. Point at the shape as it forms into a banner.",
    render: () => (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <h2 className="slide-title font-display text-[clamp(2.4rem,5.5vw,4.4rem)] leading-[0.95] text-white">
          Departments become <span className="text-coral">guilds.</span>
        </h2>
        <svg viewBox="0 0 100 100" className="morph-stage mt-10 h-64 w-64 sm:h-80 sm:w-80">
          <path id="morph-path-b" d={MORPH_SHAPES_2.boxes} fill="var(--gold)" />
        </svg>
        <p className="slide-body mt-8 max-w-xl text-xl text-white/55">
          Same team, same manager, same reporting line. Just a shared identity to fight under — a guild banner, a
          guardian that levels up with the whole team, and resources everyone contributes to together.
        </p>
      </div>
    ),
  },
  {
    id: "companion",
    kicker: "04 — The AI Companion",
    notes: "This is the differentiator slide — spend real time here. The key line to land is \"it actually acts,\" not just talks.",
    render: () => (
      <div className="flex h-full flex-col justify-center">
        <h2 className="slide-title font-display text-[clamp(2.4rem,5.5vw,4.2rem)] leading-[0.95] text-white">
          Not a mascot. <span className="text-coral">A real conversation.</span>
        </h2>
        <p className="slide-body mt-6 max-w-2xl text-xl leading-relaxed text-white/60">
          Every employee gets one AI companion, grounded in their real level, coins, guild, and pending work.
          It&apos;s a persistent chat, not a one-off popup — full history, live on every page.
        </p>
        <div className="slide-body mt-8 flex flex-col gap-3 max-w-2xl">
          {[
            "Ask it to create a task — it actually creates one, in the real database.",
            "Ask it to take you anywhere in the app — it actually navigates you there.",
            "Managers can say \"list my team\" or \"assign this to Sam\" — real names, real actions.",
          ].map((line) => (
            <p key={line} className="slide-row text-xl text-white/70">
              → {line}
            </p>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "companions-roster",
    kicker: "05 — Seven Companions",
    notes: "Name a couple of them out loud as they appear — pick two whose personality contrasts well (e.g. Charger vs Raven) to show the range.",
    render: () => (
      <div className="flex h-full flex-col justify-center">
        <h2 className="slide-title font-display text-[clamp(2.4rem,5.5vw,4.2rem)] leading-[0.95] text-white">
          Pick a voice that fits <span className="text-coral">how you work.</span>
        </h2>
        <p className="slide-body mt-4 max-w-2xl text-xl text-white/50">
          Seven distinct companions, each with a real personality and a real specialty — not reskins of the same bot.
        </p>
        <div className="companion-grid mt-9 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {PETS.map((pet) => (
            <div
              key={pet.species}
              className="companion-card flex flex-col items-center gap-3 rounded-2xl border p-5 text-center"
              style={{ borderColor: `color-mix(in oklch, ${pet.color} 30%, transparent)`, background: `color-mix(in oklch, ${pet.color} 8%, transparent)` }}
            >
              <div
                className="relative flex size-24 items-center justify-center rounded-2xl border sm:size-28"
                style={{ borderColor: `color-mix(in oklch, ${pet.color} 45%, transparent)`, background: `color-mix(in oklch, ${pet.color} 16%, transparent)` }}
              >
                <Image src={pet.image} alt={pet.name} width={112} height={112} className="h-[80%] w-[80%] object-contain" />
              </div>
              <div>
                <p className="font-display text-xl leading-tight text-white">{pet.name}</p>
                <p className="mt-1 font-mono text-xs uppercase tracking-widest" style={{ color: pet.color }}>
                  {pet.ability}
                </p>
              </div>
              <p className="text-sm leading-snug text-white/50">{pet.specialty}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "features-1",
    kicker: "06 — What's Actually Built",
    notes: "Pick two or three of these to expand on verbally based on the room — don't read all six, use them as prompts.",
    render: () => (
      <div className="flex h-full flex-col justify-center">
        <h2 className="slide-title font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-[0.95] text-white">
          Fourteen real product areas. <span className="text-coral">Here are six.</span>
        </h2>
        <div className="feature-grid mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURE_HIGHLIGHTS.slice(0, 4).map((f) => (
            <div key={f.title} className="feature-card flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-coral/30 bg-coral/10">
                <f.icon className="size-6 text-coral" strokeWidth={1.5} />
              </span>
              <div>
                <h4 className="font-display text-xl text-white">{f.title}</h4>
                <p className="mt-1.5 text-base leading-relaxed text-white/55">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "features-2",
    kicker: "07 — And Two More",
    notes: "This continues the previous slide — no need to re-explain the format, just keep the same energy.",
    render: () => (
      <div className="flex h-full flex-col justify-center">
        <h2 className="slide-title font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-[0.95] text-white">
          Rewards that spend. <span className="text-coral">Goals everyone can watch.</span>
        </h2>
        <div className="feature-grid mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURE_HIGHLIGHTS.slice(4, 6).map((f) => (
            <div key={f.title} className="feature-card flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-coral/30 bg-coral/10">
                <f.icon className="size-6 text-coral" strokeWidth={1.5} />
              </span>
              <div>
                <h4 className="font-display text-xl text-white">{f.title}</h4>
                <p className="mt-1.5 text-base leading-relaxed text-white/55">{f.body}</p>
              </div>
            </div>
          ))}
          <div className="feature-card flex flex-col justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 className="font-display text-xl text-white">Trading Post</h4>
            <p className="text-base leading-relaxed text-white/55">
              Resell anything you&apos;ve already redeemed — capped at what you originally paid, never a markup.
            </p>
          </div>
          <div className="feature-card flex flex-col justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 className="font-display text-xl text-white">Onboarding</h4>
            <p className="text-base leading-relaxed text-white/55">
              Pick a companion, name it, describe your role — AI suggests skills live as you type.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "economy",
    kicker: "08 — A Real Economy",
    notes: "Emphasize \"even after you spend them\" — that's the surprising part, most reward systems are dead ends once you redeem.",
    render: () => (
      <div className="flex h-full flex-col justify-center">
        <h2 className="slide-title font-display text-[clamp(2.4rem,5.5vw,4.2rem)] leading-[0.95] text-white">
          Coins that move, <span className="text-coral">even after you spend them.</span>
        </h2>
        <p className="slide-body mt-5 max-w-2xl text-xl text-white/55">
          Earn from approved quests and quiz answers. Spend in the marketplace. Resell what you don&apos;t need on
          the Trading Post. Coins keep circulating — they don&apos;t just vanish into a leaderboard.
        </p>
        <div className="slide-body mt-8 grid grid-cols-2 gap-4 max-w-2xl sm:grid-cols-4">
          {[
            ["Marketplace", "Shipped"],
            ["Trading Post", "Shipped"],
            ["Notifications", "Shipped"],
            ["Web3 Provenance", "Roadmap"],
          ].map(([name, status]) => (
            <div key={name} className="slide-stat rounded-2xl border border-white/10 bg-white/5 p-5 text-base text-white/70">
              <p className="font-display text-lg text-white">{name}</p>
              <p className={`mt-1 font-mono text-xs uppercase tracking-widest ${status === "Shipped" ? "text-success" : "text-white/40"}`}>{status}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "stats",
    kicker: "09 — By The Numbers",
    notes: "Let each number count up before speaking over it — the count-up itself holds attention, don't talk through it.",
    render: () => (
      <div className="flex h-full flex-col justify-center">
        <h2 className="slide-title font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-[0.95] text-white">
          Small on paper. <span className="text-coral">Deep in practice.</span>
        </h2>
        <div className="stats-row mt-9 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {[
            { value: 7, label: "AI companion species" },
            { value: 14, label: "product areas, shipped" },
            { value: 4, label: "guild resource types" },
            { value: 100, label: "% of adventures AI-generated" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <span className="stat-num font-display text-6xl text-coral sm:text-7xl" data-value={s.value}>
                0
              </span>
              <span className="max-w-[18ch] text-base text-white/50">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "why",
    kicker: "10 — Why This Stands Out",
    notes: "This is the thesis statement of the whole pitch. Slow down and say it plainly — it's the line people should remember.",
    render: () => (
      <div className="flex h-full flex-col justify-center">
        <h2 className="slide-title max-w-3xl font-display text-[clamp(2.4rem,5.5vw,4rem)] leading-[0.95] text-white">
          Gamification that serves <span className="text-coral">collaboration</span>, not competition.
        </h2>
        <p className="slide-body mt-6 max-w-2xl text-xl leading-relaxed text-white/55">
          No public leaderboards ranking people against each other. Guild resources are shared, not individually
          hoarded. The AI companion is structural to every feature, not a bolted-on chatbot. And managers see their
          team by companion identity first — recognition without the awkwardness of a name on every review.
        </p>
      </div>
    ),
  },
  {
    id: "closer",
    kicker: "",
    notes: "Closing line. Pause after this one, don't fill the silence — let it land, then take questions.",
    render: () => (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <h2 className="slide-title font-display text-[clamp(2.8rem,7vw,5.5rem)] leading-[0.95] text-white">
          Let&apos;s make work <span className="text-coral">worth showing up for.</span>
        </h2>
      </div>
    ),
  },
];

function Deck({ onExit }: { onExit: () => void }) {
  const { isFullscreen, exit } = useFullscreen();
  const [index, setIndex] = useState(0);
  const [notesVisible, setNotesVisible] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<LightningBurstHandle>(null);
  const morphedRef = useRef({ tasks: false, org: false });
  const transitioning = useRef(false);

  function playSlideIn(el: HTMLElement) {
    gsap.fromTo(
      el.querySelectorAll(".slide-eyebrow, .slide-title, .slide-body, .slide-row, .slide-stat"),
      { opacity: 0, y: 28, filter: "blur(6px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6, stagger: 0.06, ease: "power3.out" },
    );

    const companionCards = el.querySelectorAll(".companion-card");
    if (companionCards.length) {
      gsap.fromTo(
        companionCards,
        { opacity: 0, scale: 0.4, y: 20, rotate: -8 },
        { opacity: 1, scale: 1, y: 0, rotate: 0, duration: 0.55, stagger: 0.06, delay: 0.35, ease: "back.out(2.2)" },
      );
    }

    const featureCards = el.querySelectorAll<HTMLElement>(".feature-card");
    featureCards.forEach((card, i) => {
      gsap.fromTo(
        card,
        { opacity: 0, x: i % 2 === 0 ? -40 : 40 },
        { opacity: 1, x: 0, duration: 0.55, delay: 0.2 + i * 0.09, ease: "power3.out" },
      );
    });

    const statEls = el.querySelectorAll<HTMLElement>(".stat-num");
    statEls.forEach((statEl, i) => {
      const target = Number(statEl.dataset.value);
      const obj = { val: 0 };
      gsap.fromTo(statEl, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, delay: 0.15 + i * 0.08, ease: "power2.out" });
      gsap.to(obj, {
        val: target,
        duration: 1.3,
        delay: 0.2 + i * 0.08,
        ease: "power2.out",
        onUpdate: () => {
          statEl.textContent = Math.round(obj.val).toString();
        },
      });
    });

    const morphA = el.querySelector<SVGPathElement>("#morph-path-a");
    if (morphA && !morphedRef.current.tasks) {
      morphedRef.current.tasks = true;
      gsap.delayedCall(0.6, () => gsap.to(morphA, { morphSVG: MORPH_SHAPES.sword, duration: 1.2, ease: "power2.inOut" }));
    }
    const morphB = el.querySelector<SVGPathElement>("#morph-path-b");
    if (morphB && !morphedRef.current.org) {
      morphedRef.current.org = true;
      gsap.delayedCall(0.6, () => gsap.to(morphB, { morphSVG: MORPH_SHAPES_2.banner, duration: 1.2, ease: "power2.inOut" }));
    }
  }

  function goTo(next: number) {
    const clamped = gsap.utils.clamp(0, SLIDES.length - 1, next);
    if (clamped === index || transitioning.current) return;
    transitioning.current = true;

    const stage = stageRef.current;
    const outgoing = stage?.querySelector<HTMLElement>(`[data-slide="${index}"]`);
    const incoming = stage?.querySelector<HTMLElement>(`[data-slide="${clamped}"]`);
    const dir = clamped > index ? 1 : -1;

    setIndex(clamped);

    if (outgoing) {
      gsap.to(outgoing, {
        opacity: 0,
        scale: 0.96,
        filter: "blur(8px)",
        x: -dir * 40,
        duration: 0.35,
        ease: "power2.in",
        onComplete: () => gsap.set(outgoing, { visibility: "hidden" }),
      });
    }
    if (incoming) {
      gsap.set(incoming, { visibility: "visible" });
      gsap.fromTo(
        incoming,
        { opacity: 0, scale: 1.03, filter: "blur(8px)", x: dir * 40 },
        {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          x: 0,
          duration: 0.5,
          ease: "power2.out",
          onComplete: () => {
            playSlideIn(incoming);
            transitioning.current = false;
          },
        },
      );
    } else {
      transitioning.current = false;
    }
  }

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const allSlides = stage.querySelectorAll<HTMLElement>("[data-slide]");
    allSlides.forEach((el) => {
      gsap.set(el, el.dataset.slide === "0" ? { opacity: 1 } : { opacity: 0, visibility: "hidden" });
    });
    const first = stage.querySelector<HTMLElement>('[data-slide="0"]');
    if (first) playSlideIn(first);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === "n" || e.key === "N") setNotesVisible((v) => !v);
      if (e.key === "Escape") {
        void exit();
        onExit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  async function handleClickZone(dir: 1 | -1) {
    if (dir === 1 && index === SLIDES.length - 2) {
      const stage = stageRef.current;
      const rect = stage?.getBoundingClientRect();
      if (rect) {
        void burstRef.current?.fire(rect.left + rect.width / 2, rect.top + rect.height / 2, Math.max(rect.width, rect.height) * 0.5);
      }
    }
    goTo(index + dir);
  }

  const currentNotes = SLIDES[index].notes;

  return (
    <div className="landing-page fixed inset-0 overflow-hidden bg-(--ink)">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <LightningBurst ref={burstRef} />

      <div ref={stageRef} className={`relative h-full w-full px-10 py-16 sm:px-20 sm:py-20 ${notesVisible ? "pb-28 sm:pb-32" : ""}`}>
        {SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            data-slide={i}
            className={`absolute inset-0 px-10 py-16 sm:px-20 sm:py-20 ${notesVisible ? "pb-28 sm:pb-32" : ""}`}
            style={{ pointerEvents: i === index ? "auto" : "none" }}
          >
            {slide.kicker && (
              <p className="slide-eyebrow absolute top-8 left-10 font-mono text-sm uppercase tracking-[0.25em] text-white/35 sm:left-20">
                {slide.kicker}
              </p>
            )}
            {slide.render()}
          </div>
        ))}
      </div>

      <button aria-label="Previous slide" onClick={() => handleClickZone(-1)} className="absolute inset-y-0 left-0 z-20 w-1/4 cursor-w-resize" />
      <button aria-label="Next slide" onClick={() => handleClickZone(1)} className="absolute inset-y-0 right-0 z-20 w-3/4 cursor-e-resize" />

      {notesVisible && currentNotes && (
        <div className="pointer-events-none absolute right-0 bottom-16 left-0 z-30 border-t border-white/10 bg-black/60 px-10 py-4 backdrop-blur-sm sm:px-20">
          <p className="mx-auto flex max-w-4xl items-start gap-3 font-mono text-sm leading-relaxed text-white/55">
            <span className="mt-0.5 shrink-0 rounded-full border border-coral/40 bg-coral/10 px-2 py-0.5 text-[10px] tracking-widest text-coral uppercase">Say</span>
            {currentNotes}
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute right-8 bottom-6 left-8 z-30 flex items-center justify-between sm:right-16 sm:left-16">
        <div className="flex items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <span key={s.id} className="h-1.5 rounded-full transition-all duration-300" style={{ width: i === index ? 24 : 6, background: i === index ? "var(--coral)" : "rgba(255,255,255,0.2)" }} />
          ))}
        </div>
        <span className="font-mono text-xs text-white/40">
          {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </span>
      </div>

      <div className="pointer-events-auto absolute top-8 right-8 z-30 flex items-center gap-2 sm:right-16">
        <button
          type="button"
          onClick={() => setNotesVisible((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white/60 backdrop-blur-sm transition-colors hover:text-white"
        >
          {notesVisible ? "Hide notes" : "Show notes"}
        </button>
        {!isFullscreen && (
          <button
            type="button"
            onClick={() => document.documentElement.requestFullscreen().catch(() => {})}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white/60 backdrop-blur-sm transition-colors hover:text-white"
          >
            <Maximize className="size-3.5" />
            Full screen
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            await exit();
            onExit();
          }}
          aria-label="Exit presentation"
          className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/60 backdrop-blur-sm transition-colors hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="pointer-events-none absolute top-8 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/30 sm:flex">
        <ArrowLeft className="size-3" />
        Click sides or arrow keys · N to toggle notes
        <ArrowRight className="size-3" />
      </div>
    </div>
  );
}

export default function ShowPptPage() {
  const { enter } = useFullscreen();
  const [started, setStarted] = useState(false);

  // Keep the MorphSVGPlugin reference alive so the bundler doesn't tree-shake
  // it out — it's used purely via string plugin config ("morphSVG"), never
  // referenced by identifier, so nothing else forces this import to stay.
  void MorphSVGPlugin;

  async function handleEnter() {
    await enter();
    setStarted(true);
  }

  if (!started) {
    return (
      <div className="relative">
        <Link
          href="/"
          className="fixed top-6 left-6 z-50 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-white/70 backdrop-blur-sm transition-colors hover:border-white/30 hover:text-white sm:left-12"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>
        <GateScreen onEnter={handleEnter} />
      </div>
    );
  }

  return <Deck onExit={() => setStarted(false)} />;
}
