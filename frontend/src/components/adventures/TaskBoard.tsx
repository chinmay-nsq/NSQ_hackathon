"use client";

import { Star, ClipboardCheck, RotateCcw, CheckCircle2 } from "lucide-react";
import { BoardTask, TaskColumn } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const COLUMNS: { key: TaskColumn; label: string; icon: typeof ClipboardCheck }[] = [
  { key: "todo", label: "To Do", icon: ClipboardCheck },
  { key: "in_review", label: "In Review", icon: ClipboardCheck },
  { key: "needs_rework", label: "Needs Rework", icon: RotateCcw },
  { key: "done", label: "Done", icon: CheckCircle2 },
];

const WORK_ITEM_STYLE: Record<string, { label: string; className: string }> = {
  TASK: { label: "Task", className: "border-primary/40 text-primary" },
  STORY: { label: "Story", className: "border-[var(--chart-2)]/40 text-[var(--chart-2)]" },
  BUG: { label: "Bug", className: "border-destructive/40 text-destructive" },
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function TaskCard({ task, onOpen }: { task: BoardTask; onOpen: (task: BoardTask) => void }) {
  const workItem = WORK_ITEM_STYLE[task.workItemType ?? "TASK"];
  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className="w-full rounded-xl border border-border/60 bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="mb-2 flex items-center justify-between">
        <Badge variant="outline" className={cn("font-mono text-[10px] tracking-wide uppercase", workItem.className)}>
          {workItem.label}
        </Badge>
        <span className="flex items-center gap-1 font-mono text-[11px] text-primary">
          <Star className="size-3" />
          {task.xpReward}
        </span>
      </div>
      <p className="line-clamp-2 text-sm font-medium">{task.title}</p>
      {task.assignee && (
        <div className="mt-3 flex items-center gap-2">
          <Avatar className="size-5 shrink-0">
            <AvatarFallback className="font-display text-[9px]">{initials(task.assignee.name)}</AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-muted-foreground">{task.assignee.name}</span>
        </div>
      )}
    </button>
  );
}

/**
 * The whole-team Kanban board — every real task for the viewer's guild(s),
 * grouped into columns derived straight from the same completed/approval
 * fields the approvals flow already uses (no separate hand-maintained
 * status). Moving a card is click-based: open it, take the real action
 * (submit/approve/reject) that already exists — the board just visualizes
 * where that leaves it, it doesn't invent a free-drag status.
 */
export function TaskBoard({ tasks, onOpenTask }: { tasks: BoardTask[]; onOpenTask: (task: BoardTask) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.column === col.key);
        return (
          <div key={col.key} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                <col.icon className="size-3.5" />
                {col.label}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">{columnTasks.length}</span>
            </div>
            <div className="flex min-h-24 flex-col gap-2.5 rounded-2xl border border-dashed border-border/50 bg-muted/20 p-2.5">
              {columnTasks.length === 0 ? (
                <p className="px-1.5 py-3 text-center text-xs text-muted-foreground">No tasks here.</p>
              ) : (
                columnTasks.map((task) => <TaskCard key={task.id} task={task} onOpen={onOpenTask} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
