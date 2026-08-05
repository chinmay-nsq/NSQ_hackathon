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
}

export const GuildService = new GuildServiceImpl();
