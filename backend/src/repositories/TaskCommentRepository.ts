import { prisma } from "@/config/db";

export const TaskCommentRepository = {
  create(adventureId: string, authorId: string, body: string) {
    return prisma.taskComment.create({
      data: { adventureId, authorId, body },
      include: { author: { select: { id: true, name: true, title: true } } },
    });
  },

  findForAdventure(adventureId: string) {
    return prisma.taskComment.findMany({
      where: { adventureId },
      include: { author: { select: { id: true, name: true, title: true } } },
      orderBy: { createdAt: "asc" },
    });
  },
};
