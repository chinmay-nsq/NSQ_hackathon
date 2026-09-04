import { prisma } from "@/config/db";
import { AssignmentStatus, AssignmentType, ApprovalStatus, BoardStatus, Prisma } from "@prisma/client";

export const AssignmentRepository = {
  /**
   * Active assignments, plus the employee's own SOLO assignments completed
   * TODAY (not full history) — so a just-finished daily quiz/task is still
   * visible and reviewable for the rest of the day, instead of vanishing
   * from the list the instant it's marked COMPLETED.
   */
  findActiveForEmployee(employeeId: string, teamId: string | null, startOfDay: Date) {
    return prisma.assignment.findMany({
      where: {
        OR: [
          { status: "ACTIVE", type: "SOLO", createdById: employeeId },
          { status: "ACTIVE", type: "TEAM", teamId: teamId ?? "__none__" },
          { status: "ACTIVE", type: "CROSS_TEAM" },
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

  findTodaysSoloAssignment(employeeId: string, startOfDay: Date) {
    return prisma.assignment.findFirst({
      where: { type: "SOLO", createdById: employeeId, createdAt: { gte: startOfDay }, aiGenerated: true },
    });
  },

  findTodaysTeamAssignment(teamId: string, startOfDay: Date) {
    return prisma.assignment.findFirst({
      where: { type: "TEAM", teamId, createdAt: { gte: startOfDay } },
    });
  },

  findById(id: string) {
    return prisma.assignment.findUnique({ where: { id } });
  },

  /** Full detail for the enlarged task view — real assignee identity, who created/assigned it, all in one query. */
  findByIdWithFullDetail(id: string) {
    return prisma.assignment.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, title: true, avatarSeed: true } },
        assignedBy: { select: { id: true, name: true, title: true, avatarSeed: true } },
        progress: {
          include: {
            employee: { select: { id: true, name: true, title: true, avatarSeed: true, teamId: true } },
          },
        },
      },
    });
  },

  create(data: Prisma.AssignmentCreateInput) {
    return prisma.assignment.create({ data });
  },

  setStatus(id: string, status: AssignmentStatus) {
    return prisma.assignment.update({ where: { id }, data: { status } });
  },

  findProgress(assignmentId: string, employeeId: string) {
    return prisma.assignmentProgress.findUnique({
      where: { assignmentId_employeeId: { assignmentId, employeeId } },
    });
  },

  /** Submits/records completion — the caller decides APPROVED (immediate credit) vs PENDING (needs review). */
  upsertProgress(
    assignmentId: string,
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
    return prisma.assignmentProgress.upsert({
      where: { assignmentId_employeeId: { assignmentId, employeeId } },
      create: { assignmentId, employeeId, ...shared },
      update: shared,
    });
  },

  setApproval(
    assignmentId: string,
    employeeId: string,
    approval: ApprovalStatus,
    approvedById: string,
    rejectionNote?: string
  ) {
    return prisma.assignmentProgress.update({
      where: { assignmentId_employeeId: { assignmentId, employeeId } },
      data: { approval, approvedById, approvedAt: new Date(), rejectionNote },
    });
  },

  /** Moves a card to a Kanban column. Touches nothing else — see AssignmentService.setBoardStatus. */
  setBoardStatus(assignmentId: string, boardStatus: BoardStatus) {
    return prisma.assignment.update({ where: { id: assignmentId }, data: { boardStatus } });
  },

  /** The minimum shape assertCanViewTask needs to authorise a board move. */
  findBoardCard(assignmentId: string) {
    return prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        title: true,
        teamId: true,
        boardStatus: true,
        progress: { select: { employeeId: true, employee: { select: { teamId: true } } } },
        // Last resort when resolving which standup room a task belongs to.
        createdBy: { select: { teamId: true } },
      },
    });
  },

  /** Re-plans (or un-plans, with `null`) which sprint a task belongs to — e.g. moving a spillover task into the next sprint. */
  setSprint(assignmentId: string, sprintId: string | null) {
    return prisma.assignment.update({ where: { id: assignmentId }, data: { sprintId } });
  },

  /**
   * Manager/admin-assigned tasks that haven't been completed yet, for
   * members of the given teams — the "awaiting completion" section above
   * the review queue. `assignedById` set (not just aiGenerated: false)
   * distinguishes a manager-assigned task from an employee's own
   * self-authored one, which otherwise look identical.
   */
  findAssignedNotCompletedForTeams(teamIds: string[]) {
    return prisma.assignment.findMany({
      where: {
        type: "SOLO",
        assignedById: { not: null },
        status: "ACTIVE",
        teamId: { in: teamIds },
        progress: { none: { completed: true } },
      },
      include: {
        // Who assigned it (always the viewing manager themself here, but
        // kept for completeness/admin view) and — the actually useful
        // field — who it's assigned TO, via the one AssignmentProgress row
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

  /** Same as findAssignedNotCompletedForTeams but company-wide, for admins. */
  findAllAssignedNotCompleted() {
    return prisma.assignment.findMany({
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
   * given teams — every status (not started, pending, approved,
   * rejected), not just the currently-outstanding ones. Used for the
   * "Assigned by you" section, distinct from the action-oriented Approvals
   * queues above.
   */
  findAssignedHistoryForTeams(teamIds: string[]) {
    return prisma.assignment.findMany({
      where: {
        type: "SOLO",
        assignedById: { not: null },
        teamId: { in: teamIds },
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

  /** Same as findAssignedHistoryForTeams but company-wide, for admins. */
  findAllAssignedHistory() {
    return prisma.assignment.findMany({
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
    return prisma.assignmentProgress.findMany({
      where: { employeeId, completed: true },
      include: { assignment: { include: { assignedBy: { select: { id: true, name: true, title: true, avatarSeed: true } } } } },
      orderBy: { completedAt: "desc" },
    });
  },

  /**
   * Tasks assigned TO this employee by a manager that they haven't
   * completed yet — the employee-side mirror of
   * findAssignedNotCompletedForTeams, scoped to one person instead of a
   * manager's whole team.
   */
  findAssignedNotCompletedForEmployee(employeeId: string) {
    return prisma.assignment.findMany({
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
   * A manager's review queue for one approval status, scoped to the teams
   * they lead — PENDING is "waiting for your review", APPROVED is "you've
   * already reviewed and accepted this". Shared by listPendingFor's pending
   * bucket and the new full-history approved bucket, so both stay in sync
   * on shape (real employee identity, assignment details) instead of
   * duplicating near-identical queries per status.
   */
  findByApprovalStatusForTeams(approval: ApprovalStatus, teamIds: string[]) {
    return prisma.assignmentProgress.findMany({
      where: {
        approval,
        employee: { teamId: { in: teamIds } },
      },
      include: {
        assignment: true,
        employee: { select: { id: true, name: true, title: true, avatarSeed: true } },
      },
      orderBy: { completedAt: "desc" },
    });
  },

  /** Same as findByApprovalStatusForTeams but company-wide, for admins. */
  findByApprovalStatusAll(approval: ApprovalStatus) {
    return prisma.assignmentProgress.findMany({
      where: { approval },
      include: {
        assignment: true,
        employee: { select: { id: true, name: true, title: true, avatarSeed: true } },
      },
      orderBy: { completedAt: "desc" },
    });
  },

  findProgressWithAssignment(assignmentId: string, employeeId: string) {
    return prisma.assignmentProgress.findUnique({
      where: { assignmentId_employeeId: { assignmentId, employeeId } },
      include: { assignment: true },
    });
  },

  /**
   * Whole-team Kanban board — every SOLO task belonging to a member of
   * these teams (self-created or manager-assigned, active or completed in
   * the last window) plus every TEAM-type task for these teams, each
   * with real assignee identity. The board still respects who's actually
   * assigned (shown per-card), it just isn't filtered down to "my own
   * tasks only" the way the plain task list is.
   */
  findBoardForTeams(teamIds: string[], since: Date) {
    return prisma.assignment.findMany({
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
                  { createdBy: { teamId: { in: teamIds } } },
                  { progress: { some: { employee: { teamId: { in: teamIds } } } } },
                ],
              },
              { type: "TEAM", teamId: { in: teamIds } },
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
  findBoardBySprint(teamIds: string[], sprintId: string | null) {
    return prisma.assignment.findMany({
      where: {
        sprintId,
        dailyQuizDate: null,
        OR: [
          {
            type: "SOLO",
            OR: [
              { createdBy: { teamId: { in: teamIds } } },
              { progress: { some: { employee: { teamId: { in: teamIds } } } } },
            ],
          },
          { type: "TEAM", teamId: { in: teamIds } },
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

export type { AssignmentType };
