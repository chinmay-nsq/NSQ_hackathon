"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  ListChecks,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Adventure, DialogueAction, EmployeeGrowth, TeamGrowth, GrowthInsight, WeeklyPoint } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
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

/** Shared micro-label: the one place small-caps type is allowed to appear. */
const LABEL = "text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase";

/*
  One accent per role, and always the same one: blue is progress and output,
  yellow is the coin economy and anything waiting to be approved, pink is
  people — the companion, the team, what's still open. The tints are the only
  colour on a stat row, so the numbers stay the loudest thing on it.
*/
const STAT_TONES = {
  blue: "bg-blue-soft text-primary",
  yellow: "bg-yellow-soft text-yellow-foreground",
  pink: "bg-pink-soft text-pink-foreground",
} as const;

function StatTile({
  icon: Icon,
  label,
  value,
  suffix = "",
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  tone: keyof typeof STAT_TONES;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4">
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", STAT_TONES[tone])}>
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0">
        <p className="tabular font-display text-2xl leading-none font-bold">
          <CountUp value={value} />
          {suffix}
        </p>
        <p className={cn("mt-1.5", LABEL)}>{label}</p>
      </div>
    </div>
  );
}

/**
 * Same read as the full Growth page's own delta badge — the magnitude and
 * direction of change since the start of the window, spelled out rather than
 * left for the chart shape to imply. Green/red here is status, not accent:
 * it encodes which way the number moved.
 */
function DeltaBadge({ deltaPct }: { deltaPct: number | null }) {
  if (deltaPct === null) {
    return <span className="text-xs text-muted-foreground">No trend yet</span>;
  }
  const isGood = deltaPct >= 0;
  const sign = deltaPct > 0 ? "+" : "";
  return (
    <span className={cn("tabular text-xs font-medium", isGood ? "text-success" : "text-destructive")}>
      {sign}
      {deltaPct}% vs earlier
    </span>
  );
}

/**
 * One weekly trend: the current figure and its delta above, the line beneath.
 * Both the manager and the individual view show two of these side by side, so
 * they live in one component rather than four near-identical blocks.
 */
function TrendCard({
  label,
  value,
  deltaPct,
  points,
  color,
  valueSuffix = "",
  emptyMessage,
}: {
  label: string;
  value: string;
  deltaPct: number | null;
  points: WeeklyPoint[];
  color: string;
  valueSuffix?: string;
  emptyMessage?: string;
}) {
  return (
    <Card className="border border-border">
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <span className={LABEL}>{label}</span>
          <div className="text-right">
            <p className="tabular font-display text-xl leading-none font-bold">{value}</p>
            <div className="mt-1">
              <DeltaBadge deltaPct={deltaPct} />
            </div>
          </div>
        </div>
        {emptyMessage ? (
          <p className="flex h-20 items-center justify-center text-center text-xs text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <GrowthSparkline points={points} color={color} valueSuffix={valueSuffix} className="h-20" />
        )}
      </CardContent>
    </Card>
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
  const level = employee?.level ?? 1;
  const xpIntoLevel = (employee?.xp ?? 0) % XP_PER_LEVEL;
  const pendingApprovals = pendingClaimsCount + pendingSubmissionsCount;
  const taskLabel = taskWord(employee?.role);
  const tourQuestId =
    pendingAdventures.find((a) => a.quiz && a.quiz.length > 0)?.id ?? pendingAdventures[0]?.id;

  return (
    <PageIn>
      <PageHeader
        title={`Welcome back${employee ? `, ${employee.name.split(" ")[0]}` : ""}`}
        description="Here's what's happening with you and your team today."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Managers don't get a companion card — no visible companion for that role. */}
        {!isManager && (
          <Card className="relative overflow-hidden border border-border lg:col-span-2">
            {/* The companion is the app's one moment of character — a single
                soft pink wash marks it out without tinting the whole card. */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_75%_at_0%_0%,var(--pink-soft),transparent_70%)]" />
            <CardContent className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
              {employee?.companion && (
                <div className="mx-auto flex size-24 shrink-0 items-center justify-center rounded-2xl bg-pink-soft sm:mx-0">
                  <CompanionViewer
                    species={employee.companion.species}
                    className="size-full"
                    interactive={false}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className={cn("mb-2.5 flex items-center gap-1.5", LABEL)}>
                  <Sparkles className="size-3.5 text-pink" />
                  Your companion
                </p>
                {dialogueLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  <>
                    <p className="text-[15px] leading-relaxed text-balance">{dialogue}</p>
                    {dialogueAction && (
                      <Button
                        size="sm"
                        className="group mt-4"
                        onClick={() => router.push(DIALOGUE_ACTION_ROUTE[dialogueAction.topic])}
                      >
                        {dialogueAction.label}
                        <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {isManager ? (
          <Card className="border border-border lg:col-span-3">
            <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-yellow-soft text-yellow-foreground">
                  <ClipboardCheck className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className={LABEL}>Needs your attention</p>
                  <p className="tabular font-display mt-1 text-3xl leading-none font-bold">
                    <CountUp value={pendingApprovals} />
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {pendingClaimsCount} reward claim{pendingClaimsCount === 1 ? "" : "s"} ·{" "}
                    {pendingSubmissionsCount} task submission{pendingSubmissionsCount === 1 ? "" : "s"} waiting on you
                  </p>
                </div>
              </div>
              <Button
                className="group shrink-0"
                render={
                  <Link href="/approvals">
                    Review now
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-border">
            <CardContent className="flex h-full flex-col justify-between gap-5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={LABEL}>Level</p>
                  <p className="tabular font-display mt-1 text-3xl leading-none font-bold">{level}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 font-medium">
                  {employee?.title ?? "Member"}
                </Badge>
              </div>
              <div className="space-y-2">
                <AnimatedBar pct={xpIntoLevel} className="h-1.5" fillClassName="bg-primary" />
                <div className="tabular flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {xpIntoLevel} / {XP_PER_LEVEL} XP
                  </span>
                  <span>{XP_PER_LEVEL - xpIntoLevel} to level {level + 1}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {isManager ? (
          <>
            <StatTile icon={Users} label="Team size" value={teamGrowth?.memberCount ?? 0} tone="pink" />
            <StatTile icon={ClipboardCheck} label="Pending approvals" value={pendingApprovals} tone="yellow" />
            <StatTile
              icon={ListChecks}
              label="Tasks completed"
              value={teamGrowth?.totalTasksCompleted ?? 0}
              tone="blue"
            />
          </>
        ) : (
          <>
            <StatTile icon={Zap} label="Total XP" value={employee?.xp ?? 0} tone="blue" />
            <StatTile icon={Coins} label="Coins" value={employee?.coins ?? 0} tone="yellow" />
            <StatTile
              icon={ListChecks}
              label={`Pending ${taskLabel.toLowerCase()}`}
              value={pendingAdventures.length}
              tone="pink"
            />
          </>
        )}
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold">{isManager ? "Team growth" : "Your growth"}</h2>
          <Button
            variant="ghost"
            size="sm"
            className="group text-muted-foreground"
            render={
              <Link href="/growth">
                View full growth
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          />
        </div>

        {growthLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : isManager ? (
          teamGrowth === null || teamGrowth.memberCount === 0 ? (
            <Card className="border border-dashed border-border bg-transparent">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Once your team has completed some tasks, their collective growth will show up here.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TrendCard
                  label="Team accuracy"
                  value={`${teamGrowth.skill.currentPct ?? 0}%`}
                  deltaPct={teamGrowth.skill.deltaPct}
                  points={teamGrowth.skill.weekly}
                  color="var(--primary)"
                  valueSuffix="%"
                />
                <TrendCard
                  label="Sprint completion"
                  value={`${teamGrowth.sprintCompletion.currentPct ?? 0}%`}
                  deltaPct={teamGrowth.sprintCompletion.deltaPct}
                  points={teamGrowth.sprintCompletion.weekly}
                  color="var(--pink)"
                  valueSuffix="%"
                  emptyMessage={teamGrowth.sprintCompletion.sprintCount === 0 ? "No sprints yet" : undefined}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <StatTile
                  icon={ListChecks}
                  label="Tasks completed"
                  value={teamGrowth.totalTasksCompleted}
                  tone="blue"
                />
                <StatTile
                  icon={CheckCircle2}
                  label="Approval rate"
                  value={teamGrowth.approval.ratePct ?? 0}
                  suffix={teamGrowth.approval.ratePct !== null ? "%" : ""}
                  tone="yellow"
                />
              </div>
              {growthInsight && <GrowthInsightCard insight={growthInsight} />}
            </div>
          )
        ) : myGrowth === null ? (
          <Card className="border border-dashed border-border bg-transparent">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Complete a quest to start tracking your growth.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TrendCard
                label="Quiz accuracy"
                value={`${myGrowth.skill.currentPct ?? 0}%`}
                deltaPct={myGrowth.skill.deltaPct}
                points={myGrowth.skill.weekly}
                color="var(--primary)"
                valueSuffix="%"
              />
              <TrendCard
                label="XP / week"
                value={`${myGrowth.output.thisWeekXp} XP`}
                deltaPct={myGrowth.output.deltaPct}
                points={myGrowth.output.xpByWeek}
                color="var(--pink)"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatTile
                icon={ListChecks}
                label="Tasks completed"
                value={myGrowth.totalTasksCompleted}
                tone="blue"
              />
              <StatTile
                icon={CheckCircle2}
                label="Approval rate"
                value={myGrowth.approval.ratePct ?? 0}
                suffix={myGrowth.approval.ratePct !== null ? "%" : ""}
                tone="yellow"
              />
            </div>
            {growthInsight && <GrowthInsightCard insight={growthInsight} />}
          </div>
        )}
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold">Today&apos;s {taskLabel.toLowerCase()}</h2>
          <Button
            variant="ghost"
            size="sm"
            className="group text-muted-foreground"
            render={
              <Link href="/adventures">
                View all
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          />
        </div>

        {adventuresLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : pendingAdventures.length === 0 ? (
          <Card className="border border-dashed border-border bg-transparent">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {isManager ? (
                "Nothing queued up for today."
              ) : (
                <>
                  Nothing queued up for today.{" "}
                  <Link href="/adventures" className="font-medium text-primary underline-offset-2 hover:underline">
                    Generate an adventure
                  </Link>
                  .
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <StaggerGrid className="grid gap-4 sm:grid-cols-2" deps={[pendingAdventures.length]}>
            {pendingAdventures.slice(0, 4).map((a) => (
              <Link key={a.id} href={`/adventures/${a.id}`} data-tour={a.id === tourQuestId ? "quest-card" : undefined}>
                <HoverLift>
                  <Card className="h-full border border-border transition-colors hover:border-primary/40">
                    <CardContent className="p-5">
                      <div className="mb-2.5 flex items-center justify-between gap-3">
                        <Badge variant="outline" className="text-[10px] tracking-[0.1em] uppercase">
                          {a.type.replace("_", " ")}
                        </Badge>
                        <span className="tabular rounded-md bg-blue-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                          +{a.xpReward} XP
                        </span>
                      </div>
                      <p className="font-medium">{a.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {a.description}
                      </p>
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
