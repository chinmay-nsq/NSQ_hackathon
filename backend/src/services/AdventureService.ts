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
    });

    const data = AdventureFactory.buildSolo(content, employeeId, employee.guildId);
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

    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const newXp = employee.xp + adventure.xpReward;

    const [, updatedEmployee] = await prisma.$transaction([
      AdventureRepository.upsertProgress(adventureId, employeeId, submission),
      EmployeeRepository.update(employeeId, {
        xp: newXp,
        level: xpToLevel(newXp),
        coins: { increment: adventure.coinReward },
      }),
    ]);

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

    const companion = await CompanionRepository.findByEmployeeId(employeeId);
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
