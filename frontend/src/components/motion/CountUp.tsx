"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";

/** Animates a number counting up from 0 (or its previous value) whenever `value` changes. */
export function CountUp({
  value,
  className = "",
  duration = 0.9,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const obj = { val: prev.current };
      gsap.to(obj, {
        val: value,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          if (el) el.textContent = Math.round(obj.val).toLocaleString();
        },
        onComplete: () => {
          prev.current = value;
        },
      });
    },
    { dependencies: [value] }
  );

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString()}
    </span>
  );
}
