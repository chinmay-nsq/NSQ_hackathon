import { prisma } from "@/config/db";
import { Prisma, AdventureType, AdventureStatus, ApprovalStatus } from "@prisma/client";

export const AdventureRepository = {
  /**
   * Active adventures, plus the employee's own SOLO adventures completed
   * TODAY (not full history) — so a just-finished daily quiz/task is still
   * visible and reviewable for the rest of the day, instead of vanishing
   * from the list the instant it's marked COMPLETED.
   */
  findActiveForEmployee(employeeId: string, guildId: string | null, startOfDay: Date) {
    return prisma.adventure.findMany({
      where: {
        OR: [
          { status: "ACTIVE", type: "SOLO", createdById: employeeId },
          { status: "ACTIVE", type: "GUILD", guildId: guildId ?? "__none__" },
          { status: "ACTIVE", type: "CROSS_GUILD" },
          {
            status: "COMPLETED",
            type: "SOLO",
            createdById: employeeId,
            progress: { some: { employeeId, completedAt: { gte: startOfDay } } },
          },
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
    approvedById?: string,
    quizResult?: { answers: number[]; correctCount: number }
  ) {
    const shared = {
      completed: true,
      submission,
      completedAt: new Date(),
      approval,
      ...(approvedById ? { approvedById, approvedAt: new Date() } : {}),
      ...(quizResult
        ? { quizAnswers: quizResult.answers, quizCorrectCount: quizResult.correctCount }
        : {}),
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

  /**
   * Manager/admin-assigned tasks that haven't been completed yet, for
   * members of the given guilds — the "awaiting completion" section above
   * the review queue. `assignedById` set (not just aiGenerated: false)
   * distinguishes a manager-assigned task from an employee's own
   * self-authored one, which otherwise look identical.
   */
  findAssignedNotCompletedForGuilds(guildIds: string[]) {
    return prisma.adventure.findMany({
      where: {
        type: "SOLO",
        assignedById: { not: null },
        status: "ACTIVE",
        guildId: { in: guildIds },
        progress: { none: { completed: true } },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            title: true,
            avatarSeed: true,
            companion: { select: { name: true, species: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Same as findAssignedNotCompletedForGuilds but company-wide, for admins. */
  findAllAssignedNotCompleted() {
    return prisma.adventure.findMany({
      where: {
        type: "SOLO",
        assignedById: { not: null },
        status: "ACTIVE",
        progress: { none: { completed: true } },
      },
      include: {
        createdBy: {
          select: { id: true, name: true, title: true, avatarSeed: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Full history of every task a manager has assigned to members of the
   * given guilds — every status (not started, pending, approved,
   * rejected), not just the currently-outstanding ones. Used for the
   * "Assigned by you" section, distinct from the action-oriented Approvals
   * queues above.
   */
  findAssignedHistoryForGuilds(guildIds: string[]) {
    return prisma.adventure.findMany({
      where: {
        type: "SOLO",
        assignedById: { not: null },
        guildId: { in: guildIds },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            title: true,
            avatarSeed: true,
            companion: { select: { name: true, species: true } },
          },
        },
        progress: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Same as findAssignedHistoryForGuilds but company-wide, for admins. */
  findAllAssignedHistory() {
    return prisma.adventure.findMany({
      where: {
        type: "SOLO",
        assignedById: { not: null },
      },
      include: {
        createdBy: {
          select: { id: true, name: true, title: true, avatarSeed: true },
        },
        progress: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Pending-approval queue for a manager: adventures completed by members of the given guilds. */
  findPendingForGuilds(guildIds: string[]) {
    return prisma.adventureProgress.findMany({
      where: {
        approval: "PENDING",
        employee: { guildId: { in: guildIds } },
      },
      include: {
        adventure: true,
        employee: {
          select: {
            id: true,
            name: true,
            title: true,
            avatarSeed: true,
            companion: { select: { name: true, species: true } },
          },
        },
      },
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
