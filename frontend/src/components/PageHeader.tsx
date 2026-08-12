export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col flex-wrap items-start justify-between gap-6 border-b border-border/60 pb-6 sm:flex-row">
      <div className="min-w-0">
        <h1 className="font-display text-3xl tracking-wide uppercase sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="w-full min-w-0 shrink-0 sm:w-auto">{action}</div>}
    </div>
  );
}
