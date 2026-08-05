import { KingdomRepository } from "@/repositories/KingdomRepository";
import { GuildRepository } from "@/repositories/GuildRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { AIService } from "./AIService";
import { RESOURCE_TYPES, ResourceType } from "@/config/constants";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

class KingdomServiceImpl {
  async getOverview() {
    const kingdom = await KingdomRepository.getOrCreate();
    const projects = await KingdomRepository.findProjects(kingdom.id);
    return { kingdom, projects };
  }

  async contribute(employeeId: string, projectId: string, resourceType: ResourceType, amount: number) {
    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee?.guildId) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "You are not in a guild", "Bad Request");
    }

    const guild = await GuildRepository.findById(employee.guildId);
    const project = await KingdomRepository.findProjectById(projectId);
    if (!guild || !project) throw new ApiError(HttpStatus.NOT_FOUND, "Not found", "Not Found");
    if (project.unlocked) throw new ApiError(HttpStatus.BAD_REQUEST, "Project already unlocked", "Bad Request");

    if (guild[resourceType] < amount) {
      throw new ApiError(HttpStatus.BAD_REQUEST, `Guild does not have enough ${resourceType}`, "Bad Request");
    }

    await GuildRepository.decrementResource(guild.id, resourceType, amount);
    await KingdomRepository.contributeToProject(project.id, guild.id, resourceType, amount);

    const fresh = await KingdomRepository.findProjectById(project.id);
    if (!fresh) throw new ApiError(HttpStatus.NOT_FOUND, "Not found", "Not Found");

    const isComplete = RESOURCE_TYPES.every(
      (r) => fresh[`${r}Contributed` as const] >= fresh[`${r}Needed` as const]
    );

    if (isComplete && !fresh.unlocked) {
      await KingdomRepository.unlockProject(project.id);
    }

    const updatedProject = await KingdomRepository.findProjectById(project.id);
    return { project: updatedProject, unlocked: isComplete };
  }

  async getLatestStory() {
    const kingdom = await KingdomRepository.getOrCreate();
    return KingdomRepository.latestStory(kingdom.id);
  }

  async generateWeeklyStory() {
    const kingdom = await KingdomRepository.getOrCreate();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const completedAdventures = await KingdomRepository.recentCompletedAdventures(weekAgo);
    const unlockedProjects = await KingdomRepository.findUnlockedProjects(kingdom.id);

    const events = [
      ...completedAdventures.map(
        (p) => `${p.employee.guild?.name ?? p.employee.name} completed "${p.adventure.title}"`
      ),
      ...unlockedProjects.map((p) => `The kingdom unlocked ${p.name}`),
    ];

    if (events.length === 0) {
      events.push("The kingdom was quiet this week, but the guilds prepared for adventures ahead.");
    }

    const content = await AIService.generateWeeklyStory({ events });

    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);

    return KingdomRepository.createStory(kingdom.id, startOfWeek, content);
  }
}

export const KingdomService = new KingdomServiceImpl();
