export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 pb-6 mb-8 border-b border-line">
      <div>
        <p className="label-caps text-xs text-accent mb-2">{eyebrow}</p>
        <h1 className="font-display text-3xl leading-tight">{title}</h1>
        {description && <p className="text-sm text-fg-muted mt-2 max-w-xl">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
