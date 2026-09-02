import { prisma } from "@/config/db";
import { TaskActivityType } from "@prisma/client";

export const TaskActivityRepository = {
  create(adventureId: string, actorId: string, type: TaskActivityType, detail: string) {
    return prisma.taskActivityLog.create({ data: { adventureId, actorId, type, detail } });
  },

  /** Full movement history for one task's enlarged detail view, oldest first (reads top-to-bottom as a real timeline). */
  findForAdventure(adventureId: string) {
    return prisma.taskActivityLog.findMany({
      where: { adventureId },
      include: { actor: { select: { id: true, name: true, title: true } } },
      orderBy: { createdAt: "asc" },
    });
  },

  /**
   * Recent activity across every guild in `guildIds` — the Standup feed.
   * Scoped to SUBMITTED only — that's the real "this person finished this
   * work" moment (attributed to whoever did it). APPROVED/REJECTED are
   * review actions performed BY a manager ON someone else's work, so
   * including them here would misattribute "completed X" to the reviewer
   * instead of the person who actually did it — they still show up in the
   * task's own detail history, just not in this per-person feed.
   */
  findRecentForGuilds(guildIds: string[], since: Date) {
    return prisma.taskActivityLog.findMany({
      where: {
        createdAt: { gte: since },
        type: "SUBMITTED",
        actor: { guildId: { in: guildIds } },
      },
      include: {
        actor: { select: { id: true, name: true, title: true } },
        adventure: { select: { id: true, title: true, workItemType: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Same as findRecentForGuilds but company-wide — admin only. */
  findRecentAll(since: Date) {
    return prisma.taskActivityLog.findMany({
      where: { createdAt: { gte: since }, type: "SUBMITTED" },
      include: {
        actor: { select: { id: true, name: true, title: true } },
        adventure: { select: { id: true, title: true, workItemType: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
