import { BoardStatus, Prisma, WorkItemType } from "@prisma/client";
import { prisma } from "@/config/db";
import { AdventureRepository } from "@/repositories/AdventureRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { GuildRepository } from "@/repositories/GuildRepository";
import { CompanionRepository } from "@/repositories/CompanionRepository";
import { SprintRepository } from "@/repositories/SprintRepository";
import { AdventureFactory, QUIZ_COINS_PER_CORRECT, QUIZ_QUESTION_COUNT } from "@/factories/AdventureFactory";
import { AIService } from "./AIService";
import { CompanionService } from "./CompanionService";
import { TaskActivityService } from "./TaskActivityService";
import { StandupService } from "./StandupService";
import { TaskCommentRepository } from "@/repositories/TaskCommentRepository";
import { XP_PER_LEVEL, COMPANION_BOND_XP_PER_ADVENTURE } from "@/config/constants";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

// How far back the Kanban board looks for recently-completed cards — long
// enough that a task finished a couple weeks ago is still visible for
// context, short enough that the board doesn't accumulate forever.
const BOARD_HISTORY_DAYS = 14;

/** Stored enum -> the lowercase column key the board UI speaks. */
const BOARD_COLUMN = {
  TODO: "todo",
  IN_REVIEW: "in_review",
  NEEDS_REWORK: "needs_rework",
  DONE: "done",
} as const satisfies Record<BoardStatus, string>;

export type TaskColumnKey = (typeof BOARD_COLUMN)[BoardStatus];

/** The reverse map, for turning a dragged column back into the stored enum. */
const BOARD_STATUS: Record<TaskColumnKey, BoardStatus> = {
  todo: "TODO",
  in_review: "IN_REVIEW",
  needs_rework: "NEEDS_REWORK",
  done: "DONE",
};

export function isTaskColumnKey(value: string): value is TaskColumnKey {
  return value in BOARD_STATUS;
}

/** Human column names, for the standup line a move posts. */
const COLUMN_LABEL: Record<TaskColumnKey, string> = {
  todo: "To Do",
  in_review: "In Review",
  needs_rework: "Needs Rework",
  done: "Done",
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * "YYYY-MM-DD" for the current local day — used as the daily-quiz
 * uniqueness key. Built from local calendar fields directly, NOT via
 * toISOString() (which converts to UTC and would shift the date near
 * midnight in any timezone ahead of UTC, e.g. IST).
 */
function todayDateKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function xpToLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

class AdventureServiceImpl {
  async listForEmployee(employeeId: string) {
    const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    return AdventureRepository.findActiveForEmployee(employeeId, employee.guildId, startOfToday());
  }

  /**
   * The self-serve daily solo quest — a 5-question skill quiz tailored to
   * the employee's profile. The `existing` check below is just a fast path
   * to skip the AI call when possible; the actual duplicate-prevention
   * guarantee is the DB-level unique constraint on
   * [createdById, dailyQuizDate] (see AdventureFactory.buildSoloQuiz) —
   * without it, two concurrent requests (two tabs, a double-click, a
   * frontend auto-generate race) can both pass this check before either
   * commits, each call the AI, and both create a quiz for the same day.
   */
  async generateSolo(employeeId: string) {
    const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const existing = await AdventureRepository.findTodaysSoloAdventure(employeeId, startOfToday());
    if (existing) return existing;

    const questions = await AIService.generateSkillQuiz({
      jobRole: employee.jobRole,
      seniority: employee.seniority,
      skills: employee.skills,
    });

    const data = AdventureFactory.buildSoloQuiz(questions, employeeId, employee.guildId, todayDateKey());
    try {
      return await AdventureRepository.create(data);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Lost the race — another request already created today's quiz.
        // Return that one instead of failing this request.
        const winner = await AdventureRepository.findTodaysSoloAdventure(employeeId, startOfToday());
        if (winner) return winner;
      }
      throw err;
    }
  }

  /** Employee-authored solo adventure — no AI, fixed reward, requires manager/admin approval before crediting. */
  async createManualSolo(employeeId: string, title: string, description: string, workItemType?: WorkItemType) {
    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const data = AdventureFactory.buildManualSolo(title, description, employeeId, employee.guildId, workItemType);
    const created = await AdventureRepository.create(data);
    await TaskActivityService.log(created.id, employeeId, "CREATED", `Created "${title}".`);
    return created;
  }

  /**
   * A manager/admin assigns the same hand-written task to one or more
   * members of their team in one action — each selected member gets their
   * own independent copy (own progress, own approval), not a shared task.
   */
  async assignSolo(
    assignerId: string,
    assigneeIds: string[],
    title: string,
    description: string,
    xpReward: number,
    coinReward: number,
    workItemType?: WorkItemType,
    sprintId?: string
  ) {
    const uniqueIds = Array.from(new Set(assigneeIds));

    const assignees = await Promise.all(
      uniqueIds.map(async (assigneeId) => {
        await this.assertCanManage(assignerId, assigneeId);
        const assignee = await EmployeeRepository.findById(assigneeId);
        if (!assignee) throw new ApiError(HttpStatus.NOT_FOUND, "Team member not found", "Not Found");
        return assignee;
      })
    );

    // A sprint is scoped to one guild — only actually attach it to
    // assignees who belong to that same guild, so a sprint from one team
    // can never silently plan work for another.
    const sprint = sprintId ? await SprintRepository.findById(sprintId) : null;

    const created = await prisma.$transaction(
      assignees.map((assignee) =>
        AdventureRepository.create(
          AdventureFactory.buildAssignedSolo(
            title,
            description,
            xpReward,
            coinReward,
            assignee.id,
            assignee.guildId,
            assignerId,
            workItemType,
            sprint && sprint.guildId === assignee.guildId ? sprint.id : undefined
          )
        )
      )
    );

    await Promise.all(
      created.map((adventure, i) =>
        TaskActivityService.log(adventure.id, assignerId, "ASSIGNED", `Assigned to ${assignees[i].name}.`)
      )
    );

    return created;
  }

  /**
   * Re-plans a task into a different sprint (or `null` for the backlog) —
   * how a spillover task that didn't finish in time gets moved into the
   * next sprint. Same permission rule as assigning: only the task's own
   * manager (or an admin) can move it, and the target sprint must belong
   * to the same guild the task is already in.
   */
  async moveToSprint(actorId: string, adventureId: string, sprintId: string | null) {
    const adventure = await AdventureRepository.findById(adventureId);
    if (!adventure) throw new ApiError(HttpStatus.NOT_FOUND, "Task not found", "Not Found");
    if (!adventure.createdById) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "This task has no owner to check permissions against", "Bad Request");
    }
    await this.assertCanManage(actorId, adventure.createdById);

    if (sprintId) {
      const sprint = await SprintRepository.findById(sprintId);
      if (!sprint || sprint.guildId !== adventure.guildId) {
        throw new ApiError(HttpStatus.BAD_REQUEST, "That sprint doesn't belong to this task's team", "Bad Request");
      }
    }

    return AdventureRepository.setSprint(adventureId, sprintId);
  }

  /**
   * A manager/admin asks the AI to generate a task for a specific team
   * member, built only from that member's work profile — the prompt never
   * includes their name or any other identifying detail. Still needs
   * approval on completion, same as any manager-assigned task.
   */
  async generateForEmployee(assignerId: string, assigneeId: string) {
    await this.assertCanManage(assignerId, assigneeId);

    const assignee = await EmployeeRepository.findById(assigneeId);
    if (!assignee) throw new ApiError(HttpStatus.NOT_FOUND, "Team member not found", "Not Found");
    if (!assignee.jobRole || !assignee.seniority) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        "This person hasn't completed their work profile yet",
        "Bad Request"
      );
    }

    const content = await AIService.generateSoloAdventureForProfile({
      jobRole: assignee.jobRole,
      seniority: assignee.seniority,
      skills: assignee.skills,
    });

    const data = AdventureFactory.buildAssignedSolo(
      content.title,
      content.description,
      content.xpReward,
      content.coinReward,
      assigneeId,
      assignee.guildId,
      assignerId
    );
    const created = await AdventureRepository.create(data);
    await TaskActivityService.log(created.id, assignerId, "ASSIGNED", `Assigned to ${assignee.name} (AI-generated).`);
    return created;
  }

  /** Only the guild's own manager (or an admin) can spark a new team adventure — regular members complete it, they don't start it. */
  async generateGuild(employeeId: string) {
    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee?.guildId) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "You are not in a guild", "Bad Request");
    }

    const guild = await GuildRepository.findById(employee.guildId);
    if (!guild) throw new ApiError(HttpStatus.NOT_FOUND, "Guild not found", "Not Found");

    const isLeadOfThisGuild = employee.role === "MANAGER" && guild.managerId === employeeId;
    if (employee.role !== "ADMIN" && !isLeadOfThisGuild) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        "Only your team's lead can start a new team adventure",
        "Forbidden"
      );
    }

    const existing = await AdventureRepository.findTodaysGuildAdventure(guild.id, startOfToday());
    if (existing) return existing;

    const content = await AIService.generateGuildAdventure({
      guildName: guild.name,
      department: guild.department,
    });

    const data = AdventureFactory.buildGuild(content, guild.id);
    return AdventureRepository.create(data);
  }

  /**
   * Marks an adventure as done by the employee. AI-generated adventures keep
   * today's behavior — reward is credited immediately. Employee-authored
   * ("manual") adventures go PENDING instead: no crediting until a
   * manager/admin approves them via `approve()`.
   *
   * Quiz-type solo adventures pass `quizAnswers` (the option index the
   * employee picked per question) and `quizCorrectCount` (graded
   * client-side against the obfuscated answer key) — coins credited are
   * `quizCorrectCount * QUIZ_COINS_PER_CORRECT`, not the adventure's flat
   * `coinReward`. The backend does not re-verify the score; it trusts the
   * client-reported count.
   */
  async complete(
    employeeId: string,
    adventureId: string,
    submission?: string,
    quiz?: { answers: number[]; correctCount: number }
  ) {
    const adventure = await AdventureRepository.findById(adventureId);
    if (!adventure) throw new ApiError(HttpStatus.NOT_FOUND, "Adventure not found", "Not Found");
    if (adventure.status !== "ACTIVE") {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Adventure is not active", "Bad Request");
    }

    const already = await AdventureRepository.findProgress(adventureId, employeeId);
    if (already?.completed) {
      throw new ApiError(HttpStatus.CONFLICT, "Already completed", "Conflict");
    }

    if (!adventure.aiGenerated) {
      // Manual adventure: record the submission as PENDING and stop — no reward yet.
      await AdventureRepository.upsertProgress(adventureId, employeeId, submission, "PENDING");
      await AdventureRepository.setBoardStatus(adventureId, "IN_REVIEW");
      await TaskActivityService.log(adventureId, employeeId, "SUBMITTED", "Submitted for review.");
      await StandupService.postTaskEvent(adventureId, employeeId, `submitted **${adventure.title}** for review`);
      return { pendingApproval: true as const };
    }

    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const isQuiz = adventure.quiz !== null;
    if (isQuiz && !quiz) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Quiz answers are required to complete this adventure", "Bad Request");
    }
    const coinOverride = isQuiz && quiz ? Math.max(0, Math.min(quiz.correctCount, QUIZ_QUESTION_COUNT)) * QUIZ_COINS_PER_CORRECT : undefined;

    const updatedEmployee = await this.creditReward(
      employee,
      adventure,
      submission,
      "APPROVED",
      null,
      coinOverride,
      isQuiz ? quiz : undefined
    );
    await AdventureRepository.setBoardStatus(adventureId, "DONE");
    await StandupService.postTaskEvent(adventureId, employeeId, `completed **${adventure.title}**`);
    return { pendingApproval: false as const, employee: updatedEmployee };
  }

  /** Approves a pending manual adventure completion and credits the reward — manager/admin only. */
  async approve(approverId: string, adventureId: string, employeeId: string) {
    await this.assertCanManage(approverId, employeeId);

    const progress = await AdventureRepository.findProgressWithAdventure(adventureId, employeeId);
    if (!progress) throw new ApiError(HttpStatus.NOT_FOUND, "Submission not found", "Not Found");
    if (progress.approval !== "PENDING") {
      throw new ApiError(HttpStatus.CONFLICT, "This submission is not pending approval", "Conflict");
    }

    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const updated = await this.creditReward(
      employee,
      progress.adventure,
      progress.submission ?? undefined,
      "APPROVED",
      approverId
    );
    await AdventureRepository.setBoardStatus(adventureId, "DONE");
    await TaskActivityService.log(adventureId, approverId, "APPROVED", `Approved (submitted by ${employee.name}).`);
    await StandupService.postTaskEvent(adventureId, approverId, `approved **${progress.adventure.title}**`);
    return updated;
  }

  /** Rejects a pending manual adventure completion — no reward is credited. */
  async reject(approverId: string, adventureId: string, employeeId: string, note?: string) {
    await this.assertCanManage(approverId, employeeId);

    // findProgressWithAdventure (rather than findProgress) so the standup
    // line below can name the task.
    const progress = await AdventureRepository.findProgressWithAdventure(adventureId, employeeId);
    if (!progress) throw new ApiError(HttpStatus.NOT_FOUND, "Submission not found", "Not Found");
    if (progress.approval !== "PENDING") {
      throw new ApiError(HttpStatus.CONFLICT, "This submission is not pending approval", "Conflict");
    }

    const result = await AdventureRepository.setApproval(adventureId, employeeId, "REJECTED", approverId, note);
    await AdventureRepository.setBoardStatus(adventureId, "NEEDS_REWORK");
    await StandupService.postTaskEvent(adventureId, approverId, `sent **${progress.adventure.title}** back for rework`);
    await TaskActivityService.log(adventureId, approverId, "REJECTED", note ?? "Rejected — sent back for rework.");
    return result;
  }

  /**
   * Approvals queue: guild-scoped for managers, company-wide for admins.
   * Returns three lists covering the full lifecycle of a lead's assigned
   * tasks: "assigned" (not yet completed), "pending" (completed, awaiting
   * review), and "approved" (reviewed and accepted). Shows real employee
   * identity (name, not companion) — a manager needs to know exactly who a
   * task is assigned to and who completed what.
   */
  async listPendingFor(approverId: string) {
    const approver = await EmployeeRepository.findById(approverId);
    if (!approver) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    if (approver.role === "ADMIN") {
      const [pending, approved, assigned] = await Promise.all([
        AdventureRepository.findByApprovalStatusAll("PENDING"),
        AdventureRepository.findByApprovalStatusAll("APPROVED"),
        AdventureRepository.findAllAssignedNotCompleted(),
      ]);
      return { pending, approved, assigned: assigned.map(this.withAssignee) };
    }

    const guilds = await GuildRepository.findIdsManagedBy(approverId);
    if (guilds.length === 0) return { pending: [], approved: [], assigned: [] };

    const guildIds = guilds.map((g) => g.id);
    const [pending, approved, assigned] = await Promise.all([
      AdventureRepository.findByApprovalStatusForGuilds("PENDING", guildIds),
      AdventureRepository.findByApprovalStatusForGuilds("APPROVED", guildIds),
      AdventureRepository.findAssignedNotCompletedForGuilds(guildIds),
    ]);

    return { pending, approved, assigned: assigned.map(this.withAssignee) };
  }

  /**
   * Full history of every task a lead has ever assigned — every status,
   * not just the currently-outstanding ones — guild-scoped for managers,
   * company-wide for admins. Real employee identity, same reasoning as
   * listPendingFor. Distinct from listPendingFor, which is the
   * action-oriented "needs your review" queue.
   */
  async listAssignedHistoryFor(viewerId: string) {
    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    if (viewer.role === "ADMIN") {
      const history = await AdventureRepository.findAllAssignedHistory();
      return history.map(this.withAssignee);
    }

    const guilds = await GuildRepository.findIdsManagedBy(viewerId);
    if (guilds.length === 0) return [];

    const guildIds = guilds.map((g) => g.id);
    const history = await AdventureRepository.findAssignedHistoryForGuilds(guildIds);
    return history.map(this.withAssignee);
  }

  /**
   * A SOLO assignment creates exactly one AdventureProgress row (for its
   * assignee), so `progress[0].employee` is who the task is actually
   * assigned to — `createdBy` is the assigning manager, not useful for
   * "who is this task assigned to" and kept only for the admin-wide views
   * that don't include progress.
   */
  private withAssignee<T extends { progress?: { employee: unknown }[]; createdBy?: unknown }>(adventure: T) {
    const assignee = adventure.progress?.[0]?.employee ?? adventure.createdBy;
    return { ...adventure, assignee };
  }

  /**
   * An employee's own view of the same 3-state lifecycle managers see:
   * "assigned" (manager-assigned tasks not yet completed), "pending"
   * (completed, awaiting manager review), and "approved" (reviewed and
   * credited). Always the viewer's own identity — no anonymization applies
   * to your own data.
   */
  async myApprovalsFor(employeeId: string) {
    const [assigned, completed] = await Promise.all([
      AdventureRepository.findAssignedNotCompletedForEmployee(employeeId),
      AdventureRepository.findCompletedHistoryForEmployee(employeeId),
    ]);

    return {
      assigned,
      pending: completed.filter((c) => c.approval === "PENDING"),
      approved: completed.filter((c) => c.approval === "APPROVED"),
    };
  }

  /** ADMIN sees every guild; MANAGER sees the guild(s) they lead; EMPLOYEE sees their own guild. */
  private async resolveViewerGuildIds(viewer: { id: string; role: string; guildId: string | null }): Promise<string[]> {
    if (viewer.role === "ADMIN") {
      return (await GuildRepository.findAllIds()).map((g) => g.id);
    }
    if (viewer.role === "MANAGER") {
      return (await GuildRepository.findIdsManagedBy(viewer.id)).map((g) => g.id);
    }
    return viewer.guildId ? [viewer.guildId] : [];
  }

  /**
   * Moves a card between Kanban columns. This is the drag-and-drop path, so
   * it deliberately does NOT touch the approval fields or rewards: dragging
   * a card to Done does not credit XP, and dragging it back out does not
   * claw anything back. Approving through the approvals flow remains the
   * only thing that pays out.
   */
  async setBoardStatus(viewerId: string, adventureId: string, column: TaskColumnKey) {
    const adventure = await AdventureRepository.findBoardCard(adventureId);
    if (!adventure) throw new ApiError(HttpStatus.NOT_FOUND, "Task not found", "Not Found");

    // Same visibility rule as opening the card — if you can see it, you can move it.
    await this.assertCanViewTask(viewerId, adventure);

    const from = adventure.boardStatus;
    const updated = await AdventureRepository.setBoardStatus(adventureId, BOARD_STATUS[column]);

    const fromLabel = COLUMN_LABEL[BOARD_COLUMN[from]];
    const toLabel = COLUMN_LABEL[column];
    await TaskActivityService.log(adventureId, viewerId, "MOVED", `Moved from ${fromLabel} to ${toLabel}.`);
    await StandupService.postTaskEvent(
      adventureId,
      viewerId,
      `moved **${updated.title}** from ${fromLabel} to ${toLabel}`
    );

    return updated;
  }

  /**
   * The whole-team Kanban board — every real task belonging to the
   * viewer's guild(s), not filtered down to "assigned to me". Each card
   * still shows exactly who it's assigned to; visibility is just no
   * longer restricted to that one person.
   */
  /**
   * `sprintFilter` narrows the board: omitted keeps today's default (every
   * recently-active task, sprinted or not); "backlog" shows only tasks with
   * no sprint; a real sprint id shows only that sprint's tasks, regardless
   * of how old it is — a past sprint's board should still be viewable in
   * full, not clipped by the recency window that applies to the default view.
   */
  async getBoard(viewerId: string, sprintFilter?: string) {
    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const guildIds = await this.resolveViewerGuildIds(viewer);
    if (guildIds.length === 0) return [];

    let adventures;
    if (sprintFilter === "backlog") {
      adventures = await AdventureRepository.findBoardBySprint(guildIds, null);
    } else if (sprintFilter) {
      adventures = await AdventureRepository.findBoardBySprint(guildIds, sprintFilter);
    } else {
      const since = new Date();
      since.setDate(since.getDate() - BOARD_HISTORY_DAYS);
      adventures = await AdventureRepository.findBoardForGuilds(guildIds, since);
    }

    return adventures.map((a) => {
      const primaryProgress = a.progress[0];
      return {
        ...a,
        assignee: primaryProgress?.employee ?? a.createdBy,
        column: BOARD_COLUMN[a.boardStatus],
      };
    });
  }

  /** Confirms `viewerId` shares a guild with this task (or is admin) before letting them open its detail view. */
  private async assertCanViewTask(
    viewerId: string,
    adventure: { guildId: string | null; progress: { employeeId: string; employee: { guildId?: string | null } }[] }
  ) {
    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    if (viewer.role === "ADMIN") return;
    if (adventure.progress.some((p) => p.employeeId === viewerId)) return;

    const guildIds = await this.resolveViewerGuildIds(viewer);
    const relevantGuildIds = [adventure.guildId, ...adventure.progress.map((p) => p.employee.guildId ?? null)].filter(
      (id): id is string => id !== null
    );
    if (!relevantGuildIds.some((id) => guildIds.includes(id))) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to view this task", "Forbidden");
    }
  }

  /** Full detail for the enlarged task view — real info, comments, and complete real movement history. */
  async getTaskDetail(viewerId: string, adventureId: string) {
    const adventure = await AdventureRepository.findByIdWithFullDetail(adventureId);
    if (!adventure) throw new ApiError(HttpStatus.NOT_FOUND, "Task not found", "Not Found");

    await this.assertCanViewTask(viewerId, adventure);

    const [comments, activity] = await Promise.all([
      TaskCommentRepository.findForAdventure(adventureId),
      TaskActivityService.historyFor(adventureId),
    ]);

    const primaryProgress = adventure.progress[0];
    return {
      adventure: {
        ...adventure,
        assignee: primaryProgress?.employee ?? adventure.createdBy,
        column: BOARD_COLUMN[adventure.boardStatus],
      },
      comments,
      activity,
    };
  }

  /** Adds a real comment to a task's discussion — same visibility rule as viewing the task at all. */
  async addComment(viewerId: string, adventureId: string, body: string) {
    const adventure = await AdventureRepository.findByIdWithFullDetail(adventureId);
    if (!adventure) throw new ApiError(HttpStatus.NOT_FOUND, "Task not found", "Not Found");

    await this.assertCanViewTask(viewerId, adventure);

    const comment = await TaskCommentRepository.create(adventureId, viewerId, body);
    await TaskActivityService.log(adventureId, viewerId, "COMMENTED", "Left a comment.");
    return comment;
  }

  /** Confirms `managerId` (manager/admin) is allowed to act on `employeeId` — approve, reject, or assign a task. */
  private async assertCanManage(managerId: string, employeeId: string) {
    if (managerId === employeeId) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You can't do that for yourself", "Forbidden");
    }

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

  /** Shared crediting logic: XP/level/coins, guild resources, companion memory, and status flip. */
  private async creditReward(
    employee: { id: string; xp: number; guildId: string | null; name: string },
    adventure: {
      id: string;
      title: string;
      type: string;
      xpReward: number;
      coinReward: number;
      knowledgeReward: number;
      goldReward: number;
      influenceReward: number;
      materialsReward: number;
    },
    submission: string | undefined,
    approval: "APPROVED",
    approvedById: string | null,
    coinOverride?: number,
    quizResult?: { answers: number[]; correctCount: number }
  ) {
    const newXp = employee.xp + adventure.xpReward;
    const coinsToCredit = coinOverride ?? adventure.coinReward;

    const ops = [
      AdventureRepository.upsertProgress(
        adventure.id,
        employee.id,
        submission,
        approval,
        approvedById ?? undefined,
        quizResult
      ),
      EmployeeRepository.update(employee.id, {
        xp: newXp,
        level: xpToLevel(newXp),
        coins: { increment: coinsToCredit },
      }),
    ];
    const [, updatedEmployee] = await prisma.$transaction(ops);

    if (employee.guildId) {
      await GuildRepository.incrementResources(
        employee.guildId,
        {
          knowledge: adventure.knowledgeReward,
          gold: adventure.goldReward,
          influence: adventure.influenceReward,
          materials: adventure.materialsReward,
        },
        Math.round(adventure.xpReward / 2)
      );
    }

    const companion = await CompanionRepository.findByEmployeeId(employee.id);
    if (companion) {
      await CompanionService.recordAdventureCompletion(
        companion.id,
        employee.name,
        adventure.title,
        COMPANION_BOND_XP_PER_ADVENTURE
      );
    }

    if (adventure.type === "SOLO") {
      await AdventureRepository.setStatus(adventure.id, "COMPLETED");
    }

    return updatedEmployee;
  }
}

export const AdventureService = new AdventureServiceImpl();
