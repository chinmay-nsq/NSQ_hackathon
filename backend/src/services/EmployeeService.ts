import { Role } from "@prisma/client";
import { prisma } from "@/config/db";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

class EmployeeServiceImpl {
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
