import { TaskActivityType } from "@prisma/client";
import { TaskActivityRepository } from "@/repositories/TaskActivityRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { GuildRepository } from "@/repositories/GuildRepository";

const STANDUP_WINDOW_DAYS = 7;

class TaskActivityServiceImpl {
  /**
   * Records one real task movement. Best-effort and fire-and-forget from
   * the caller's perspective — a logging hiccup must never block the real
   * action (a completion, an approval) that's already committed by the
   * time this is called.
   */
  async log(adventureId: string, actorId: string, type: TaskActivityType, detail: string) {
    try {
      await TaskActivityRepository.create(adventureId, actorId, type, detail);
    } catch {
      // Best-effort — the real action already succeeded; losing one log
      // entry is preferable to failing the request over it.
    }
  }

  /** Full real movement history for one task, oldest first — feeds the enlarged task detail view. */
  historyFor(adventureId: string) {
    return TaskActivityRepository.findForAdventure(adventureId);
  }

}

export const TaskActivityService = new TaskActivityServiceImpl();
