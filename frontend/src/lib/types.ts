export type ResourceType = "knowledge" | "gold" | "influence" | "materials";

export interface Employee {
  id: string;
  email: string;
  name: string;
  avatarSeed: string;
  xp: number;
  level: number;
  coins: number;
  reputation: number;
  title: string;
  guildId: string | null;
  companion?: Companion | null;
  guild?: Guild | null;
}

export interface Companion {
  id: string;
  employeeId: string;
  species: string;
  name: string;
  bondLevel: number;
  bondXp: number;
}

export interface GuildMember {
  id: string;
  name: string;
  level: number;
  title: string;
  xp?: number;
}

export interface Guild {
  id: string;
  name: string;
  department: string;
  emblem: string;
  level: number;
  reputation: number;
  guardianSpecies: string;
  guardianName: string;
  guardianLevel: number;
  knowledge: number;
  gold: number;
  influence: number;
  materials: number;
  members: GuildMember[];
}

export interface Kingdom {
  id: string;
  name: string;
}

export interface KingdomProject {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  knowledgeNeeded: number;
  goldNeeded: number;
  influenceNeeded: number;
  materialsNeeded: number;
  knowledgeContributed: number;
  goldContributed: number;
  influenceContributed: number;
  materialsContributed: number;
}

export interface WeeklyStory {
  id: string;
  weekOf: string;
  content: string;
}

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  active: boolean;
}
