import { prisma } from "@/config/db";

export const TaskCommentRepository = {
  create(assignmentId: string, authorId: string, body: string) {
    return prisma.taskComment.create({
      data: { assignmentId, authorId, body },
      include: { author: { select: { id: true, name: true, title: true } } },
    });
  },

  findForAssignment(assignmentId: string) {
    return prisma.taskComment.findMany({
      where: { assignmentId },
      include: { author: { select: { id: true, name: true, title: true } } },
      orderBy: { createdAt: "asc" },
    });
  },
};
