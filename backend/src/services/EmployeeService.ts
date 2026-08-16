import { Role, Seniority } from "@prisma/client";
import { prisma } from "@/config/db";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { GuildRepository } from "@/repositories/GuildRepository";
import { AdventureRepository } from "@/repositories/AdventureRepository";
import { AdventureFactory } from "@/factories/AdventureFactory";
import { AIService } from "./AIService";
import { RESOURCE_TYPES } from "@/config/constants";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

class EmployeeServiceImpl {
  /** Onboarding: AI-suggested starting seniority + skill chips from just a job title. */
  suggestProfile(jobRole: string) {
    return AIService.suggestProfile(jobRole);
  }

  /**
   * Marks the guided spotlight tour as done (completed OR skipped) —
   * persisted server-side so it follows the employee across
   * browsers/devices and never re-triggers once set. One-way: there's no
   * "un-complete" path.
   */
  markOnboardingTourDone(employeeId: string) {
    return EmployeeRepository.update(employeeId, { onboardingTourDone: true });
  }

  /**
   * Completes the mandatory post-onboarding work profile (job role,
   * seniority, skills). Feeds AI task generation for this employee, both
   * their own daily solo adventures and a manager's "generate with AI".
   * Also kicks off the two other one-time onboarding moments: the
   * companion's guild-welcome message and a day-one welcome quest —
   * best-effort, so a hiccup in either never blocks profile completion
   * itself (the employee's own request is waiting on this response).
   */
  async completeProfile(employeeId: string, jobRole: string, seniority: Seniority, skills: string[]) {
    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const updated = await EmployeeRepository.update(employeeId, {
      jobRole,
      seniority,
      skills,
      profileCompletedAt: new Date(),
    });

    await this.generateWelcomeQuestOnce(employeeId, jobRole).catch(() => {});

    return updated;
  }

  /**
   * The companion's first-ever message, introducing the employee's guild —
   * built from real roster/resource data, never invented. No-ops quietly
   * for an employee with no guild or no companion yet (both legitimate
   * states right after signup).
   */
  async guildWelcomeMessage(employeeId: string): Promise<string | null> {
    const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
    if (!employee?.guild || !employee.companion) return null;

    const guild = await GuildRepository.findByIdWithMembers(employee.guild.id);
    if (!guild) return null;

    const others = guild.members.filter((m) => m.id !== employeeId);
    const memberHighlight =
      others.length > 0
        ? `Teammates already in this guild: ${others.map((m) => `${m.name} (Level ${m.level})`).join(", ")}.`
        : undefined;

    const lowest = RESOURCE_TYPES.reduce(
      (min, key) => (guild[key] < guild[min] ? key : min),
      RESOURCE_TYPES[0]
    );
    const guildResourceGap = `The guild could use more ${lowest}.`;

    return AIService.generateGuildWelcome({
      companionName: employee.companion.name,
      species: employee.companion.species,
      employeeName: employee.name,
      guildName: guild.name,
      memberHighlight,
      guildResourceGap,
    });
  }

  /**
   * Generates the one-time day-one welcome quest, guarded by
   * welcomeQuestGeneratedAt so it can never be created twice even if this
   * gets called again (e.g. a retried request). Runs alongside the normal
   * daily quiz, not instead of it.
   */
  private async generateWelcomeQuestOnce(employeeId: string, jobRole: string) {
    const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
    if (!employee || employee.welcomeQuestGeneratedAt) return;

    const content = await AIService.generateWelcomeQuest({
      employeeName: employee.name,
      guildName: employee.guild?.name,
      jobRole,
    });

    await prisma.$transaction([
      AdventureRepository.create(AdventureFactory.buildSolo(content, employeeId, employee.guildId)),
      EmployeeRepository.update(employeeId, { welcomeQuestGeneratedAt: new Date() }),
    ]);
  }

  /** All employees with basic guild/role info — admin only. */
  listAll() {
    return prisma.employee.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        level: true,
        xp: true,
        coins: true,
        guildId: true,
        guild: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  /** Promotes/demotes an employee — admin only. */
  async setRole(employeeId: string, role: Role) {
    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    return EmployeeRepository.update(employeeId, { role });
  }

  /** Company-wide snapshot for the admin dashboard. */
  async companyOverview() {
    const [employeeCount, guildCount, pendingApprovals, totalXp] = await Promise.all([
      prisma.employee.count(),
      prisma.guild.count(),
      prisma.adventureProgress.count({ where: { approval: "PENDING" } }),
      prisma.employee.aggregate({ _sum: { xp: true } }),
    ]);

    return {
      employeeCount,
      guildCount,
      pendingApprovals,
      totalXp: totalXp._sum.xp ?? 0,
    };
  }
}

export const EmployeeService = new EmployeeServiceImpl();
