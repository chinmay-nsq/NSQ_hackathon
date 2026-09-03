import { StandupRepository } from "@/repositories/StandupRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { GuildRepository } from "@/repositories/GuildRepository";
import { AdventureRepository } from "@/repositories/AdventureRepository";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

export const MAX_MESSAGE_LENGTH = 2000;

class StandupServiceImpl {
  /**
   * The rooms a viewer can open, following the same visibility the rest of
   * the app uses: an employee gets their own guild, a manager the guild(s)
   * they lead, an admin every guild. Returned in a stable order so the
   * client can default to the first one without it moving around.
   */
  async roomsFor(viewerId: string) {
    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) return [];

    if (viewer.role === "ADMIN") return GuildRepository.findRooms({});

    if (viewer.role === "MANAGER") {
      const managed = await GuildRepository.findRooms({ managerId: viewerId });
      // A manager who leads nothing yet still gets their own team's room.
      if (managed.length > 0) return managed;
    }

    if (!viewer.guildId) return [];
    return GuildRepository.findRooms({ id: viewer.guildId });
  }

  /** Throws unless the viewer is allowed in this room. */
  private async assertCanUseRoom(viewerId: string, guildId: string) {
    const rooms = await this.roomsFor(viewerId);
    if (!rooms.some((r) => r.id === guildId)) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have access to this standup", "Forbidden");
    }
  }

  /** Opening a room, or catching up from the last message the client holds. */
  async messages(viewerId: string, guildId: string, afterId?: string) {
    await this.assertCanUseRoom(viewerId, guildId);
    return afterId ? StandupRepository.findAfter(guildId, afterId) : StandupRepository.findRecent(guildId);
  }

  /** A message someone typed. */
  async postMessage(viewerId: string, guildId: string, body: string) {
    await this.assertCanUseRoom(viewerId, guildId);

    const trimmed = body.trim();
    if (!trimmed) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Message can't be empty", "Bad Request");
    }
    return StandupRepository.create(guildId, viewerId, "CHAT", trimmed.slice(0, MAX_MESSAGE_LENGTH));
  }

  /**
   * Posts the system line for a real task movement.
   *
   * Best-effort, exactly like TaskActivityService.log: the state change that
   * triggered this is already committed, so a failure to narrate it must
   * never fail the request. A task with no guild anywhere (no guild of its
   * own, no assignee, no creator) simply has no room to post into.
   */
  async postTaskEvent(adventureId: string, actorId: string, body: string) {
    try {
      const card = await AdventureRepository.findBoardCard(adventureId);
      if (!card) return;

      const guildId =
        card.guildId ?? card.progress[0]?.employee?.guildId ?? card.createdBy?.guildId ?? null;
      if (!guildId) return;

      await StandupRepository.create(guildId, actorId, "EVENT", body, adventureId);
    } catch {
      // Narration is not worth failing a committed action over.
    }
  }
}

export const StandupService = new StandupServiceImpl();
