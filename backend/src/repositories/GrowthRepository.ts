import { prisma } from "@/config/db";

export const GrowthRepository = {
  /**
   * Every completed AssignmentProgress row for one employee within a date
   * window, with just enough Assignment data to compute quiz accuracy,
   * output volume, and consistency — one shared query, since all three
   * employee-growth dimensions read from the same rows.
   */
  findCompletedProgressForEmployee(employeeId: string, since: Date) {
    return prisma.assignmentProgress.findMany({
      where: { employeeId, completed: true, completedAt: { gte: since } },
      select: {
        completedAt: true,
        quizAnswers: true,
        quizCorrectCount: true,
        approval: true,
        assignment: {
          select: { id: true, xpReward: true, quiz: true, dailyQuizDate: true, type: true },
        },
      },
      orderBy: { completedAt: "asc" },
    });
  },

  /** Same shape, but for every member of the given team ids at once — the team-growth aggregate. */
  findCompletedProgressForTeams(teamIds: string[], since: Date) {
    return prisma.assignmentProgress.findMany({
      where: {
        completed: true,
        completedAt: { gte: since },
        employee: { teamId: { in: teamIds } },
      },
      select: {
        employeeId: true,
        completedAt: true,
        quizAnswers: true,
        quizCorrectCount: true,
        approval: true,
        assignment: {
          select: { id: true, xpReward: true, quiz: true, dailyQuizDate: true, type: true },
        },
      },
      orderBy: { completedAt: "asc" },
    });
  },

  /**
   * Manager's own review-turnaround + assignment-volume source data — same
   * filter shape as AssignmentRepository's assigned-history methods, scoped
   * to a date window and trimmed to only the fields the leadership
   * computation needs (createdAt = assigned time, progress[].completedAt/
   * approvedAt/approvedById/approval).
   */
  findAssignedHistoryForTeamsSince(teamIds: string[], since: Date) {
    return prisma.assignment.findMany({
      where: {
        type: "SOLO",
        assignedById: { not: null },
        teamId: { in: teamIds },
        createdAt: { gte: since },
      },
      select: {
        id: true,
        createdAt: true,
        assignedById: true,
        progress: {
          select: { employeeId: true, completedAt: true, approval: true, approvedAt: true, approvedById: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  /** Same as findAssignedHistoryForTeamsSince but company-wide, for admins acting as their own "self growth" leader view. */
  findAllAssignedHistorySince(since: Date) {
    return prisma.assignment.findMany({
      where: { type: "SOLO", assignedById: { not: null }, createdAt: { gte: since } },
      select: {
        id: true,
        createdAt: true,
        assignedById: true,
        progress: {
          select: { employeeId: true, completedAt: true, approval: true, approvedAt: true, approvedById: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  /**
   * Real task-level activity for one employee in a date range — the actual
   * titles/types/scores behind a week's (or the whole window's) computed
   * numbers, for the manager's "why did this week look this way" detail
   * view. `until` is exclusive.
   */
  /** One row per task planned into any of the given sprints, with just enough to compute a per-sprint completion rate. */
  findTasksForSprints(sprintIds: string[]) {
    return prisma.assignment.findMany({
      where: { sprintId: { in: sprintIds } },
      select: {
        sprintId: true,
        progress: { select: { approval: true }, take: 1 },
      },
    });
  },

  findTaskActivityForEmployee(employeeId: string, since: Date, until: Date) {
    return prisma.assignmentProgress.findMany({
      where: { employeeId, completed: true, completedAt: { gte: since, lt: until } },
      select: {
        completedAt: true,
        approval: true,
        quizAnswers: true,
        quizCorrectCount: true,
        assignment: {
          select: { id: true, title: true, type: true, xpReward: true, quiz: true, dailyQuizDate: true },
        },
      },
      orderBy: { completedAt: "asc" },
    });
  },
};
