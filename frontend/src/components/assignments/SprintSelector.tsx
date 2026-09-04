"use client";

import { CalendarRange, ChevronDown } from "lucide-react";
import { Sprint } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** A real sprint id, or one of the two synthetic views: every recent task, or just the unplanned backlog. */
export type SprintFilter = string | "backlog" | "all";

function formatRange(startISO: string, endISO: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${new Date(startISO).toLocaleDateString(undefined, opts)} – ${new Date(endISO).toLocaleDateString(undefined, opts)}`;
}

/** Board-scoping control — pick a sprint to see exactly its tasks, the backlog, or everything recent. */
export function SprintSelector({
  sprints,
  value,
  onChange,
}: {
  sprints: Sprint[];
  value: SprintFilter;
  onChange: (value: SprintFilter) => void;
}) {
  const selected = sprints.find((s) => s.id === value);
  const label = value === "all" ? "All tasks" : value === "backlog" ? "Backlog" : (selected?.name ?? "All tasks");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="font-mono text-xs tracking-wide uppercase">
            <CalendarRange />
            {label}
            <ChevronDown className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="min-w-56 p-1">
        <DropdownMenuItem onClick={() => onChange("all")} className="justify-between px-2 py-1.5">
          All tasks
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("backlog")} className="justify-between px-2 py-1.5">
          Backlog
        </DropdownMenuItem>
        {sprints.length > 0 && <div className="my-1 h-px bg-border/60" />}
        {sprints.map((s) => (
          <DropdownMenuItem key={s.id} onClick={() => onChange(s.id)} className="flex-col items-start gap-0.5 px-2 py-1.5">
            <span className="flex w-full items-center justify-between">
              <span className="font-medium">
                {s.name}
                {s.isCurrent && <span className="ml-1.5 font-mono text-[9px] text-success uppercase">Current</span>}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{s.taskCount}</span>
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{formatRange(s.startDate, s.endDate)}</span>
          </DropdownMenuItem>
        ))}
        {sprints.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">No sprints yet</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
