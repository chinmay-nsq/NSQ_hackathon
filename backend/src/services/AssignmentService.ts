import { BoardStatus, Prisma, WorkItemType } from "@prisma/client";
import { prisma } from "@/config/db";
import { AssignmentRepository } from "@/repositories/AssignmentRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { TeamRepository } from "@/repositories/TeamRepository";
import { CompanionRepository } from "@/repositories/CompanionRepository";
import { SprintRepository } from "@/repositories/SprintRepository";
import { AssignmentFactory, QUIZ_COINS_PER_CORRECT, QUIZ_QUESTION_COUNT } from "@/factories/AssignmentFactory";
import { AIService } from "./AIService";
import { CompanionService } from "./CompanionService";
import { TaskActivityService } from "./TaskActivityService";
import { StandupService } from "./StandupService";
import {
  taskApprovedLine,
  taskCompletedLine,
  taskMovedLine,
  taskReworkLine,
  taskSubmittedLine,
} from "@/utils/standupNarration";
import { TaskCommentRepository } from "@/repositories/TaskCommentRepository";
import { XP_PER_LEVEL, COMPANION_BOND_XP_PER_ASSIGNMENT } from "@/config/constants";
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

class AssignmentServiceImpl {
  async listForEmployee(employeeId: string) {
    const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    return AssignmentRepository.findActiveForEmployee(employeeId, employee.teamId, startOfToday());
  }

  /**
   * The self-serve daily solo assignment — a 5-question skill quiz tailored to
   * the employee's profile. The `existing` check below is just a fast path
   * to skip the AI call when possible; the actual duplicate-prevention
   * guarantee is the DB-level unique constraint on
   * [createdById, dailyQuizDate] (see AssignmentFactory.buildSoloQuiz) —
   * without it, two concurrent requests (two tabs, a double-click, a
   * frontend auto-generate race) can both pass this check before either
   * commits, each call the AI, and both create a quiz for the same day.
   */
  async generateSolo(employeeId: string) {
    const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const existing = await AssignmentRepository.findTodaysSoloAssignment(employeeId, startOfToday());
    if (existing) return existing;

    const questions = await AIService.generateSkillQuiz({
      jobRole: employee.jobRole,
      seniority: employee.seniority,
      skills: employee.skills,
    });

    const data = AssignmentFactory.buildSoloQuiz(questions, employeeId, employee.teamId, todayDateKey());
    try {
      return await AssignmentRepository.create(data);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Lost the race — another request already created today's quiz.
        // Return that one instead of failing this request.
        const winner = await AssignmentRepository.findTodaysSoloAssignment(employeeId, startOfToday());
        if (winner) return winner;
      }
      throw err;
    }
  }

  /** Employee-authored solo assignment — no AI, fixed reward, requires manager/admin approval before crediting. */
  async createManualSolo(employeeId: string, title: string, description: string, workItemType?: WorkItemType) {
    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const data = AssignmentFactory.buildManualSolo(title, description, employeeId, employee.teamId, workItemType);
    const created = await AssignmentRepository.create(data);
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

    // A sprint is scoped to one team — only actually attach it to
    // assignees who belong to that same team, so a sprint from one team
    // can never silently plan work for another.
    const sprint = sprintId ? await SprintRepository.findById(sprintId) : null;

    const created = await prisma.$transaction(
      assignees.map((assignee) =>
        AssignmentRepository.create(
          AssignmentFactory.buildAssignedSolo(
            title,
            description,
            xpReward,
            coinReward,
            assignee.id,
            assignee.teamId,
            assignerId,
            workItemType,
            sprint && sprint.teamId === assignee.teamId ? sprint.id : undefined
          )
        )
      )
    );

    await Promise.all(
      created.map((assignment, i) =>
        TaskActivityService.log(assignment.id, assignerId, "ASSIGNED", `Assigned to ${assignees[i].name}.`)
      )
    );

    return created;
  }

  /**
   * Re-plans a task into a different sprint (or `null` for the backlog) —
   * how a spillover task that didn't finish in time gets moved into the
   * next sprint. Same permission rule as assigning: only the task's own
   * manager (or an admin) can move it, and the target sprint must belong
   * to the same team the task is already in.
   */
  async moveToSprint(actorId: string, assignmentId: string, sprintId: string | null) {
    const assignment = await AssignmentRepository.findById(assignmentId);
    if (!assignment) throw new ApiError(HttpStatus.NOT_FOUND, "Task not found", "Not Found");
    if (!assignment.createdById) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "This task has no owner to check permissions against", "Bad Request");
    }
    await this.assertCanManage(actorId, assignment.createdById);

    if (sprintId) {
      const sprint = await SprintRepository.findById(sprintId);
      if (!sprint || sprint.teamId !== assignment.teamId) {
        throw new ApiError(HttpStatus.BAD_REQUEST, "That sprint doesn't belong to this task's team", "Bad Request");
      }
    }

    return AssignmentRepository.setSprint(assignmentId, sprintId);
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

    const content = await AIService.generateSoloAssignmentForProfile({
      jobRole: assignee.jobRole,
      seniority: assignee.seniority,
      skills: assignee.skills,
    });

    const data = AssignmentFactory.buildAssignedSolo(
      content.title,
      content.description,
      content.xpReward,
      content.coinReward,
      assigneeId,
      assignee.teamId,
      assignerId
    );
    const created = await AssignmentRepository.create(data);
    await TaskActivityService.log(created.id, assignerId, "ASSIGNED", `Assigned to ${assignee.name} (AI-generated).`);
    return created;
  }

  /** Only the team's own manager (or an admin) can spark a new team assignment — regular members complete it, they don't start it. */
  async generateTeam(employeeId: string) {
    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee?.teamId) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "You are not in a team", "Bad Request");
    }

    const team = await TeamRepository.findById(employee.teamId);
    if (!team) throw new ApiError(HttpStatus.NOT_FOUND, "Team not found", "Not Found");

    const isLeadOfThisTeam = employee.role === "MANAGER" && team.managerId === employeeId;
    if (employee.role !== "ADMIN" && !isLeadOfThisTeam) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        "Only your team's lead can start a new team assignment",
        "Forbidden"
      );
    }

    const existing = await AssignmentRepository.findTodaysTeamAssignment(team.id, startOfToday());
    if (existing) return existing;

    const content = await AIService.generateTeamAssignment({
      teamName: team.name,
      department: team.department,
    });

    const data = AssignmentFactory.buildTeam(content, team.id);
    return AssignmentRepository.create(data);
  }

  /**
   * Marks an assignment as done by the employee. AI-generated assignments keep
   * today's behavior — reward is credited immediately. Employee-authored
   * ("manual") assignments go PENDING instead: no crediting until a
   * manager/admin approves them via `approve()`.
   *
   * Quiz-type solo assignments pass `quizAnswers` (the option index the
   * employee picked per question) and `quizCorrectCount` (graded
   * client-side against the obfuscated answer key) — coins credited are
   * `quizCorrectCount * QUIZ_COINS_PER_CORRECT`, not the assignment's flat
   * `coinReward`. The backend does not re-verify the score; it trusts the
   * client-reported count.
   */
  async complete(
    employeeId: string,
    assignmentId: string,
    submission?: string,
    quiz?: { answers: number[]; correctCount: number }
  ) {
    const assignment = await AssignmentRepository.findById(assignmentId);
    if (!assignment) throw new ApiError(HttpStatus.NOT_FOUND, "Assignment not found", "Not Found");
    if (assignment.status !== "ACTIVE") {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Assignment is not active", "Bad Request");
    }

    const already = await AssignmentRepository.findProgress(assignmentId, employeeId);
    if (already?.completed) {
      throw new ApiError(HttpStatus.CONFLICT, "Already completed", "Conflict");
    }

    if (!assignment.aiGenerated) {
      // Manual assignment: record the submission as PENDING and stop — no reward yet.
      await AssignmentRepository.upsertProgress(assignmentId, employeeId, submission, "PENDING");
      await AssignmentRepository.setBoardStatus(assignmentId, "IN_REVIEW");
      await TaskActivityService.log(assignmentId, employeeId, "SUBMITTED", "Submitted for review.");
      await StandupService.postTaskEvent(assignmentId, employeeId, taskSubmittedLine(assignment.title));
      return { pendingApproval: true as const };
    }

    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const isQuiz = assignment.quiz !== null;
    if (isQuiz && !quiz) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Quiz answers are required to complete this assignment", "Bad Request");
    }
    const coinOverride = isQuiz && quiz ? Math.max(0, Math.min(quiz.correctCount, QUIZ_QUESTION_COUNT)) * QUIZ_COINS_PER_CORRECT : undefined;

    const updatedEmployee = await this.creditReward(
      employee,
      assignment,
      submission,
      "APPROVED",
      null,
      coinOverride,
      isQuiz ? quiz : undefined
    );
    await AssignmentRepository.setBoardStatus(assignmentId, "DONE");
    await StandupService.postTaskEvent(assignmentId, employeeId, taskCompletedLine(assignment.title));
    return { pendingApproval: false as const, employee: updatedEmployee };
  }

  /** Approves a pending manual assignment completion and credits the reward — manager/admin only. */
  async approve(approverId: string, assignmentId: string, employeeId: string) {
    await this.assertCanManage(approverId, employeeId);

    const progress = await AssignmentRepository.findProgressWithAssignment(assignmentId, employeeId);
    if (!progress) throw new ApiError(HttpStatus.NOT_FOUND, "Submission not found", "Not Found");
    if (progress.approval !== "PENDING") {
      throw new ApiError(HttpStatus.CONFLICT, "This submission is not pending approval", "Conflict");
    }

    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const updated = await this.creditReward(
      employee,
      progress.assignment,
      progress.submission ?? undefined,
      "APPROVED",
      approverId
    );
    await AssignmentRepository.setBoardStatus(assignmentId, "DONE");
    await TaskActivityService.log(assignmentId, approverId, "APPROVED", `Approved (submitted by ${employee.name}).`);
    await StandupService.postTaskEvent(assignmentId, approverId, taskApprovedLine(progress.assignment.title));
    return updated;
  }

  /** Rejects a pending manual assignment completion — no reward is credited. */
  async reject(approverId: string, assignmentId: string, employeeId: string, note?: string) {
    await this.assertCanManage(approverId, employeeId);

    // findProgressWithAssignment (rather than findProgress) so the standup
    // line below can name the task.
    const progress = await AssignmentRepository.findProgressWithAssignment(assignmentId, employeeId);
    if (!progress) throw new ApiError(HttpStatus.NOT_FOUND, "Submission not found", "Not Found");
    if (progress.approval !== "PENDING") {
      throw new ApiError(HttpStatus.CONFLICT, "This submission is not pending approval", "Conflict");
    }

    const result = await AssignmentRepository.setApproval(assignmentId, employeeId, "REJECTED", approverId, note);
    await AssignmentRepository.setBoardStatus(assignmentId, "NEEDS_REWORK");
    await StandupService.postTaskEvent(assignmentId, approverId, taskReworkLine(progress.assignment.title));
    await TaskActivityService.log(assignmentId, approverId, "REJECTED", note ?? "Rejected — sent back for rework.");
    return result;
  }

  /**
   * Approvals queue: team-scoped for managers, company-wide for admins.
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
        AssignmentRepository.findByApprovalStatusAll("PENDING"),
        AssignmentRepository.findByApprovalStatusAll("APPROVED"),
        AssignmentRepository.findAllAssignedNotCompleted(),
      ]);
      return { pending, approved, assigned: assigned.map(this.withAssignee) };
    }

    const teams = await TeamRepository.findIdsManagedBy(approverId);
    if (teams.length === 0) return { pending: [], approved: [], assigned: [] };

    const teamIds = teams.map((g) => g.id);
    const [pending, approved, assigned] = await Promise.all([
      AssignmentRepository.findByApprovalStatusForTeams("PENDING", teamIds),
      AssignmentRepository.findByApprovalStatusForTeams("APPROVED", teamIds),
      AssignmentRepository.findAssignedNotCompletedForTeams(teamIds),
    ]);

    return { pending, approved, assigned: assigned.map(this.withAssignee) };
  }

  /**
   * Full history of every task a lead has ever assigned — every status,
   * not just the currently-outstanding ones — team-scoped for managers,
   * company-wide for admins. Real employee identity, same reasoning as
   * listPendingFor. Distinct from listPendingFor, which is the
   * action-oriented "needs your review" queue.
   */
  async listAssignedHistoryFor(viewerId: string) {
    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    if (viewer.role === "ADMIN") {
      const history = await AssignmentRepository.findAllAssignedHistory();
      return history.map(this.withAssignee);
    }

    const teams = await TeamRepository.findIdsManagedBy(viewerId);
    if (teams.length === 0) return [];

    const teamIds = teams.map((g) => g.id);
    const history = await AssignmentRepository.findAssignedHistoryForTeams(teamIds);
    return history.map(this.withAssignee);
  }

  /**
   * A SOLO assignment creates exactly one AssignmentProgress row (for its
   * assignee), so `progress[0].employee` is who the task is actually
   * assigned to — `createdBy` is the assigning manager, not useful for
   * "who is this task assigned to" and kept only for the admin-wide views
   * that don't include progress.
   */
  private withAssignee<T extends { progress?: { employee: unknown }[]; createdBy?: unknown }>(assignment: T) {
    const assignee = assignment.progress?.[0]?.employee ?? assignment.createdBy;
    return { ...assignment, assignee };
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
      AssignmentRepository.findAssignedNotCompletedForEmployee(employeeId),
      AssignmentRepository.findCompletedHistoryForEmployee(employeeId),
    ]);

    return {
      assigned,
      pending: completed.filter((c) => c.approval === "PENDING"),
      approved: completed.filter((c) => c.approval === "APPROVED"),
    };
  }

  /** ADMIN sees every team; MANAGER sees the team(s) they lead; EMPLOYEE sees their own team. */
  private async resolveViewerTeamIds(viewer: { id: string; role: string; teamId: string | null }): Promise<string[]> {
    if (viewer.role === "ADMIN") {
      return (await TeamRepository.findAllIds()).map((g) => g.id);
    }
    if (viewer.role === "MANAGER") {
      return (await TeamRepository.findIdsManagedBy(viewer.id)).map((g) => g.id);
    }
    return viewer.teamId ? [viewer.teamId] : [];
  }

  /**
   * Moves a card between Kanban columns. This is the drag-and-drop path, so
   * it deliberately does NOT touch the approval fields or rewards: dragging
   * a card to Done does not credit XP, and dragging it back out does not
   * claw anything back. Approving through the approvals flow remains the
   * only thing that pays out.
   */
  async setBoardStatus(viewerId: string, assignmentId: string, column: TaskColumnKey) {
    const assignment = await AssignmentRepository.findBoardCard(assignmentId);
    if (!assignment) throw new ApiError(HttpStatus.NOT_FOUND, "Task not found", "Not Found");

    // Same visibility rule as opening the card — if you can see it, you can move it.
    await this.assertCanViewTask(viewerId, assignment);

    const from = assignment.boardStatus;
    const updated = await AssignmentRepository.setBoardStatus(assignmentId, BOARD_STATUS[column]);

    const fromLabel = COLUMN_LABEL[BOARD_COLUMN[from]];
    const toLabel = COLUMN_LABEL[column];
    await TaskActivityService.log(assignmentId, viewerId, "MOVED", `Moved from ${fromLabel} to ${toLabel}.`);
    await StandupService.postTaskEvent(assignmentId, viewerId, taskMovedLine(column, updated.title));

    return updated;
  }

  /**
   * The whole-team Kanban board — every real task belonging to the
   * viewer's team(s), not filtered down to "assigned to me". Each card
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

    const teamIds = await this.resolveViewerTeamIds(viewer);
    if (teamIds.length === 0) return [];

    let assignments;
    if (sprintFilter === "backlog") {
      assignments = await AssignmentRepository.findBoardBySprint(teamIds, null);
    } else if (sprintFilter) {
      assignments = await AssignmentRepository.findBoardBySprint(teamIds, sprintFilter);
    } else {
      const since = new Date();
      since.setDate(since.getDate() - BOARD_HISTORY_DAYS);
      assignments = await AssignmentRepository.findBoardForTeams(teamIds, since);
    }

    return assignments.map((a) => {
      const primaryProgress = a.progress[0];
      return {
        ...a,
        assignee: primaryProgress?.employee ?? a.createdBy,
        column: BOARD_COLUMN[a.boardStatus],
      };
    });
  }

  /** Confirms `viewerId` shares a team with this task (or is admin) before letting them open its detail view. */
  private async assertCanViewTask(
    viewerId: string,
    assignment: { teamId: string | null; progress: { employeeId: string; employee: { teamId?: string | null } }[] }
  ) {
    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    if (viewer.role === "ADMIN") return;
    if (assignment.progress.some((p) => p.employeeId === viewerId)) return;

    const teamIds = await this.resolveViewerTeamIds(viewer);
    const relevantTeamIds = [assignment.teamId, ...assignment.progress.map((p) => p.employee.teamId ?? null)].filter(
      (id): id is string => id !== null
    );
    if (!relevantTeamIds.some((id) => teamIds.includes(id))) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to view this task", "Forbidden");
    }
  }

  /** Full detail for the enlarged task view — real info, comments, and complete real movement history. */
  async getTaskDetail(viewerId: string, assignmentId: string) {
    const assignment = await AssignmentRepository.findByIdWithFullDetail(assignmentId);
    if (!assignment) throw new ApiError(HttpStatus.NOT_FOUND, "Task not found", "Not Found");

    await this.assertCanViewTask(viewerId, assignment);

    const [comments, activity] = await Promise.all([
      TaskCommentRepository.findForAssignment(assignmentId),
      TaskActivityService.historyFor(assignmentId),
    ]);

    const primaryProgress = assignment.progress[0];
    return {
      assignment: {
        ...assignment,
        assignee: primaryProgress?.employee ?? assignment.createdBy,
        column: BOARD_COLUMN[assignment.boardStatus],
      },
      comments,
      activity,
    };
  }

  /** Adds a real comment to a task's discussion — same visibility rule as viewing the task at all. */
  async addComment(viewerId: string, assignmentId: string, body: string) {
    const assignment = await AssignmentRepository.findByIdWithFullDetail(assignmentId);
    if (!assignment) throw new ApiError(HttpStatus.NOT_FOUND, "Task not found", "Not Found");

    await this.assertCanViewTask(viewerId, assignment);

    const comment = await TaskCommentRepository.create(assignmentId, viewerId, body);
    await TaskActivityService.log(assignmentId, viewerId, "COMMENTED", "Left a comment.");
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
    if (!employee?.teamId) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to do that", "Forbidden");
    }
    const managedTeams = await TeamRepository.findIdsManagedBy(managerId);
    if (!managedTeams.some((g) => g.id === employee.teamId)) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to do that", "Forbidden");
    }
  }

  /** Shared crediting logic: XP/level/coins, team resources, companion memory, and status flip. */
  private async creditReward(
    employee: { id: string; xp: number; teamId: string | null; name: string },
    assignment: {
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
    const newXp = employee.xp + assignment.xpReward;
    const coinsToCredit = coinOverride ?? assignment.coinReward;

    const ops = [
      AssignmentRepository.upsertProgress(
        assignment.id,
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

    if (employee.teamId) {
      await TeamRepository.incrementResources(
        employee.teamId,
        {
          knowledge: assignment.knowledgeReward,
          gold: assignment.goldReward,
          influence: assignment.influenceReward,
          materials: assignment.materialsReward,
        },
        Math.round(assignment.xpReward / 2)
      );
    }

    const companion = await CompanionRepository.findByEmployeeId(employee.id);
    if (companion) {
      await CompanionService.recordAssignmentCompletion(
        companion.id,
        employee.name,
        assignment.title,
        COMPANION_BOND_XP_PER_ASSIGNMENT
      );
    }

    if (assignment.type === "SOLO") {
      await AssignmentRepository.setStatus(assignment.id, "COMPLETED");
    }

    return updatedEmployee;
  }
}

export const AssignmentService = new AssignmentServiceImpl();
