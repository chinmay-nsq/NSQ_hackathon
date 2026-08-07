import { GuildRepository } from "@/repositories/GuildRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

class GuildServiceImpl {
  listAll() {
    return GuildRepository.findAllWithMembers();
  }

  async getById(id: string) {
    const guild = await GuildRepository.findByIdWithDetails(id);
    if (!guild) throw new ApiError(HttpStatus.NOT_FOUND, "Guild not found", "Not Found");
    return guild;
  }

  async join(employeeId: string, guildId: string) {
    const guild = await GuildRepository.findById(guildId);
    if (!guild) throw new ApiError(HttpStatus.NOT_FOUND, "Guild not found", "Not Found");
    return EmployeeRepository.setGuild(employeeId, guildId);
  }

  /** Guilds (with members) led by this manager/admin — used to populate the "assign a task" member picker. */
  listManagedBy(managerId: string) {
    return GuildRepository.findManagedByWithMembers(managerId);
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
