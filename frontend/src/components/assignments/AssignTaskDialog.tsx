"use client";

import { useEffect, useState } from "react";
import { UserPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api";
import { Team, Sprint, WorkItemType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CompanionViewer } from "@/components/companion3d/CompanionViewer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const WORK_ITEM_OPTIONS: { value: WorkItemType; label: string }[] = [
  { value: "TASK", label: "Task" },
  { value: "STORY", label: "Story" },
  { value: "BUG", label: "Bug" },
];

/** Manager/admin-only: hand-writes a task and assigns it to one or more members of a team they lead. */
export function AssignTaskDialog({
  onAssigned,
  sprints = [],
  defaultSprintId,
}: {
  onAssigned: () => void;
  /** Recent sprints, for the "plan into" picker — passed down from the board so it doesn't re-fetch its own copy. */
  sprints?: Sprint[];
  /** Pre-selects whichever sprint the board is currently scoped to, if any. */
  defaultSprintId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [workItemType, setWorkItemType] = useState<WorkItemType>("TASK");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [xpReward, setXpReward] = useState(25);
  const [coinReward, setCoinReward] = useState(15);
  const [sprintId, setSprintId] = useState(defaultSprintId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadingTeams = open && !teamsLoaded;

  async function handleGenerateWithAI(targetEmployeeId: string) {
    setGeneratingId(targetEmployeeId);
    try {
      await api.post(`/assignments/solo/generate-for/${targetEmployeeId}`);
      toast.success("Generated a task with AI");
      setOpen(false);
      reset();
      onAssigned();
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError
          ? err.message
          : "Could not generate a task — they may not have completed their profile yet."
      );
    } finally {
      setGeneratingId(null);
    }
  }

  useEffect(() => {
    if (!open || teamsLoaded) return;
    api
      .get<{ teams: Team[] }>("/teams/managed")
      .then((data) => setTeams(data.teams))
      .catch(() => setTeams([]))
      .finally(() => setTeamsLoaded(true));
  }, [open, teamsLoaded]);

  useEffect(() => {
    if (open) setSprintId(defaultSprintId ?? "");
  }, [open, defaultSprintId]);

  function reset() {
    setSelectedIds(new Set());
    setWorkItemType("TASK");
    setTitle("");
    setDescription("");
    setXpReward(25);
    setCoinReward(15);
    setSprintId(defaultSprintId ?? "");
    setError(null);
  }

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) => (prev.size === members.length ? new Set() : new Set(members.map((m) => m.id))));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setError("Choose who this task is for.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/assignments/solo/assign", {
        employeeIds: Array.from(selectedIds),
        title: title.trim(),
        description: description.trim(),
        xpReward,
        coinReward,
        workItemType,
        ...(sprintId ? { sprintId } : {}),
      });
      setOpen(false);
      reset();
      onAssigned();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not assign this task.");
    } finally {
      setSubmitting(false);
    }
  }

  const members = teams.flatMap((g) => g.members.map((m) => ({ ...m, teamName: g.name })));
  const allSelected = members.length > 0 && selectedIds.size === members.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="font-mono text-xs tracking-wide uppercase" data-tour="assign-task-btn">
            <UserPlus />
            Create Task
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-wide uppercase">Create a task</DialogTitle>
            <DialogDescription>Hand-write a task and assign it to one or more of your team&apos;s members.</DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-mono text-xs tracking-wide uppercase">Type</Label>
                <div className="flex gap-1.5">
                  {WORK_ITEM_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setWorkItemType(opt.value)}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-2 text-center font-mono text-xs tracking-wide uppercase transition-colors",
                        workItemType === opt.value
                          ? "border-primary bg-accent font-medium text-primary"
                          : "border-border text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assign-sprint" className="font-mono text-xs tracking-wide uppercase">
                  Sprint
                </Label>
                <select
                  id="assign-sprint"
                  value={sprintId}
                  onChange={(e) => setSprintId(e.target.value)}
                  className="h-9.5 w-full rounded-md border border-border bg-background px-3 text-sm"
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
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="font-mono text-xs tracking-wide uppercase">Assign to</Label>
                {members.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase hover:text-foreground"
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
              {loadingTeams ? (
                <p className="text-sm text-muted-foreground">Loading your team…</p>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You don&apos;t lead a team with any members yet.
                </p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-1.5">
                  {members.map((m) => {
                    const checked = selectedIds.has(m.id);
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          checked ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleMember(m.id)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleMember(m.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {m.species && (
                            <CompanionViewer species={m.species} interactive={false} className="size-8 shrink-0" />
                          )}
                          <span className="min-w-0 flex-1 truncate">
                            <span className="font-medium">{m.name}</span>
                            {m.companionName && <span className="text-muted-foreground"> · {m.companionName}</span>}
                          </span>
                          {teams.length > 1 && (
                            <span className="shrink-0 text-xs text-muted-foreground">{m.teamName}</span>
                          )}
                        </button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={generatingId === m.id}
                          onClick={() => handleGenerateWithAI(m.id)}
                          className="h-7 shrink-0 px-2 font-mono text-[10px] tracking-wide uppercase"
                          title="Generate a task for this person with AI, based on their profile"
                        >
                          <Sparkles className="size-3" />
                          {generatingId === m.id ? "…" : "AI"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedIds.size > 0 && (
                <p className="font-mono text-[11px] text-muted-foreground uppercase">
                  {selectedIds.size} member{selectedIds.size === 1 ? "" : "s"} selected
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-title" className="font-mono text-xs tracking-wide uppercase">
                Title
              </Label>
              <Input
                id="assign-title"
                required
                minLength={3}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Review the Q3 roadmap doc"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-description" className="font-mono text-xs tracking-wide uppercase">
                Description
              </Label>
              <Textarea
                id="assign-description"
                required
                minLength={10}
                maxLength={2000}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should they do?"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assign-xp" className="font-mono text-xs tracking-wide uppercase">
                  XP reward
                </Label>
                <Input
                  id="assign-xp"
                  type="number"
                  min={5}
                  max={200}
                  value={xpReward}
                  onChange={(e) => setXpReward(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-coins" className="font-mono text-xs tracking-wide uppercase">
                  Coin reward
                </Label>
                <Input
                  id="assign-coins"
                  type="number"
                  min={5}
                  max={200}
                  value={coinReward}
                  onChange={(e) => setCoinReward(Number(e.target.value))}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="submit"
              disabled={submitting || members.length === 0}
              className="glow-primary font-mono text-xs tracking-wide uppercase"
            >
              {submitting
                ? "Creating…"
                : selectedIds.size > 1
                  ? `Create for ${selectedIds.size}`
                  : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
