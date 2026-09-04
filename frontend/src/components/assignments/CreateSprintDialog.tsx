"use client";

import { useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Team, Sprint } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Manager/admin-only: starts a new two-week sprint their team's tasks can be planned into. */
export function CreateSprintDialog({ onCreated }: { onCreated: (sprint: Sprint) => void }) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(addDaysISO(14));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || teamsLoaded) return;
    api
      .get<{ teams: Team[] }>("/teams/managed")
      .then((data) => {
        setTeams(data.teams);
        if (data.teams.length > 0) setTeamId(data.teams[0].id);
      })
      .catch(() => setTeams([]))
      .finally(() => setTeamsLoaded(true));
  }, [open, teamsLoaded]);

  function reset() {
    setName("");
    setStartDate(todayISO());
    setEndDate(addDaysISO(14));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) {
      setError("You don't lead a team yet.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await api.post<{ sprint: Sprint }>("/sprints", {
        teamId,
        name: name.trim(),
        startDate,
        endDate,
      });
      setOpen(false);
      reset();
      onCreated(data.sprint);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create this sprint.");
    } finally {
      setSubmitting(false);
    }
  }

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
          <Button variant="outline" size="sm" className="font-mono text-xs tracking-wide uppercase">
            <CalendarPlus />
            New sprint
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-wide uppercase">Start a sprint</DialogTitle>
            <DialogDescription>Plan your team's tasks into a time-boxed sprint.</DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            {teams.length > 1 && (
              <div className="space-y-1.5">
                <Label className="font-mono text-xs tracking-wide uppercase">Team</Label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {teams.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="sprint-name" className="font-mono text-xs tracking-wide uppercase">
                Name
              </Label>
              <Input
                id="sprint-name"
                required
                minLength={2}
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sprint 3"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sprint-start" className="font-mono text-xs tracking-wide uppercase">
                  Start
                </Label>
                <Input
                  id="sprint-start"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sprint-end" className="font-mono text-xs tracking-wide uppercase">
                  End
                </Label>
                <Input id="sprint-end" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={submitting} className="glow-primary font-mono text-xs tracking-wide uppercase">
              {submitting ? "Creating…" : "Create sprint"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
