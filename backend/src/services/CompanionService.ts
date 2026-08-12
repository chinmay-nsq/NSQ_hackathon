import { Prisma } from "@prisma/client";
import { CompanionRepository } from "@/repositories/CompanionRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { AdventureRepository } from "@/repositories/AdventureRepository";
import { ChatRepository } from "@/repositories/ChatRepository";
import { CompanionFactory } from "@/factories/CompanionFactory";
import { AIService } from "./AIService";
import { CompanionSpecies, RESOURCE_TYPES } from "@/config/constants";
import { prisma } from "@/config/db";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

// A generous but real ceiling — protects against one runaway chat spamming
// the AI provider (cost) while still allowing a genuinely long conversation.
const MAX_MESSAGE_LENGTH = 1000;
const CHAT_HISTORY_PAGE_SIZE = 50;

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

  /** Most recent messages, oldest first — ready to render directly as a conversation. */
  async getChatHistory(employeeId: string) {
    const companion = await CompanionRepository.findByEmployeeId(employeeId);
    if (!companion) throw new ApiError(HttpStatus.NOT_FOUND, "No companion yet", "Not Found");

    const messages = await ChatRepository.findRecentForCompanion(companion.id, CHAT_HISTORY_PAGE_SIZE);
    return messages.reverse();
  }

  /**
   * Sends a real chat message and gets the companion's reply — both are
   * persisted. Grounded in the employee's actual current state (level, XP,
   * coins, guild, pending adventures, quiz status) via the same lookups
   * getDialogue uses, so the companion can answer real questions instead of
   * only narrating at them.
   */
  async sendMessage(employeeId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) throw new ApiError(HttpStatus.BAD_REQUEST, "Message can't be empty", "Bad Request");
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Message is too long", "Bad Request");
    }

    const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
    if (!employee) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    if (!employee.companion) throw new ApiError(HttpStatus.NOT_FOUND, "No companion yet", "Not Found");

    const pendingAdventures = await AdventureRepository.findActiveForEmployee(
      employeeId,
      employee.guildId,
      startOfToday()
    );
    const pendingAdventureTitles = pendingAdventures
      .filter((a) => !a.progress?.[0]?.completed)
      .map((a) => a.title);

    const todaysSolo = await AdventureRepository.findTodaysSoloAdventure(employeeId, startOfToday());
    const dailyQuizStatus: "not_generated" | "pending" | "completed" =
      !todaysSolo || todaysSolo.quiz === null
        ? "not_generated"
        : todaysSolo.status === "COMPLETED"
          ? "completed"
          : "pending";

    // Save the user's turn first so it's never lost even if the AI call
    // below fails — the conversation history is the source of truth, not
    // just the response to this one request.
    await ChatRepository.create(employee.companion.id, "USER", trimmed);

    const priorMessages = await ChatRepository.findRecentForCompanion(employee.companion.id);
    const history = priorMessages
      .reverse()
      .map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content }));

    const reply = await AIService.chat(
      {
        companionName: employee.companion.name,
        species: employee.companion.species,
        employeeName: employee.name,
        level: employee.level,
        xp: employee.xp,
        coins: employee.coins,
        guildName: employee.guild?.name,
        pendingAdventureTitles,
        dailyQuizStatus,
      },
      history
    );

    const saved = await ChatRepository.create(employee.companion.id, "COMPANION", reply);
    return saved;
  }
}

export const CompanionService = new CompanionServiceImpl();
