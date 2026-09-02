import { prisma } from "@/config/db";

export const SprintRepository = {
  create(guildId: string, name: string, startDate: Date, endDate: Date) {
    return prisma.sprint.create({ data: { guildId, name, startDate, endDate } });
  },

  /** Most recent sprints for the given guilds, each with its planned task count — newest first. */
  findRecentForGuilds(guildIds: string[], limit: number) {
    return prisma.sprint.findMany({
      where: { guildId: { in: guildIds } },
      include: { _count: { select: { adventures: true } } },
      orderBy: { startDate: "desc" },
      take: limit,
    });
  },

  findById(id: string) {
    return prisma.sprint.findUnique({ where: { id } });
  },
};
