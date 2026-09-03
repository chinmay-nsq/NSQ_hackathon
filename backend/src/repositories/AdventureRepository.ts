import { prisma } from "@/config/db";
import { AdventureStatus, AdventureType, ApprovalStatus, BoardStatus, Prisma } from "@prisma/client";

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

  /** Full detail for the enlarged task view — real assignee identity, who created/assigned it, all in one query. */
  findByIdWithFullDetail(id: string) {
    return prisma.adventure.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, title: true, avatarSeed: true } },
        assignedBy: { select: { id: true, name: true, title: true, avatarSeed: true } },
        progress: {
          include: {
            employee: { select: { id: true, name: true, title: true, avatarSeed: true, guildId: true } },
          },
        },
      },
    });
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

  /** Moves a card to a Kanban column. Touches nothing else — see AdventureService.setBoardStatus. */
  setBoardStatus(adventureId: string, boardStatus: BoardStatus) {
    return prisma.adventure.update({ where: { id: adventureId }, data: { boardStatus } });
  },

  /** The minimum shape assertCanViewTask needs to authorise a board move. */
  findBoardCard(adventureId: string) {
    return prisma.adventure.findUnique({
      where: { id: adventureId },
      select: {
        id: true,
        guildId: true,
        progress: { select: { employeeId: true, employee: { select: { guildId: true } } } },
      },
    });
  },

  /** Re-plans (or un-plans, with `null`) which sprint a task belongs to — e.g. moving a spillover task into the next sprint. */
  setSprint(adventureId: string, sprintId: string | null) {
    return prisma.adventure.update({ where: { id: adventureId }, data: { sprintId } });
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
        // Who assigned it (always the viewing manager themself here, but
        // kept for completeness/admin view) and — the actually useful
        // field — who it's assigned TO, via the one AdventureProgress row
        // a SOLO assignment creates for its assignee.
        createdBy: { select: { id: true, name: true, title: true, avatarSeed: true } },
        progress: {
          include: {
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
        createdBy: { select: { id: true, name: true, title: true, avatarSeed: true } },
        progress: {
          include: {
            employee: { select: { id: true, name: true, title: true, avatarSeed: true } },
          },
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
        createdBy: { select: { id: true, name: true, title: true, avatarSeed: true } },
        progress: {
          include: {
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
        },
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
        createdBy: { select: { id: true, name: true, title: true, avatarSeed: true } },
        progress: {
          include: {
            employee: { select: { id: true, name: true, title: true, avatarSeed: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * An employee's own full history of completed SOLO tasks — both
   * self-generated (daily quiz) and manager-assigned ones — every status,
   * so someone can look back at everything they've finished. Always the
   * viewer's own identity, so no anonymization applies here at all.
   */
  findCompletedHistoryForEmployee(employeeId: string) {
    return prisma.adventureProgress.findMany({
      where: { employeeId, completed: true },
      include: { adventure: { include: { assignedBy: { select: { id: true, name: true, title: true, avatarSeed: true } } } } },
      orderBy: { completedAt: "desc" },
    });
  },

  /**
   * Tasks assigned TO this employee by a manager that they haven't
   * completed yet — the employee-side mirror of
   * findAssignedNotCompletedForGuilds, scoped to one person instead of a
   * manager's whole team.
   */
  findAssignedNotCompletedForEmployee(employeeId: string) {
    return prisma.adventure.findMany({
      where: {
        type: "SOLO",
        assignedById: { not: null },
        status: "ACTIVE",
        progress: { some: { employeeId, completed: false } },
      },
      include: {
        assignedBy: { select: { id: true, name: true, title: true, avatarSeed: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * A manager's review queue for one approval status, scoped to the guilds
   * they lead — PENDING is "waiting for your review", APPROVED is "you've
   * already reviewed and accepted this". Shared by listPendingFor's pending
   * bucket and the new full-history approved bucket, so both stay in sync
   * on shape (real employee identity, adventure details) instead of
   * duplicating near-identical queries per status.
   */
  findByApprovalStatusForGuilds(approval: ApprovalStatus, guildIds: string[]) {
    return prisma.adventureProgress.findMany({
      where: {
        approval,
        employee: { guildId: { in: guildIds } },
      },
      include: {
        adventure: true,
        employee: { select: { id: true, name: true, title: true, avatarSeed: true } },
      },
      orderBy: { completedAt: "desc" },
    });
  },

  /** Same as findByApprovalStatusForGuilds but company-wide, for admins. */
  findByApprovalStatusAll(approval: ApprovalStatus) {
    return prisma.adventureProgress.findMany({
      where: { approval },
      include: {
        adventure: true,
        employee: { select: { id: true, name: true, title: true, avatarSeed: true } },
      },
      orderBy: { completedAt: "desc" },
    });
  },

  findProgressWithAdventure(adventureId: string, employeeId: string) {
    return prisma.adventureProgress.findUnique({
      where: { adventureId_employeeId: { adventureId, employeeId } },
      include: { adventure: true },
    });
  },

  /**
   * Whole-team Kanban board — every SOLO task belonging to a member of
   * these guilds (self-created or manager-assigned, active or completed in
   * the last window) plus every GUILD-type task for these guilds, each
   * with real assignee identity. The board still respects who's actually
   * assigned (shown per-card), it just isn't filtered down to "my own
   * tasks only" the way the plain task list is.
   */
  findBoardForGuilds(guildIds: string[], since: Date) {
    return prisma.adventure.findMany({
      where: {
        AND: [
          // The personal daily skill quiz is practice, not team-planned
          // work — it never belongs on the shared Sprint/Kanban board.
          { dailyQuizDate: null },
          {
            OR: [
              {
                type: "SOLO",
                OR: [
                  { createdBy: { guildId: { in: guildIds } } },
                  { progress: { some: { employee: { guildId: { in: guildIds } } } } },
                ],
              },
              { type: "GUILD", guildId: { in: guildIds } },
            ],
          },
          { OR: [{ status: "ACTIVE" }, { createdAt: { gte: since } }] },
        ],
      },
      include: {
        createdBy: { select: { id: true, name: true, title: true, avatarSeed: true } },
        assignedBy: { select: { id: true, name: true, title: true, avatarSeed: true } },
        progress: {
          include: {
            employee: { select: { id: true, name: true, title: true, avatarSeed: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * The board scoped to exactly one sprint (or, with `sprintId: null`, the
   * backlog) — no recency window, since a past sprint should still show
   * its full task list, not just what's happened in the last two weeks.
   */
  findBoardBySprint(guildIds: string[], sprintId: string | null) {
    return prisma.adventure.findMany({
      where: {
        sprintId,
        dailyQuizDate: null,
        OR: [
          {
            type: "SOLO",
            OR: [
              { createdBy: { guildId: { in: guildIds } } },
              { progress: { some: { employee: { guildId: { in: guildIds } } } } },
            ],
          },
          { type: "GUILD", guildId: { in: guildIds } },
        ],
      },
      include: {
        createdBy: { select: { id: true, name: true, title: true, avatarSeed: true } },
        assignedBy: { select: { id: true, name: true, title: true, avatarSeed: true } },
        progress: {
          include: {
            employee: { select: { id: true, name: true, title: true, avatarSeed: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};

export type { AdventureType };
