import { KingdomRepository } from "@/repositories/KingdomRepository";
import { GuildRepository } from "@/repositories/GuildRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
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
}

export const KingdomService = new KingdomServiceImpl();
