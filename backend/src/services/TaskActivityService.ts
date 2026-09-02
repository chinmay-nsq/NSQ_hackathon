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

  /**
   * "Who completed what" for the Standup page, grouped by person — a
   * manager/admin sees their whole team/company, an employee sees their
   * own guild (teammates' real names, since this is a real work-visibility
   * feature, not an anonymized one like Growth).
   */
  async standupFor(viewerId: string) {
    const viewer = await EmployeeRepository.findById(viewerId);
    if (!viewer) return [];

    const since = new Date();
    since.setDate(since.getDate() - STANDUP_WINDOW_DAYS);

    let entries;
    if (viewer.role === "ADMIN") {
      entries = await TaskActivityRepository.findRecentAll(since);
    } else {
      // Managers see the guild(s) they lead; plain employees see the guild
      // they're a member of — a manager who happens to also be a member of
      // some guild still wants their LED team's standup, not their own.
      const guildIds =
        viewer.role === "MANAGER"
          ? (await GuildRepository.findIdsManagedBy(viewerId)).map((g) => g.id)
          : viewer.guildId
            ? [viewer.guildId]
            : [];
      if (guildIds.length === 0) return [];
      entries = await TaskActivityRepository.findRecentForGuilds(guildIds, since);
    }

    const byPerson = new Map<
      string,
      { employeeId: string; name: string; title: string; items: { adventureTitle: string; type: string; at: string }[] }
    >();
    for (const entry of entries) {
      const existing = byPerson.get(entry.actorId);
      const item = { adventureTitle: entry.adventure.title, type: entry.type, at: entry.createdAt.toISOString() };
      if (existing) {
        existing.items.push(item);
      } else {
        byPerson.set(entry.actorId, {
          employeeId: entry.actorId,
          name: entry.actor.name,
          title: entry.actor.title,
          items: [item],
        });
      }
    }

    return Array.from(byPerson.values());
  }
}

export const TaskActivityService = new TaskActivityServiceImpl();
