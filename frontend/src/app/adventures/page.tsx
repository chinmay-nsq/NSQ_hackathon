"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, History, Plus, Sparkles, XCircle } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Adventure, AssignedTaskHistoryItem } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { HoverLift } from "@/components/motion/HoverLift";
import { CreateAdventureDialog } from "@/components/adventures/CreateAdventureDialog";
import { AssignTaskDialog } from "@/components/adventures/AssignTaskDialog";
import { ensureDailyQuiz } from "@/lib/ensureDailyQuiz";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function historyStatus(item: AssignedTaskHistoryItem): { label: string; className: string; icon: typeof Clock } {
  const progress = item.progress?.[0];
  if (!progress?.completed) return { label: "Not started", className: "text-muted-foreground", icon: Clock };
  if (progress.approval === "PENDING") return { label: "Pending review", className: "text-muted-foreground", icon: Clock };
  if (progress.approval === "REJECTED") return { label: "Rejected", className: "text-destructive", icon: XCircle };
  return { label: "Approved", className: "text-success", icon: CheckCircle2 };
}

const TYPE_LABEL: Record<string, string> = {
  SOLO: "Solo",
  GUILD: "Team",
  CROSS_GUILD: "Company",
};

export default function AdventuresPage() {
  const { employee } = useAuthStore();
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<"solo" | "guild" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AssignedTaskHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const canAssignTasks = employee?.role === "MANAGER" || employee?.role === "ADMIN";

  const load = useCallback(() => {
    return api
      .get<{ adventures: Adventure[] }>("/adventures/")
      .then((data) => setAdventures(data.adventures))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load adventures."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Only the initial load auto-generates today's quiz if missing — later
    // refetches (after assigning/creating a task) just refresh the list.
    api
      .get<{ adventures: Adventure[] }>("/adventures/")
      .then((data) => ensureDailyQuiz(data.adventures))
      .then((adventures) => setAdventures(adventures))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load adventures."))
      .finally(() => setLoading(false));
  }, []);

  const loadHistory = useCallback(() => {
    // Only managers/admins can assign tasks (the section is hidden for
    // everyone else) — the endpoint itself is role-guarded too, so a plain
    // employee hitting this just gets a quiet 403 here.
    return api
      .get<{ history: AssignedTaskHistoryItem[] }>("/adventures/assigned-history")
      .then((data) => setHistory(data.history))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    // The "Assigned by you" section only ever renders when canAssignTasks is
    // true, so skipping the fetch otherwise just means historyLoading stays
    // at its initial true — harmless, since the section (and its skeleton)
    // never mounts for a plain employee anyway.
    if (canAssignTasks) void loadHistory();
  }, [canAssignTasks, loadHistory]);

  async function handleGenerate(kind: "solo" | "guild") {
    setGenerating(kind);
    setError(null);
    try {
      await api.post(`/adventures/${kind}/generate`);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not generate an adventure right now.");
    } finally {
      setGenerating(null);
    }
  }

  // Only an AI-generated solo adventure blocks generating another today —
  // manually-created ones (which stay ACTIVE while pending approval) are a
  // separate thing and shouldn't disable this button.
  const hasSoloToday = adventures.some((a) => a.type === "SOLO" && a.status === "ACTIVE" && a.aiGenerated);
  const hasGuildToday = adventures.some((a) => a.type === "GUILD" && a.status === "ACTIVE");
  // Only the guild's own lead (or an admin) can start a team adventure — the
  // backend is the real gate, this just decides whether to show the button.
  const canStartGuildAdventure =
    Boolean(employee?.guildId) &&
    (employee?.role === "ADMIN" ||
      (employee?.role === "MANAGER" && employee?.guild?.managerId === employee?.id));

  return (
    <PageIn>
      <PageHeader
        title="Adventures"
        description="Short tasks that earn you XP, coins, and resources for your team."
        action={
          <div className="flex flex-wrap justify-end gap-2">
            {canAssignTasks && (
              <AssignTaskDialog
                onAssigned={() => {
                  void load();
                  void loadHistory();
                }}
              />
            )}
            <CreateAdventureDialog onCreated={load} />
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs tracking-wide uppercase"
              onClick={() => handleGenerate("solo")}
              disabled={hasSoloToday || generating !== null}
            >
              <Plus />
              {generating === "solo" ? "Generating…" : "New solo adventure"}
            </Button>
            {canStartGuildAdventure && (
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs tracking-wide uppercase"
                onClick={() => handleGenerate("guild")}
                disabled={hasGuildToday || generating !== null}
              >
                <Sparkles />
                {generating === "guild" ? "Generating…" : "New team adventure"}
              </Button>
            )}
          </div>
        }
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : adventures.length === 0 ? (
        <Card className="border-0">
          <CardContent className="px-4 py-10 text-center text-sm text-muted-foreground">
            No adventures yet. Generate your first one above.
          </CardContent>
        </Card>
      ) : (
        <StaggerGrid className="grid gap-3 sm:grid-cols-2" deps={[adventures.length]}>
          {adventures.map((a) => {
            const progress = a.progress?.[0];
            const completed = Boolean(progress?.completed);
            const approval = progress?.approval ?? "NONE";
            return (
              <Link key={a.id} href={`/adventures/${a.id}`}>
                <HoverLift>
                  <Card className={cn("border-0", completed && approval !== "REJECTED" && "opacity-60")}>
                    <CardContent className="px-5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-[10px] tracking-wide uppercase">
                          {TYPE_LABEL[a.type] ?? a.type}
                        </Badge>
                        {approval === "PENDING" ? (
                          <span className="flex items-center gap-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                            <Clock className="size-3.5" />
                            Pending
                          </span>
                        ) : approval === "REJECTED" ? (
                          <span className="flex items-center gap-1 font-mono text-[10px] tracking-wide text-destructive uppercase">
                            <XCircle className="size-3.5" />
                            Rejected
                          </span>
                        ) : completed ? (
                          <CheckCircle2 className="size-4 text-success" />
                        ) : (
                          <span className="tabular font-mono text-xs text-primary">+{a.xpReward} XP</span>
                        )}
                      </div>
                      <p className="font-medium">{a.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
                    </CardContent>
                  </Card>
                </HoverLift>
              </Link>
            );
          })}
        </StaggerGrid>
      )}

      {canAssignTasks && (
        <div className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl tracking-wide uppercase">
            <History className="size-4.5 text-muted-foreground" />
            Assigned by you ({history.length})
          </h2>

          {historyLoading ? (
            <div className="space-y-px">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven&apos;t assigned any tasks yet.</p>
          ) : (
            <StaggerGrid className="divide-y divide-border/60 border-t border-border/60" deps={[history.length]}>
              {history.map((item) => {
                const status = historyStatus(item);
                return (
                  <div key={item.id} className="flex items-start gap-4 py-4">
                    <Avatar className="size-10 shrink-0">
                      <AvatarFallback className="font-display bg-accent text-accent-foreground">
                        {initials(item.createdBy.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.createdBy.name}</p>
                        <span className="text-xs text-muted-foreground">{item.createdBy.title}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] tracking-wide uppercase">
                          {item.title}
                        </Badge>
                        <span className="tabular font-mono text-xs text-primary">
                          +{item.xpReward} XP · +{item.coinReward} coins
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1 font-mono text-[10px] tracking-wide uppercase",
                        status.className
                      )}
                    >
                      <status.icon className="size-3.5" />
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </StaggerGrid>
          )}
        </div>
      )}
    </PageIn>
  );
}
