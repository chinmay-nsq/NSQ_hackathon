"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { cn } from "@/lib/utils";

export type GrowthDimension = "skill" | "consistency" | "output";

const OPTIONS: { key: GrowthDimension; label: string }[] = [
  { key: "skill", label: "Skill" },
  { key: "consistency", label: "Consistency" },
  { key: "output", label: "Output" },
];

/** A 3-way segmented control with a sliding highlight pill that glides between options rather than snapping. */
export function DimensionToggle({
  value,
  onChange,
}: {
  value: GrowthDimension;
  onChange: (dimension: GrowthDimension) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  function movePill(animate: boolean) {
    const track = trackRef.current;
    const pill = pillRef.current;
    if (!track || !pill) return;
    const activeBtn = track.querySelector<HTMLButtonElement>(`[data-key="${value}"]`);
    if (!activeBtn) return;

    const targetX = activeBtn.offsetLeft;
    const targetW = activeBtn.offsetWidth;

    if (animate) {
      gsap.to(pill, { x: targetX, width: targetW, duration: 0.45, ease: "power3.out" });
    } else {
      gsap.set(pill, { x: targetX, width: targetW });
    }
  }

  useGSAP(() => movePill(false), { scope: trackRef, dependencies: [] });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- movePill reads `value` via closure; re-declaring it as a dep would re-run this on every render since it's not memoized, which isn't the intent here (only `value` changes should trigger the animated move).
  useEffect(() => movePill(true), [value]);

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label="Growth dimension"
      className="relative inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 p-1"
    >
      <div ref={pillRef} className="glow-primary absolute top-1 bottom-1 left-0 rounded-full bg-primary" />
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          data-key={opt.key}
          role="tab"
          aria-selected={value === opt.key}
          onClick={() => onChange(opt.key)}
          className={cn(
            "relative z-10 rounded-full px-4 py-1.5 font-mono text-xs font-medium tracking-wide uppercase transition-colors",
            value === opt.key ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
