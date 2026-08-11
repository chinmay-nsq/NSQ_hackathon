import { prisma } from "@/config/db";
import { NotificationType } from "@prisma/client";

const ACTOR_SELECT = {
  select: { id: true, name: true, title: true, avatarSeed: true },
} as const;

export const NotificationRepository = {
  create(data: { recipientId: string; actorId?: string; type: NotificationType; title: string; body: string }) {
    return prisma.notification.create({ data });
  },

  createMany(data: { recipientId: string; actorId?: string; type: NotificationType; title: string; body: string }[]) {
    if (data.length === 0) return Promise.resolve({ count: 0 });
    return prisma.notification.createMany({ data });
  },

  findForRecipient(recipientId: string, take = 30) {
    return prisma.notification.findMany({
      where: { recipientId },
      include: { actor: ACTOR_SELECT },
      orderBy: { createdAt: "desc" },
      take,
    });
  },

  countUnread(recipientId: string) {
    return prisma.notification.count({ where: { recipientId, read: false } });
  },

  markAllRead(recipientId: string) {
    return prisma.notification.updateMany({
      where: { recipientId, read: false },
      data: { read: true },
    });
  },

  markRead(id: string, recipientId: string) {
    // recipientId scoped into the WHERE, not checked separately — a user
    // can only ever mark their own notifications read this way.
    return prisma.notification.updateMany({
      where: { id, recipientId },
      data: { read: true },
    });
  },
};
