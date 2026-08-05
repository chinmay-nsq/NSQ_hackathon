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
};
