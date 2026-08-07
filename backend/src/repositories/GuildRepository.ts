import { prisma } from "@/config/db";
import { Prisma } from "@prisma/client";
import { ResourceType } from "@/config/constants";

export const GuildRepository = {
  findAllWithMembers() {
    return prisma.guild.findMany({
      include: { members: { select: { id: true, name: true, level: true, title: true } } },
      orderBy: { reputation: "desc" },
    });
  },

  findByIdWithDetails(id: string) {
    return prisma.guild.findUnique({
      where: { id },
      include: {
        members: { select: { id: true, name: true, level: true, title: true, xp: true } },
        adventures: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
      },
    });
  },

  findById(id: string) {
    return prisma.guild.findUnique({ where: { id } });
  },

  findIdsManagedBy(managerId: string): Promise<{ id: string }[]> {
    return prisma.guild.findMany({ where: { managerId }, select: { id: true } });
  },

  findManagedByWithMembers(managerId: string) {
    return prisma.guild.findMany({
      where: { managerId },
      include: { members: { select: { id: true, name: true, title: true, level: true } } },
      orderBy: { name: "asc" },
    });
  },

  create(data: Prisma.GuildCreateInput) {
    return prisma.guild.create({ data });
  },

  update(id: string, data: Prisma.GuildUpdateInput) {
    return prisma.guild.update({ where: { id }, data });
  },

  incrementResources(
    id: string,
    amounts: Partial<Record<ResourceType, number>>,
    reputationDelta = 0
  ) {
    return prisma.guild.update({
      where: { id },
      data: {
        knowledge: { increment: amounts.knowledge ?? 0 },
        gold: { increment: amounts.gold ?? 0 },
        influence: { increment: amounts.influence ?? 0 },
        materials: { increment: amounts.materials ?? 0 },
        reputation: { increment: reputationDelta },
      },
    });
  },

  decrementResource(id: string, resourceType: ResourceType, amount: number) {
    return prisma.guild.update({
      where: { id },
      data: { [resourceType]: { decrement: amount } },
    });
  },
};
