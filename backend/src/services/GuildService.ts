import { Role } from "@prisma/client";
import { GuildRepository } from "@/repositories/GuildRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { anonymizeMember } from "@/utils/anonymize";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

class GuildServiceImpl {
  /**
   * Admins see every team (company-wide oversight). Everyone else only sees
   * the team they actually belong to — managers see the team(s) they lead,
   * employees see the team they've joined. No one can browse other teams.
   */
  async listAll(viewerId: string) {
    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    if (viewer.role === "ADMIN") {
      return GuildRepository.findAllWithMembers();
    }
    if (viewer.role === "MANAGER") {
      return GuildRepository.findManagedByWithMembers(viewerId);
    }
    if (!viewer.guildId) return [];
    const guild = await GuildRepository.findByIdWithMembers(viewer.guildId);
    return guild ? [guild] : [];
  }

  /**
   * Fetches a guild's detail. Only that guild's own members, its manager, or
   * an admin may view it — no browsing other teams by id. If the viewer is
   * that guild's manager, members are shown by companion identity only
   * (never real name) — admins and the members themselves always see real
   * names.
   */
  async getById(id: string, viewerId: string) {
    const guild = await GuildRepository.findByIdWithDetails(id);
    if (!guild) throw new ApiError(HttpStatus.NOT_FOUND, "Guild not found", "Not Found");

    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");

    const isManagerOfThisGuild = viewer.role === "MANAGER" && guild.managerId === viewerId;
    const isMember = viewer.guildId === guild.id;
    const canView = viewer.role === "ADMIN" || isManagerOfThisGuild || isMember;
    if (!canView) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to view this team", "Forbidden");
    }

    if (!isManagerOfThisGuild) return guild;

    return {
      ...guild,
      members: guild.members.map((m) => anonymizeMember(m, Role.MANAGER)),
    };
  }

  /** Resolves an invite code to basic guild info — used by the signup page to preview which team you're joining. */
  async getByInviteCode(inviteCode: string) {
    const guild = await GuildRepository.findByInviteCode(inviteCode);
    if (!guild) throw new ApiError(HttpStatus.NOT_FOUND, "Invite link is invalid or expired", "Not Found");
    return { id: guild.id, name: guild.name, department: guild.department };
  }

  /** The shareable invite link's code for a guild — manager (own guild) or admin only. */
  async getInviteCode(guildId: string, viewerId: string) {
    const guild = await GuildRepository.findById(guildId);
    if (!guild) throw new ApiError(HttpStatus.NOT_FOUND, "Guild not found", "Not Found");

    const viewer = await EmployeeRepository.findById(viewerId);
    const canView = viewer?.role === "ADMIN" || (viewer?.role === "MANAGER" && guild.managerId === viewerId);
    if (!canView) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have permission to do that", "Forbidden");
    }

    return guild.inviteCode;
  }

  /**
   * Guilds (with members) led by this manager/admin — used to populate the
   * "assign a task" member picker. Managers see companion identity only;
   * admins see real names.
   */
  async listManagedBy(managerId: string) {
    const viewer = await EmployeeRepository.findById(managerId);
    const guilds = await GuildRepository.findManagedByWithMembers(managerId);
    if (viewer?.role !== "MANAGER") return guilds;

    return guilds.map((g) => ({
      ...g,
      members: g.members.map((m) => anonymizeMember(m, Role.MANAGER)),
    }));
  }

  /**
   * Creates a new guild (team) — manager/admin only, enforced by route middleware.
   * A manager creating a guild automatically becomes its manager; an admin may
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

    return GuildRepository.create({
      name: data.name,
      department: data.department,
      manager: { connect: { id: managerId } },
    });
  }
}

export const GuildService = new GuildServiceImpl();
