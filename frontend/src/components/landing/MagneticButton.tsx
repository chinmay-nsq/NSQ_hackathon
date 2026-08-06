"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { ambientEngine } from "@/lib/audio/ambientEngine";
import { cn } from "@/lib/utils";

/** A button that pulls toward the cursor within its bounds and reacts with a subtle audio pitch lift. */
export function MagneticButton({
  children,
  className,
  onClick,
  strength = 0.4,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  strength?: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    gsap.to(el, { x, y, duration: 0.3, ease: "power2.out" });
  }

  function handleMouseLeave() {
    if (!ref.current) return;
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
    ambientEngine.setHoverLift(false);
  }

  function handleMouseEnter() {
    ambientEngine.setHoverLift(true);
  }

  function handleClick() {
    ambientEngine.playChime();
    onClick?.();
  }

  return (
    <button
      ref={ref}
      type="button"
      data-cursor="magnetic"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden transition-colors",
        className
      )}
    >
      {children}
    </button>
  );
}
