"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";

/**
 * Animates its direct children in with a staggered scale+fade — for card
 * grids where items load asynchronously (re-runs whenever `deps` changes,
 * e.g. after data finishes loading).
 */
export function StaggerGrid({
  children,
  className = "",
  deps = [],
}: {
  children: React.ReactNode;
  className?: string;
  deps?: unknown[];
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const items = Array.from(root.children);
      if (items.length === 0) return;

      gsap.fromTo(
        items,
        { opacity: 0, y: 18, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: "back.out(1.6)",
          stagger: 0.06,
        }
      );
    },
    { scope, dependencies: deps }
  );

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
