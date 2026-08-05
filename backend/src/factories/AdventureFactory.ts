import { Prisma } from "@prisma/client";
import { ResourceType } from "@/config/constants";

export interface GeneratedAdventureContent {
  title: string;
  description: string;
  xpReward: number;
  coinReward: number;
  resourceType: ResourceType;
  resourceAmount: number;
}

const RESOURCE_REWARD_FIELD: Record<ResourceType, string> = {
  knowledge: "knowledgeReward",
  gold: "goldReward",
  influence: "influenceReward",
  materials: "materialsReward",
};

/**
 * Builds Prisma create-input for each Adventure type from AI-generated content,
 * so route/service code never hand-assembles the resource-reward field mapping.
 */
export const AdventureFactory = {
  buildSolo(content: GeneratedAdventureContent, employeeId: string, guildId: string | null): Prisma.AdventureCreateInput {
    return {
      type: "SOLO",
      title: content.title,
      description: content.description,
      xpReward: content.xpReward,
      coinReward: content.coinReward,
      [RESOURCE_REWARD_FIELD[content.resourceType]]: content.resourceAmount,
      createdBy: { connect: { id: employeeId } },
      ...(guildId ? { guild: { connect: { id: guildId } } } : {}),
    };
  },

  buildGuild(content: GeneratedAdventureContent, guildId: string): Prisma.AdventureCreateInput {
    return {
      type: "GUILD",
      title: content.title,
      description: content.description,
      xpReward: content.xpReward,
      coinReward: content.coinReward,
      [RESOURCE_REWARD_FIELD[content.resourceType]]: content.resourceAmount,
      guild: { connect: { id: guildId } },
    };
  },

  buildCrossGuild(content: GeneratedAdventureContent): Prisma.AdventureCreateInput {
    return {
      type: "CROSS_GUILD",
      title: content.title,
      description: content.description,
      xpReward: content.xpReward,
      coinReward: content.coinReward,
      [RESOURCE_REWARD_FIELD[content.resourceType]]: content.resourceAmount,
    };
  },
};
