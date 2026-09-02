"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Coins, Flame, Sparkles, Star, ListChecks, CheckCircle2, Users, ClipboardCheck, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { Adventure, DialogueAction, EmployeeGrowth, TeamGrowth, GrowthInsight } from "@/lib/types";
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
import { GrowthSparkline } from "@/components/growth/GrowthSparkline";
import { GrowthInsightCard } from "@/components/growth/GrowthInsightCard";
import { ensureDailyQuiz } from "@/lib/ensureDailyQuiz";
import { LightningBurst, type LightningBurstHandle } from "@/components/landing/LightningBurst";
import { taskWord } from "@/lib/taskLabels";
import { THUNDERBOLT_ENABLED } from "@/lib/featureFlags";

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
  suffix = "",
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
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
          {suffix}
        </p>
        <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      </div>
    </div>
  );
}

/** Same read as the full Growth page's own delta badge — the magnitude and direction of change since the start of the window, spelled out rather than left for the chart shape to imply. */
function DeltaBadge({ deltaPct }: { deltaPct: number | null }) {
  if (deltaPct === null) {
    return <span className="font-mono text-xs text-muted-foreground">— no trend yet</span>;
  }
  const isGood = deltaPct >= 0;
  const sign = deltaPct > 0 ? "+" : "";
  return (
    <span className={`font-mono text-xs font-medium ${isGood ? "text-success" : "text-destructive"}`}>
      {sign}
      {deltaPct}% vs earlier
    </span>
  );
}

export default function DashboardPage() {
  const { employee } = useAuthStore();
  const router = useRouter();
  // Managers don't have a visible companion (see CompanionService.autoProvisionHidden)
  // — no companion card, no companion dialogue, no daily quiz, no self-created tasks.
  const isManager = employee?.role === "MANAGER" || employee?.role === "ADMIN";
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [dialogueAction, setDialogueAction] = useState<DialogueAction | undefined>(undefined);
  const [dialogueLoading, setDialogueLoading] = useState(!isManager);
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [adventuresLoading, setAdventuresLoading] = useState(true);
  const [myGrowth, setMyGrowth] = useState<EmployeeGrowth | null>(null);
  const [teamGrowth, setTeamGrowth] = useState<TeamGrowth | null>(null);
  const [growthInsight, setGrowthInsight] = useState<GrowthInsight | null>(null);
  const [growthLoading, setGrowthLoading] = useState(true);
  const [pendingClaimsCount, setPendingClaimsCount] = useState(0);
  const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(0);
  const burstRef = useRef<LightningBurstHandle>(null);
  const stillLoading = dialogueLoading || adventuresLoading;

  // A compact preview of the same real analytics the Growth page shows in
  // full — managers see their team's rollup, everyone else sees their own.
  // Both endpoints already compute a real AI insight alongside the numbers
  // (grounded in what's actually in `growth`, never invented) — pulling
  // that in too is what actually makes this section readable at a glance
  // instead of just handing over an unlabeled chart shape.
  useEffect(() => {
    if (!employee) return;
    const request = isManager
      ? api.get<{ growth: TeamGrowth; insight: GrowthInsight }>("/growth/team").then((data) => {
          setTeamGrowth(data.growth);
          setGrowthInsight(data.insight);
        })
      : api.get<{ growth: EmployeeGrowth; insight: GrowthInsight }>("/growth/me").then((data) => {
          setMyGrowth(data.growth);
          setGrowthInsight(data.insight);
        });
    request.catch(() => {}).finally(() => setGrowthLoading(false));
  }, [employee, isManager]);

  // Managers don't earn XP/levels themselves — the thing they actually need
  // at a glance is what's waiting on them, so this replaces that slot.
  useEffect(() => {
    if (!employee || !isManager) return;
    Promise.all([
      api.get<{ claims: unknown[] }>("/marketplace/claims/pending"),
      api.get<{ pending: unknown[] }>("/adventures/pending"),
    ])
      .then(([claims, tasks]) => {
        setPendingClaimsCount(claims.claims.length);
        setPendingSubmissionsCount(tasks.pending.length);
      })
      .catch(() => {});
  }, [employee, isManager]);

  // While this page's own data is still loading (companion dialogue +
  // today's adventures), a click anywhere strikes a real lightning bolt at
  // the click point instead of silently doing nothing on the skeletons.
  useEffect(() => {
    if (!THUNDERBOLT_ENABLED || !stillLoading) return;
    function onClick(e: MouseEvent) {
      void burstRef.current?.fire(e.clientX, e.clientY, 120);
    }
    window.addEventListener("click", onClick, { capture: true });
    return () => window.removeEventListener("click", onClick, { capture: true });
  }, [stillLoading]);

  useEffect(() => {
    if (!employee) return;

    // Ensure today's quiz exists BEFORE asking the companion for a greeting
    // — otherwise the dialogue request can race ahead and describe "nothing
    // pending" right before the quiz silently appears a moment later.
    // Managers skip the daily quiz entirely (no personal daily task).
    api
      .get<{ adventures: Adventure[] }>("/adventures/")
      .then((data) => (isManager ? data.adventures : ensureDailyQuiz(data.adventures)))
      .catch(() => [] as Adventure[])
      .then((adventures) => {
        setAdventures(adventures);
        setAdventuresLoading(false);

        if (isManager) return;

        api
          .get<{ dialogue: string; action?: DialogueAction }>("/companion/dialogue")
          .then((data) => {
            setDialogue(data.dialogue);
            setDialogueAction(data.action);
          })
          .catch(() => setDialogue(FALLBACK_DIALOGUE))
          .finally(() => setDialogueLoading(false));
      });
  }, [employee, isManager]);

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
        {/* Managers don't get a companion card — no visible companion for that role. */}
        {!isManager && (
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
        )}

        {isManager ? (
          <Card className="glow-primary bg-grid relative overflow-hidden border-0 lg:col-span-3">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_0%,var(--glow-primary),transparent)]" />
            <CardContent className="relative flex flex-col items-center justify-between gap-4 px-5 sm:flex-row">
              <div>
                <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Needs your attention</p>
                <p className="font-display text-3xl tracking-wide">
                  <CountUp value={pendingClaimsCount + pendingSubmissionsCount} />
                </p>
                <p className="text-sm text-muted-foreground">
                  {pendingClaimsCount} reward claim{pendingClaimsCount === 1 ? "" : "s"} · {pendingSubmissionsCount} task
                  submission{pendingSubmissionsCount === 1 ? "" : "s"} waiting on you
                </p>
              </div>
              <Button
                className="glow-primary shrink-0 font-mono text-xs tracking-wide uppercase"
                render={
                  <Link href="/approvals">
                    Review now
                    <ArrowRight />
                  </Link>
                }
              />
            </CardContent>
          </Card>
        ) : (
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
        )}
      </div>

      <div className="mt-6 grid divide-y divide-border/60 border border-border/60 rounded-xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {isManager ? (
          <>
            <StatTile icon={Users} label="Team size" value={teamGrowth?.memberCount ?? 0} />
            <StatTile icon={ClipboardCheck} label="Pending approvals" value={pendingClaimsCount + pendingSubmissionsCount} accent="var(--destructive)" />
            <StatTile icon={ListChecks} label="Tasks completed" value={teamGrowth?.totalTasksCompleted ?? 0} accent="var(--chart-1)" />
          </>
        ) : (
          <>
            <StatTile icon={Star} label="Total XP" value={employee?.xp ?? 0} />
            <StatTile icon={Coins} label="Coins" value={employee?.coins ?? 0} accent="var(--currency)" />
            <StatTile icon={Flame} label={`Pending ${taskWord(employee?.role)}`} value={pendingAdventures.length} />
          </>
        )}
      </div>

      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl tracking-wide uppercase">
            {isManager ? "Team Growth" : "Your Growth"}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="font-mono text-xs tracking-wide uppercase"
            render={
              <Link href="/growth">
                View full growth
                <ArrowRight />
              </Link>
            }
          />
        </div>

        {growthLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : isManager ? (
          teamGrowth === null || teamGrowth.memberCount === 0 ? (
            <Card className="border-0">
              <CardContent className="px-4 py-6 text-center text-sm text-muted-foreground">
                Once your team has completed some tasks, their collective growth will show up here.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-0">
                  <CardContent className="px-5 py-4">
                    <div className="mb-1 flex items-start justify-between">
                      <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                        Team accuracy
                      </span>
                      <div className="text-right">
                        <p className="tabular font-display text-lg leading-tight">{teamGrowth.skill.currentPct ?? 0}%</p>
                        <DeltaBadge deltaPct={teamGrowth.skill.deltaPct} />
                      </div>
                    </div>
                    <GrowthSparkline points={teamGrowth.skill.weekly} color="var(--chart-4)" valueSuffix="%" className="h-20" />
                  </CardContent>
                </Card>
                <Card className="border-0">
                  <CardContent className="px-5 py-4">
                    <div className="mb-1 flex items-start justify-between">
                      <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                        Sprint completion
                      </span>
                      <div className="text-right">
                        <p className="tabular font-display text-lg leading-tight">
                          {teamGrowth.sprintCompletion.currentPct ?? 0}%
                        </p>
                        <DeltaBadge deltaPct={teamGrowth.sprintCompletion.deltaPct} />
                      </div>
                    </div>
                    {teamGrowth.sprintCompletion.sprintCount === 0 ? (
                      <p className="flex h-20 items-center justify-center text-center text-xs text-muted-foreground">
                        No sprints yet
                      </p>
                    ) : (
                      <GrowthSparkline points={teamGrowth.sprintCompletion.weekly} color="var(--chart-2)" valueSuffix="%" className="h-20" />
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="grid divide-y divide-border/60 border border-border/60 rounded-xl sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <StatTile icon={ListChecks} label="Tasks completed" value={teamGrowth.totalTasksCompleted} accent="var(--chart-1)" />
                <StatTile
                  icon={CheckCircle2}
                  label="Approval rate"
                  value={teamGrowth.approval.ratePct ?? 0}
                  suffix={teamGrowth.approval.ratePct !== null ? "%" : ""}
                  accent="var(--success)"
                />
              </div>
              {growthInsight && <GrowthInsightCard insight={growthInsight} />}
            </div>
          )
        ) : myGrowth === null ? (
          <Card className="border-0">
            <CardContent className="px-4 py-6 text-center text-sm text-muted-foreground">
              Complete a quest to start tracking your growth.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-0">
                <CardContent className="px-5 py-4">
                  <div className="mb-1 flex items-start justify-between">
                    <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                      Quiz accuracy
                    </span>
                    <div className="text-right">
                      <p className="tabular font-display text-lg leading-tight">{myGrowth.skill.currentPct ?? 0}%</p>
                      <DeltaBadge deltaPct={myGrowth.skill.deltaPct} />
                    </div>
                  </div>
                  <GrowthSparkline points={myGrowth.skill.weekly} color="var(--chart-4)" valueSuffix="%" className="h-20" />
                </CardContent>
              </Card>
              <Card className="border-0">
                <CardContent className="px-5 py-4">
                  <div className="mb-1 flex items-start justify-between">
                    <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                      XP / week
                    </span>
                    <div className="text-right">
                      <p className="tabular font-display text-lg leading-tight">{myGrowth.output.thisWeekXp} xp</p>
                      <DeltaBadge deltaPct={myGrowth.output.deltaPct} />
                    </div>
                  </div>
                  <GrowthSparkline points={myGrowth.output.xpByWeek} color="var(--chart-2)" className="h-20" />
                </CardContent>
              </Card>
            </div>
            <div className="grid divide-y divide-border/60 border border-border/60 rounded-xl sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <StatTile icon={ListChecks} label="Tasks completed" value={myGrowth.totalTasksCompleted} accent="var(--chart-1)" />
              <StatTile
                icon={CheckCircle2}
                label="Approval rate"
                value={myGrowth.approval.ratePct ?? 0}
                suffix={myGrowth.approval.ratePct !== null ? "%" : ""}
                accent="var(--success)"
              />
            </div>
            {growthInsight && <GrowthInsightCard insight={growthInsight} />}
          </div>
        )}
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl tracking-wide uppercase">Today&apos;s {taskWord(employee?.role)}</h2>
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
              {isManager ? (
                `No ${taskWord(employee?.role).toLowerCase()} yet today.`
              ) : (
                <>
                  No adventures yet today.{" "}
                  <Link href="/adventures" className="text-primary underline-offset-2 hover:underline">
                    Generate one
                  </Link>
                  .
                </>
              )}
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

      <LightningBurst ref={burstRef} />
    </PageIn>
  );
}
