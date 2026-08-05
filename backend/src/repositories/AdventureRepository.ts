import { prisma } from "@/config/db";
import { Prisma, AdventureType, AdventureStatus } from "@prisma/client";

export const AdventureRepository = {
  findActiveForEmployee(employeeId: string, guildId: string | null) {
    return prisma.adventure.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { type: "SOLO", createdById: employeeId },
          { type: "GUILD", guildId: guildId ?? "__none__" },
          { type: "CROSS_GUILD" },
        ],
      },
      include: { progress: { where: { employeeId } } },
      orderBy: { createdAt: "desc" },
    });
  },

  findTodaysSoloAdventure(employeeId: string, startOfDay: Date) {
    return prisma.adventure.findFirst({
      where: { type: "SOLO", createdById: employeeId, createdAt: { gte: startOfDay } },
    });
  },

  findTodaysGuildAdventure(guildId: string, startOfDay: Date) {
    return prisma.adventure.findFirst({
      where: { type: "GUILD", guildId, createdAt: { gte: startOfDay } },
    });
  },

  findById(id: string) {
    return prisma.adventure.findUnique({ where: { id } });
  },

  create(data: Prisma.AdventureCreateInput) {
    return prisma.adventure.create({ data });
  },

  setStatus(id: string, status: AdventureStatus) {
    return prisma.adventure.update({ where: { id }, data: { status } });
  },

  findProgress(adventureId: string, employeeId: string) {
    return prisma.adventureProgress.findUnique({
      where: { adventureId_employeeId: { adventureId, employeeId } },
    });
  },

  upsertProgress(adventureId: string, employeeId: string, submission?: string) {
    return prisma.adventureProgress.upsert({
      where: { adventureId_employeeId: { adventureId, employeeId } },
      create: { adventureId, employeeId, completed: true, submission, completedAt: new Date() },
      update: { completed: true, submission, completedAt: new Date() },
    });
  },
};

export type { AdventureType };
