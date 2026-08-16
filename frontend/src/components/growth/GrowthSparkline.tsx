"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { WeeklyPoint } from "@/lib/types";

const WIDTH = 480;
const HEIGHT = 120;
const PAD_X = 12;
const PAD_Y = 16;

/** Formats a "YYYY-MM-DD" week-start into a short label, e.g. "Aug 4". */
function shortLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** A smoothed path through `points`, using simple quadratic midpoint smoothing rather than a straight polyline. */
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const cur = points[i];
    const next = points[i + 1];
    const midX = (cur.x + next.x) / 2;
    const midY = (cur.y + next.y) / 2;
    d += ` Q ${cur.x},${cur.y} ${midX},${midY}`;
  }
  const last = points[points.length - 1];
  d += ` T ${last.x},${last.y}`;
  return d;
}

/**
 * A hand-rolled SVG trend line — deliberately not a charting library (see
 * growth feature plan): this project's whole visual language is raw <svg>
 * driven by GSAP (AnimatedBar, ResourceMeter, the landing page), and 6 data
 * points is well within what a ~100-line component handles cleanly.
 *
 * The line draws itself on with a real stroke-dashoffset animation, the
 * area beneath fades in behind it, and each point pops in with a staggered
 * bounce once the line has finished drawing — three distinct motions
 * layered together instead of one flat fade. Hovering (or tapping, on
 * touch) a point shows a real styled tooltip anchored to it, not the
 * browser's default title-attribute tooltip.
 */
export function GrowthSparkline({
  points,
  color = "var(--chart-1)",
  valueSuffix = "",
  className = "",
}: {
  points: WeeklyPoint[];
  color?: string;
  valueSuffix?: string;
  className?: string;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const dotsRef = useRef<SVGGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const gradientId = useId();
  const [hovered, setHovered] = useState<{ x: number; y: number; label: string; value: string } | null>(null);

  const { linePath, areaPath, plotted, maxValue } = useMemo(() => {
    const values = points.map((p) => p.value);
    const max = Math.max(1, ...values);
    const innerW = WIDTH - PAD_X * 2;
    const innerH = HEIGHT - PAD_Y * 2;

    const plottedPoints = points.map((p, i) => ({
      x: PAD_X + (points.length > 1 ? (innerW * i) / (points.length - 1) : innerW / 2),
      y: PAD_Y + innerH - (p.value / max) * innerH,
      raw: p,
    }));

    const line = buildSmoothPath(plottedPoints);
    const area =
      plottedPoints.length > 0
        ? `${line} L ${plottedPoints[plottedPoints.length - 1].x},${HEIGHT - PAD_Y} L ${plottedPoints[0].x},${HEIGHT - PAD_Y} Z`
        : "";

    return { linePath: line, areaPath: area, plotted: plottedPoints, maxValue: max };
  }, [points]);

  useGSAP(
    () => {
      const path = pathRef.current;
      const area = areaRef.current;
      const dots = dotsRef.current;
      if (!path) return;

      const length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      gsap.set(area, { opacity: 0 });
      const dotEls = dots ? Array.from(dots.children) : [];
      gsap.set(dotEls, { opacity: 0, scale: 0, transformOrigin: "center" });

      const tl = gsap.timeline();
      tl.to(path, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" })
        .to(area, { opacity: 1, duration: 0.6, ease: "power1.out" }, "-=0.7")
        .to(dotEls, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.06, ease: "back.out(2.4)" }, "-=0.5");

      return () => {
        tl.kill();
      };
    },
    { dependencies: [linePath], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      const tip = tooltipRef.current;
      if (!tip) return;
      if (hovered) {
        gsap.killTweensOf(tip);
        gsap.fromTo(tip, { opacity: 0, y: 6, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: "power2.out" });
      }
    },
    { dependencies: [hovered?.label, hovered?.value] },
  );

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full overflow-visible"
        preserveAspectRatio="none"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path ref={areaRef} d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path ref={pathRef} d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        <g ref={dotsRef}>
          {plotted.map((p, i) => {
            const label = `${shortLabel(p.raw.weekStart)}: ${p.raw.value}${valueSuffix}`;
            return (
              <g key={i}>
                {/* generous invisible hit target — the visible dot alone is too small to hover/tap reliably */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={14}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered({ x: p.x, y: p.y, label: shortLabel(p.raw.weekStart), value: `${p.raw.value}${valueSuffix}` })}
                  onFocus={() => setHovered({ x: p.x, y: p.y, label: shortLabel(p.raw.weekStart), value: `${p.raw.value}${valueSuffix}` })}
                  onBlur={() => setHovered(null)}
                  onClick={() => setHovered((cur) => (cur?.x === p.x ? null : { x: p.x, y: p.y, label: shortLabel(p.raw.weekStart), value: `${p.raw.value}${valueSuffix}` }))}
                  tabIndex={0}
                  role="img"
                  aria-label={label}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={maxValue > 0 && p.raw.value === 0 ? 2.5 : 4}
                  fill={color}
                  className="pointer-events-none"
                  style={hovered?.x === p.x ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}
                />
              </g>
            );
          })}
        </g>
      </svg>

      {hovered && (
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border/60 bg-popover px-2.5 py-1.5 whitespace-nowrap shadow-lg"
          style={{ left: `${(hovered.x / WIDTH) * 100}%`, top: `${(hovered.y / HEIGHT) * 100}%`, marginTop: -8 }}
        >
          <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">{hovered.label}</p>
          <p className="tabular text-sm font-semibold text-popover-foreground">{hovered.value}</p>
        </div>
      )}

      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground/70">
        <span>{points[0] ? shortLabel(points[0].weekStart) : ""}</span>
        <span>{points[points.length - 1] ? shortLabel(points[points.length - 1].weekStart) : ""}</span>
      </div>
    </div>
  );
}
