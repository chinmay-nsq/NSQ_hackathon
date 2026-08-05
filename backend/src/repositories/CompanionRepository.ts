import { prisma } from "@/config/db";
import { Prisma } from "@prisma/client";

export const CompanionRepository = {
  findByEmployeeId(employeeId: string) {
    return prisma.companion.findUnique({ where: { employeeId } });
  },

  findByEmployeeIdWithMemories(employeeId: string, take = 5) {
    return prisma.companion.findUnique({
      where: { employeeId },
      include: { memories: { orderBy: { createdAt: "desc" }, take } },
    });
  },

  create(data: { employeeId: string; species: string; name: string }) {
    return prisma.companion.create({ data });
  },

  update(id: string, data: Prisma.CompanionUpdateInput) {
    return prisma.companion.update({ where: { id }, data });
  },

  addBondXp(id: string, amount: number) {
    return prisma.companion.update({ where: { id }, data: { bondXp: { increment: amount } } });
  },

  touchDialogueTimestamp(id: string) {
    return prisma.companion.update({ where: { id }, data: { lastDialogueAt: new Date() } });
  },

  latestMemory(companionId: string) {
    return prisma.companionMemory.findFirst({
      where: { companionId },
      orderBy: { createdAt: "desc" },
    });
  },

  addMemory(companionId: string, eventType: string, summary: string) {
    return prisma.companionMemory.create({ data: { companionId, eventType, summary } });
  },
};
