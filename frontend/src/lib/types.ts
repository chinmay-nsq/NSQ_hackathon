export type ResourceType = "knowledge" | "gold" | "influence" | "materials";

export type Role = "EMPLOYEE" | "MANAGER" | "ADMIN";
export type Seniority = "JUNIOR" | "MID" | "SENIOR" | "LEAD";

export interface Employee {
  id: string;
  email: string;
  name: string;
  avatarSeed: string;
  role: Role;
  xp: number;
  level: number;
  coins: number;
  reputation: number;
  title: string;
  guildId: string | null;
  jobRole?: string | null;
  seniority?: Seniority | null;
  skills?: string[];
  profileCompletedAt?: string | null;
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

export type AdventureType = "SOLO" | "GUILD" | "CROSS_GUILD";
export type AdventureStatus = "ACTIVE" | "COMPLETED" | "EXPIRED";
export type ApprovalStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export interface AdventureProgress {
  id?: string;
  employeeId?: string;
  completed?: boolean;
  submission?: string | null;
  approval?: ApprovalStatus;
  rejectionNote?: string | null;
}

export interface Adventure {
  id: string;
  type: AdventureType;
  title: string;
  description: string;
  status: AdventureStatus;
  xpReward: number;
  coinReward: number;
  knowledgeReward: number;
  goldReward: number;
  influenceReward: number;
  materialsReward: number;
  guildId?: string | null;
  aiGenerated?: boolean;
  createdAt: string;
  progress: AdventureProgress[];
}

export interface PendingApproval {
  id: string;
  adventureId: string;
  employeeId: string;
  submission: string | null;
  completedAt: string | null;
  adventure: Adventure;
  employee: { id: string; name: string; title: string; avatarSeed: string; species?: string | null };
}

export interface CompanyOverview {
  employeeCount: number;
  guildCount: number;
  pendingApprovals: number;
  totalXp: number;
}

export interface GuildMember {
  id: string;
  name: string;
  level: number;
  title: string;
  xp?: number;
  /** Present when the current viewer sees this member anonymized (by companion identity, not real name) — a manager viewing their own team. */
  species?: string | null;
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
