"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { GrowthInsight } from "@/lib/types";

const TOPIC_LABEL: Record<string, string> = {
  adventures: "Go to Adventures",
  teams: "Go to Teams",
  approvals: "Go to Approvals",
  growth: "See more",
};

/**
 * AI-phrased headline + observations about numbers already computed on the
 * backend — visually inherits the old recap card's glow treatment (radial
 * gradient, coral-tinted border) but the reveal is now a staggered
 * line-by-line rise instead of a typewriter, since this is a set of
 * discrete stat callouts, not continuous prose.
 *
 * Any observation the AI tagged with a topic (a closed enum resolved to a
 * real route server-side — never a raw AI-produced URL) renders with a real
 * "go there" button, so pointing at something concrete is one click away
 * instead of just being described.
 */
export function GrowthInsightCard({ insight }: { insight: GrowthInsight }) {
  const scope = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const lines = root.querySelectorAll(".insight-line");
      gsap.fromTo(
        lines,
        { opacity: 0, x: -14, filter: "blur(3px)" },
        { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.55, stagger: 0.09, ease: "power3.out" },
      );

      const glow = root.querySelector(".insight-glow");
      if (glow) {
        gsap.fromTo(glow, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.9, ease: "power2.out" });
      }
    },
    { scope, dependencies: [insight.headline] },
  );

  return (
    <div
      ref={scope}
      className="glow-primary bg-grid relative overflow-hidden rounded-2xl border border-border/60 bg-card px-6 py-6"
    >
      <div className="insight-glow pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_0%_0%,var(--glow-primary),transparent)]" />

      <div className="relative">
        <p className="insight-line mb-3 flex items-center gap-2 font-mono text-[11px] font-medium tracking-widest text-primary uppercase">
          <Sparkles className="size-3.5" />
          AI Insight
        </p>
        <p className="insight-line font-display text-xl leading-snug tracking-wide text-foreground sm:text-2xl">
          {insight.headline}
        </p>
        <ul className="mt-4 flex flex-col gap-1">
          {insight.observations.map((o) => (
            <li key={o.text} className="insight-line flex flex-wrap items-center gap-x-2.5 gap-y-1.5 py-1.5">
              <span className="flex flex-1 items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {o.text}
              </span>
              {o.href && (
                <button
                  type="button"
                  data-cursor="magnetic"
                  onClick={() => router.push(o.href!)}
                  className="group flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] font-medium tracking-widest text-primary uppercase transition-colors hover:border-primary/50 hover:bg-primary/20"
                >
                  {TOPIC_LABEL[o.topic ?? "growth"] ?? "Go there"}
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
