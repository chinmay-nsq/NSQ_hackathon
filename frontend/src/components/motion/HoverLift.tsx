"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";

/** Wraps any element with a GSAP hover lift + press-down micro-interaction. */
export function HoverLift({
  children,
  className = "",
  lift = 6,
  scale = 1.015,
}: {
  children: React.ReactNode;
  className?: string;
  lift?: number;
  scale?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const tl = gsap.timeline({ paused: true }).to(el, {
        y: -lift,
        scale,
        boxShadow: "0 12px 24px -8px oklch(0 0 0 / 0.18)",
        duration: 0.25,
        ease: "power2.out",
      });

      const onEnter = () => tl.play();
      const onLeave = () => tl.reverse();
      const onDown = () => gsap.to(el, { scale: scale * 0.97, duration: 0.1 });
      const onUp = () => gsap.to(el, { scale, duration: 0.15 });

      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
      el.addEventListener("mousedown", onDown);
      el.addEventListener("mouseup", onUp);

      return () => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
        el.removeEventListener("mousedown", onDown);
        el.removeEventListener("mouseup", onUp);
      };
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
