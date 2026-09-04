import { Role } from "@prisma/client";
import { TeamRepository } from "@/repositories/TeamRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { anonymizeMember } from "@/utils/anonymize";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

class TeamServiceImpl {
  /**
   * Admins see every team (company-wide oversight). Everyone else only sees
   * the team they actually belong to — managers see the team(s) they lead,
   * employees see the team they've joined. No one can browse other teams.
   */
  async listAll(viewerId: string) {
    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    if (viewer.role === "ADMIN") {
      return TeamRepository.findAllWithMembers();
    }
    if (viewer.role === "MANAGER") {
      return TeamRepository.findManagedByWithMembers(viewerId);
    }
    if (!viewer.teamId) return [];
    const team = await TeamRepository.findByIdWithMembers(viewer.teamId);
    return team ? [team] : [];
  }

  /**
   * Fetches a team's detail. Only that team's own members, its manager, or
   * an admin may view it — no browsing other teams by id. If the viewer is
   * that team's manager, members are shown by companion identity only
   * (never real name) — admins and the members themselves always see real
   * names.
   */
  async getById(id: string, viewerId: string) {
    const team = await TeamRepository.findByIdWithDetails(id);
    if (!team) throw new ApiError(HttpStatus.NOT_FOUND, "Team not found", "Not Found");

    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const isManagerOfThisTeam = viewer.role === "MANAGER" && team.managerId === viewerId;
    const isMember = viewer.teamId === team.id;
    const canView = viewer.role === "ADMIN" || isManagerOfThisTeam || isMember;
    if (!canView) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to view this team", "Forbidden");
    }

    if (!isManagerOfThisTeam) return team;

    return {
      ...team,
      members: team.members.map((m) => anonymizeMember(m, Role.MANAGER)),
    };
  }

  /** Resolves an invite code to basic team info — used by the signup page to preview which team you're joining. */
  async getByInviteCode(inviteCode: string) {
    const team = await TeamRepository.findByInviteCode(inviteCode);
    if (!team) throw new ApiError(HttpStatus.NOT_FOUND, "Invite link is invalid or expired", "Not Found");
    return { id: team.id, name: team.name, department: team.department };
  }

  /** The shareable invite link's code for a team — manager (own team) or admin only. */
  async getInviteCode(teamId: string, viewerId: string) {
    const team = await TeamRepository.findById(teamId);
    if (!team) throw new ApiError(HttpStatus.NOT_FOUND, "Team not found", "Not Found");

    const viewer = await EmployeeRepository.findById(viewerId);
    const canView = viewer?.role === "ADMIN" || (viewer?.role === "MANAGER" && team.managerId === viewerId);
    if (!canView) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to do that", "Forbidden");
    }

    return team.inviteCode;
  }

  /**
   * Teams (with members) led by this manager/admin — used to populate the
   * "assign a task" member picker. Unlike the Teams roster view, real names
   * are always shown here: a manager assigning real work needs to know who
   * they're actually assigning it to, not just a companion identity.
   */
  async listManagedBy(managerId: string) {
    const teams = await TeamRepository.findManagedByWithMembers(managerId);
    return teams.map((g) => ({
      ...g,
      members: g.members.map((m) => ({
        id: m.id,
        name: m.name,
        title: m.title,
        level: m.level,
        companionName: m.companion?.name ?? null,
        species: m.companion?.species ?? null,
      })),
    }));
  }

  /**
   * Creates a new team (team) — manager/admin only, enforced by route middleware.
   * A manager creating a team automatically becomes its manager; an admin may
   * optionally assign a different manager by their employee id.
   */
  async create(creatorId: string, creatorRole: "MANAGER" | "ADMIN", data: { name: string; department: string; managerId?: string }) {
    let managerId = creatorId;
    if (creatorRole === "ADMIN" && data.managerId) {
      const manager = await EmployeeRepository.findById(data.managerId);
      if (!manager || (manager.role !== "MANAGER" && manager.role !== "ADMIN")) {
        throw new ApiError(HttpStatus.BAD_REQUEST, "managerId must belong to a manager or admin", "Bad Request");
      }
      managerId = data.managerId;
    }

    return TeamRepository.create({
      name: data.name,
      department: data.department,
      manager: { connect: { id: managerId } },
    });
  }
}

export const TeamService = new TeamServiceImpl();
