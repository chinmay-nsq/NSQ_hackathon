"use client";

import { useRef } from "react";
import { Brain, Coins, Zap, Hammer, type LucideIcon } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/motion/CountUp";

const RESOURCE_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  knowledge: { label: "Knowledge", icon: Brain, color: "var(--chart-4)" },
  gold: { label: "Gold", icon: Coins, color: "var(--currency)" },
  influence: { label: "Influence", icon: Zap, color: "var(--primary)" },
  materials: { label: "Materials", icon: Hammer, color: "var(--success)" },
};

export function ResourceMeter({
  resource,
  current,
  needed,
  className,
}: {
  resource: string;
  current: number;
  needed: number;
  className?: string;
}) {
  const meta = RESOURCE_META[resource] ?? { label: resource, icon: Zap, color: "var(--primary)" };
  const Icon = meta.icon;
  const pct = needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 100;
  const fillRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!fillRef.current) return;
      gsap.fromTo(
        fillRef.current,
        { width: "0%" },
        { width: `${pct}%`, duration: 1, ease: "power3.out" }
      );
    },
    { dependencies: [pct] }
  );

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <Icon className="size-3.5" />
          {meta.label}
        </span>
        <span className="tabular text-muted-foreground">
          <CountUp value={current} duration={0.7} />
          {needed > 0 && <span className="opacity-60"> / {needed}</span>}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div ref={fillRef} className="h-full rounded-full" style={{ backgroundColor: meta.color }} />
      </div>
    </div>
  );
}
