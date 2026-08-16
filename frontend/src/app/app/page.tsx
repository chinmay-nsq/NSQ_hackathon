"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Coins, Flame, Sparkles, Star, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { Adventure, DialogueAction } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { HoverLift } from "@/components/motion/HoverLift";
import { CountUp } from "@/components/motion/CountUp";
import { AnimatedBar } from "@/components/motion/AnimatedBar";
import { CompanionViewer } from "@/components/companion3d/CompanionViewer";
import { ensureDailyQuiz } from "@/lib/ensureDailyQuiz";

const FALLBACK_DIALOGUE = "I'm here with you — let's see what today brings!";
const XP_PER_LEVEL = 100;

const DIALOGUE_ACTION_ROUTE: Record<DialogueAction["topic"], string> = {
  adventures: "/adventures",
  approvals: "/approvals",
  teams: "/teams",
};

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3.5 px-2 py-1">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted"
        style={accent ? { color: accent, boxShadow: `0 0 16px 0 ${accent}33` } : undefined}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="tabular font-display text-xl leading-tight">
          <CountUp value={value} />
        </p>
        <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { employee } = useAuthStore();
  const router = useRouter();
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [dialogueAction, setDialogueAction] = useState<DialogueAction | undefined>(undefined);
  const [dialogueLoading, setDialogueLoading] = useState(true);
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [adventuresLoading, setAdventuresLoading] = useState(true);

  useEffect(() => {
    // Ensure today's quiz exists BEFORE asking the companion for a greeting
    // — otherwise the dialogue request can race ahead and describe "nothing
    // pending" right before the quiz silently appears a moment later.
    api
      .get<{ adventures: Adventure[] }>("/adventures/")
      .then((data) => ensureDailyQuiz(data.adventures))
      .catch(() => [] as Adventure[])
      .then((adventures) => {
        setAdventures(adventures);
        setAdventuresLoading(false);

        api
          .get<{ dialogue: string; action?: DialogueAction }>("/companion/dialogue")
          .then((data) => {
            setDialogue(data.dialogue);
            setDialogueAction(data.action);
          })
          .catch(() => setDialogue(FALLBACK_DIALOGUE))
          .finally(() => setDialogueLoading(false));
      });
  }, []);

  const pendingAdventures = adventures.filter((a) => !a.progress?.[0]?.completed && a.status === "ACTIVE");
  const xpIntoLevel = (employee?.xp ?? 0) % XP_PER_LEVEL;
  const tourQuestId =
    pendingAdventures.find((a) => a.quiz && a.quiz.length > 0)?.id ?? pendingAdventures[0]?.id;

  return (
    <PageIn>
      <PageHeader
        title={`Welcome back${employee ? `, ${employee.name.split(" ")[0]}` : ""}`}
        description="Here's what's happening with you and your team today."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glow-primary bg-grid relative overflow-hidden border-0 lg:col-span-2">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_0%,var(--glow-primary),transparent)]" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
              <Sparkles className="size-3.5 text-primary" />
              Your companion
            </CardTitle>
          </CardHeader>
          <CardContent className="relative flex flex-col items-center gap-4 px-4 text-center sm:flex-row sm:items-center sm:text-left">
            {employee?.companion && (
              <CompanionViewer
                species={employee.companion.species}
                className="h-24 w-24 shrink-0"
                interactive={false}
              />
            )}
            <div className="min-w-0 flex-1">
              {dialogueLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <>
                  <p className="text-base leading-relaxed">{dialogue}</p>
                  {dialogueAction && (
                    <button
                      type="button"
                      data-cursor="magnetic"
                      onClick={() => router.push(DIALOGUE_ACTION_ROUTE[dialogueAction.topic])}
                      className="group mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 font-mono text-[11px] font-medium tracking-widest text-primary uppercase transition-colors hover:border-primary/50 hover:bg-primary/20"
                    >
                      {dialogueAction.label}
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardContent className="flex flex-col gap-3.5 px-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-display text-lg tracking-wide">Level {employee?.level ?? 1}</span>
              <span className="tabular font-mono text-xs text-muted-foreground">
                {xpIntoLevel} / {XP_PER_LEVEL} XP
              </span>
            </div>
            <AnimatedBar pct={xpIntoLevel} fillClassName="bg-xp shadow-[0_0_10px_0_var(--xp)]" />
            <Badge variant="secondary" className="w-fit font-mono text-[10px] tracking-wide uppercase">
              {employee?.title ?? "Member"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid divide-y divide-border/60 border border-border/60 rounded-xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <StatTile icon={Star} label="Total XP" value={employee?.xp ?? 0} />
        <StatTile icon={Coins} label="Coins" value={employee?.coins ?? 0} accent="var(--currency)" />
        <StatTile icon={Flame} label="Pending Adventures" value={pendingAdventures.length} />
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl tracking-wide uppercase">Today&apos;s Adventures</h2>
          <Button
            variant="ghost"
            size="sm"
            className="font-mono text-xs tracking-wide uppercase"
            render={
              <Link href="/adventures">
                View all
                <ArrowRight />
              </Link>
            }
          />
        </div>

        {adventuresLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : pendingAdventures.length === 0 ? (
          <Card className="border-0">
            <CardContent className="px-4 py-6 text-center text-sm text-muted-foreground">
              No adventures yet today.{" "}
              <Link href="/adventures" className="text-primary underline-offset-2 hover:underline">
                Generate one
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <StaggerGrid className="grid gap-3 sm:grid-cols-2" deps={[pendingAdventures.length]}>
            {pendingAdventures.slice(0, 4).map((a) => (
              <Link key={a.id} href={`/adventures/${a.id}`} data-tour={a.id === tourQuestId ? "quest-card" : undefined}>
                <HoverLift>
                  <Card className="border-0">
                    <CardContent className="px-5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-[10px] tracking-wide uppercase">
                          {a.type.replace("_", " ")}
                        </Badge>
                        <span className="tabular font-mono text-xs text-primary">+{a.xpReward} XP</span>
                      </div>
                      <p className="font-medium">{a.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
                    </CardContent>
                  </Card>
                </HoverLift>
              </Link>
            ))}
          </StaggerGrid>
        )}
      </div>
    </PageIn>
  );
}
