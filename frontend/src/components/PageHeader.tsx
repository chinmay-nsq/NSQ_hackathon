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
    <div className="mb-8 flex flex-col flex-wrap items-start justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold text-balance sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="w-full min-w-0 shrink-0 sm:w-auto">{action}</div>}
    </div>
  );
}
