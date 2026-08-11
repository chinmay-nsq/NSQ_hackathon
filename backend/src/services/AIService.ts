import { getAIProvider } from "@/factories/AIProviderFactory";
import { GeneratedAdventureContent } from "@/factories/AdventureFactory";
import { encodeAnswer } from "@/utils/quizCipher";

export interface QuizQuestionContent {
  question: string;
  options: [string, string, string, string];
  string: string;
  number: string;
}

interface RawQuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

const FALLBACK_QUIZ_QUESTIONS: RawQuizQuestion[] = [
  {
    question: "What's generally the best first step when you don't understand a task?",
    options: ["Guess and hope for the best", "Ask a clarifying question", "Ignore it", "Wait for someone else to do it"],
    correctIndex: 1,
  },
  {
    question: "Which habit most improves long-term code/document quality?",
    options: ["Skipping review", "Regular small revisions", "Writing everything at once", "Never asking for feedback"],
    correctIndex: 1,
  },
  {
    question: "When a deadline is at risk, what's the most useful early action?",
    options: ["Stay silent and hope it works out", "Flag it early to your team", "Wait until it's overdue", "Blame the tools"],
    correctIndex: 1,
  },
  {
    question: "What best describes a healthy feedback loop at work?",
    options: ["Feedback only during annual reviews", "Frequent, specific, two-way feedback", "No feedback at all", "Feedback only when something goes wrong"],
    correctIndex: 1,
  },
  {
    question: "Which is the strongest sign of good documentation?",
    options: ["It's long", "Someone new can follow it without help", "It uses technical jargon", "It's never updated"],
    correctIndex: 1,
  },
];

const FALLBACK_SOLO: GeneratedAdventureContent[] = [
  {
    title: "Morning Reflection",
    description: "Write two sentences about what you want to accomplish today.",
    xpReward: 20,
    coinReward: 10,
    resourceType: "influence",
    resourceAmount: 5,
  },
  {
    title: "Appreciate a Teammate",
    description: "Send a message thanking a teammate for something specific they did recently.",
    xpReward: 25,
    coinReward: 15,
    resourceType: "influence",
    resourceAmount: 8,
  },
];

class AIServiceImpl {
  async generateSoloAdventure(context: {
    employeeName: string;
    department: string;
    recentActivity: string;
    jobRole?: string | null;
    seniority?: string | null;
    skills?: string[];
  }): Promise<GeneratedAdventureContent> {
    const system = `You are the AI Dungeon Master for Weatherline, a workplace gamification app.
Generate ONE short solo adventure (a small daily task) for an employee, tailored to their role, seniority, and skills when given.
Respond ONLY with JSON matching: { "title": string, "description": string, "xpReward": number (10-40), "coinReward": number (5-25), "resourceType": "knowledge"|"gold"|"influence"|"materials", "resourceAmount": number (3-15) }
Keep it realistic for a workplace: a small task that actually uses their skills, plus learning, reflection, wellness, or peer appreciation as variety. No fantasy jargon in the description itself, just the framing.`;

    const profileLine = context.jobRole
      ? `Role: ${context.jobRole}${context.seniority ? ` (${context.seniority})` : ""}. Skills: ${(context.skills ?? []).join(", ") || "none listed"}.`
      : "No work profile on file yet — keep it generic.";

    const user = `Employee: ${context.employeeName}, Department: ${context.department}. ${profileLine} Recent activity: ${context.recentActivity || "none yet"}. Generate today's solo adventure.`;

    try {
      return await getAIProvider().completeJSON<GeneratedAdventureContent>(system, user);
    } catch {
      return FALLBACK_SOLO[Math.floor(Math.random() * FALLBACK_SOLO.length)];
    }
  }

  /**
   * The self-serve daily solo quest — a 5-question multiple-choice skill
   * quiz tailored to the employee's role/seniority/skills, instead of a
   * plain text task. Each correct option is obfuscated via `encodeAnswer`
   * before being returned, so the raw content never contains a
   * `correctIndex` field.
   */
  async generateSkillQuiz(context: {
    jobRole?: string | null;
    seniority?: string | null;
    skills?: string[];
  }): Promise<QuizQuestionContent[]> {
    const system = `You are a skills-quiz generator for Weatherline, a workplace gamification app.
Generate EXACTLY 5 multiple-choice questions that test practical knowledge relevant to the employee's role, seniority, and skills.
Each question must have exactly 4 options, with exactly one correct answer.
Respond ONLY with JSON matching: { "questions": [{ "question": string, "options": [string, string, string, string], "correctIndex": number (0-3) }] }
Keep questions practical and specific to the listed skills — not generic trivia. Vary difficulty by seniority.`;

    const profileLine = context.jobRole
      ? `Role: ${context.jobRole}${context.seniority ? ` (${context.seniority})` : ""}. Skills: ${(context.skills ?? []).join(", ") || "none listed"}.`
      : "No work profile on file yet — keep questions generic workplace best-practice questions.";

    const user = `${profileLine} Generate today's 5-question skill quiz.`;

    let raw: RawQuizQuestion[];
    try {
      const result = await getAIProvider().completeJSON<{ questions: RawQuizQuestion[] }>(system, user);
      raw = Array.isArray(result.questions) && result.questions.length === 5 ? result.questions : FALLBACK_QUIZ_QUESTIONS;
    } catch {
      raw = FALLBACK_QUIZ_QUESTIONS;
    }

    return raw.map((q) => {
      const correctIndex = q.correctIndex >= 0 && q.correctIndex <= 3 ? q.correctIndex : 0;
      const { string, number } = encodeAnswer(correctIndex);
      return { question: q.question, options: q.options, string, number };
    });
  }

  /**
   * Manager-triggered generation for a specific team member — built ONLY
   * from their work profile (job role, seniority, skills), never their name
   * or any other personally-identifying detail. Matches the anonymity model
   * used everywhere else a manager views their team.
   */
  async generateSoloAdventureForProfile(context: {
    jobRole: string;
    seniority: string;
    skills: string[];
  }): Promise<GeneratedAdventureContent> {
    const system = `You are the AI Dungeon Master for Weatherline, a workplace gamification app.
Generate ONE short solo adventure (a small daily task) for an employee, based only on their role, seniority, and skills — you are never told their name or any other identifying detail, and must not invent one.
Respond ONLY with JSON matching: { "title": string, "description": string, "xpReward": number (10-40), "coinReward": number (5-25), "resourceType": "knowledge"|"gold"|"influence"|"materials", "resourceAmount": number (3-15) }
Keep it realistic for a workplace: a small task that actually uses their listed skills at their seniority level.`;

    const user = `Role: ${context.jobRole} (${context.seniority}). Skills: ${context.skills.join(", ")}. Generate a task for this person.`;

    try {
      return await getAIProvider().completeJSON<GeneratedAdventureContent>(system, user);
    } catch {
      return FALLBACK_SOLO[Math.floor(Math.random() * FALLBACK_SOLO.length)];
    }
  }

  async generateGuildAdventure(context: {
    guildName: string;
    department: string;
  }): Promise<GeneratedAdventureContent> {
    const system = `You are the AI Dungeon Master for Weatherline. Generate ONE short guild (team) adventure — a small collaborative task for a whole department team.
Respond ONLY with JSON matching: { "title": string, "description": string, "xpReward": number (20-50), "coinReward": number (10-30), "resourceType": "knowledge"|"gold"|"influence"|"materials", "resourceAmount": number (10-30) }`;

    const user = `Guild: ${context.guildName}, Department: ${context.department}. Generate today's guild adventure relevant to this department's real work.`;

    try {
      return await getAIProvider().completeJSON<GeneratedAdventureContent>(system, user);
    } catch {
      return {
        title: `${context.department} Knowledge Share`,
        description: `Share one best practice from ${context.department} with the rest of the guild.`,
        xpReward: 30,
        coinReward: 20,
        resourceType: "knowledge",
        resourceAmount: 15,
      };
    }
  }

  async generateCompanionDialogue(context: {
    companionName: string;
    species: string;
    employeeName: string;
    guildName?: string;
    guildResourceGap?: string;
    pendingAdventures: number;
    dailyQuizStatus: "not_generated" | "pending" | "completed";
    recentMemory?: string;
  }): Promise<string> {
    const system = `You are ${context.companionName}, a ${context.species} AI companion in Weatherline, a workplace gamification app.
You are warm, encouraging, and a little playful — like a coach and friend. Speak in first person, 1-3 sentences, no markdown.
You know about the employee's guild progress and pending adventures. Reference concrete numbers naturally, the way this example does:
"Good morning! Your guild is only 120 Knowledge away from upgrading the Forge. Completing today's learning adventure will help everyone."
Never claim they completed something they haven't — only say a quiz/adventure is "done" if you are explicitly told it is.
If told their daily skill quiz is still unanswered, you MUST nudge them to go take it — that's the single most important thing to mention.`;

    const quizLine =
      context.dailyQuizStatus === "pending"
        ? "Their daily skill quiz is generated and waiting, not yet answered — encourage them to complete it today."
        : context.dailyQuizStatus === "completed"
          ? "Their daily skill quiz is already done for today — congratulate them, don't ask them to do it again."
          : "Their daily skill quiz hasn't been generated yet — don't mention it either way.";

    const user = `Employee: ${context.employeeName}. Guild: ${context.guildName ?? "no guild yet"}. Resource gap: ${context.guildResourceGap ?? "none"}. Pending adventures: ${context.pendingAdventures}. ${quizLine} Recent memory: ${context.recentMemory ?? "none"}. Generate today's greeting.`;

    try {
      return await getAIProvider().completeText(system, user);
    } catch {
      if (context.dailyQuizStatus === "pending") {
        return `Hey ${context.employeeName}! Your daily skill quiz is ready and waiting — 5 questions, 5 coins each. Let's knock it out!`;
      }
      return `Good morning, ${context.employeeName}! You have ${context.pendingAdventures} adventure(s) waiting. Let's make today count!`;
    }
  }

  async generateWeeklyStory(context: { events: string[] }): Promise<string> {
    const system = `You are the AI Story Engine for Weatherline. Write a short, warm narrative recap (3-5 sentences) of the week's events in the kingdom, in a light fantasy storytelling tone, based ONLY on the real events given. Do not invent events not listed.`;

    const user = `Events this week:\n${context.events.map((e) => `- ${e}`).join("\n")}\n\nWrite the weekly kingdom story.`;

    try {
      return await getAIProvider().completeText(system, user);
    } catch {
      return `This week, the kingdom's guilds pressed forward together. ${context.events.join(" ")}`;
    }
  }
}

export const AIService = new AIServiceImpl();
