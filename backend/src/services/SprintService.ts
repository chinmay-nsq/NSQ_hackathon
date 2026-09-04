import { SprintRepository } from "@/repositories/SprintRepository";
import { TeamRepository } from "@/repositories/TeamRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

const RECENT_SPRINTS_LIMIT = 6;

function isCurrent(sprint: { startDate: Date; endDate: Date }): boolean {
  const now = new Date();
  return sprint.startDate <= now && now <= sprint.endDate;
}

class SprintServiceImpl {
  /** Same team-visibility rule the Kanban board uses: admin sees every team, a manager sees the team(s) they lead, an employee sees their own team. */
  private async resolveViewerTeamIds(viewer: { id: string; role: string; teamId: string | null }): Promise<string[]> {
    if (viewer.role === "ADMIN") {
      return (await TeamRepository.findAllIds()).map((g) => g.id);
    }
    if (viewer.role === "MANAGER") {
      return (await TeamRepository.findIdsManagedBy(viewer.id)).map((g) => g.id);
    }
    return viewer.teamId ? [viewer.teamId] : [];
  }

  async listForViewer(viewerId: string) {
    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const teamIds = await this.resolveViewerTeamIds(viewer);
    if (teamIds.length === 0) return [];

    const sprints = await SprintRepository.findRecentForTeams(teamIds, RECENT_SPRINTS_LIMIT);
    return sprints.map((s) => ({
      id: s.id,
      teamId: s.teamId,
      name: s.name,
      startDate: s.startDate,
      endDate: s.endDate,
      taskCount: s._count.assignments,
      isCurrent: isCurrent(s),
    }));
  }

  /** Manager/admin creates a new sprint for a team they lead. */
  async create(creatorId: string, teamId: string, name: string, startDate: Date, endDate: Date) {
    if (endDate <= startDate) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "End date must be after the start date", "Bad Request");
    }

    const creator = await EmployeeRepository.findById(creatorId);
    if (!creator) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    if (creator.role !== "ADMIN") {
      const managed = await TeamRepository.findIdsManagedBy(creatorId);
      if (!managed.some((g) => g.id === teamId)) {
        throw new ApiError(HttpStatus.FORBIDDEN, "You don't lead this team", "Forbidden");
      }
    }

    return SprintRepository.create(teamId, name, startDate, endDate);
  }
}

export const SprintService = new SprintServiceImpl();
