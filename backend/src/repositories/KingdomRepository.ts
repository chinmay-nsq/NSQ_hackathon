import { prisma } from "@/config/db";
import { KingdomProject } from "@prisma/client";
import { ResourceType } from "@/config/constants";

export const KingdomRepository = {
  async getOrCreate() {
    const existing = await prisma.kingdom.findFirst();
    if (existing) return existing;
    return prisma.kingdom.create({ data: { name: "The Kingdom" } });
  },

  findProjects(kingdomId: string) {
    return prisma.kingdomProject.findMany({ where: { kingdomId }, orderBy: { createdAt: "asc" } });
  },

  findUnlockedProjects(kingdomId: string): Promise<KingdomProject[]> {
    return prisma.kingdomProject.findMany({ where: { kingdomId, unlocked: true } });
  },

  findProjectById(id: string) {
    return prisma.kingdomProject.findUnique({ where: { id } });
  },

  contributeToProject(
    projectId: string,
    guildId: string,
    resourceType: ResourceType,
    amount: number
  ) {
    const contributedField = `${resourceType}Contributed` as const;
    return prisma.$transaction([
      prisma.kingdomProject.update({
        where: { id: projectId },
        data: { [contributedField]: { increment: amount } },
      }),
      prisma.kingdomContribution.create({
        data: { projectId, guildId, resourceType, amount },
      }),
    ]);
  },

  unlockProject(id: string) {
    return prisma.kingdomProject.update({ where: { id }, data: { unlocked: true } });
  },
};
