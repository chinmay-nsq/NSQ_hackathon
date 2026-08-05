export function Card({
  children,
  className = "",
  title,
  eyebrow,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  eyebrow?: string;
}) {
  return (
    <div
      className={`relative bg-card border border-line rounded-sm ${className}`}
      style={{
        boxShadow: "0 1px 0 0 color-mix(in srgb, var(--fg) 6%, transparent) inset, 0 8px 24px -12px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.75"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 55%, transparent), transparent)",
        }}
      />
      {(title || eyebrow) && (
        <div className="px-5 pt-4 pb-3 border-b border-line">
          {eyebrow && <p className="label-caps text-[11px] text-fg-muted mb-1">{eyebrow}</p>}
          {title && <h3 className="font-display text-lg leading-tight">{title}</h3>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
