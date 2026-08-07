import { prisma } from "@/config/db";
import { Prisma, AdventureType, AdventureStatus, ApprovalStatus } from "@prisma/client";

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
      where: { type: "SOLO", createdById: employeeId, createdAt: { gte: startOfDay }, aiGenerated: true },
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

  /** Submits/records completion — the caller decides APPROVED (immediate credit) vs PENDING (needs review). */
  upsertProgress(
    adventureId: string,
    employeeId: string,
    submission: string | undefined,
    approval: ApprovalStatus,
    approvedById?: string
  ) {
    const shared = {
      completed: true,
      submission,
      completedAt: new Date(),
      approval,
      ...(approvedById ? { approvedById, approvedAt: new Date() } : {}),
    };
    return prisma.adventureProgress.upsert({
      where: { adventureId_employeeId: { adventureId, employeeId } },
      create: { adventureId, employeeId, ...shared },
      update: shared,
    });
  },

  setApproval(
    adventureId: string,
    employeeId: string,
    approval: ApprovalStatus,
    approvedById: string,
    rejectionNote?: string
  ) {
    return prisma.adventureProgress.update({
      where: { adventureId_employeeId: { adventureId, employeeId } },
      data: { approval, approvedById, approvedAt: new Date(), rejectionNote },
    });
  },

  /** Pending-approval queue for a manager: adventures completed by members of the given guilds. */
  findPendingForGuilds(guildIds: string[]) {
    return prisma.adventureProgress.findMany({
      where: {
        approval: "PENDING",
        employee: { guildId: { in: guildIds } },
      },
      include: { adventure: true, employee: { select: { id: true, name: true, title: true, avatarSeed: true } } },
      orderBy: { completedAt: "asc" },
    });
  },

  /** Company-wide pending-approval queue, for admins. */
  findAllPending() {
    return prisma.adventureProgress.findMany({
      where: { approval: "PENDING" },
      include: { adventure: true, employee: { select: { id: true, name: true, title: true, avatarSeed: true } } },
      orderBy: { completedAt: "asc" },
    });
  },

  findProgressWithAdventure(adventureId: string, employeeId: string) {
    return prisma.adventureProgress.findUnique({
      where: { adventureId_employeeId: { adventureId, employeeId } },
      include: { adventure: true },
    });
  },
};

export type { AdventureType };
