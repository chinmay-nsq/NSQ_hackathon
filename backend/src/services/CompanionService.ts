import { CompanionRepository } from "@/repositories/CompanionRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { CompanionFactory } from "@/factories/CompanionFactory";
import { AIService } from "./AIService";
import { CompanionSpecies, RESOURCE_TYPES } from "@/config/constants";
import { prisma } from "@/config/db";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

class CompanionServiceImpl {
  async create(employeeId: string, species: CompanionSpecies, name: string) {
    const existing = await CompanionRepository.findByEmployeeId(employeeId);
    if (existing) {
      throw new ApiError(HttpStatus.CONFLICT, "You already have a companion", "Conflict");
    }
    return prisma.companion.create({ data: CompanionFactory.build(employeeId, species, name) });
  }

  async getMine(employeeId: string) {
    const companion = await CompanionRepository.findByEmployeeIdWithMemories(employeeId);
    if (!companion) {
      throw new ApiError(HttpStatus.NOT_FOUND, "No companion yet", "Not Found");
    }
    return companion;
  }

  async getDialogue(employeeId: string) {
    const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    if (!employee.companion) throw new ApiError(HttpStatus.NOT_FOUND, "No companion yet", "Not Found");

    const pendingAdventures = await prisma.adventureProgress.count({
      where: { employeeId, completed: false },
    });

    let guildResourceGap: string | undefined;
    if (employee.guild) {
      const guild = employee.guild;
      const lowest = RESOURCE_TYPES.reduce((min, key) => (guild[key] < guild[min] ? key : min), RESOURCE_TYPES[0]);
      guildResourceGap = `${guild.name} could use more ${lowest}`;
    }

    const latestMemory = await CompanionRepository.latestMemory(employee.companion.id);

    const dialogue = await AIService.generateCompanionDialogue({
      companionName: employee.companion.name,
      species: employee.companion.species,
      employeeName: employee.name,
      guildName: employee.guild?.name,
      guildResourceGap,
      pendingAdventures,
      recentMemory: latestMemory?.summary,
    });

    await CompanionRepository.touchDialogueTimestamp(employee.companion.id);

    return dialogue;
  }

  async recordAdventureCompletion(companionId: string, employeeName: string, adventureTitle: string, bondXpGain: number) {
    await CompanionRepository.addBondXp(companionId, bondXpGain);
    await CompanionRepository.addMemory(
      companionId,
      "completed_adventure",
      `${employeeName} completed "${adventureTitle}"`
    );
  }
}

export const CompanionService = new CompanionServiceImpl();
