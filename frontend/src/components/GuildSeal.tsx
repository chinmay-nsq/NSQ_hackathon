const GUILD_COLORS: Record<string, string> = {
  hammer: "var(--accent)",
  book: "var(--fg-muted)",
  coin: "var(--value)",
  flame: "var(--warning)",
};

export function GuildSeal({ emblem, name, size = 40 }: { emblem: string; name: string; size?: number }) {
  const color = GUILD_COLORS[emblem] ?? "var(--accent)";
  const initial = name.replace(/^(the|guild)\s+/i, "").charAt(0).toUpperCase();

  return (
    <div
      className="shrink-0 rounded-full flex items-center justify-center font-display italic"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        color,
        border: `1.5px solid ${color}`,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      {initial}
    </div>
  );
}
