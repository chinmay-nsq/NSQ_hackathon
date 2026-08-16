import { prisma } from "@/config/db";

export const GrowthRepository = {
  /**
   * Every completed AdventureProgress row for one employee within a date
   * window, with just enough Adventure data to compute quiz accuracy,
   * output volume, and consistency — one shared query, since all three
   * employee-growth dimensions read from the same rows.
   */
  findCompletedProgressForEmployee(employeeId: string, since: Date) {
    return prisma.adventureProgress.findMany({
      where: { employeeId, completed: true, completedAt: { gte: since } },
      select: {
        completedAt: true,
        quizAnswers: true,
        quizCorrectCount: true,
        adventure: {
          select: { id: true, xpReward: true, quiz: true, dailyQuizDate: true, type: true },
        },
      },
      orderBy: { completedAt: "asc" },
    });
  },

  /** Same shape, but for every member of the given guild ids at once — the team-growth aggregate. */
  findCompletedProgressForGuilds(guildIds: string[], since: Date) {
    return prisma.adventureProgress.findMany({
      where: {
        completed: true,
        completedAt: { gte: since },
        employee: { guildId: { in: guildIds } },
      },
      select: {
        employeeId: true,
        completedAt: true,
        quizAnswers: true,
        quizCorrectCount: true,
        adventure: {
          select: { id: true, xpReward: true, quiz: true, dailyQuizDate: true, type: true },
        },
      },
      orderBy: { completedAt: "asc" },
    });
  },

  /**
   * Manager's own review-turnaround + assignment-volume source data — same
   * filter shape as AdventureRepository's assigned-history methods, scoped
   * to a date window and trimmed to only the fields the leadership
   * computation needs (createdAt = assigned time, progress[].completedAt/
   * approvedAt/approvedById/approval).
   */
  findAssignedHistoryForGuildsSince(guildIds: string[], since: Date) {
    return prisma.adventure.findMany({
      where: {
        type: "SOLO",
        assignedById: { not: null },
        guildId: { in: guildIds },
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

  /** Same as findAssignedHistoryForGuildsSince but company-wide, for admins acting as their own "self growth" leader view. */
  findAllAssignedHistorySince(since: Date) {
    return prisma.adventure.findMany({
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
};
