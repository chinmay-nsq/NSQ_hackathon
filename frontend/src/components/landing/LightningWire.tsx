"use client";

import { useId, useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";

/**
 * Wraps any inline content (typically a text link) and, when hovered/touched,
 * detonates a real branching lightning burst that spreads across and around
 * it — a jagged main bolt plus several forking sub-branches, all regenerated
 * every flicker frame so it never reads as a static asset, driven through a
 * rapid multi-flash with GSAP, backed by a blurred glow duplicate and a soft
 * radial flash behind the text for punch.
 */
export function LightningWire({
  children,
  className = "",
  autoStrikeDelay,
}: {
  children: ReactNode;
  className?: string;
  /** If set, plays one strike automatically this many seconds after mount — so the effect is discovered at least once, not just left as a hidden hover detail. */
  autoStrikeDelay?: number;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const boltGroupRef = useRef<SVGGElement>(null);
  const glowGroupRef = useRef<SVGGElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const flickerTl = useRef<gsap.core.Timeline | null>(null);
  const blurId = useId();

  /** A single jagged path from (x0,y0) to (x1,y1) with random perpendicular jitter. */
  function jaggedPath(x0: number, y0: number, x1: number, y1: number, segments: number, spread: number): string {
    let d = `M ${x0} ${y0}`;
    const dx = x1 - x0;
    const dy = y1 - y0;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const bx = x0 + dx * t;
      const by = y0 + dy * t;
      const jitter = i === segments ? 0 : (Math.random() - 0.5) * spread;
      // perpendicular offset so jitter reads as "electric" rather than just noisy on one axis
      const px = bx - dy * 0.001 * jitter;
      const py = by + dx * 0.001 * jitter + (Math.random() - 0.5) * spread * 0.4;
      d += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    return d;
  }

  /**
   * Builds a ring of bolts that hug the OUTSIDE of the text's bounding box —
   * each one starts on an edge (top/bottom/left/right) and travels further
   * outward, away from the box, so nothing ever crosses over the text
   * itself. Padding keeps every anchor point clear of the content.
   */
  function buildBurst(width: number, height: number): string[] {
    const pad = 14; // gap kept clear around the text — anchors sit outside this
    const paths: string[] = [];
    const boltCount = 5 + Math.floor(Math.random() * 3); // 5-7

    for (let i = 0; i < boltCount; i++) {
      const edge = i % 4; // cycle through all four sides so coverage is even
      let ox: number, oy: number, ex: number, ey: number;

      if (edge === 0) {
        // top edge, shoots further up
        ox = Math.random() * width;
        oy = -pad;
        ex = ox + (Math.random() - 0.5) * width * 0.5;
        ey = -pad - height * (0.35 + Math.random() * 0.55);
      } else if (edge === 1) {
        // bottom edge, shoots further down
        ox = Math.random() * width;
        oy = height + pad;
        ex = ox + (Math.random() - 0.5) * width * 0.5;
        ey = height + pad + height * (0.35 + Math.random() * 0.55);
      } else if (edge === 2) {
        // left edge, shoots further left
        ox = -pad;
        oy = Math.random() * height;
        ex = -pad - width * (0.18 + Math.random() * 0.22);
        ey = oy + (Math.random() - 0.5) * height * 0.8;
      } else {
        // right edge, shoots further right
        ox = width + pad;
        oy = Math.random() * height;
        ex = width + pad + width * (0.18 + Math.random() * 0.22);
        ey = oy + (Math.random() - 0.5) * height * 0.8;
      }

      paths.push(jaggedPath(ox, oy, ex, ey, 5, Math.min(width, height) * 0.25));
    }
    return paths;
  }

  function setPaths(group: SVGGElement, dArr: string[]) {
    const existing = group.querySelectorAll("path");
    dArr.forEach((d, i) => {
      let p = existing[i];
      if (!p) {
        p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        group.appendChild(p);
      }
      p.setAttribute("d", d);
    });
    for (let i = dArr.length; i < existing.length; i++) existing[i].remove();
  }

  function strike() {
    const svg = svgRef.current;
    const boltGroup = boltGroupRef.current;
    const glowGroup = glowGroupRef.current;
    const wrap = wrapRef.current;
    if (!svg || !boltGroup || !glowGroup || !wrap) return;

    flickerTl.current?.kill();

    const width = wrap.offsetWidth;
    const height = Math.max(wrap.offsetHeight, 28);
    // Bolts now reach outward past the box on every side (see buildBurst) —
    // the viewBox has to frame that extra space too, or 1 unit stops
    // meaning 1px and the burst renders at the wrong scale.
    const reachX = width * 0.5;
    const reachY = height * 1.2;
    svg.setAttribute(
      "viewBox",
      `${-reachX} ${-reachY} ${width + reachX * 2} ${height + reachY * 2}`,
    );

    const redraw = () => {
      const paths = buildBurst(width, height);
      setPaths(boltGroup, paths);
      setPaths(glowGroup, paths);
    };
    redraw();

    const tl = gsap.timeline();
    flickerTl.current = tl;
    const groups = [boltGroup, glowGroup];
    tl.set(groups, { opacity: 1 })
      .call(redraw)
      .to(groups, { opacity: 0.1, duration: 0.035 })
      .call(redraw)
      .to(groups, { opacity: 1, duration: 0.025 })
      .call(redraw)
      .to(groups, { opacity: 0.2, duration: 0.05 })
      .call(redraw)
      .to(groups, { opacity: 1, duration: 0.025 })
      .call(redraw)
      .to(groups, { opacity: 0.3, duration: 0.04 })
      .call(redraw)
      .to(groups, { opacity: 1, duration: 0.02 })
      .to(groups, { opacity: 0, duration: 0.45, delay: 0.1, ease: "power2.in" });

    if (flashRef.current) {
      gsap.killTweensOf(flashRef.current);
      gsap.fromTo(
        flashRef.current,
        { opacity: 0.9 },
        { opacity: 0, duration: 0.5, ease: "power2.in" },
      );
    }
  }

  useGSAP(
    () => {
      gsap.set([boltGroupRef.current, glowGroupRef.current], { opacity: 0 });
      if (flashRef.current) gsap.set(flashRef.current, { opacity: 0 });

      if (autoStrikeDelay === undefined) return;
      const id = window.setTimeout(strike, autoStrikeDelay * 1000);
      return () => window.clearTimeout(id);
    },
    { scope: wrapRef, dependencies: [autoStrikeDelay] },
  );

  return (
    <span
      ref={wrapRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={strike}
      onTouchStart={strike}
    >
      {/* Soft radial flash behind the content, punches brighter on every strike */}
      <div
        ref={flashRef}
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-full opacity-0"
        style={{
          background: "radial-gradient(circle, color-mix(in oklch, var(--coral, #ff5a36) 55%, transparent), transparent 70%)",
        }}
      />

      {children}

      {/* Burst overlay — overflows well past the content's own box so bolts have room to radiate outward on every side */}
      <svg
        ref={svgRef}
        className="pointer-events-none absolute -inset-x-10 -inset-y-10 h-[calc(100%+5rem)] w-[calc(100%+5rem)] overflow-visible"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <filter id={blurId} x="-100%" y="-200%" width="300%" height="500%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <g ref={glowGroupRef} opacity="0" stroke="var(--coral, #ff5a36)" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${blurId})`} />
        <g ref={boltGroupRef} opacity="0" stroke="#fff" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
