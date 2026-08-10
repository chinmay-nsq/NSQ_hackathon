"use client";

import { useState } from "react";

const COLORS = ["#ff5a36", "#ffcdb8", "#ffe9a8"];

interface Particle {
  left: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  drift: number;
}

/**
 * Full-page ambient dust, drifting slowly upward behind all content — the
 * same warm-glow feel as the crystal's particles, but a lightweight CSS
 * layer (not WebGL) since it needs to run continuously behind the entire
 * scrollable page rather than orbiting one 3D object.
 */
export function AmbientParticles({ count = 44 }: { count?: number }) {
  // Lazy one-time random init (React's documented escape hatch) — never re-runs on render.
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 14 + Math.random() * 18,
      delay: -Math.random() * 30,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      drift: (Math.random() - 0.5) * 60,
    }))
  );

  return (
    <div className="ambient-particles pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {particles.map((p, i) => (
        <span
          key={i}
          className="ambient-particle"
          style={
            {
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              boxShadow: `0 0 ${p.size * 2.5}px ${p.size * 0.6}px ${p.color}`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
