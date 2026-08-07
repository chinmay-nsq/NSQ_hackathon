"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
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

/** Manager/admin-only: creates a new guild (team). The creating manager becomes its lead. */
export function CreateGuildDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDepartment("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/guilds", { name: name.trim(), department: department.trim() });
      setOpen(false);
      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create this team.");
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
            <Plus />
            New team
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-wide uppercase">Create a team</DialogTitle>
            <DialogDescription>You&apos;ll be set as this team&apos;s manager.</DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="guild-name" className="font-mono text-xs tracking-wide uppercase">
                Team name
              </Label>
              <Input
                id="guild-name"
                required
                minLength={3}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nightwatch Guild"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guild-department" className="font-mono text-xs tracking-wide uppercase">
                Department
              </Label>
              <Input
                id="guild-department"
                required
                minLength={2}
                maxLength={80}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Design"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="submit"
              disabled={submitting}
              className="glow-primary font-mono text-xs tracking-wide uppercase"
            >
              {submitting ? "Creating…" : "Create team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
