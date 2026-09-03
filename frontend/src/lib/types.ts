export type ResourceType = "knowledge" | "gold" | "influence" | "materials";

export type Role = "EMPLOYEE" | "MANAGER" | "ADMIN";
export type Seniority = "JUNIOR" | "MID" | "SENIOR" | "LEAD";

/** AI-suggested starting profile from just a job title — onboarding intake. */
export interface ProfileSuggestion {
  seniority: Seniority;
  skills: string[];
}

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
  onboardingTourDone: boolean;
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

export type ChatRole = "USER" | "COMPANION";

export interface ChatMessage {
  id: string;
  companionId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export type AdventureType = "SOLO" | "GUILD" | "CROSS_GUILD";
export type AdventureStatus = "ACTIVE" | "COMPLETED" | "EXPIRED";
export type ApprovalStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";
export type WorkItemType = "TASK" | "STORY" | "BUG";
export type TaskColumn = "todo" | "in_review" | "needs_rework" | "done";

export interface AdventureProgress {
  id?: string;
  employeeId?: string;
  completed?: boolean;
  submission?: string | null;
  approval?: ApprovalStatus;
  rejectionNote?: string | null;
  quizAnswers?: number[] | null;
  quizCorrectCount?: number | null;
}

export interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  string: string;
  number: string;
}

export interface Adventure {
  id: string;
  type: AdventureType;
  workItemType?: WorkItemType;
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
  sprintId?: string | null;
  aiGenerated?: boolean;
  createdAt: string;
  progress: AdventureProgress[];
  quiz?: QuizQuestion[] | null;
}

/** A time-boxed iteration tasks can be planned into — Azure DevOps-style sprints, scoped to one team. */
export interface Sprint {
  id: string;
  guildId: string;
  name: string;
  startDate: string;
  endDate: string;
  taskCount: number;
  isCurrent: boolean;
}

/** One card on the whole-team Kanban board — real assignee, always shown (visibility is team-wide, not filtered to "mine"). */
export interface BoardTask extends Adventure {
  assignee: AssigneeIdentity | null;
  column: TaskColumn;
}

export interface TaskComment {
  id: string;
  adventureId: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; title: string };
}

export type TaskActivityType = "CREATED" | "ASSIGNED" | "SUBMITTED" | "APPROVED" | "REJECTED" | "COMMENTED";

export interface TaskActivityEntry {
  id: string;
  type: TaskActivityType;
  detail: string;
  createdAt: string;
  actor: { id: string; name: string; title: string };
}

export interface TaskDetail {
  adventure: BoardTask;
  comments: TaskComment[];
  activity: TaskActivityEntry[];
}

/** One person's real "who completed what" feed on the Standup page. */
export interface StandupPerson {
  employeeId: string;
  name: string;
  title: string;
  items: { adventureTitle: string; type: TaskActivityType; at: string }[];
}

export interface PendingApproval {
  id: string;
  adventureId: string;
  employeeId: string;
  submission: string | null;
  completedAt: string | null;
  adventure: Adventure;
  employee: { id: string; name: string; title: string; avatarSeed: string };
}

/** Real identity of who a task is assigned to — a manager needs to know exactly who, not just their companion. */
export interface AssigneeIdentity {
  id: string;
  name: string;
  title: string;
  avatarSeed: string;
}

/** A manager-assigned task that hasn't been completed yet — "awaiting completion" in Approvals. */
export interface AssignedTask {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  coinReward: number;
  createdAt: string;
  createdBy: { id: string; name: string; title: string; avatarSeed: string };
  assignee: AssigneeIdentity;
}

/** One row in a lead's full "every task I've ever assigned" history, any status. */
export interface AssignedTaskHistoryItem {
  id: string;
  title: string;
  description: string;
  status: AdventureStatus;
  xpReward: number;
  coinReward: number;
  createdAt: string;
  createdBy: { id: string; name: string; title: string; avatarSeed: string };
  assignee: AssigneeIdentity;
  progress: AdventureProgress[];
}

/** One row in an employee's own "completed" history — pending review or approved. */
export interface MyHistoryItem {
  id: string;
  completedAt: string | null;
  submission: string | null;
  quizCorrectCount: number | null;
  approval: ApprovalStatus;
  adventure: Adventure & { assignedBy?: { id: string; name: string; title: string; avatarSeed: string } | null };
}

/** A task assigned to the current employee that they haven't completed yet. */
export interface MyAssignedTask {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  coinReward: number;
  createdAt: string;
  assignedBy: { id: string; name: string; title: string; avatarSeed: string } | null;
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
  managerId?: string;
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

export interface WeeklyPoint {
  weekStart: string;
  value: number;
}

export type GrowthObservationTopic = "adventures" | "teams" | "approvals" | "growth";

export type DialogueActionTopic = "adventures" | "approvals" | "teams";

export interface DialogueAction {
  topic: DialogueActionTopic;
  label: string;
}

export interface GrowthObservation {
  text: string;
  topic?: GrowthObservationTopic;
  /** Set by the backend from a fixed route map keyed on `topic` — never a raw AI-produced URL. */
  href?: string;
}

export interface GrowthInsight {
  headline: string;
  observations: GrowthObservation[];
}

export interface ApprovalRate {
  approvedCount: number;
  rejectedCount: number;
  ratePct: number | null;
}

export interface EmployeeGrowth {
  skill: { weekly: WeeklyPoint[]; currentPct: number | null; deltaPct: number | null };
  consistency: { activeDaysByWeek: WeeklyPoint[]; currentStreakDays: number; longestGapDays: number | null };
  output: { xpByWeek: WeeklyPoint[]; thisWeekXp: number; rollingAvgXp: number; deltaPct: number | null };
  approval: ApprovalRate;
  totalTasksCompleted: number;
}

export interface TeamGrowth {
  memberCount: number;
  skill: { weekly: WeeklyPoint[]; currentPct: number | null; deltaPct: number | null };
  consistency: { activeDaysByWeek: WeeklyPoint[] };
  output: { xpByWeek: WeeklyPoint[]; thisWeekXp: number; rollingAvgXp: number; deltaPct: number | null };
  approval: ApprovalRate;
  totalTasksCompleted: number;
  sprintCompletion: { weekly: WeeklyPoint[]; currentPct: number | null; deltaPct: number | null; sprintCount: number };
}

export interface TeamMemberGrowth {
  employeeId: string;
  name: string;
  title: string;
  level: number;
  growth: EmployeeGrowth;
}

export interface TaskActivityDetail {
  title: string;
  type: string;
  xpReward: number;
  completedAt: string | null;
  detail: string;
}

/**
 * Real task-level detail + an AI explanation for why a team member's
 * performance looked the way it did in a specific week (or the whole
 * window, when weekStart is null). The personal daily skill quiz is
 * deliberately excluded — it's private practice, not delegated work a
 * manager reviews.
 */
export interface WeekDetail {
  periodLabel: string;
  weekStart: string | null;
  xpThisPeriod: number;
  rollingAvgXp: number;
  activeDays: number;
  tasks: TaskActivityDetail[];
  insight: string;
}

export interface ManagerSelfGrowth {
  turnaround: { weekly: WeeklyPoint[]; currentAvgHours: number | null; deltaPct: number | null; sampleSize: number };
  volume: { assignedByWeek: WeeklyPoint[]; approvedByWeek: WeeklyPoint[] };
}

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  active: boolean;
}

export interface Purchase {
  id: string;
  employeeId: string;
  itemId: string;
  item: MarketplaceItem;
  createdAt: string;
  /** PENDING = "Ordered", APPROVED = "Claimed", REJECTED = refunded. */
  approval: ApprovalStatus;
  approvedAt?: string | null;
}

/** A reward claim awaiting (or having received) a manager's decision — shown on the Approvals page. */
export interface RewardClaim {
  id: string;
  createdAt: string;
  approval: ApprovalStatus;
  approvedAt?: string | null;
  item: MarketplaceItem;
  employee: { id: string; name: string; title: string };
}

export type ListingStatus = "ACTIVE" | "SOLD" | "CANCELLED";

/** A trading-post listing browsed by other employees — seller shown by companion identity only. */
export interface Listing {
  id: string;
  status: ListingStatus;
  askingPrice: number;
  createdAt: string;
  soldAt?: string | null;
  purchase: Purchase;
  seller: { id: string; name: string; title: string; avatarSeed: string; species?: string | null };
}

/** One of the current employee's own listings — no seller identity needed, it's always you. */
export interface MyListing {
  id: string;
  status: ListingStatus;
  askingPrice: number;
  createdAt: string;
  soldAt?: string | null;
  purchase: Purchase;
}

export type NotificationType = "REWARD_CLAIMED" | "ONBOARDING_STALLED";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  actor: { id: string; name: string; title: string; avatarSeed: string } | null;
}
