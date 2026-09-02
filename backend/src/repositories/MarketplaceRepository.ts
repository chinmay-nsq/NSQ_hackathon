import { prisma } from "@/config/db";

export const MarketplaceRepository = {
  findActiveItems() {
    return prisma.marketplaceItem.findMany({ where: { active: true } });
  },

  findItemById(id: string) {
    return prisma.marketplaceItem.findUnique({ where: { id } });
  },

  recordPurchase(employeeId: string, itemId: string, cost: number) {
    return prisma.$transaction([
      prisma.purchase.create({ data: { employeeId, itemId } }),
      prisma.employee.update({ where: { id: employeeId }, data: { coins: { decrement: cost } } }),
    ]);
  },

  findPurchasesForEmployee(employeeId: string) {
    return prisma.purchase.findMany({
      where: { employeeId },
      include: { item: true },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Reward claims (PENDING) ordered by employees across the given guilds — what a manager sees to act on. */
  findPendingForGuilds(guildIds: string[]) {
    return prisma.purchase.findMany({
      where: { approval: "PENDING", employee: { guildId: { in: guildIds } } },
      include: { item: true, employee: { select: { id: true, name: true, title: true } } },
      orderBy: { createdAt: "asc" },
    });
  },

  /** Same as findPendingForGuilds but company-wide — admin only. */
  findPendingAllGuilds() {
    return prisma.purchase.findMany({
      where: { approval: "PENDING" },
      include: { item: true, employee: { select: { id: true, name: true, title: true } } },
      orderBy: { createdAt: "asc" },
    });
  },

  /** Recently decided claims (APPROVED/REJECTED) across the given guilds — recent history for the manager view. */
  findRecentlyDecidedForGuilds(guildIds: string[], limit: number) {
    return prisma.purchase.findMany({
      where: { approval: { in: ["APPROVED", "REJECTED"] }, employee: { guildId: { in: guildIds } } },
      include: { item: true, employee: { select: { id: true, name: true, title: true } } },
      orderBy: { approvedAt: "desc" },
      take: limit,
    });
  },

  /** Same as findRecentlyDecidedForGuilds but company-wide — admin only. */
  findRecentlyDecidedAllGuilds(limit: number) {
    return prisma.purchase.findMany({
      where: { approval: { in: ["APPROVED", "REJECTED"] } },
      include: { item: true, employee: { select: { id: true, name: true, title: true } } },
      orderBy: { approvedAt: "desc" },
      take: limit,
    });
  },

  findPurchaseById(id: string) {
    return prisma.purchase.findUnique({ where: { id }, include: { employee: true, item: true } });
  },

  approvePurchase(id: string, approverId: string) {
    return prisma.purchase.update({
      where: { id },
      data: { approval: "APPROVED", approvedById: approverId, approvedAt: new Date() },
    });
  },

  /** Rejecting a claim refunds the reserved coins in the same transaction. */
  rejectPurchase(id: string, approverId: string, employeeId: string, refundAmount: number) {
    return prisma.$transaction([
      prisma.purchase.update({
        where: { id },
        data: { approval: "REJECTED", approvedById: approverId, approvedAt: new Date() },
      }),
      prisma.employee.update({ where: { id: employeeId }, data: { coins: { increment: refundAmount } } }),
    ]);
  },
};
