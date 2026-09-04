import { prisma } from "@/config/db";

export const SprintRepository = {
  create(teamId: string, name: string, startDate: Date, endDate: Date) {
    return prisma.sprint.create({ data: { teamId, name, startDate, endDate } });
  },

  /** Most recent sprints for the given teams, each with its planned task count — newest first. */
  findRecentForTeams(teamIds: string[], limit: number) {
    return prisma.sprint.findMany({
      where: { teamId: { in: teamIds } },
      include: { _count: { select: { assignments: true } } },
      orderBy: { startDate: "desc" },
      take: limit,
    });
  },

  findById(id: string) {
    return prisma.sprint.findUnique({ where: { id } });
  },
};
