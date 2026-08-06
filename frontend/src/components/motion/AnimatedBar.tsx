"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { cn } from "@/lib/utils";

/** A progress bar whose fill animates to `pct` (0-100) with GSAP on mount/change. */
export function AnimatedBar({
  pct,
  className = "",
  fillClassName = "bg-primary",
}: {
  pct: number;
  className?: string;
  fillClassName?: string;
}) {
  const fillRef = useRef<HTMLDivElement>(null);
  const clamped = Math.max(0, Math.min(100, pct));

  useGSAP(
    () => {
      if (!fillRef.current) return;
      gsap.fromTo(
        fillRef.current,
        { width: "0%" },
        { width: `${clamped}%`, duration: 1, ease: "power3.out" }
      );
    },
    { dependencies: [clamped] }
  );

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div ref={fillRef} className={cn("h-full rounded-full", fillClassName)} />
    </div>
  );
}
