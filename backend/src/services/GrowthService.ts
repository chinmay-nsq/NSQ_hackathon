import { GrowthRepository } from "@/repositories/GrowthRepository";
import { GuildRepository } from "@/repositories/GuildRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { SprintRepository } from "@/repositories/SprintRepository";
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

export interface ApprovalRate {
  approvedCount: number;
  rejectedCount: number;
  /** null when there's nothing decided yet to compute a rate from. */
  ratePct: number | null;
}

export interface EmployeeGrowth {
  skill: { weekly: WeeklyPoint[]; currentPct: number | null; deltaPct: number | null };
  consistency: { activeDaysByWeek: WeeklyPoint[]; currentStreakDays: number; longestGapDays: number | null };
  output: { xpByWeek: WeeklyPoint[]; thisWeekXp: number; rollingAvgXp: number; deltaPct: number | null };
  approval: ApprovalRate;
  totalTasksCompleted: number;
}

export interface SprintCompletionTrend {
  /** One point per sprint, oldest first; weekStart is that sprint's start date. */
  weekly: WeeklyPoint[];
  currentPct: number | null;
  deltaPct: number | null;
  sprintCount: number;
}

export interface TeamGrowth {
  memberCount: number;
  skill: { weekly: WeeklyPoint[]; currentPct: number | null; deltaPct: number | null };
  consistency: { activeDaysByWeek: WeeklyPoint[] };
  output: { xpByWeek: WeeklyPoint[]; thisWeekXp: number; rollingAvgXp: number; deltaPct: number | null };
  approval: ApprovalRate;
  totalTasksCompleted: number;
  sprintCompletion: SprintCompletionTrend;
}

export interface TeamMemberGrowth {
  employeeId: string;
  name: string;
  title: string;
  level: number;
  growth: EmployeeGrowth;
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
  approval: string;
  adventure: QuizAdventureRef;
}

interface TaskActivityRow {
  completedAt: Date | null;
  approval: string;
  quizAnswers: unknown;
  quizCorrectCount: number | null;
  adventure: QuizAdventureRef & { id: string; title: string; type: string };
}

export interface TaskActivityDetail {
  title: string;
  type: string;
  xpReward: number;
  completedAt: string | null;
  /** Human-readable outcome — "3/5 correct (60%)" for a quiz, or the approval status for a regular task. */
  detail: string;
}

export interface WeekDetail {
  periodLabel: string;
  weekStart: string | null;
  xpThisPeriod: number;
  rollingAvgXp: number;
  activeDays: number;
  tasks: TaskActivityDetail[];
  insight: string;
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

const APPROVAL_LABEL: Record<string, string> = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PENDING: "Submitted, awaiting review",
  NONE: "Completed",
};

/** Turns one real task-activity row into a human-readable outcome line — quiz accuracy for quizzes, approval status for everything else. Never invents anything not in the row itself. */
function describeTaskActivity(row: TaskActivityRow): TaskActivityDetail {
  const pct = submissionAccuracyPct(row);
  let detail: string;
  if (pct !== null) {
    const quiz = row.adventure.quiz as unknown[] | null;
    const total = Array.isArray(quiz) ? quiz.length : 0;
    const correct = total > 0 ? Math.round((pct / 100) * total) : 0;
    detail = total > 0 ? `${correct}/${total} correct (${Math.round(pct)}%)` : `${Math.round(pct)}% accuracy`;
  } else {
    detail = APPROVAL_LABEL[row.approval] ?? row.approval;
  }

  return {
    title: row.adventure.title,
    type: row.adventure.type,
    xpReward: row.adventure.xpReward,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    detail,
  };
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
 * Approval rate over decided submissions only — PENDING (still waiting) and
 * NONE (no review required, e.g. a self-generated quiz) are excluded from
 * the denominator entirely, since neither is a real "approved vs rejected"
 * decision yet.
 */
function computeApprovalRate(rows: ProgressRow[]): ApprovalRate {
  let approvedCount = 0;
  let rejectedCount = 0;
  for (const row of rows) {
    if (row.approval === "APPROVED") approvedCount++;
    else if (row.approval === "REJECTED") rejectedCount++;
  }
  const decided = approvedCount + rejectedCount;
  const ratePct = decided > 0 ? Math.round((approvedCount / decided) * 1000) / 10 : null;
  return { approvedCount, rejectedCount, ratePct };
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

/**
 * Per-sprint task completion rate — approved tasks / all tasks planned into
 * that sprint. `sprints` must already be ordered oldest-first (chronological,
 * matching the week-bucket charts) and `tasks` is every Adventure whose
 * sprintId is one of those sprints, each with its lone progress row's
 * approval status (a SOLO task has exactly one assignee).
 */
function computeSprintCompletion(
  sprints: { id: string; startDate: Date }[],
  tasks: { sprintId: string | null; progress: { approval: string }[] }[]
): SprintCompletionTrend {
  const totals = new Map<string, { total: number; approved: number }>();
  sprints.forEach((s) => totals.set(s.id, { total: 0, approved: 0 }));
  for (const t of tasks) {
    if (!t.sprintId) continue;
    const bucket = totals.get(t.sprintId);
    if (!bucket) continue;
    bucket.total += 1;
    if (t.progress[0]?.approval === "APPROVED") bucket.approved += 1;
  }

  const points = sprints.map((s) => {
    const b = totals.get(s.id)!;
    return {
      weekStart: dateKey(s.startDate),
      value: b.total > 0 ? Math.round((b.approved / b.total) * 1000) / 10 : 0,
      hasData: b.total > 0,
    };
  });

  const withData = points.filter((p) => p.hasData);
  const currentPct = withData.length > 0 ? withData[withData.length - 1].value : null;
  const oldestPct = withData.length > 0 ? withData[0].value : null;
  const deltaPct = currentPct !== null && oldestPct !== null ? Math.round((currentPct - oldestPct) * 10) / 10 : null;

  return {
    weekly: points.map(({ weekStart, value }) => ({ weekStart, value })),
    currentPct,
    deltaPct,
    sprintCount: sprints.length,
  };
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
      approval: computeApprovalRate(rows),
      totalTasksCompleted: rows.length,
    };
  }

  async getTeamGrowth(managerId: string): Promise<TeamGrowth> {
    const guildIds = (await GuildRepository.findIdsManagedBy(managerId)).map((g) => g.id);
    if (guildIds.length === 0) {
      return {
        memberCount: 0,
        skill: emptySkill(),
        consistency: emptyConsistency(),
        output: computeOutputVolume([]),
        approval: computeApprovalRate([]),
        totalTasksCompleted: 0,
        sprintCompletion: { weekly: [], currentPct: null, deltaPct: null, sprintCount: 0 },
      };
    }
    const since = weeksAgo(GROWTH_WEEKS);
    const [rows, sprintsDesc] = await Promise.all([
      GrowthRepository.findCompletedProgressForGuilds(guildIds, since),
      SprintRepository.findRecentForGuilds(guildIds, GROWTH_WEEKS),
    ]);
    const sprints = [...sprintsDesc].reverse(); // oldest -> newest, matching the week-bucket charts
    const tasks = sprints.length > 0 ? await GrowthRepository.findTasksForSprints(sprints.map((s) => s.id)) : [];
    const memberIds = new Set(rows.map((r) => r.employeeId));
    return {
      memberCount: memberIds.size,
      skill: computeSkillTrend(rows),
      consistency: computeConsistency(rows),
      output: computeOutputVolume(rows),
      approval: computeApprovalRate(rows),
      totalTasksCompleted: rows.length,
      sprintCompletion: computeSprintCompletion(sprints, tasks),
    };
  }

  /**
   * Per-member breakdown for the manager's Teams dashboard — same
   * skill/consistency/output computation getEmployeeGrowth already does,
   * just run once per member of every guild this manager leads. "Current"
   * (currentPct / thisWeekXp) reads as the recent snapshot, deltaPct as the
   * trend since the start of the 6-week window — that's the "this month vs
   * overall" comparison the dashboard shows.
   */
  async getTeamMemberBreakdown(managerId: string): Promise<TeamMemberGrowth[]> {
    const guilds = await GuildRepository.findManagedByWithMembers(managerId);
    const members = guilds.flatMap((g) => g.members);
    if (members.length === 0) return [];

    const breakdown = await Promise.all(
      members.map(async (m) => ({
        employeeId: m.id,
        name: m.name,
        title: m.title,
        level: m.level,
        growth: await this.getEmployeeGrowth(m.id),
      }))
    );
    return breakdown;
  }

  /** Confirms `managerId` (manager/admin) is allowed to view `employeeId`'s week-level detail. */
  private async assertCanView(managerId: string, employeeId: string) {
    const manager = await EmployeeRepository.findById(managerId);
    if (!manager) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    if (manager.role === "ADMIN") return;
    if (manager.role !== "MANAGER") {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to do that", "Forbidden");
    }

    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee?.guildId) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to do that", "Forbidden");
    }
    const managedGuilds = await GuildRepository.findIdsManagedBy(managerId);
    if (!managedGuilds.some((g) => g.id === employee.guildId)) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to do that", "Forbidden");
    }
  }

  /**
   * Real task-level detail + an AI explanation for why one employee's
   * performance looked the way it did in a specific week (weekStartISO
   * given, any Monday-of-the-week date) or across the whole window
   * (weekStartISO omitted — "at any time"). Every number and every task
   * title shown here is real; the AI is only ever handed this same data to
   * phrase an explanation from, never asked to invent a cause.
   */
  async getEmployeeWeekDetail(managerId: string, employeeId: string, weekStartISO?: string): Promise<WeekDetail> {
    await this.assertCanView(managerId, employeeId);

    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    let since: Date;
    let until: Date;
    let periodLabel: string;
    let weekStartKey: string | null = null;

    if (weekStartISO) {
      const parsed = new Date(`${weekStartISO}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        throw new ApiError(HttpStatus.BAD_REQUEST, "Invalid week", "Bad Request");
      }
      since = weekStartOf(parsed);
      until = new Date(since);
      until.setDate(until.getDate() + 7);
      weekStartKey = dateKey(since);
      periodLabel = `the week of ${weekStartKey}`;
    } else {
      since = weeksAgo(GROWTH_WEEKS);
      until = new Date();
      until.setDate(until.getDate() + 1); // inclusive of today
      periodLabel = `the full ${GROWTH_WEEKS}-week window`;
    }

    const [growth, allRows] = await Promise.all([
      this.getEmployeeGrowth(employeeId),
      GrowthRepository.findTaskActivityForEmployee(employeeId, since, until),
    ]);

    // The daily skill quiz is personal practice, not delegated work — this
    // view is about real assigned/self-created tasks a manager would
    // actually review, so quiz completions are excluded entirely (not just
    // hidden from the list — they don't count toward this period's XP or
    // active-day totals either).
    const rows = allRows.filter((r) => r.adventure.dailyQuizDate === null);
    const tasks = rows.map(describeTaskActivity);

    const xpThisPeriod = tasks.reduce((sum, t) => sum + t.xpReward, 0);
    const activeDays = new Set(rows.filter((r) => r.completedAt).map((r) => dateKey(r.completedAt!))).size;

    const insight = await AIService.generateWeekPerformanceInsight({
      employeeName: employee.name,
      periodLabel,
      xpThisPeriod,
      rollingAvgXp: growth.output.rollingAvgXp,
      activeDays,
      tasks: tasks.map((t) => ({ title: t.title, type: t.type, xpReward: t.xpReward, detail: t.detail })),
    });

    return {
      periodLabel,
      weekStart: weekStartKey,
      xpThisPeriod,
      rollingAvgXp: growth.output.rollingAvgXp,
      activeDays,
      tasks,
      insight,
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
