"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { useOnboardingTourStore } from "@/store/onboardingTourStore";
import { LightningBurst, type LightningBurstHandle } from "@/components/landing/LightningBurst";
import { Loader2 } from "lucide-react";

/**
 * A brief safety net for the short window right after login where we don't
 * yet know whether this employee has completed the guided tour
 * (`doneKnown` false until /auth/me resolves). If the user clicks anywhere
 * during that window, strike a lightning bolt at the click point (visual +
 * sound, reusing the landing page's own effect) and block interaction
 * behind a dark center loader until the real status arrives — rather than
 * silently letting the click do nothing or risk the tour flashing on/off.
 * Renders nothing once doneKnown is true; normally invisible in practice
 * since that fetch is fast.
 */
export function TourStatusGate() {
  const doneKnown = useOnboardingTourStore((s) => s.doneKnown);
  const burstRef = useRef<LightningBurstHandle>(null);
  const [struck, setStruck] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (doneKnown) return;

    function onClick(e: MouseEvent) {
      setStruck(true);
      void burstRef.current?.fire(e.clientX, e.clientY, 140);
    }
    window.addEventListener("click", onClick, { capture: true });
    return () => window.removeEventListener("click", onClick, { capture: true });
  }, [doneKnown]);

  useGSAP(
    () => {
      if (!struck || !overlayRef.current) return;
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" });
    },
    { dependencies: [struck] },
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <LightningBurst ref={burstRef} />
      {struck && !doneKnown && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-90 flex items-center justify-center bg-black/70 opacity-0 backdrop-blur-sm"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="size-8 animate-spin text-white/80" />
        </div>
      )}
    </>,
    document.body,
  );
}
