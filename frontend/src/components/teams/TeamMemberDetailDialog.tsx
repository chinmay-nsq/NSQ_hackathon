"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, Flame, Zap, Timer, Sparkles, type LucideIcon } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { api } from "@/lib/api";
import { TeamMemberGrowth, WeekDetail } from "@/lib/types";
import { GrowthSparkline } from "@/components/growth/GrowthSparkline";
import { DimensionToggle, type GrowthDimension } from "@/components/growth/DimensionToggle";
import { CountUp } from "@/components/motion/CountUp";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

/** "YYYY-MM-DD" -> "Aug 4", matching GrowthSparkline's own week-start label format. */
function shortWeekLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

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

/**
 * "Why did this week look this way?" — a real task list plus an AI
 * explanation grounded in it, for whichever period the manager picks (a
 * specific week, or "Overall" for the whole 6-week window). Fetched fresh
 * per selection since it's real backend computation (task activity + a
 * live AI call), not something already sitting in the card's data.
 */
function WhyPanel({ employeeId, weeks }: { employeeId: string; weeks: { weekStart: string }[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<WeekDetail | null>(null);
  const [loading, setLoading] = useState(false);

  function selectPeriod(period: string) {
    setSelected(period);
    setLoading(true);
  }

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const query = selected === "overall" ? "" : `?weekStart=${selected}`;
    api
      .get<WeekDetail>(`/growth/team-members/${employeeId}/week${query}`)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, selected]);

  return (
    <div className="mt-6">
      <h3 className="mb-3 flex items-center gap-1.5 font-display text-lg tracking-wide uppercase">
        <Sparkles className="size-4 text-primary" />
        Why?
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {weeks.map((w) => (
          <button
            key={w.weekStart}
            type="button"
            onClick={() => selectPeriod(w.weekStart)}
            className={`rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-wide uppercase transition-colors ${
              selected === w.weekStart
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {shortWeekLabel(w.weekStart)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => selectPeriod("overall")}
          className={`rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-wide uppercase transition-colors ${
            selected === "overall"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          Overall
        </button>
      </div>

      {loading && (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}

      {!loading && detail && (
        <div className="mt-4 space-y-4">
          <div className="glow-primary rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed">
            {detail.insight}
          </div>

          {detail.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed tasks in {detail.periodLabel}.</p>
          ) : (
            <div className="space-y-1.5">
              {detail.tasks.map((t, i) => (
                <div
                  key={`${t.title}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.detail}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px] tracking-wide uppercase">
                      {t.type.replace("_", " ")}
                    </Badge>
                    <span className="tabular font-mono text-xs text-primary">+{t.xpReward} XP</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Full skill/consistency/output detail for one team member — opened from
 * their card on the Teams page. Reuses every number already fetched for
 * the card (getTeamMemberBreakdown returns the full EmployeeGrowth per
 * member), so this needs no extra API call — it's the same data, just
 * un-collapsed into all three dimensions with the exact chart/tile
 * treatment the employee's own Growth page uses.
 */
export function TeamMemberDetailDialog({
  member,
  open,
  onOpenChange,
}: {
  member: TeamMemberGrowth | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [dimension, setDimension] = useState<GrowthDimension>("skill");
  const panelRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = panelRef.current;
      if (!el) return;
      gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
    },
    { dependencies: [dimension, member?.employeeId] },
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setDimension("skill");
      }}
    >
      <DialogContent className="sm:max-w-xl">
        {member && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar className="size-11 shrink-0">
                  <AvatarFallback className="font-display bg-accent text-accent-foreground">
                    {initials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-display text-xl tracking-wide uppercase">{member.name}</DialogTitle>
                  <DialogDescription>{member.title}</DialogDescription>
                </div>
                <Badge variant="secondary" className="shrink-0 font-mono text-[10px] tracking-wide uppercase">
                  Lvl {member.level}
                </Badge>
              </div>
            </DialogHeader>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <DimensionToggle value={dimension} onChange={setDimension} />
            </div>

            <div ref={panelRef} className="rounded-2xl border border-border/60 bg-card p-6">
              {dimension === "skill" && (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display text-lg tracking-wide uppercase">Quiz Accuracy</h3>
                    <DeltaBadge deltaPct={member.growth.skill.deltaPct} />
                  </div>
                  <GrowthSparkline points={member.growth.skill.weekly} color="var(--chart-4)" valueSuffix="%" />
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <StatTile
                      icon={Zap}
                      label="This week"
                      value={member.growth.skill.currentPct ?? 0}
                      suffix="%"
                      accent="var(--chart-4)"
                    />
                    <StatTile
                      icon={TrendingUp}
                      label="Change"
                      value={member.growth.skill.deltaPct ?? 0}
                      suffix=" pts"
                      accent="var(--chart-4)"
                    />
                  </div>
                </>
              )}

              {dimension === "consistency" && (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display text-lg tracking-wide uppercase">Active Days / Week</h3>
                    <span className="font-mono text-xs text-muted-foreground">
                      {member.growth.consistency.currentStreakDays}-day streak
                    </span>
                  </div>
                  <GrowthSparkline points={member.growth.consistency.activeDaysByWeek} color="var(--chart-3)" />
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <StatTile
                      icon={Flame}
                      label="Current streak"
                      value={member.growth.consistency.currentStreakDays}
                      suffix=" days"
                      accent="var(--chart-3)"
                    />
                    <StatTile
                      icon={Timer}
                      label="Longest gap"
                      value={member.growth.consistency.longestGapDays ?? 0}
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
                    <DeltaBadge deltaPct={member.growth.output.deltaPct} />
                  </div>
                  <GrowthSparkline points={member.growth.output.xpByWeek} color="var(--chart-2)" />
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <StatTile
                      icon={Zap}
                      label="This week"
                      value={member.growth.output.thisWeekXp}
                      suffix=" xp"
                      accent="var(--chart-2)"
                    />
                    <StatTile
                      icon={TrendingUp}
                      label="Their average"
                      value={member.growth.output.rollingAvgXp}
                      suffix=" xp"
                      accent="var(--chart-2)"
                    />
                  </div>
                </>
              )}
            </div>

            <WhyPanel key={member.employeeId} employeeId={member.employeeId} weeks={member.growth.skill.weekly} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
