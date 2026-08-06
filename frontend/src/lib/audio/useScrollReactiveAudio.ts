"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap/registerPlugins";
import { ambientEngine } from "./ambientEngine";

/** Feeds overall page scroll progress (0-1) into the ambient engine's filter brightness. */
export function useScrollReactiveAudio() {
  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        ambientEngine.setScrollProgress(self.progress);
      },
    });

    return () => trigger.kill();
  }, []);
}
