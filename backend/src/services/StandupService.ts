import { StandupRepository } from "@/repositories/StandupRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { TeamRepository } from "@/repositories/TeamRepository";
import { AssignmentRepository } from "@/repositories/AssignmentRepository";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

export const MAX_MESSAGE_LENGTH = 2000;

class StandupServiceImpl {
  /**
   * The rooms a viewer can open, following the same visibility the rest of
   * the app uses: an employee gets their own team, a manager the team(s)
   * they lead, an admin every team. Returned in a stable order so the
   * client can default to the first one without it moving around.
   */
  async roomsFor(viewerId: string) {
    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) return [];

    if (viewer.role === "ADMIN") return TeamRepository.findRooms({});

    if (viewer.role === "MANAGER") {
      const managed = await TeamRepository.findRooms({ managerId: viewerId });
      // A manager who leads nothing yet still gets their own team's room.
      if (managed.length > 0) return managed;
    }

    if (!viewer.teamId) return [];
    return TeamRepository.findRooms({ id: viewer.teamId });
  }

  /** Throws unless the viewer is allowed in this room. */
  private async assertCanUseRoom(viewerId: string, teamId: string) {
    const rooms = await this.roomsFor(viewerId);
    if (!rooms.some((r) => r.id === teamId)) {
      throw new ApiError(HttpStatus.FORBIDDEN, "You don't have access to this standup", "Forbidden");
    }
  }

  /** Opening a room, or catching up from the last message the client holds. */
  async messages(viewerId: string, teamId: string, afterId?: string) {
    await this.assertCanUseRoom(viewerId, teamId);
    return afterId ? StandupRepository.findAfter(teamId, afterId) : StandupRepository.findRecent(teamId);
  }

  /** A message someone typed. */
  async postMessage(viewerId: string, teamId: string, body: string) {
    await this.assertCanUseRoom(viewerId, teamId);

    const trimmed = body.trim();
    if (!trimmed) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Message can't be empty", "Bad Request");
    }
    return StandupRepository.create(teamId, viewerId, "CHAT", trimmed.slice(0, MAX_MESSAGE_LENGTH));
  }

  /**
   * Posts the system line for a real task movement.
   *
   * Best-effort, exactly like TaskActivityService.log: the state change that
   * triggered this is already committed, so a failure to narrate it must
   * never fail the request. A task with no team anywhere (no team of its
   * own, no assignee, no creator) simply has no room to post into.
   */
  async postTaskEvent(assignmentId: string, actorId: string, body: string) {
    try {
      const card = await AssignmentRepository.findBoardCard(assignmentId);
      if (!card) return;

      const teamId =
        card.teamId ?? card.progress[0]?.employee?.teamId ?? card.createdBy?.teamId ?? null;
      if (!teamId) return;

      await StandupRepository.create(teamId, actorId, "EVENT", body, assignmentId);
    } catch {
      // Narration is not worth failing a committed action over.
    }
  }
}

export const StandupService = new StandupServiceImpl();
