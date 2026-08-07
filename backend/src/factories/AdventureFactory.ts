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
// Fixed reward for employee-authored adventures — no AI call, so the reward
// is a flat baseline rather than a generated range. Manager approval is the
// quality gate instead of AI-judged difficulty.
export const MANUAL_ADVENTURE_XP = 25;
export const MANUAL_ADVENTURE_COINS = 15;

export const AdventureFactory = {
  buildManualSolo(
    title: string,
    description: string,
    employeeId: string,
    guildId: string | null
  ): Prisma.AdventureCreateInput {
    return {
      type: "SOLO",
      title,
      description,
      xpReward: MANUAL_ADVENTURE_XP,
      coinReward: MANUAL_ADVENTURE_COINS,
      aiGenerated: false,
      createdBy: { connect: { id: employeeId } },
      ...(guildId ? { guild: { connect: { id: guildId } } } : {}),
    };
  },

  /** A manager/admin hand-writes a task and assigns it to one member of their team. */
  buildAssignedSolo(
    title: string,
    description: string,
    xpReward: number,
    coinReward: number,
    assigneeId: string,
    guildId: string | null
  ): Prisma.AdventureCreateInput {
    return {
      type: "SOLO",
      title,
      description,
      xpReward,
      coinReward,
      aiGenerated: false,
      createdBy: { connect: { id: assigneeId } },
      ...(guildId ? { guild: { connect: { id: guildId } } } : {}),
    };
  },

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
