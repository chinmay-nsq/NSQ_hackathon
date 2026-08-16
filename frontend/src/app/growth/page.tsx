"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, Flame, Zap, Users, Timer, ClipboardCheck, type LucideIcon } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { api } from "@/lib/api";
import { EmployeeGrowth, TeamGrowth, ManagerSelfGrowth, GrowthInsight } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { CountUp } from "@/components/motion/CountUp";
import { GrowthSparkline } from "@/components/growth/GrowthSparkline";
import { GrowthInsightCard } from "@/components/growth/GrowthInsightCard";
import { DimensionToggle, type GrowthDimension } from "@/components/growth/DimensionToggle";

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
    <div className="flex items-center gap-3.5 rounded-2xl border border-border/60 bg-card px-4 py-3.5">
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

function DeltaBadge({ deltaPct, invert = false }: { deltaPct: number | null; invert?: boolean }) {
  if (deltaPct === null) {
    return <span className="font-mono text-xs text-muted-foreground">— no trend yet</span>;
  }
  // `invert`: for turnaround hours, a NEGATIVE delta (faster) is the good direction.
  const isGood = invert ? deltaPct <= 0 : deltaPct >= 0;
  const sign = deltaPct > 0 ? "+" : "";
  return (
    <span className={`font-mono text-xs font-medium ${isGood ? "text-success" : "text-destructive"}`}>
      {sign}
      {deltaPct}% vs earlier
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
      <TrendingUp className="size-6" strokeWidth={1.5} />
      {message}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  );
}

function MyGrowthTab() {
  const [growth, setGrowth] = useState<EmployeeGrowth | null>(null);
  const [insight, setInsight] = useState<GrowthInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [dimension, setDimension] = useState<GrowthDimension>("skill");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<{ growth: EmployeeGrowth; insight: GrowthInsight }>("/growth/me")
      .then((data) => {
        setGrowth(data.growth);
        setInsight(data.insight);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Cross-fade the chart panel every time the dimension toggle changes.
  useGSAP(
    () => {
      const el = panelRef.current;
      if (!el) return;
      gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
    },
    { dependencies: [dimension] },
  );

  if (loading) return <LoadingBlock />;
  if (!growth) return <EmptyState message="Complete a quest to start tracking your growth." />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <DimensionToggle value={dimension} onChange={setDimension} />
      </div>

      <div ref={panelRef} className="rounded-2xl border border-border/60 bg-card p-6">
        {dimension === "skill" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg tracking-wide uppercase">Quiz Accuracy</h3>
              <DeltaBadge deltaPct={growth.skill.deltaPct} />
            </div>
            <GrowthSparkline points={growth.skill.weekly} color="var(--chart-4)" valueSuffix="%" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <StatTile icon={Zap} label="This week" value={growth.skill.currentPct ?? 0} suffix="%" accent="var(--chart-4)" />
              <StatTile icon={TrendingUp} label="Change" value={growth.skill.deltaPct ?? 0} suffix=" pts" accent="var(--chart-4)" />
            </div>
          </>
        )}

        {dimension === "consistency" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg tracking-wide uppercase">Active Days / Week</h3>
              <span className="font-mono text-xs text-muted-foreground">{growth.consistency.currentStreakDays}-day streak</span>
            </div>
            <GrowthSparkline points={growth.consistency.activeDaysByWeek} color="var(--chart-3)" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <StatTile icon={Flame} label="Current streak" value={growth.consistency.currentStreakDays} suffix=" days" accent="var(--chart-3)" />
              <StatTile
                icon={Timer}
                label="Longest gap"
                value={growth.consistency.longestGapDays ?? 0}
                suffix=" days"
                accent="var(--chart-3)"
              />
            </div>
          </>
        )}

        {dimension === "output" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg tracking-wide uppercase">XP / Week</h3>
              <DeltaBadge deltaPct={growth.output.deltaPct} />
            </div>
            <GrowthSparkline points={growth.output.xpByWeek} color="var(--chart-2)" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <StatTile icon={Zap} label="This week" value={growth.output.thisWeekXp} suffix=" xp" accent="var(--chart-2)" />
              <StatTile icon={TrendingUp} label="Your average" value={growth.output.rollingAvgXp} suffix=" xp" accent="var(--chart-2)" />
            </div>
          </>
        )}
      </div>

      {insight && <GrowthInsightCard insight={insight} />}
    </div>
  );
}

function TeamGrowthTab() {
  const [growth, setGrowth] = useState<TeamGrowth | null>(null);
  const [insight, setInsight] = useState<GrowthInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ growth: TeamGrowth; insight: GrowthInsight }>("/growth/team")
      .then((data) => {
        setGrowth(data.growth);
        setInsight(data.insight);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingBlock />;
  if (!growth || growth.memberCount === 0) {
    return <EmptyState message="Once your team has completed some quests, their collective growth will show up here." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg tracking-wide uppercase">Team Quiz Accuracy</h3>
            <DeltaBadge deltaPct={growth.skill.deltaPct} />
          </div>
          <GrowthSparkline points={growth.skill.weekly} color="var(--chart-4)" valueSuffix="%" />
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg tracking-wide uppercase">Team Active Days</h3>
            <span className="font-mono text-xs text-muted-foreground">{growth.memberCount} members</span>
          </div>
          <GrowthSparkline points={growth.consistency.activeDaysByWeek} color="var(--chart-3)" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile icon={Users} label="Team size" value={growth.memberCount} accent="var(--chart-5)" />
        <StatTile icon={Zap} label="Avg accuracy" value={growth.skill.currentPct ?? 0} suffix="%" accent="var(--chart-4)" />
        <StatTile
          icon={Flame}
          label="Active this week"
          value={growth.consistency.activeDaysByWeek.at(-1)?.value ?? 0}
          suffix=" days"
          accent="var(--chart-3)"
        />
      </div>

      {insight && <GrowthInsightCard insight={insight} />}
    </div>
  );
}

function LeadershipTab() {
  const [growth, setGrowth] = useState<ManagerSelfGrowth | null>(null);
  const [insight, setInsight] = useState<GrowthInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ growth: ManagerSelfGrowth; insight: GrowthInsight }>("/growth/leadership")
      .then((data) => {
        setGrowth(data.growth);
        setInsight(data.insight);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingBlock />;
  if (!growth) return <EmptyState message="Assign and review a few tasks to start tracking your leadership trend." />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg tracking-wide uppercase">Review Turnaround</h3>
            <DeltaBadge deltaPct={growth.turnaround.deltaPct} invert />
          </div>
          <GrowthSparkline points={growth.turnaround.weekly} color="var(--chart-5)" valueSuffix="h" />
          {growth.turnaround.sampleSize < 3 && (
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">
              Based on limited data ({growth.turnaround.sampleSize} reviewed submission{growth.turnaround.sampleSize === 1 ? "" : "s"})
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg tracking-wide uppercase">Assigned vs Approved</h3>
          </div>
          <GrowthSparkline points={growth.volume.assignedByWeek} color="var(--chart-1)" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          icon={Timer}
          label="Avg turnaround"
          value={growth.turnaround.currentAvgHours ?? 0}
          suffix="h"
          accent="var(--chart-5)"
        />
        <StatTile icon={ClipboardCheck} label="Assigned" value={growth.volume.assignedByWeek.at(-1)?.value ?? 0} accent="var(--chart-1)" />
        <StatTile icon={Zap} label="Approved" value={growth.volume.approvedByWeek.at(-1)?.value ?? 0} accent="var(--success)" />
      </div>

      {insight && <GrowthInsightCard insight={insight} />}
    </div>
  );
}

export default function GrowthPage() {
  const { employee } = useAuthStore();
  const isManager = employee?.role === "MANAGER" || employee?.role === "ADMIN";

  return (
    <PageIn>
      <PageHeader
        title="Growth"
        description="Your real trend, computed from what you've actually done — no leaderboards, no invented numbers."
      />

      <Tabs defaultValue="me">
        <TabsList>
          <TabsTrigger value="me">My Growth</TabsTrigger>
          {isManager && <TabsTrigger value="team">Team Growth</TabsTrigger>}
          {isManager && <TabsTrigger value="leadership">My Leadership</TabsTrigger>}
        </TabsList>

        <TabsContent value="me" className="mt-6">
          <MyGrowthTab />
        </TabsContent>
        {isManager && (
          <TabsContent value="team" className="mt-6">
            <TeamGrowthTab />
          </TabsContent>
        )}
        {isManager && (
          <TabsContent value="leadership" className="mt-6">
            <LeadershipTab />
          </TabsContent>
        )}
      </Tabs>
    </PageIn>
  );
}
