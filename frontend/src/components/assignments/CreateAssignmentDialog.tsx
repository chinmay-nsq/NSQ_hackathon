"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
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

export function CreateAssignmentDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/assignments/solo/create", { title: title.trim(), description: description.trim() });
      setOpen(false);
      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create this assignment.");
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
            <PenLine />
            Create your own
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-wide uppercase">
              Create an assignment
            </DialogTitle>
            <DialogDescription>
              Write your own task. Once you mark it complete, your manager reviews it before you get
              credited.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="assignment-title" className="font-mono text-xs tracking-wide uppercase">
                Title
              </Label>
              <Input
                id="assignment-title"
                required
                minLength={3}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Refactor the onboarding flow"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assignment-description" className="font-mono text-xs tracking-wide uppercase">
                Description
              </Label>
              <Textarea
                id="assignment-description"
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you do, and why does it matter?"
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
              {submitting ? "Creating…" : "Create assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
