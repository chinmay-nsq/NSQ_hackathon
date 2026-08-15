"use client";

import { useId, useImperativeHandle, useRef, forwardRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { generateBolt, type BoltSegment } from "@/lib/lightning/generateBolt";
import { playSparkSound } from "@/lib/audio/sparkSound";

export interface LightningBurstHandle {
  /** Detonates from (originX, originY) in viewport coordinates, covering roughly `reach` px in every direction. Resolves once the visual has fully played out. */
  fire: (originX: number, originY: number, reach: number) => Promise<void>;
  /** Fires four independent bolt clusters from the four screen corners, all converging inward toward the viewport center. Resolves once fully played out. */
  fireConverge: () => Promise<void>;
}

const BOLT_COLOR = "#5ec4ff"; // cool electric blue, not the brand coral
const BOLT_COLOR_CORE = "#eaf6ff"; // near-white-blue core for the hottest part of each bolt
const FLASH_COUNT = 4;

/**
 * A fixed, full-viewport SVG overlay that detonates fractal lightning —
 * either radiating outward from one point (`fire`) or as four clusters
 * converging inward from the screen's corners toward center
 * (`fireConverge`). Renders nothing until one of those is called.
 */
export const LightningBurst = forwardRef<LightningBurstHandle>(function LightningBurst(_props, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const glowGroupRef = useRef<SVGGElement>(null);
  const coreGroupRef = useRef<SVGGElement>(null);
  const flashRefs = useRef<(HTMLDivElement | null)[]>([]);
  const blurId = useId();

  /** Bolts radiating outward from a single point in every direction. */
  function buildRadiatingBranches(ox: number, oy: number, reach: number): BoltSegment[] {
    const strikeCount = 6 + Math.floor(Math.random() * 3); // 6-8
    const segments: BoltSegment[] = [];

    for (let i = 0; i < strikeCount; i++) {
      const angle = (Math.PI * 2 * i) / strikeCount + (Math.random() - 0.5) * 0.9;
      const len = reach * (0.55 + Math.random() * 0.55);
      const ex = ox + Math.cos(angle) * len;
      const ey = oy + Math.sin(angle) * len;
      segments.push(
        ...generateBolt(ox, oy, ex, ey, {
          displacement: len * 0.22,
          maxDepth: 6,
          branchChance: 0.4,
          branchLengthFactor: 0.5,
        }),
      );
    }
    return segments;
  }

  /** A cluster of bolts starting at a corner and traveling toward (targetX, targetY), fanning out slightly rather than a single straight line. */
  function buildConvergingCluster(cornerX: number, cornerY: number, targetX: number, targetY: number): BoltSegment[] {
    const strikeCount = 3 + Math.floor(Math.random() * 2); // 3-4 per corner
    const segments: BoltSegment[] = [];
    const baseDx = targetX - cornerX;
    const baseDy = targetY - cornerY;
    const baseLen = Math.hypot(baseDx, baseDy) || 1;
    const baseAngle = Math.atan2(baseDy, baseDx);

    for (let i = 0; i < strikeCount; i++) {
      const spread = (Math.random() - 0.5) * 0.5; // fan out slightly around the straight line to target
      const reach = baseLen * (0.85 + Math.random() * 0.25);
      const angle = baseAngle + spread;
      const ex = cornerX + Math.cos(angle) * reach;
      const ey = cornerY + Math.sin(angle) * reach;
      segments.push(
        ...generateBolt(cornerX, cornerY, ex, ey, {
          displacement: baseLen * 0.16,
          maxDepth: 6,
          branchChance: 0.35,
          branchLengthFactor: 0.45,
        }),
      );
    }
    return segments;
  }

  function renderSegments(group: SVGGElement, segments: BoltSegment[]) {
    const existing = group.querySelectorAll("polyline");
    segments.forEach((seg, i) => {
      let p = existing[i];
      if (!p) {
        p = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        group.appendChild(p);
      }
      p.setAttribute("points", seg.points);
      // Deeper branches are thinner and dimmer — sells the "sub-branch" feel.
      const opacityByDepth = Math.max(0.35, 1 - seg.depth * 0.14);
      p.setAttribute("opacity", opacityByDepth.toFixed(2));
    });
    for (let i = segments.length; i < existing.length; i++) existing[i].remove();
  }

  /** Shared flicker timeline: calls `redraw` repeatedly while the segments pulse in/out, then fully fades and resolves. */
  function playFlicker(redraw: () => void): Promise<void> {
    return new Promise((resolve) => {
      const glowGroup = glowGroupRef.current;
      const coreGroup = coreGroupRef.current;
      if (!glowGroup || !coreGroup) {
        resolve();
        return;
      }

      redraw();
      const groups = [glowGroup, coreGroup];
      const tl = gsap.timeline({ onComplete: resolve });
      tl.set(groups, { opacity: 1 })
        .call(redraw)
        .to(groups, { opacity: 0.15, duration: 0.045 })
        .call(redraw)
        .to(groups, { opacity: 1, duration: 0.03 })
        .call(redraw)
        .to(groups, { opacity: 0.25, duration: 0.06 })
        .call(redraw)
        .to(groups, { opacity: 1, duration: 0.03 })
        .call(redraw)
        .to(groups, { opacity: 0.35, duration: 0.05 })
        .call(redraw)
        .to(groups, { opacity: 1, duration: 0.025 })
        .to(groups, { opacity: 0.15, duration: 0.4, ease: "power2.in" })
        .call(redraw)
        .to(groups, { opacity: 0.7, duration: 0.05 })
        .to(groups, { opacity: 0, duration: 0.5, ease: "power2.in" });
    });
  }

  function flashAt(index: number, x: number, y: number, size: number) {
    const flash = flashRefs.current[index];
    if (!flash) return;
    gsap.killTweensOf(flash);
    gsap.set(flash, { left: x, top: y, width: size, height: size });
    gsap.fromTo(flash, { opacity: 0.85, scale: 0.6 }, { opacity: 0, scale: 1.15, duration: 0.85, ease: "power2.in" });
  }

  useImperativeHandle(ref, () => ({
    async fire(originX: number, originY: number, reach: number) {
      playSparkSound();
      flashAt(0, originX, originY, reach * 2.6);
      await playFlicker(() => {
        const glowGroup = glowGroupRef.current;
        const coreGroup = coreGroupRef.current;
        if (!glowGroup || !coreGroup) return;
        const segments = buildRadiatingBranches(originX, originY, reach);
        renderSegments(glowGroup, segments);
        renderSegments(coreGroup, segments);
      });
    },

    async fireConverge() {
      playSparkSound();

      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;
      const corners = [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: 0, y: h },
        { x: w, y: h },
      ];
      const flashSize = Math.max(w, h) * 0.55;
      corners.forEach((corner, i) => flashAt(i, corner.x, corner.y, flashSize));

      await playFlicker(() => {
        const glowGroup = glowGroupRef.current;
        const coreGroup = coreGroupRef.current;
        if (!glowGroup || !coreGroup) return;
        const segments = corners.flatMap((corner) => buildConvergingCluster(corner.x, corner.y, cx, cy));
        renderSegments(glowGroup, segments);
        renderSegments(coreGroup, segments);
      });
    },
  }));

  useGSAP(() => {
    gsap.set([glowGroupRef.current, coreGroupRef.current], { opacity: 0 });
    flashRefs.current.forEach((f) => f && gsap.set(f, { opacity: 0 }));
  });

  return (
    <>
      {Array.from({ length: FLASH_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            flashRefs.current[i] = el;
          }}
          aria-hidden
          className="pointer-events-none fixed z-40 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
          style={{
            background: `radial-gradient(circle, color-mix(in oklch, ${BOLT_COLOR} 55%, transparent), transparent 70%)`,
          }}
        />
      ))}
      <svg ref={svgRef} className="pointer-events-none fixed inset-0 z-40 h-full w-full overflow-visible" aria-hidden>
        <defs>
          <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <g
          ref={glowGroupRef}
          opacity="0"
          stroke={BOLT_COLOR}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${blurId})`}
        />
        <g
          ref={coreGroupRef}
          opacity="0"
          stroke={BOLT_COLOR_CORE}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
});
