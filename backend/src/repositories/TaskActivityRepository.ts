import { prisma } from "@/config/db";
import { TaskActivityType } from "@prisma/client";

export const TaskActivityRepository = {
  create(assignmentId: string, actorId: string, type: TaskActivityType, detail: string) {
    return prisma.taskActivityLog.create({ data: { assignmentId, actorId, type, detail } });
  },

  /** Full movement history for one task's enlarged detail view, oldest first (reads top-to-bottom as a real timeline). */
  findForAssignment(assignmentId: string) {
    return prisma.taskActivityLog.findMany({
      where: { assignmentId },
      include: { actor: { select: { id: true, name: true, title: true } } },
      orderBy: { createdAt: "asc" },
    });
  },

  /**
   * Recent activity across every team in `teamIds` — the Standup feed.
   * Scoped to SUBMITTED only — that's the real "this person finished this
   * work" moment (attributed to whoever did it). APPROVED/REJECTED are
   * review actions performed BY a manager ON someone else's work, so
   * including them here would misattribute "completed X" to the reviewer
   * instead of the person who actually did it — they still show up in the
   * task's own detail history, just not in this per-person feed.
   */

};
