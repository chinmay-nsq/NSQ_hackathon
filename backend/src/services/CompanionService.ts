import { Prisma } from "@prisma/client";
import { CompanionRepository } from "@/repositories/CompanionRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { AdventureRepository } from "@/repositories/AdventureRepository";
import { CompanionFactory } from "@/factories/CompanionFactory";
import { AIService } from "./AIService";
import { CompanionSpecies, RESOURCE_TYPES } from "@/config/constants";
import { prisma } from "@/config/db";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

class CompanionServiceImpl {
  async create(employeeId: string, species: CompanionSpecies, name: string) {
    const existing = await CompanionRepository.findByEmployeeId(employeeId);
    if (existing) {
      throw new ApiError(HttpStatus.CONFLICT, "You already have a companion", "Conflict");
    }
    const nameTaken = await CompanionRepository.findByNameInsensitive(name);
    if (nameTaken) {
      throw new ApiError(HttpStatus.CONFLICT, "That companion name is already taken", "Conflict");
    }

    try {
      return await prisma.companion.create({ data: CompanionFactory.build(employeeId, species, name) });
    } catch (err) {
      // A second request could win the same name in the gap between the
      // check above and this insert — the DB's unique index is the real
      // guard; this just turns that race into the same friendly 409 instead
      // of a raw Prisma error.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ApiError(HttpStatus.CONFLICT, "That companion name is already taken", "Conflict");
      }
      throw err;
    }
  }

  async isNameAvailable(name: string): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const existing = await CompanionRepository.findByNameInsensitive(trimmed);
    return !existing;
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

    // A freshly-generated daily quiz has no AdventureProgress row at all
    // until it's completed, so the count above can't see it — check today's
    // solo adventure directly. "not_generated" (no row yet) must be told to
    // the AI as a DISTINCT state from "completed" — otherwise a brand-new
    // account that has never taken the quiz gets told it's "already done".
    const todaysSolo = await AdventureRepository.findTodaysSoloAdventure(employeeId, startOfToday());
    const dailyQuizStatus: "not_generated" | "pending" | "completed" =
      !todaysSolo || todaysSolo.quiz === null
        ? "not_generated"
        : todaysSolo.status === "COMPLETED"
          ? "completed"
          : "pending";

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
      dailyQuizStatus,
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
