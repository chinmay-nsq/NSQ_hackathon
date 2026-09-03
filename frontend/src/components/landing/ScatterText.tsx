"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText } from "@/lib/gsap/registerPlugins";

/**
 * Splits its text into individual characters and, as the element scrolls
 * into view, animates each one in from a random scattered position/rotation
 * on screen so the word visibly "assembles" out of chaos — rather than a
 * plain fade/slide reveal. Scrubbed to scroll position, not a fire-once
 * timeline, so scrolling back up un-scatters it too.
 *
 * Splitting to "words,chars" rather than "chars" alone matters: the chars
 * are inline-block, which makes every single one a line-break opportunity,
 * so a heading that has to wrap breaks mid-word ("en / gage"). The word
 * wrappers keep each word whole while the animation still runs per char.
 */
export function ScatterText({
  children,
  as = "span",
  className = "",
  scatterRadius = 260,
}: {
  children: string;
  as?: "span" | "h2" | "h3";
  className?: string;
  /** How far (px) characters start scattered from their resting position. */
  scatterRadius?: number;
}) {
  const ref = useRef<HTMLHeadingElement & HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const split = SplitText.create(el, {
        type: "words,chars",
        charsClass: "scatter-char",
        wordsClass: "scatter-word",
      });

      split.chars.forEach((char) => {
        gsap.set(char, { display: "inline-block" });
      });

      const angle = () => Math.random() * Math.PI * 2;
      const startState = split.chars.map(() => {
        const a = angle();
        const r = scatterRadius * (0.6 + Math.random() * 0.5);
        return {
          x: Math.cos(a) * r,
          y: Math.sin(a) * r,
          rotation: (Math.random() - 0.5) * 260,
          opacity: 0,
          filter: "blur(6px)",
        };
      });

      gsap.set(split.chars, (i: number) => startState[i]);

      gsap.to(split.chars, {
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 1,
        stagger: { each: 0.018, from: "random" },
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          end: "top 45%",
          scrub: 0.7,
        },
      });

      return () => split.revert();
    },
    { scope: ref, dependencies: [children] },
  );

  if (as === "h2") {
    return (
      <h2 ref={ref} className={className}>
        {children}
      </h2>
    );
  }
  if (as === "h3") {
    return (
      <h3 ref={ref} className={className}>
        {children}
      </h3>
    );
  }
  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
}
