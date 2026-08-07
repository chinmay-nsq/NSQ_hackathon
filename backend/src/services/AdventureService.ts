import { Role } from "@prisma/client";
import { prisma } from "@/config/db";
import { AdventureRepository } from "@/repositories/AdventureRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { GuildRepository } from "@/repositories/GuildRepository";
import { CompanionRepository } from "@/repositories/CompanionRepository";
import { AdventureFactory } from "@/factories/AdventureFactory";
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

function xpToLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

class AdventureServiceImpl {
  async listForEmployee(employeeId: string) {
    const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    return AdventureRepository.findActiveForEmployee(employeeId, employee.guildId);
  }

  async generateSolo(employeeId: string) {
    const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const existing = await AdventureRepository.findTodaysSoloAdventure(employeeId, startOfToday());
    if (existing) return existing;

    const content = await AIService.generateSoloAdventure({
      employeeName: employee.name,
      department: employee.guild?.department ?? "General",
      recentActivity: "",
      jobRole: employee.jobRole,
      seniority: employee.seniority,
      skills: employee.skills,
    });

    const data = AdventureFactory.buildSolo(content, employeeId, employee.guildId);
    return AdventureRepository.create(data);
  }

  /** Employee-authored solo adventure — no AI, fixed reward, requires manager/admin approval before crediting. */
  async createManualSolo(employeeId: string, title: string, description: string) {
    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const data = AdventureFactory.buildManualSolo(title, description, employeeId, employee.guildId);
    return AdventureRepository.create(data);
  }

  /** A manager/admin assigns a task directly to one member of their team. Still needs approval on completion. */
  async assignSolo(
    assignerId: string,
    assigneeId: string,
    title: string,
    description: string,
    xpReward: number,
    coinReward: number
  ) {
    await this.assertCanManage(assignerId, assigneeId);

    const assignee = await EmployeeRepository.findById(assigneeId);
    if (!assignee) throw new ApiError(HttpStatus.NOT_FOUND, "Team member not found", "Not Found");

    const data = AdventureFactory.buildAssignedSolo(
      title,
      description,
      xpReward,
      coinReward,
      assigneeId,
      assignee.guildId
    );
    return AdventureRepository.create(data);
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
      assignee.guildId
    );
    return AdventureRepository.create(data);
  }

  async generateGuild(employeeId: string) {
    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee?.guildId) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "You are not in a guild", "Bad Request");
    }

    const guild = await GuildRepository.findById(employee.guildId);
    if (!guild) throw new ApiError(HttpStatus.NOT_FOUND, "Guild not found", "Not Found");

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
   */
  async complete(employeeId: string, adventureId: string, submission?: string) {
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

    const updatedEmployee = await this.creditReward(employee, adventure, submission, "APPROVED", null);
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
   * Pending-approval queue: guild-scoped for managers, company-wide for
   * admins. Managers see the submitting employee by companion identity
   * only — never their real name.
   */
  async listPendingFor(approverId: string) {
    const approver = await EmployeeRepository.findById(approverId);
    if (!approver) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    if (approver.role === "ADMIN") {
      return AdventureRepository.findAllPending();
    }

    const guilds = await GuildRepository.findIdsManagedBy(approverId);
    if (guilds.length === 0) return [];
    const pending = await AdventureRepository.findPendingForGuilds(guilds.map((g) => g.id));
    return pending.map((p) => ({ ...p, employee: anonymizeMember(p.employee, Role.MANAGER) }));
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
    approvedById: string | null
  ) {
    const newXp = employee.xp + adventure.xpReward;

    const ops = [
      AdventureRepository.upsertProgress(adventure.id, employee.id, submission, approval, approvedById ?? undefined),
      EmployeeRepository.update(employee.id, {
        xp: newXp,
        level: xpToLevel(newXp),
        coins: { increment: adventure.coinReward },
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
