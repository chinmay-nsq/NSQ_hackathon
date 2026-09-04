import { prisma } from "@/config/db";
import { CompanyProject } from "@prisma/client";
import { ResourceType } from "@/config/constants";

export const CompanyRepository = {
  async getOrCreate() {
    const existing = await prisma.company.findFirst();
    if (existing) return existing;
    return prisma.company.create({ data: { name: "The Company" } });
  },

  findProjects(companyId: string) {
    return prisma.companyProject.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } });
  },

  findUnlockedProjects(companyId: string): Promise<CompanyProject[]> {
    return prisma.companyProject.findMany({ where: { companyId, unlocked: true } });
  },

  findProjectById(id: string) {
    return prisma.companyProject.findUnique({ where: { id } });
  },

  contributeToProject(
    projectId: string,
    teamId: string,
    resourceType: ResourceType,
    amount: number
  ) {
    const contributedField = `${resourceType}Contributed` as const;
    return prisma.$transaction([
      prisma.companyProject.update({
        where: { id: projectId },
        data: { [contributedField]: { increment: amount } },
      }),
      prisma.companyContribution.create({
        data: { projectId, teamId, resourceType, amount },
      }),
    ]);
  },

  unlockProject(id: string) {
    return prisma.companyProject.update({ where: { id }, data: { unlocked: true } });
  },
};
