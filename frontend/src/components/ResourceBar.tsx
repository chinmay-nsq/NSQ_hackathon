const RESOURCE_META: Record<string, { label: string; color: string; symbol: string }> = {
  knowledge: { label: "Knowledge", color: "var(--fg-muted)", symbol: "K" },
  gold: { label: "Gold", color: "var(--value)", symbol: "G" },
  influence: { label: "Influence", color: "var(--accent)", symbol: "I" },
  materials: { label: "Materials", color: "var(--success)", symbol: "M" },
};

export function ResourceBar({
  resource,
  current,
  needed,
}: {
  resource: string;
  current: number;
  needed: number;
}) {
  const meta = RESOURCE_META[resource] ?? { label: resource, color: "var(--fg-muted)", symbol: "?" };
  const pct = needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 100;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="label-caps text-[11px] text-fg-muted flex items-center gap-1.5">
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
            style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 25%, transparent)`, color: meta.color }}
          >
            {meta.symbol}
          </span>
          {meta.label}
        </span>
        <span className="tabular text-xs text-fg-muted">
          {current}
          {needed > 0 ? <span className="opacity-50"> / {needed}</span> : ""}
        </span>
      </div>
      <div className="h-1.5 bg-bg-deep rounded-none overflow-hidden border border-line">
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: meta.color }}
        />
      </div>
    </div>
  );
}
