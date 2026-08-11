import { Role, Prisma } from "@prisma/client";
import { prisma } from "@/config/db";
import { AdventureRepository } from "@/repositories/AdventureRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { GuildRepository } from "@/repositories/GuildRepository";
import { CompanionRepository } from "@/repositories/CompanionRepository";
import { AdventureFactory, QUIZ_COINS_PER_CORRECT, QUIZ_QUESTION_COUNT } from "@/factories/AdventureFactory";
import { AIService } from "./AIService";
import { CompanionService } from "./CompanionService";
import { XP_PER_LEVEL, COMPANION_BOND_XP_PER_ADVENTURE } from "@/config/constants";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";
import { anonymizeMember } from "@/utils/anonymize";

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
  async createManualSolo(employeeId: string, title: string, description: string) {
    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const data = AdventureFactory.buildManualSolo(title, description, employeeId, employee.guildId);
    return AdventureRepository.create(data);
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
    coinReward: number
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

    return prisma.$transaction(
      assignees.map((assignee) =>
        AdventureRepository.create(
          AdventureFactory.buildAssignedSolo(
            title,
            description,
            xpReward,
            coinReward,
            assignee.id,
            assignee.guildId,
            assignerId
          )
        )
      )
    );
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
    return AdventureRepository.create(data);
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

    return this.creditReward(employee, progress.adventure, progress.submission ?? undefined, "APPROVED", approverId);
  }

  /** Rejects a pending manual adventure completion — no reward is credited. */
  async reject(approverId: string, adventureId: string, employeeId: string, note?: string) {
    await this.assertCanManage(approverId, employeeId);

    const progress = await AdventureRepository.findProgress(adventureId, employeeId);
    if (!progress) throw new ApiError(HttpStatus.NOT_FOUND, "Submission not found", "Not Found");
    if (progress.approval !== "PENDING") {
      throw new ApiError(HttpStatus.CONFLICT, "This submission is not pending approval", "Conflict");
    }

    return AdventureRepository.setApproval(adventureId, employeeId, "REJECTED", approverId, note);
  }

  /**
   * Approvals queue: guild-scoped for managers, company-wide for admins.
   * Returns two lists — tasks assigned but not yet completed ("awaiting
   * completion"), and tasks completed and awaiting review ("pending"), so a
   * lead can see the full lifecycle of what they've handed out. Managers see
   * the employee by companion identity only — never their real name.
   */
  async listPendingFor(approverId: string) {
    const approver = await EmployeeRepository.findById(approverId);
    if (!approver) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    if (approver.role === "ADMIN") {
      const [pending, assigned] = await Promise.all([
        AdventureRepository.findAllPending(),
        AdventureRepository.findAllAssignedNotCompleted(),
      ]);
      return { pending, assigned };
    }

    const guilds = await GuildRepository.findIdsManagedBy(approverId);
    if (guilds.length === 0) return { pending: [], assigned: [] };

    const guildIds = guilds.map((g) => g.id);
    const [pending, assigned] = await Promise.all([
      AdventureRepository.findPendingForGuilds(guildIds),
      AdventureRepository.findAssignedNotCompletedForGuilds(guildIds),
    ]);

    return {
      pending: pending.map((p) => ({ ...p, employee: anonymizeMember(p.employee, Role.MANAGER) })),
      assigned: assigned.map((a) => ({ ...a, createdBy: anonymizeMember(a.createdBy!, Role.MANAGER) })),
    };
  }

  /**
   * Full history of every task a lead has ever assigned — every status,
   * not just the currently-outstanding ones — guild-scoped for managers,
   * company-wide for admins. Managers see the assignee by companion
   * identity only, never their real name. Distinct from listPendingFor,
   * which is the action-oriented "needs your review" queue.
   */
  async listAssignedHistoryFor(viewerId: string) {
    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    if (viewer.role === "ADMIN") {
      const history = await AdventureRepository.findAllAssignedHistory();
      return history;
    }

    const guilds = await GuildRepository.findIdsManagedBy(viewerId);
    if (guilds.length === 0) return [];

    const guildIds = guilds.map((g) => g.id);
    const history = await AdventureRepository.findAssignedHistoryForGuilds(guildIds);
    return history.map((a) => ({ ...a, createdBy: anonymizeMember(a.createdBy!, Role.MANAGER) }));
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
