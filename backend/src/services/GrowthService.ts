import { GrowthRepository } from "@/repositories/GrowthRepository";
import { GuildRepository } from "@/repositories/GuildRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { AIService, GrowthInsight, GrowthObservationTopic } from "./AIService";
import { NAVIGABLE_ROUTES } from "./CompanionToolService";
import { decodeAnswer } from "@/utils/quizCipher";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

// Maps an AI-chosen topic (a closed enum, never a free-text URL — see
// AIService's growth-insight prompts) to a real route, reusing the same
// allow-list the companion chat's navigate tool already trusts.
const GROWTH_TOPIC_ROUTES: Record<GrowthObservationTopic, string> = {
  adventures: NAVIGABLE_ROUTES.adventures,
  teams: NAVIGABLE_ROUTES.teams,
  approvals: NAVIGABLE_ROUTES.approvals,
  growth: NAVIGABLE_ROUTES.growth,
};

/** Attaches a real `href` to every observation that has a topic, derived from a fixed route map — never trusts the AI to produce a URL directly. */
function withActionLinks(insight: GrowthInsight): GrowthInsight & {
  observations: (GrowthInsight["observations"][number] & { href?: string })[];
} {
  return {
    ...insight,
    observations: insight.observations.map((o) => ({
      ...o,
      href: o.topic ? GROWTH_TOPIC_ROUTES[o.topic] : undefined,
    })),
  };
}

const GROWTH_WEEKS = 6;

export interface WeeklyPoint {
  weekStart: string; // ISO date, Monday of that week
  value: number;
}

export interface EmployeeGrowth {
  skill: { weekly: WeeklyPoint[]; currentPct: number | null; deltaPct: number | null };
  consistency: { activeDaysByWeek: WeeklyPoint[]; currentStreakDays: number; longestGapDays: number | null };
  output: { xpByWeek: WeeklyPoint[]; thisWeekXp: number; rollingAvgXp: number; deltaPct: number | null };
}

export interface TeamGrowth {
  memberCount: number;
  skill: { weekly: WeeklyPoint[]; currentPct: number | null; deltaPct: number | null };
  consistency: { activeDaysByWeek: WeeklyPoint[] };
}

export interface ManagerSelfGrowth {
  turnaround: { weekly: WeeklyPoint[]; currentAvgHours: number | null; deltaPct: number | null; sampleSize: number };
  volume: { assignedByWeek: WeeklyPoint[]; approvedByWeek: WeeklyPoint[] };
}

interface QuizAdventureRef {
  quiz: unknown;
  dailyQuizDate: string | null;
  xpReward: number;
}

interface ProgressRow {
  completedAt: Date | null;
  quizAnswers: unknown;
  quizCorrectCount: number | null;
  adventure: QuizAdventureRef;
}

interface AssignedAdventureRow {
  id: string;
  createdAt: Date;
  assignedById: string | null;
  progress: {
    employeeId: string;
    completedAt: Date | null;
    approval: string;
    approvedAt: Date | null;
    approvedById: string | null;
  }[];
}

/** "YYYY-MM-DD" from local calendar fields — never toISOString(), which shifts near midnight in timezones ahead of UTC. */
function dateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Monday of the week containing `d`, at local midnight. */
function weekStartOf(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diffToMonday);
  return copy;
}

function weeksAgo(n: number): Date {
  const d = weekStartOf(new Date());
  d.setDate(d.getDate() - 7 * (n - 1));
  return d;
}

/** Builds the ordered list of Monday week-start dates for the rolling window, so every bucket is present even if empty. */
function buildWeekBuckets(): Date[] {
  const start = weeksAgo(GROWTH_WEEKS);
  const buckets: Date[] = [];
  for (let i = 0; i < GROWTH_WEEKS; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + 7 * i);
    buckets.push(d);
  }
  return buckets;
}

function bucketKeyFor(d: Date): string {
  return dateKey(weekStartOf(d));
}

function emptySkill(): EmployeeGrowth["skill"] {
  return { weekly: buildWeekBuckets().map((d) => ({ weekStart: dateKey(d), value: 0 })), currentPct: null, deltaPct: null };
}

function emptyConsistency(): TeamGrowth["consistency"] {
  return { activeDaysByWeek: buildWeekBuckets().map((d) => ({ weekStart: dateKey(d), value: 0 })) };
}

/** Per-submission accuracy % for quiz-type rows only — decodes the real answer key and compares index-by-index, falling back to the stored aggregate if raw data is missing/malformed. */
function submissionAccuracyPct(row: ProgressRow): number | null {
  if (!row.adventure.dailyQuizDate) return null; // not a quiz submission

  const quiz = row.adventure.quiz as { string: string; number: string }[] | null;
  const answers = row.quizAnswers as number[] | null;

  if (Array.isArray(quiz) && Array.isArray(answers) && quiz.length > 0 && quiz.length === answers.length) {
    let correct = 0;
    for (let i = 0; i < quiz.length; i++) {
      try {
        if (decodeAnswer(quiz[i]) === answers[i]) correct++;
      } catch {
        // malformed entry — skip it rather than fail the whole submission
      }
    }
    return (correct / quiz.length) * 100;
  }

  if (typeof row.quizCorrectCount === "number" && Array.isArray(quiz) && quiz.length > 0) {
    return (row.quizCorrectCount / quiz.length) * 100;
  }

  return null;
}

function computeSkillTrend(rows: ProgressRow[]): EmployeeGrowth["skill"] {
  const buckets = buildWeekBuckets();
  const sums = new Map<string, { total: number; count: number }>();
  buckets.forEach((d) => sums.set(dateKey(d), { total: 0, count: 0 }));

  for (const row of rows) {
    if (!row.completedAt) continue;
    const pct = submissionAccuracyPct(row);
    if (pct === null) continue;
    const key = bucketKeyFor(row.completedAt);
    const bucket = sums.get(key);
    if (bucket) {
      bucket.total += pct;
      bucket.count += 1;
    }
  }

  const weekly = buckets.map((d) => {
    const key = dateKey(d);
    const bucket = sums.get(key)!;
    return { weekStart: key, value: bucket.count > 0 ? Math.round((bucket.total / bucket.count) * 10) / 10 : 0 };
  });

  const withData = weekly.filter((_, i) => sums.get(weekly[i].weekStart)!.count > 0);
  const currentPct = withData.length > 0 ? withData[withData.length - 1].value : null;
  const oldestPct = withData.length > 0 ? withData[0].value : null;
  const deltaPct = currentPct !== null && oldestPct !== null ? Math.round((currentPct - oldestPct) * 10) / 10 : null;

  return { weekly, currentPct, deltaPct };
}

function computeConsistency(rows: ProgressRow[]): EmployeeGrowth["consistency"] {
  const buckets = buildWeekBuckets();
  const daysByWeek = new Map<string, Set<string>>();
  buckets.forEach((d) => daysByWeek.set(dateKey(d), new Set()));

  const allActiveDays = new Set<string>();
  for (const row of rows) {
    if (!row.completedAt) continue;
    const day = dateKey(row.completedAt);
    allActiveDays.add(day);
    const week = daysByWeek.get(bucketKeyFor(row.completedAt));
    week?.add(day);
  }

  const activeDaysByWeek = buckets.map((d) => {
    const key = dateKey(d);
    return { weekStart: key, value: daysByWeek.get(key)!.size };
  });

  const sortedDays = Array.from(allActiveDays).sort();
  let longestGapDays: number | null = null;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const cur = new Date(sortedDays[i]);
    const gap = Math.round((cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)) - 1;
    if (gap > 0 && (longestGapDays === null || gap > longestGapDays)) longestGapDays = gap;
  }

  let currentStreakDays = 0;
  if (sortedDays.length > 0) {
    const today = new Date();
    const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const activeSet = allActiveDays;
    // A streak "counts" if today or yesterday is active — otherwise it's already broken.
    const todayKey = dateKey(cursor);
    const yesterday = new Date(cursor);
    yesterday.setDate(yesterday.getDate() - 1);
    if (activeSet.has(todayKey) || activeSet.has(dateKey(yesterday))) {
      const walk = activeSet.has(todayKey) ? cursor : yesterday;
      while (activeSet.has(dateKey(walk))) {
        currentStreakDays++;
        walk.setDate(walk.getDate() - 1);
      }
    }
  }

  return { activeDaysByWeek, currentStreakDays, longestGapDays };
}

function computeOutputVolume(rows: ProgressRow[]): EmployeeGrowth["output"] {
  const buckets = buildWeekBuckets();
  const sums = new Map<string, number>();
  buckets.forEach((d) => sums.set(dateKey(d), 0));

  for (const row of rows) {
    if (!row.completedAt) continue;
    const key = bucketKeyFor(row.completedAt);
    if (sums.has(key)) sums.set(key, sums.get(key)! + row.adventure.xpReward);
  }

  const xpByWeek = buckets.map((d) => ({ weekStart: dateKey(d), value: sums.get(dateKey(d))! }));
  const thisWeekXp = xpByWeek[xpByWeek.length - 1]?.value ?? 0;
  const otherWeeks = xpByWeek.slice(0, -1);
  const rollingAvgXp = otherWeeks.length > 0 ? Math.round(otherWeeks.reduce((s, w) => s + w.value, 0) / otherWeeks.length) : 0;
  const deltaPct = rollingAvgXp > 0 ? Math.round(((thisWeekXp - rollingAvgXp) / rollingAvgXp) * 1000) / 10 : null;

  return { xpByWeek, thisWeekXp, rollingAvgXp, deltaPct };
}

/**
 * Manager review-turnaround, in hours, bucketed by the week of the REVIEW
 * (approvedAt), not the submission — this is a "how fast is the manager
 * reviewing" trend. A LOWER number, and a NEGATIVE delta, means faster
 * (an improvement) — callers must not describe a negative delta as decline.
 */
function computeTurnaround(history: AssignedAdventureRow[]): ManagerSelfGrowth["turnaround"] {
  const buckets = buildWeekBuckets();
  const sums = new Map<string, { total: number; count: number }>();
  buckets.forEach((d) => sums.set(dateKey(d), { total: 0, count: 0 }));

  let sampleSize = 0;
  for (const adventure of history) {
    for (const p of adventure.progress) {
      if ((p.approval !== "APPROVED" && p.approval !== "REJECTED") || !p.completedAt || !p.approvedAt) continue;
      const hours = (p.approvedAt.getTime() - p.completedAt.getTime()) / (1000 * 60 * 60);
      if (hours < 0) continue; // clock skew guard, not a real case
      const key = bucketKeyFor(p.approvedAt);
      const bucket = sums.get(key);
      if (bucket) {
        bucket.total += hours;
        bucket.count += 1;
        sampleSize += 1;
      }
    }
  }

  const weekly = buckets.map((d) => {
    const key = dateKey(d);
    const bucket = sums.get(key)!;
    return { weekStart: key, value: bucket.count > 0 ? Math.round((bucket.total / bucket.count) * 10) / 10 : 0 };
  });

  const withData = weekly.filter((w) => sums.get(w.weekStart)!.count > 0);
  const currentAvgHours = withData.length > 0 ? withData[withData.length - 1].value : null;
  const oldestAvgHours = withData.length > 0 ? withData[0].value : null;
  const deltaPct =
    currentAvgHours !== null && oldestAvgHours !== null && oldestAvgHours > 0
      ? Math.round(((currentAvgHours - oldestAvgHours) / oldestAvgHours) * 1000) / 10
      : null;

  return { weekly, currentAvgHours, deltaPct, sampleSize };
}

function computeAssignmentVolume(history: AssignedAdventureRow[]): ManagerSelfGrowth["volume"] {
  const buckets = buildWeekBuckets();
  const assigned = new Map<string, number>();
  const approved = new Map<string, number>();
  buckets.forEach((d) => {
    assigned.set(dateKey(d), 0);
    approved.set(dateKey(d), 0);
  });

  for (const adventure of history) {
    const key = bucketKeyFor(adventure.createdAt);
    if (assigned.has(key)) assigned.set(key, assigned.get(key)! + 1);

    for (const p of adventure.progress) {
      if (p.approval === "APPROVED" && p.approvedAt) {
        const approvedKey = bucketKeyFor(p.approvedAt);
        if (approved.has(approvedKey)) approved.set(approvedKey, approved.get(approvedKey)! + 1);
      }
    }
  }

  return {
    assignedByWeek: buckets.map((d) => ({ weekStart: dateKey(d), value: assigned.get(dateKey(d))! })),
    approvedByWeek: buckets.map((d) => ({ weekStart: dateKey(d), value: approved.get(dateKey(d))! })),
  };
}

class GrowthServiceImpl {
  async getEmployeeGrowth(employeeId: string): Promise<EmployeeGrowth> {
    const since = weeksAgo(GROWTH_WEEKS);
    const rows = await GrowthRepository.findCompletedProgressForEmployee(employeeId, since);
    return {
      skill: computeSkillTrend(rows),
      consistency: computeConsistency(rows),
      output: computeOutputVolume(rows),
    };
  }

  async getTeamGrowth(managerId: string): Promise<TeamGrowth> {
    const guildIds = (await GuildRepository.findIdsManagedBy(managerId)).map((g) => g.id);
    if (guildIds.length === 0) {
      return { memberCount: 0, skill: emptySkill(), consistency: emptyConsistency() };
    }
    const since = weeksAgo(GROWTH_WEEKS);
    const rows = await GrowthRepository.findCompletedProgressForGuilds(guildIds, since);
    const memberIds = new Set(rows.map((r) => r.employeeId));
    return {
      memberCount: memberIds.size,
      skill: computeSkillTrend(rows),
      consistency: computeConsistency(rows),
    };
  }

  async getManagerSelfGrowth(managerId: string, isAdmin: boolean): Promise<ManagerSelfGrowth> {
    const since = weeksAgo(GROWTH_WEEKS);
    const history = isAdmin
      ? await GrowthRepository.findAllAssignedHistorySince(since)
      : await GrowthRepository.findAssignedHistoryForGuildsSince(
          (await GuildRepository.findIdsManagedBy(managerId)).map((g) => g.id),
          since
        );
    return {
      turnaround: computeTurnaround(history),
      volume: computeAssignmentVolume(history),
    };
  }

  async getEmployeeGrowthWithInsight(employeeId: string) {
    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    const growth = await this.getEmployeeGrowth(employeeId);
    const insight = await AIService.generateEmployeeGrowthInsight({
      employeeName: employee.name,
      skillCurrentPct: growth.skill.currentPct,
      skillDeltaPct: growth.skill.deltaPct,
      currentStreakDays: growth.consistency.currentStreakDays,
      longestGapDays: growth.consistency.longestGapDays,
      thisWeekXp: growth.output.thisWeekXp,
      rollingAvgXp: growth.output.rollingAvgXp,
      outputDeltaPct: growth.output.deltaPct,
    });
    return { growth, insight: withActionLinks(insight) };
  }

  async getTeamGrowthWithInsight(managerId: string) {
    const growth = await this.getTeamGrowth(managerId);
    const avgActiveDaysThisWeek = growth.consistency.activeDaysByWeek.at(-1)?.value ?? null;
    const insight: GrowthInsight =
      growth.memberCount === 0
        ? {
            headline: "No team members yet.",
            observations: [{ text: "Add members to your team to start tracking collective growth.", topic: "teams" }],
          }
        : await AIService.generateTeamGrowthInsight({
            memberCount: growth.memberCount,
            skillCurrentPct: growth.skill.currentPct,
            skillDeltaPct: growth.skill.deltaPct,
            avgActiveDaysThisWeek,
          });
    return { growth, insight: withActionLinks(insight) };
  }

  async getManagerSelfGrowthWithInsight(managerId: string, isAdmin: boolean) {
    const growth = await this.getManagerSelfGrowth(managerId, isAdmin);
    const insight = await AIService.generateManagerSelfGrowthInsight({
      currentAvgTurnaroundHours: growth.turnaround.currentAvgHours,
      turnaroundDeltaPct: growth.turnaround.deltaPct,
      turnaroundSampleSize: growth.turnaround.sampleSize,
      assignedThisWeek: growth.volume.assignedByWeek.at(-1)?.value ?? 0,
      approvedThisWeek: growth.volume.approvedByWeek.at(-1)?.value ?? 0,
    });
    return { growth, insight: withActionLinks(insight) };
  }
}

export const GrowthService = new GrowthServiceImpl();
