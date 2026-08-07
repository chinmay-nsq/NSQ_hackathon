"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Guild } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Manager/admin-only: hand-writes a task and assigns it directly to one member of a team they lead. */
export function AssignTaskDialog({ onAssigned }: { onAssigned: () => void }) {
  const [open, setOpen] = useState(false);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [guildsLoaded, setGuildsLoaded] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [xpReward, setXpReward] = useState(25);
  const [coinReward, setCoinReward] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingGuilds = open && !guildsLoaded;

  useEffect(() => {
    if (!open || guildsLoaded) return;
    api
      .get<{ guilds: Guild[] }>("/guilds/managed")
      .then((data) => setGuilds(data.guilds))
      .catch(() => setGuilds([]))
      .finally(() => setGuildsLoaded(true));
  }, [open, guildsLoaded]);

  function reset() {
    setEmployeeId(null);
    setTitle("");
    setDescription("");
    setXpReward(25);
    setCoinReward(15);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) {
      setError("Choose who this task is for.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/adventures/solo/assign", {
        employeeId,
        title: title.trim(),
        description: description.trim(),
        xpReward,
        coinReward,
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

  const members = guilds.flatMap((g) => g.members.map((m) => ({ ...m, guildName: g.name })));

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
            <UserPlus />
            Assign task
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-wide uppercase">Assign a task</DialogTitle>
            <DialogDescription>Hand-write a task for someone on your team.</DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="font-mono text-xs tracking-wide uppercase">Assign to</Label>
              {loadingGuilds ? (
                <p className="text-sm text-muted-foreground">Loading your team…</p>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You don&apos;t lead a team with any members yet.
                </p>
              ) : (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-1.5">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEmployeeId(m.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                        employeeId === m.id ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
                      )}
                    >
                      <span>{m.name}</span>
                      <span className="text-xs text-muted-foreground">{m.guildName}</span>
                    </button>
                  ))}
                </div>
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
              {submitting ? "Assigning…" : "Assign task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
