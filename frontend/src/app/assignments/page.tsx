"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Assignment, BoardTask, Sprint, TaskColumn } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { CreateAssignmentDialog } from "@/components/assignments/CreateAssignmentDialog";
import { AssignTaskDialog } from "@/components/assignments/AssignTaskDialog";
import { TaskBoard } from "@/components/assignments/TaskBoard";
import { TaskDetailDialog } from "@/components/assignments/TaskDetailDialog";
import { SprintSelector, type SprintFilter } from "@/components/assignments/SprintSelector";
import { CreateSprintDialog } from "@/components/assignments/CreateSprintDialog";
import { ensureDailyQuiz } from "@/lib/ensureDailyQuiz";
import { taskWord } from "@/lib/taskLabels";
import { toast } from "sonner";

export default function AssignmentsPage() {
  const { employee } = useAuthStore();
  const router = useRouter();
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<"solo" | "team" | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintFilter, setSprintFilter] = useState<SprintFilter>("all");
  const [boardReady, setBoardReady] = useState(false);
  const sprintDefaultedRef = useRef(false);

  const canAssignTasks = employee?.role === "MANAGER" || employee?.role === "ADMIN";

  const loadSprints = useCallback(() => {
    return api
      .get<{ sprints: Sprint[] }>("/sprints")
      .then((data) => {
        setSprints(data.sprints);
        // First load only: default the view to whichever sprint is
        // currently active, so opening the board lands you on "now" —
        // falls back to "All tasks" once no sprint is in progress. Later
        // refreshes (e.g. after creating a sprint) never override a filter
        // the viewer has already chosen.
        if (!sprintDefaultedRef.current) {
          sprintDefaultedRef.current = true;
          const current = data.sprints.find((s) => s.isCurrent);
          if (current) setSprintFilter(current.id);
        }
      })
      .catch(() => {});
  }, []);

  const loadBoard = useCallback((filter: SprintFilter) => {
    const query = filter === "all" ? "" : `?sprintId=${encodeURIComponent(filter)}`;
    return api
      .get<{ tasks: BoardTask[] }>(`/assignments/board${query}`)
      .then((data) => setTasks(data.tasks))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load the board."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!employee) return;
    // Ensure today's quiz exists (employees only — managers have no
    // personal daily task) and resolve the default sprint filter before the
    // board's first load, so it doesn't load once, then reload a moment
    // later once the real default is known.
    const ensureQuiz = canAssignTasks
      ? Promise.resolve()
      : api
          .get<{ assignments: Assignment[] }>("/assignments/")
          .then((data) => ensureDailyQuiz(data.assignments))
          .catch(() => {});

    Promise.all([loadSprints(), ensureQuiz]).then(() => setBoardReady(true));
  }, [employee, canAssignTasks, loadSprints]);

  useEffect(() => {
    if (!boardReady) return;
    setLoading(true);
    void loadBoard(sprintFilter);
  }, [sprintFilter, boardReady, loadBoard]);

  async function handleGenerate(kind: "solo" | "team") {
    setGenerating(kind);
    setError(null);
    try {
      await api.post(`/assignments/${kind}/generate`);
      await loadBoard(sprintFilter);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not generate an assignment right now.");
    } finally {
      setGenerating(null);
    }
  }

  /**
   * Drag-and-drop between columns. The card moves locally first so the drop
   * feels instant, then the server call confirms it; if that fails we put
   * the board back exactly as it was rather than leaving a card sitting in
   * a column the server never accepted.
   *
   * This only moves the card. Rewards are still paid by approving through
   * the task dialog, so dropping something in Done credits nobody.
   */
  async function handleMoveTask(taskId: string, column: TaskColumn) {
    const previous = tasks;
    const moving = previous.find((t) => t.id === taskId);
    if (!moving || moving.column === column) return;

    setTasks((current) => current.map((t) => (t.id === taskId ? { ...t, column } : t)));

    try {
      await api.post(`/assignments/${taskId}/board-status`, { column });
    } catch (err) {
      setTasks(previous);
      toast.error(err instanceof ApiRequestError ? err.message : "Could not move that card.");
    }
  }

  function handleOpenTask(task: BoardTask) {
    // Quiz-type tasks (the personal daily quiz) keep their own dedicated
    // question-by-question flow — everything else opens the real enlarged
    // detail view (comments, history, approve/reject) in place.
    if (task.quiz && task.quiz.length > 0) {
      router.push(`/assignments/${task.id}`);
      return;
    }
    setOpenTaskId(task.id);
    setDetailOpen(true);
  }

  const hasSoloToday = tasks.some((t) => t.type === "SOLO" && t.status === "ACTIVE" && t.aiGenerated);
  const hasTeamToday = tasks.some((t) => t.type === "TEAM" && t.status === "ACTIVE");
  const canStartTeamAssignment =
    Boolean(employee?.teamId) &&
    (employee?.role === "ADMIN" ||
      (employee?.role === "MANAGER" && employee?.team?.managerId === employee?.id));

  return (
    <PageIn>
      <PageHeader
        title={taskWord(employee?.role)}
        description="Everyone on your team, one real board — not just what's assigned to you."
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SprintSelector sprints={sprints} value={sprintFilter} onChange={setSprintFilter} />
            {canAssignTasks && (
              <CreateSprintDialog
                onCreated={(sprint) => {
                  setSprints((prev) => [sprint, ...prev]);
                  setSprintFilter(sprint.id);
                }}
              />
            )}
            {canAssignTasks && (
              <AssignTaskDialog
                sprints={sprints}
                defaultSprintId={sprintFilter !== "all" && sprintFilter !== "backlog" ? sprintFilter : undefined}
                onAssigned={() => loadBoard(sprintFilter)}
              />
            )}
            {/* "Create your own task" — self-service, not available for managers. */}
            {!canAssignTasks && (
              <>
                <CreateAssignmentDialog onCreated={() => loadBoard(sprintFilter)} />
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs tracking-wide uppercase"
                  onClick={() => handleGenerate("solo")}
                  disabled={hasSoloToday || generating !== null}
                >
                  <Plus />
                  {generating === "solo" ? "Generating…" : "New solo assignment"}
                </Button>
              </>
            )}
            {canStartTeamAssignment && (
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs tracking-wide uppercase"
                onClick={() => handleGenerate("team")}
                disabled={hasTeamToday || generating !== null}
              >
                <Sparkles />
                {generating === "team" ? "Generating…" : "New team assignment"}
              </Button>
            )}
          </div>
        }
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card className="border-0">
          <CardContent className="px-4 py-10 text-center text-sm text-muted-foreground">
            No {taskWord(employee?.role).toLowerCase()} yet.
          </CardContent>
        </Card>
      ) : (
        <TaskBoard tasks={tasks} onOpenTask={handleOpenTask} onMoveTask={handleMoveTask} />
      )}

      <TaskDetailDialog
        taskId={openTaskId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onChanged={() => loadBoard(sprintFilter)}
        sprints={sprints}
      />
    </PageIn>
  );
}
