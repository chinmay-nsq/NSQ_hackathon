import { SprintRepository } from "@/repositories/SprintRepository";
import { GuildRepository } from "@/repositories/GuildRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

const RECENT_SPRINTS_LIMIT = 6;

function isCurrent(sprint: { startDate: Date; endDate: Date }): boolean {
  const now = new Date();
  return sprint.startDate <= now && now <= sprint.endDate;
}

class SprintServiceImpl {
  /** Same guild-visibility rule the Kanban board uses: admin sees every guild, a manager sees the guild(s) they lead, an employee sees their own guild. */
  private async resolveViewerGuildIds(viewer: { id: string; role: string; guildId: string | null }): Promise<string[]> {
    if (viewer.role === "ADMIN") {
      return (await GuildRepository.findAllIds()).map((g) => g.id);
    }
    if (viewer.role === "MANAGER") {
      return (await GuildRepository.findIdsManagedBy(viewer.id)).map((g) => g.id);
    }
    return viewer.guildId ? [viewer.guildId] : [];
  }

  async listForViewer(viewerId: string) {
    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const guildIds = await this.resolveViewerGuildIds(viewer);
    if (guildIds.length === 0) return [];

    const sprints = await SprintRepository.findRecentForGuilds(guildIds, RECENT_SPRINTS_LIMIT);
    return sprints.map((s) => ({
      id: s.id,
      guildId: s.guildId,
      name: s.name,
      startDate: s.startDate,
      endDate: s.endDate,
      taskCount: s._count.adventures,
      isCurrent: isCurrent(s),
    }));
  }

  /** Manager/admin creates a new sprint for a guild they lead. */
  async create(creatorId: string, guildId: string, name: string, startDate: Date, endDate: Date) {
    if (endDate <= startDate) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "End date must be after the start date", "Bad Request");
    }

    const creator = await EmployeeRepository.findById(creatorId);
    if (!creator) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    if (creator.role !== "ADMIN") {
      const managed = await GuildRepository.findIdsManagedBy(creatorId);
      if (!managed.some((g) => g.id === guildId)) {
        throw new ApiError(HttpStatus.FORBIDDEN, "You don't lead this team", "Forbidden");
      }
    }

    return SprintRepository.create(guildId, name, startDate, endDate);
  }
}

export const SprintService = new SprintServiceImpl();
