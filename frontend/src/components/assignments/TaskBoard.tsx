"use client";

import { useRef, useState } from "react";
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

/** Identifies our own cards on the drag payload, so foreign drags are ignored. */
const DRAG_MIME = "application/x-skibidi-task";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function TaskCard({
  task,
  dragging,
  onOpen,
  onDragStateChange,
}: {
  task: BoardTask;
  dragging: boolean;
  onOpen: (task: BoardTask) => void;
  onDragStateChange: (taskId: string | null) => void;
}) {
  const workItem = WORK_ITEM_STYLE[task.workItemType ?? "TASK"];
  // A drag ends with a click event on the card, which would otherwise open
  // the detail dialog the moment you drop. This remembers that a drag just
  // happened so the click that follows it can be ignored.
  const draggedRef = useRef(false);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      aria-label={`${task.title} — drag to move between columns`}
      onDragStart={(e) => {
        draggedRef.current = true;
        e.dataTransfer.setData(DRAG_MIME, task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStateChange(task.id);
      }}
      onDragEnd={() => onDragStateChange(null)}
      onClick={() => {
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        onOpen(task);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task);
        }
      }}
      className={cn(
        "w-full cursor-grab rounded-xl border border-border/60 bg-card p-3.5 text-left transition-[colors,opacity] select-none",
        "hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        "active:cursor-grabbing",
        dragging && "opacity-40"
      )}
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
    </div>
  );
}

/**
 * The whole-team Kanban board — every real task for the viewer's team(s).
 *
 * Cards are dragged between columns, which writes the card's stored
 * `boardStatus` and nothing else: dragging to Done does NOT credit XP, and
 * dragging back out does not claw anything back. Paying out rewards stays
 * with the approvals flow (open a card and approve it), so the board can
 * move freely without money moving with it.
 */
export function TaskBoard({
  tasks,
  onOpenTask,
  onMoveTask,
}: {
  tasks: BoardTask[];
  onOpenTask: (task: BoardTask) => void;
  onMoveTask: (taskId: string, column: TaskColumn) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskColumn | null>(null);

  const draggingTask = draggingId ? tasks.find((t) => t.id === draggingId) : undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.column === col.key);
        // The column a dragged card came from isn't a real target.
        const isTarget = draggingTask !== undefined && draggingTask.column !== col.key;
        const isOver = isTarget && overColumn === col.key;

        return (
          <div key={col.key} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                <col.icon className="size-3.5" />
                {col.label}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">{columnTasks.length}</span>
            </div>
            <div
              // dragover must be cancelled for the drop to be allowed at all.
              // Tracking the hovered column here rather than on dragleave
              // avoids the flicker you get as the pointer crosses child cards.
              onDragOver={(e) => {
                if (!isTarget) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOverColumn(col.key);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData(DRAG_MIME);
                setOverColumn(null);
                setDraggingId(null);
                if (taskId && isTarget) onMoveTask(taskId, col.key);
              }}
              className={cn(
                "flex min-h-24 flex-col gap-2.5 rounded-2xl border border-dashed border-border/50 bg-muted/20 p-2.5 transition-colors",
                isTarget && "border-primary/30",
                isOver && "border-solid border-primary bg-accent/50"
              )}
            >
              {columnTasks.length === 0 ? (
                <p className="px-1.5 py-3 text-center text-xs text-muted-foreground">
                  {isOver ? "Drop to move here" : "No tasks here."}
                </p>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    dragging={draggingId === task.id}
                    onOpen={onOpenTask}
                    onDragStateChange={(id) => {
                      setDraggingId(id);
                      if (id === null) setOverColumn(null);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
