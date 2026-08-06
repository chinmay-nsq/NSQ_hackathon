"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";

/** Reveals text word-by-word, as if it's being written, whenever `text` changes. */
export function TypewriterReveal({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const words = text.split(" ");
      el.innerHTML = words
        .map((w) => `<span class="inline-block opacity-0 translate-y-2">${w}</span>`)
        .join(" ");

      gsap.to(el.querySelectorAll("span"), {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: "power2.out",
        stagger: 0.02,
      });
    },
    { dependencies: [text] }
  );

  return <p ref={ref} className={className} />;
}
