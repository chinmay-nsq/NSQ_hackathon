/** A single polyline segment, ready for an SVG `points` attribute. */
export interface BoltSegment {
  points: string;
  /** 0 = main trunk, higher = deeper branch (thinner, dimmer, shorter-lived). */
  depth: number;
}

/**
 * Recursively subdivides a line from (x0,y0) to (x1,y1), displacing the
 * midpoint sideways each time (the classic "midpoint displacement" fractal
 * used for real lightning-bolt generation), and randomly spawns shorter
 * branch segments off to the side at each subdivision. Produces a jagged,
 * organically-branching bolt rather than a straight ray or a simple zigzag.
 */
export function generateBolt(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  options: {
    displacement: number;
    depth?: number;
    maxDepth?: number;
    branchChance?: number;
    branchLengthFactor?: number;
  },
): BoltSegment[] {
  const { displacement, depth = 0, maxDepth = 5, branchChance = 0.35, branchLengthFactor = 0.55 } = options;

  if (depth >= maxDepth || displacement < 1.5) {
    return [{ points: `${x0.toFixed(1)},${y0.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`, depth }];
  }

  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  // perpendicular unit vector
  const perpX = -dy / len;
  const perpY = dx / len;
  const offset = (Math.random() - 0.5) * displacement;
  const midX = mx + perpX * offset;
  const midY = my + perpY * offset;

  const segments: BoltSegment[] = [
    ...generateBolt(x0, y0, midX, midY, { displacement: displacement * 0.6, depth: depth + 1, maxDepth, branchChance, branchLengthFactor }),
    ...generateBolt(midX, midY, x1, y1, { displacement: displacement * 0.6, depth: depth + 1, maxDepth, branchChance, branchLengthFactor }),
  ];

  if (Math.random() < branchChance && depth < maxDepth - 1) {
    const branchAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.6 + (Math.random() < 0.5 ? -0.5 : 0.5);
    const branchLen = len * branchLengthFactor * (0.4 + Math.random() * 0.6);
    const bx = midX + Math.cos(branchAngle) * branchLen;
    const by = midY + Math.sin(branchAngle) * branchLen;
    segments.push(
      ...generateBolt(midX, midY, bx, by, {
        displacement: displacement * 0.5,
        depth: depth + 2,
        maxDepth,
        branchChance: branchChance * 0.6,
        branchLengthFactor,
      }),
    );
  }

  return segments;
}
