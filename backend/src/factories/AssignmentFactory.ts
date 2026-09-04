import { Prisma, WorkItemType } from "@prisma/client";
import { ResourceType } from "@/config/constants";
import { QuizQuestionContent } from "@/services/AIService";

export interface GeneratedAssignmentContent {
  title: string;
  description: string;
  xpReward: number;
  coinReward: number;
  resourceType: ResourceType;
  resourceAmount: number;
}

// The self-serve daily quiz: 5 coins per correct answer (5 questions), plus
// a flat XP reward just for taking it — coinReward here is the maximum
// possible (all 5 correct); actual crediting is quizCorrectCount * COINS_PER_CORRECT.
export const QUIZ_COINS_PER_CORRECT = 5;
export const QUIZ_QUESTION_COUNT = 5;
export const QUIZ_XP_REWARD = 20;

const RESOURCE_REWARD_FIELD: Record<ResourceType, string> = {
  knowledge: "knowledgeReward",
  gold: "goldReward",
  influence: "influenceReward",
  materials: "materialsReward",
};

/**
 * Builds Prisma create-input for each Assignment type from AI-generated content,
 * so route/service code never hand-assembles the resource-reward field mapping.
 */
// Fixed reward for employee-authored assignments — no AI call, so the reward
// is a flat baseline rather than a generated range. Manager approval is the
// quality gate instead of AI-judged difficulty.
export const MANUAL_ASSIGNMENT_XP = 25;
export const MANUAL_ASSIGNMENT_COINS = 15;

export const AssignmentFactory = {
  buildManualSolo(
    title: string,
    description: string,
    employeeId: string,
    teamId: string | null,
    workItemType: WorkItemType = "TASK"
  ): Prisma.AssignmentCreateInput {
    return {
      type: "SOLO",
      workItemType,
      title,
      description,
      xpReward: MANUAL_ASSIGNMENT_XP,
      coinReward: MANUAL_ASSIGNMENT_COINS,
      aiGenerated: false,
      createdBy: { connect: { id: employeeId } },
      ...(teamId ? { team: { connect: { id: teamId } } } : {}),
    };
  },

  /** A manager/admin hand-writes a task and assigns it to one member of their team. */
  buildAssignedSolo(
    title: string,
    description: string,
    xpReward: number,
    coinReward: number,
    assigneeId: string,
    teamId: string | null,
    assignerId: string,
    workItemType: WorkItemType = "TASK",
    sprintId?: string | null
  ): Prisma.AssignmentCreateInput {
    return {
      type: "SOLO",
      workItemType,
      title,
      description,
      xpReward,
      coinReward,
      aiGenerated: false,
      createdBy: { connect: { id: assigneeId } },
      assignedBy: { connect: { id: assignerId } },
      ...(teamId ? { team: { connect: { id: teamId } } } : {}),
      ...(sprintId ? { sprint: { connect: { id: sprintId } } } : {}),
    };
  },

  buildSolo(content: GeneratedAssignmentContent, employeeId: string, teamId: string | null): Prisma.AssignmentCreateInput {
    return {
      type: "SOLO",
      title: content.title,
      description: content.description,
      xpReward: content.xpReward,
      coinReward: content.coinReward,
      [RESOURCE_REWARD_FIELD[content.resourceType]]: content.resourceAmount,
      createdBy: { connect: { id: employeeId } },
      ...(teamId ? { team: { connect: { id: teamId } } } : {}),
    };
  },

  /**
   * The self-serve daily solo assignment — a 5-question skill quiz instead of a
   * text task. `dailyQuizDate` (paired with a DB-level unique constraint on
   * [createdById, dailyQuizDate]) is what actually prevents two of these
   * ever existing for the same employee on the same day, even under
   * concurrent requests — the application-level "does one exist" check
   * alone can't close that race.
   */
  buildSoloQuiz(
    questions: QuizQuestionContent[],
    employeeId: string,
    teamId: string | null,
    dailyQuizDate: string
  ): Prisma.AssignmentCreateInput {
    return {
      type: "SOLO",
      title: "Daily Skill Quiz",
      description: "Answer 5 questions tailored to your skills. Earn 5 coins for each correct answer.",
      xpReward: QUIZ_XP_REWARD,
      coinReward: QUIZ_QUESTION_COUNT * QUIZ_COINS_PER_CORRECT,
      quiz: questions as unknown as Prisma.InputJsonValue,
      dailyQuizDate,
      createdBy: { connect: { id: employeeId } },
      ...(teamId ? { team: { connect: { id: teamId } } } : {}),
    };
  },

  buildTeam(content: GeneratedAssignmentContent, teamId: string): Prisma.AssignmentCreateInput {
    return {
      type: "TEAM",
      title: content.title,
      description: content.description,
      xpReward: content.xpReward,
      coinReward: content.coinReward,
      [RESOURCE_REWARD_FIELD[content.resourceType]]: content.resourceAmount,
      team: { connect: { id: teamId } },
    };
  },

  buildCrossTeam(content: GeneratedAssignmentContent): Prisma.AssignmentCreateInput {
    return {
      type: "CROSS_TEAM",
      title: content.title,
      description: content.description,
      xpReward: content.xpReward,
      coinReward: content.coinReward,
      [RESOURCE_REWARD_FIELD[content.resourceType]]: content.resourceAmount,
    };
  },
};
