"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";

/**
 * Wraps a page's content with a consistent entrance animation:
 * the page rises + fades in, and every direct child of the root
 * (cards, headers, sections) staggers in behind it.
 */
export function PageIn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;

      const children = Array.from(root.children);
      gsap.set(children, { opacity: 0, y: 24 });
      gsap.to(children, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.08,
      });
    },
    { scope }
  );

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
