"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Plus, Sparkles, XCircle } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Adventure } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { HoverLift } from "@/components/motion/HoverLift";
import { CreateAdventureDialog } from "@/components/adventures/CreateAdventureDialog";

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

  const load = useCallback(() => {
    return api
      .get<{ adventures: Adventure[] }>("/adventures/")
      .then((data) => setAdventures(data.adventures))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load adventures."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <PageIn>
      <PageHeader
        title="Adventures"
        description="Short tasks that earn you XP, coins, and resources for your team."
        action={
          <div className="flex flex-wrap justify-end gap-2">
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
            {employee?.guildId && (
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
    </PageIn>
  );
}
