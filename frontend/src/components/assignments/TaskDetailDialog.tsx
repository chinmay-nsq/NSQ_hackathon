"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star, Coins, Send, Check, X, Clock, User } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { TaskDetail, TaskActivityEntry, Sprint } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const WORK_ITEM_STYLE: Record<string, { label: string; className: string }> = {
  TASK: { label: "Task", className: "border-primary/40 text-primary" },
  STORY: { label: "Story", className: "border-[var(--chart-2)]/40 text-[var(--chart-2)]" },
  BUG: { label: "Bug", className: "border-destructive/40 text-destructive" },
};

const COLUMN_LABEL: Record<string, { label: string; className: string }> = {
  todo: { label: "To Do", className: "text-muted-foreground" },
  in_review: { label: "In Review", className: "text-[var(--chart-4)]" },
  needs_rework: { label: "Needs Rework", className: "text-destructive" },
  done: { label: "Done", className: "text-success" },
};

const ACTIVITY_LABEL: Record<string, string> = {
  CREATED: "created",
  ASSIGNED: "assigned",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMMENTED: "commented",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function ActivityRow({ entry }: { entry: TaskActivityEntry }) {
  return (
    <div className="flex gap-2.5 py-1.5">
      <Clock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{entry.actor.name}</span> {ACTIVITY_LABEL[entry.type] ?? entry.type.toLowerCase()}
        {" — "}
        {entry.detail}
        <span className="ml-1.5 text-muted-foreground/70">{formatWhen(entry.createdAt)}</span>
      </p>
    </div>
  );
}

/**
 * The enlarged task view — opened by clicking a board card instead of just
 * seeing the card. Real title/description/assignee/status, real comments,
 * and the real full movement history (never a mocked timeline). The action
 * buttons here ARE how a card actually changes column — reuses the exact
 * existing complete/approve/reject endpoints, so there's no parallel
 * "set status" mechanism to keep in sync with the real approval workflow.
 */
export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
  onChanged,
  sprints = [],
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  /** Recent sprints, for the "move to sprint" control — passed down from the board rather than re-fetched here. */
  sprints?: Sprint[];
}) {
  const { employee } = useAuthStore();
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  // Which task `detail` actually belongs to — compared against `taskId` at
  // render time to derive "still loading" / "stale from a previous task",
  // rather than a separate loading flag set synchronously inside the effect.
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submission, setSubmission] = useState("");
  const [acting, setActing] = useState(false);
  const [movingSprint, setMovingSprint] = useState(false);

  const isManager = employee?.role === "MANAGER" || employee?.role === "ADMIN";
  const loading = taskId !== null && detailTaskId !== taskId;

  function load() {
    if (!taskId) return;
    api
      .get<TaskDetail>(`/assignments/${taskId}/detail`)
      .then((data) => {
        setDetail(data);
        setDetailTaskId(taskId);
      })
      .catch(() => {
        setDetail(null);
        setDetailTaskId(taskId);
      });
  }

  useEffect(() => {
    if (!open || !taskId) return;
    let cancelled = false;
    api
      .get<TaskDetail>(`/assignments/${taskId}/detail`)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setDetailTaskId(taskId);
      })
      .catch(() => {
        if (cancelled) return;
        setDetail(null);
        setDetailTaskId(taskId);
      });
    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  async function handleAddComment() {
    if (!taskId || !commentBody.trim()) return;
    setSubmittingComment(true);
    try {
      await api.post(`/assignments/${taskId}/comments`, { body: commentBody.trim() });
      setCommentBody("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not add that comment.");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleMarkComplete() {
    if (!taskId) return;
    setActing(true);
    try {
      await api.post(`/assignments/${taskId}/complete`, { submission: submission.trim() || undefined });
      toast.success("Submitted for review");
      setSubmission("");
      load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not submit this task.");
    } finally {
      setActing(false);
    }
  }

  async function handleApprove() {
    if (!taskId || !detail?.assignment.assignee) return;
    setActing(true);
    try {
      await api.post(`/assignments/${taskId}/approve/${detail.assignment.assignee.id}`);
      toast.success("Approved");
      load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not approve this task.");
    } finally {
      setActing(false);
    }
  }

  async function handleMoveSprint(nextSprintId: string) {
    if (!taskId) return;
    setMovingSprint(true);
    try {
      await api.post(`/assignments/${taskId}/sprint`, { sprintId: nextSprintId || null });
      toast.success(nextSprintId ? "Moved to sprint" : "Moved to backlog");
      load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not move this task.");
    } finally {
      setMovingSprint(false);
    }
  }

  async function handleReject() {
    if (!taskId || !detail?.assignment.assignee) return;
    setActing(true);
    try {
      await api.post(`/assignments/${taskId}/reject/${detail.assignment.assignee.id}`);
      toast.success("Rejected — sent back for rework");
      load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not reject this task.");
    } finally {
      setActing(false);
    }
  }

  const assignment = detail?.assignment;
  const workItem = WORK_ITEM_STYLE[assignment?.workItemType ?? "TASK"];
  const column = COLUMN_LABEL[assignment?.column ?? "todo"];
  const isMyTask = assignment?.assignee?.id === employee?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {loading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-20" />
            <Skeleton className="h-24" />
          </div>
        ) : !assignment ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Could not load this task.</p>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("font-mono text-[10px] tracking-wide uppercase", workItem.className)}>
                  {workItem.label}
                </Badge>
                <span className={cn("font-mono text-[10px] tracking-widest uppercase", column.className)}>
                  {column.label}
                </span>
              </div>
              <DialogTitle className="font-display text-xl tracking-wide">{assignment.title}</DialogTitle>
            </DialogHeader>

            <p className="text-sm leading-relaxed text-muted-foreground">{assignment.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <Star className="size-4 text-xp" />
                {assignment.xpReward} XP
              </span>
              <span className="flex items-center gap-1.5">
                <Coins className="size-4 text-currency" />
                {assignment.coinReward} coins
              </span>
              {assignment.assignee && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="size-4" />
                  Assigned to {assignment.assignee.name}
                </span>
              )}
            </div>

            {isManager && (
              <div className="flex items-center gap-2">
                <label className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Sprint</label>
                <select
                  value={assignment.sprintId ?? ""}
                  disabled={movingSprint}
                  onChange={(e) => handleMoveSprint(e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value="">Backlog (no sprint)</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.isCurrent ? " · Current" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Real actions — the only way a card actually moves columns. */}
            {assignment.column === "todo" && isMyTask && (
              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3.5">
                <Textarea
                  value={submission}
                  onChange={(e) => setSubmission(e.target.value)}
                  placeholder="Add a note about what you did (optional)"
                  rows={2}
                />
                <Button size="sm" disabled={acting} onClick={handleMarkComplete} className="glow-primary">
                  {acting ? "Submitting…" : "Mark complete"}
                </Button>
              </div>
            )}
            {assignment.column === "in_review" && isManager && (
              <div className="flex gap-2">
                <Button size="sm" disabled={acting} onClick={handleApprove} className="glow-primary">
                  <Check />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={acting}
                  onClick={handleReject}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <X />
                  Reject
                </Button>
              </div>
            )}

            <div className="border-t border-border/60 pt-4">
              <h4 className="mb-2 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">History</h4>
              <div className="max-h-32 space-y-0.5 overflow-y-auto">
                {detail.activity.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No activity yet.</p>
                ) : (
                  detail.activity.map((entry) => <ActivityRow key={entry.id} entry={entry} />)
                )}
              </div>
            </div>

            <div className="border-t border-border/60 pt-4">
              <h4 className="mb-2 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                Comments ({detail.comments.length})
              </h4>
              <div className="mb-3 max-h-40 space-y-2.5 overflow-y-auto">
                {detail.comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar className="size-6 shrink-0">
                      <AvatarFallback className="font-display text-[10px]">{initials(c.author.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 rounded-lg bg-muted/40 px-3 py-1.5">
                      <p className="text-xs font-medium">{c.author.name}</p>
                      <p className="text-sm">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Add a comment…"
                  rows={1}
                  className="min-h-9"
                />
                <Button
                  size="icon-sm"
                  disabled={submittingComment || !commentBody.trim()}
                  onClick={handleAddComment}
                  className="shrink-0"
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
