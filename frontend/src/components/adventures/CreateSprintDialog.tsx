"use client";

import { useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Guild, Sprint } from "@/lib/types";
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
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [guildsLoaded, setGuildsLoaded] = useState(false);
  const [guildId, setGuildId] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(addDaysISO(14));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || guildsLoaded) return;
    api
      .get<{ guilds: Guild[] }>("/guilds/managed")
      .then((data) => {
        setGuilds(data.guilds);
        if (data.guilds.length > 0) setGuildId(data.guilds[0].id);
      })
      .catch(() => setGuilds([]))
      .finally(() => setGuildsLoaded(true));
  }, [open, guildsLoaded]);

  function reset() {
    setName("");
    setStartDate(todayISO());
    setEndDate(addDaysISO(14));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guildId) {
      setError("You don't lead a team yet.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await api.post<{ sprint: Sprint }>("/sprints", {
        guildId,
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
            {guilds.length > 1 && (
              <div className="space-y-1.5">
                <Label className="font-mono text-xs tracking-wide uppercase">Team</Label>
                <select
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {guilds.map((g) => (
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
