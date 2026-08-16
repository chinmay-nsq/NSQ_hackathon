"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronRight, X } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { useOnboardingTourStore } from "@/store/onboardingTourStore";
import { useAuthStore } from "@/store/authStore";
import { EMPLOYEE_TOUR_STEPS, LEAD_TOUR_STEPS, type TourStep } from "@/lib/onboardingTourSteps";
import { COMPANION_IMAGE_PATH, COMPANION_FALLBACK_COLOR } from "@/components/companion3d/companionAssets";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function subscribeNever() {
  return () => {};
}

/** SSR-safe "has this component hydrated on the client" check, without the react-hooks/set-state-in-effect violation a useState+useEffect version would trip — snapshot differs between server (always false) and client (always true) by design, which is exactly what useSyncExternalStore is for. */
function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

/** Polls for a `data-tour="key"` element (it may not exist yet right after navigation, while the page is still mounting) and returns its live bounding rect, updated on scroll/resize. Returns null whenever there's no key to look for, without ever calling setState synchronously from the effect body — the "no key" case is handled by simply never scheduling any measurement, and the cleanup from the previous key's effect run clears listeners/timers on its own. */
function useTourTargetRect(targetKey: string | null): Rect | null {
  const [rectByKey, setRectByKey] = useState<{ key: string; rect: Rect } | null>(null);

  useEffect(() => {
    if (!targetKey) return;

    let cancelled = false;
    let pollId: number | undefined;

    function measure(): boolean {
      const el = document.querySelector<HTMLElement>(`[data-tour="${targetKey}"]`);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      if (!cancelled) {
        setRectByKey({ key: targetKey!, rect: { top: r.top, left: r.left, width: r.width, height: r.height } });
      }
      return true;
    }

    function poll() {
      if (cancelled) return;
      measure();
      pollId = window.setTimeout(poll, 100);
    }
    poll();

    const onViewportChange = () => measure();
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange);

    return () => {
      cancelled = true;
      if (pollId) window.clearTimeout(pollId);
      window.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [targetKey]);

  // Stale-key guard: if the target changed (or was cleared) since the last
  // successful measurement, don't return a rect that belongs to the old key.
  if (!targetKey || rectByKey?.key !== targetKey) return null;
  return rectByKey.rect;
}

export function OnboardingTour() {
  const { employee } = useAuthStore();
  const { active, stepIndex, done, doneKnown, completedActionKey, syncDone, start, next, finish, skip } =
    useOnboardingTourStore();
  const pathname = usePathname();
  const router = useRouter();
  const bubbleRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  // Portalled straight to document.body (below) so the overlay always paints
  // above ANY app content — including dialogs — regardless of whether some
  // ancestor (sidebar, provider, etc.) happens to establish its own stacking
  // context. document.body doesn't exist during SSR, so this is only true
  // once actually mounted on the client.
  const mounted = useMounted();

  const isLead = employee?.role === "MANAGER" || employee?.role === "ADMIN";
  const steps: TourStep[] = isLead ? LEAD_TOUR_STEPS : EMPLOYEE_TOUR_STEPS;
  const step = active ? steps[stepIndex] : null;

  // Sync the store's `done` flag from the real DB value as soon as the
  // employee record is fetched — the store itself always starts false and
  // never reads localStorage, so this is the only source of truth.
  useEffect(() => {
    if (employee) syncDone(employee.onboardingTourDone);
  }, [employee, syncDone]);

  // Auto-start once: only after we actually know the real done state (not
  // just the frontend's own false default), the employee has a companion,
  // and completed profile (the mandatory onboarding pages are already their
  // own guided flow) — and only ever once, per the DB's onboardingTourDone.
  useEffect(() => {
    if (!doneKnown || done || active) return;
    if (employee?.companion && employee.profileCompletedAt) {
      start();
    }
  }, [doneKnown, done, active, employee, start]);

  // Auto-navigate to wherever the current step's target actually lives.
  // Steps with `route: null` are "just watch, don't redirect" (e.g. the
  // quiz-in-progress step, which lives on a dynamic /adventures/[id] the
  // tour has no fixed route for).
  useEffect(() => {
    if (!step || step.route === null) return;
    if (pathname !== step.route) {
      router.push(step.route);
    }
  }, [step, pathname, router]);

  const advance = () => {
    if (stepIndex >= steps.length - 1) {
      finish();
    } else {
      next();
    }
  };

  const onCorrectPage = step ? step.route === null || pathname === step.route : false;
  const rect = useTourTargetRect(onCorrectPage ? (step?.target ?? null) : null);
  const waitingStep = Boolean(step && !step.target);

  // Advance the tour when the user actually clicks the real spotlighted
  // element — a real event listener on the element itself (not polling), so
  // the click's normal behavior (navigation, dialog open, etc.) still
  // happens exactly as it would without the tour running. Skipped entirely
  // for `requireAction` steps — those only unlock via signalAction(), fired
  // by the page once the real action genuinely completes (see below).
  useEffect(() => {
    if (!step || !step.target || !rect || step.requireAction) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) return;

    function onClick() {
      advance();
    }
    el.addEventListener("click", onClick, { once: true });
    return () => el.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-binds per step/rect on purpose (new element or position each time)
  }, [step, rect, stepIndex, steps.length]);

  const nextDisabled = Boolean(step?.requireAction && completedActionKey !== step.key);

  useGSAP(
    () => {
      if (!step || (!rect && !waitingStep)) return;
      gsap.fromTo(
        bubbleRef.current,
        { opacity: 0, y: 24, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.6)" },
      );
      if (!waitingStep) {
        gsap.fromTo(ringRef.current, { opacity: 0, scale: 1.15 }, { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" });
        gsap.to(ringRef.current, {
          boxShadow: "0 0 0 6px color-mix(in oklch, var(--primary) 55%, transparent)",
          repeat: -1,
          yoyo: true,
          duration: 0.9,
          ease: "sine.inOut",
        });
      }
    },
    { dependencies: [step?.key, rect?.top, rect?.left, waitingStep] },
  );

  if (!mounted || !step) return null;
  if (!waitingStep && !rect) return null;

  const pad = 10;
  const spotTop = rect ? rect.top - pad : 0;
  const spotLeft = rect ? rect.left - pad : 0;
  const spotWidth = rect ? rect.width + pad * 2 : 0;
  const spotHeight = rect ? rect.height + pad * 2 : 0;
  const radius = 14;

  const species = employee?.companion?.species ?? "barbarian";
  const portraitSrc = COMPANION_IMAGE_PATH[species];
  const accent = COMPANION_FALLBACK_COLOR[species] ?? "var(--primary)";
  const isLastStep = stepIndex >= steps.length - 1;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-100" aria-live="polite">
      {rect && (
        <>
          {/* Dimmed overlay with a real spotlight cutout via an SVG mask — everything outside the hole is dark and unclickable; the hole itself has no overlay above it, so the real element underneath stays fully interactive. */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              <mask id="tour-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect x={spotLeft} y={spotTop} width={spotWidth} height={spotHeight} rx={radius} fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(5,4,3,0.72)" mask="url(#tour-spotlight-mask)" />
          </svg>

          {/* Pulsing highlight ring around the real target, click-through so the actual button underneath still receives the click. */}
          <div
            ref={ringRef}
            className="pointer-events-none absolute rounded-[14px] ring-2 ring-primary"
            style={{ top: spotTop, left: spotLeft, width: spotWidth, height: spotHeight }}
          />

          {/* Four click-catcher bands around the spotlight hole (top/bottom/left/right) — simpler and more robust than a single inverse-polygon clip-path, and leaves the hole itself completely free of any overlay so the real element underneath is the only thing that can receive the click. */}
          <div className="pointer-events-auto absolute inset-x-0 top-0" style={{ height: Math.max(spotTop, 0) }} onClick={(e) => e.stopPropagation()} />
          <div className="pointer-events-auto absolute inset-x-0 bottom-0" style={{ top: spotTop + spotHeight }} onClick={(e) => e.stopPropagation()} />
          <div className="pointer-events-auto absolute" style={{ top: spotTop, height: spotHeight, left: 0, width: Math.max(spotLeft, 0) }} onClick={(e) => e.stopPropagation()} />
          <div className="pointer-events-auto absolute" style={{ top: spotTop, height: spotHeight, left: spotLeft + spotWidth, right: 0 }} onClick={(e) => e.stopPropagation()} />
        </>
      )}

      <button
        type="button"
        onClick={skip}
        className="pointer-events-auto absolute top-6 right-6 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 font-mono text-[11px] tracking-widest text-white/70 uppercase backdrop-blur-sm transition-colors hover:text-white"
      >
        Skip
        <X className="size-3" />
      </button>

      <div
        ref={bubbleRef}
        className="pointer-events-auto fixed right-6 bottom-6 z-10 flex max-w-sm items-end gap-3 sm:right-10 sm:bottom-10"
      >
        <div className="glow-primary relative flex flex-col gap-3 rounded-2xl rounded-bl-sm border border-border/60 bg-popover px-4 py-3 text-sm leading-relaxed text-popover-foreground shadow-xl">
          <p>{step.message}</p>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Step {stepIndex + 1} / {steps.length}
            </span>
            <button
              type="button"
              onClick={advance}
              disabled={nextDisabled}
              className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 font-mono text-[11px] font-medium tracking-widest text-primary-foreground uppercase transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLastStep ? "Finish" : "Next"}
              <ChevronRight className="size-3" />
            </button>
          </div>
        </div>
        <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full sm:size-20" style={{ background: `radial-gradient(circle, ${accent}33, transparent 70%)` }}>
          {portraitSrc && <Image src={portraitSrc} alt="" width={80} height={80} className="relative h-[85%] w-[85%] object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]" />}
        </div>
      </div>
    </div>,
    document.body,
  );
}
