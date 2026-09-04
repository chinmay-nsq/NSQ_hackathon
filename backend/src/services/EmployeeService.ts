import { Role, Seniority } from "@prisma/client";
import { prisma } from "@/config/db";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { TeamRepository } from "@/repositories/TeamRepository";
import { AssignmentRepository } from "@/repositories/AssignmentRepository";
import { AssignmentFactory } from "@/factories/AssignmentFactory";
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
   * their own daily solo assignments and a manager's "generate with AI".
   * Also kicks off the two other one-time onboarding moments: the
   * companion's team-welcome message and a day-one welcome assignment —
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

    // Managers/admins don't get the "Say hello" welcome assignment — commented
    // out rather than deleted so it's a one-line revert if that changes.
    if (employee.role === Role.EMPLOYEE) {
      await this.generateWelcomeQuestOnce(employeeId, jobRole).catch(() => {});
    }

    return updated;
  }

  /**
   * The companion's first-ever message, introducing the employee's team —
   * built from real roster/resource data, never invented. No-ops quietly
   * for an employee with no team or no companion yet (both legitimate
   * states right after signup).
   */
  async teamWelcomeMessage(employeeId: string): Promise<string | null> {
    const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
    // Managers have a hidden auto-provisioned companion (bookkeeping only —
    // see CompanionService.autoProvisionHidden) and never see a companion
    // welcome message.
    if (employee?.role !== Role.EMPLOYEE) return null;
    if (!employee?.team || !employee.companion) return null;

    const team = await TeamRepository.findByIdWithMembers(employee.team.id);
    if (!team) return null;

    const others = team.members.filter((m) => m.id !== employeeId);
    const memberHighlight =
      others.length > 0
        ? `Teammates already in this team: ${others.map((m) => `${m.name} (Level ${m.level})`).join(", ")}.`
        : undefined;

    const lowest = RESOURCE_TYPES.reduce(
      (min, key) => (team[key] < team[min] ? key : min),
      RESOURCE_TYPES[0]
    );
    const teamResourceGap = `The team could use more ${lowest}.`;

    return AIService.generateTeamWelcome({
      companionName: employee.companion.name,
      species: employee.companion.species,
      employeeName: employee.name,
      teamName: team.name,
      memberHighlight,
      teamResourceGap,
    });
  }

  /**
   * Generates the one-time day-one welcome assignment, guarded by
   * welcomeQuestGeneratedAt so it can never be created twice even if this
   * gets called again (e.g. a retried request). Runs alongside the normal
   * daily quiz, not instead of it.
   */
  private async generateWelcomeQuestOnce(employeeId: string, jobRole: string) {
    const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
    if (!employee || employee.welcomeQuestGeneratedAt) return;

    const content = await AIService.generateWelcomeQuest({
      employeeName: employee.name,
      teamName: employee.team?.name,
      jobRole,
    });

    await prisma.$transaction([
      AssignmentRepository.create(AssignmentFactory.buildSolo(content, employeeId, employee.teamId)),
      EmployeeRepository.update(employeeId, { welcomeQuestGeneratedAt: new Date() }),
    ]);
  }

  /** All employees with basic team/role info — admin only. */
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
        teamId: true,
        team: { select: { id: true, name: true } },
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
    const [employeeCount, teamCount, pendingApprovals, totalXp] = await Promise.all([
      prisma.employee.count(),
      prisma.team.count(),
      prisma.assignmentProgress.count({ where: { approval: "PENDING" } }),
      prisma.employee.aggregate({ _sum: { xp: true } }),
    ]);

    return {
      employeeCount,
      teamCount,
      pendingApprovals,
      totalXp: totalXp._sum.xp ?? 0,
    };
  }
}

export const EmployeeService = new EmployeeServiceImpl();
