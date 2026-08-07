"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap/registerPlugins";
import { musicEngine } from "./musicEngine";

/** Feeds overall page scroll progress (0-1) into the music engine's filter brightness. */
export function useScrollReactiveAudio() {
  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        musicEngine.setScrollProgress(self.progress);
      },
    });

    return () => trigger.kill();
  }, []);
}
