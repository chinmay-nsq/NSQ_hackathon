"use client";

import { TrendingUp, TrendingDown, Flame, Star } from "lucide-react";
import { TeamMemberGrowth } from "@/lib/types";
import { GrowthSparkline } from "@/components/growth/GrowthSparkline";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function DeltaBadge({ deltaPct, suffix = "%" }: { deltaPct: number | null; suffix?: string }) {
  if (deltaPct === null) return <span className="text-xs text-muted-foreground">No trend yet</span>;
  const positive = deltaPct >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${positive ? "text-success" : "text-destructive"}`}>
      <Icon className="size-3.5" />
      {positive ? "+" : ""}
      {deltaPct}
      {suffix} since this window started
    </span>
  );
}

/**
 * One team member's real performance snapshot — skill accuracy this
 * window (the "current" figure, roughly "this month") against the trend
 * since the window started ("overall from the past"), plus consistency and
 * output. Every number here is the same computation GrowthService already
 * does for the employee's own Growth page — nothing re-derived or invented.
 * Clicking the card (anywhere outside the sparkline's own interactive dots)
 * opens the full detail view — a plain clickable div rather than a
 * <button>, since a <button> can't legally wrap the sparkline's own
 * touch-tap-to-toggle-tooltip points.
 */
export function TeamMemberPerformanceCard({
  member,
  onOpenDetail,
}: {
  member: TeamMemberGrowth;
  onOpenDetail: (member: TeamMemberGrowth) => void;
}) {
  const { skill, consistency, output } = member.growth;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(member)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail(member);
        }
      }}
      className="cursor-pointer rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="flex items-center gap-3">
        <Avatar className="size-10 shrink-0">
          <AvatarFallback className="font-display bg-accent text-accent-foreground">
            {initials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{member.name}</p>
          <p className="truncate text-xs text-muted-foreground">{member.title}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 font-mono text-[10px] tracking-wide uppercase">
          Lvl {member.level}
        </Badge>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Skill accuracy
          </span>
          <span className="tabular font-display text-lg">
            {skill.currentPct !== null ? `${skill.currentPct}%` : "—"}
          </span>
        </div>
        <GrowthSparkline points={skill.weekly} color="var(--chart-1)" valueSuffix="%" className="mt-1 h-16" />
        <DeltaBadge deltaPct={skill.deltaPct} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
        <div className="flex items-center gap-2">
          <Flame className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="tabular text-sm font-medium">{consistency.currentStreakDays}d streak</p>
            <p className="truncate text-[10px] text-muted-foreground uppercase">Consistency</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Star className="size-4 shrink-0 text-xp" />
          <div className="min-w-0">
            <p className="tabular text-sm font-medium">{output.thisWeekXp} XP</p>
            <p className="truncate text-[10px] text-muted-foreground uppercase">
              vs {output.rollingAvgXp} avg
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
