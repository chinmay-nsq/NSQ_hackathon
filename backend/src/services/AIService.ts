import { getAIProvider, ChatTurn } from "@/factories/AIProviderFactory";
import { GeneratedAdventureContent } from "@/factories/AdventureFactory";
import { encodeAnswer } from "@/utils/quizCipher";

export interface QuizQuestionContent {
  question: string;
  options: [string, string, string, string];
  string: string;
  number: string;
}

export interface ProfileSuggestion {
  seniority: "JUNIOR" | "MID" | "SENIOR" | "LEAD";
  skills: string[];
}

interface RawQuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

// Used only if the AI call fails/is unavailable — kept technical rather than
// behavioral so a quiz still reads as a "skills" quiz even in the worst case,
// even though it can't be tailored to the employee's actual listed skills.
const FALLBACK_QUIZ_QUESTIONS: RawQuizQuestion[] = [
  {
    question: "In version control, what does a 'merge conflict' mean?",
    options: [
      "Two branches changed the same lines differently and Git can't auto-resolve it",
      "A file was deleted",
      "The repository is out of storage",
      "Two people are online at the same time",
    ],
    correctIndex: 0,
  },
  {
    question: "What is the primary purpose of an index in a database table?",
    options: ["To encrypt the data", "To speed up lookups on that column", "To back up the table", "To enforce column names"],
    correctIndex: 1,
  },
  {
    question: "In a typical request/response API call, what does a 4xx status code indicate?",
    options: ["A server-side error", "A successful request", "A client-side error, like bad input", "The server is redirecting"],
    correctIndex: 2,
  },
  {
    question: "What does 'technical debt' generally refer to?",
    options: [
      "Money owed to a software vendor",
      "The implied cost of extra rework from choosing a quick fix over a better long-term approach",
      "A bug that can never be fixed",
      "The time spent in meetings",
    ],
    correctIndex: 1,
  },
  {
    question: "What's the main benefit of writing automated tests for a piece of logic?",
    options: [
      "They make the code run faster",
      "They catch regressions when the code changes later",
      "They replace the need for documentation",
      "They are required by law",
    ],
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

// Used only if the AI call fails during onboarding — generic enough to not
// be actively wrong for most office/software roles, since the employee can
// still freely edit the suggested chips before confirming.
const FALLBACK_PROFILE_SUGGESTION: ProfileSuggestion = {
  seniority: "MID",
  skills: ["communication", "problem-solving", "time-management"],
};

const FALLBACK_WELCOME_QUEST: GeneratedAdventureContent = {
  title: "Say Hello",
  description: "Introduce yourself to your guild — share your role and one thing you're excited to work on.",
  xpReward: 20,
  coinReward: 15,
  resourceType: "influence",
  resourceAmount: 10,
};

class AIServiceImpl {
  async generateSoloAdventure(context: {
    employeeName: string;
    department: string;
    recentActivity: string;
    jobRole?: string | null;
    seniority?: string | null;
    skills?: string[];
  }): Promise<GeneratedAdventureContent> {
    const system = `You are the AI Dungeon Master for Skibidi-Sprint, a workplace gamification app.
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
    const system = `You are a skills-quiz generator for Skibidi-Sprint, a workplace gamification app.
Generate EXACTLY 5 multiple-choice questions that test HARD, TECHNICAL/DOMAIN knowledge tied directly to the employee's listed skills — each question must be traceable to one specific skill from the list (e.g. a "react" skill gets a question about React hooks/rendering/state, a "postgres" skill gets a question about indexes/transactions/query plans).
Each question must have exactly 4 options, with exactly one correct answer.
Respond ONLY with JSON matching: { "questions": [{ "question": string, "options": [string, string, string, string], "correctIndex": number (0-3) }] }
Vary difficulty by seniority (JUNIOR = fundamentals, LEAD = deep/edge-case knowledge).
Do NOT write generic workplace-behavior, soft-skill, or "best practice" questions (e.g. about communication, feedback, deadlines, documentation habits) — every question must test concrete knowledge of one of the listed skills. If skills are genuinely empty, fall back to practical questions about the employee's job role itself, still never behavioral ones.`;

    const profileLine = context.jobRole
      ? `Role: ${context.jobRole}${context.seniority ? ` (${context.seniority})` : ""}. Skills: ${(context.skills ?? []).join(", ") || "none listed"}. Write one question per skill where possible, cycling through the list if there are fewer than 5 skills.`
      : "No work profile on file yet — write practical technical questions for a generic software/office role, not behavioral ones.";

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
    const system = `You are the AI Dungeon Master for Skibidi-Sprint, a workplace gamification app.
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
    const system = `You are the AI Dungeon Master for Skibidi-Sprint. Generate ONE short guild (team) adventure — a small collaborative task for a whole department team.
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
    const system = `You are ${context.companionName}, a ${context.species} AI companion in Skibidi-Sprint, a workplace gamification app.
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
    const system = `You are the AI Story Engine for Skibidi-Sprint. Write a short, warm narrative recap (3-5 sentences) of the week's events in the kingdom, in a light fantasy storytelling tone, based ONLY on the real events given. Do not invent events not listed.`;

    const user = `Events this week:\n${context.events.map((e) => `- ${e}`).join("\n")}\n\nWrite the weekly kingdom story.`;

    try {
      return await getAIProvider().completeText(system, user);
    } catch {
      return `This week, the kingdom's guilds pressed forward together. ${context.events.join(" ")}`;
    }
  }

  /**
   * Onboarding: given just a free-typed job title, suggests a starting
   * seniority + a handful of relevant skills as editable chips, so a new
   * employee confirms/adjusts instead of typing up to 15 skills from a
   * blank input. Purely a starting point — never blocks submission.
   */
  async suggestProfile(jobRole: string): Promise<ProfileSuggestion> {
    const system = `You infer a starting work profile from a job title for Skibidi-Sprint, a workplace gamification app.
Respond ONLY with JSON matching: { "seniority": "JUNIOR"|"MID"|"SENIOR"|"LEAD", "skills": string[] }
Guess a reasonable default seniority (MID if genuinely ambiguous) and 5-8 concrete, specific skills a person with that job title would plausibly have (tools, technologies, or practical competencies — not vague traits like "hardworking"). Lowercase, short (1-3 words each).`;

    const user = `Job title: "${jobRole}". Suggest their starting profile.`;

    try {
      const result = await getAIProvider().completeJSON<ProfileSuggestion>(system, user);
      const seniority = (["JUNIOR", "MID", "SENIOR", "LEAD"] as const).includes(result.seniority)
        ? result.seniority
        : "MID";
      const skills = Array.isArray(result.skills) ? result.skills.slice(0, 8).filter(Boolean) : [];
      return skills.length > 0 ? { seniority, skills } : FALLBACK_PROFILE_SUGGESTION;
    } catch {
      return FALLBACK_PROFILE_SUGGESTION;
    }
  }

  /**
   * Onboarding: the companion's first message to a brand-new teammate,
   * introducing their guild using real roster/resource data — never
   * invented details. Distinct from generateCompanionDialogue (the
   * recurring dashboard greeting) — this fires exactly once, right after
   * profile completion.
   */
  async generateGuildWelcome(context: {
    companionName: string;
    species: string;
    employeeName: string;
    guildName: string;
    memberHighlight?: string;
    guildResourceGap?: string;
  }): Promise<string> {
    const system = `You are ${context.companionName}, a ${context.species} AI companion in Skibidi-Sprint, a workplace gamification app.
This is the very first thing you ever say to a brand-new teammate who just joined a guild (team). Be warm and welcoming, 2-4 sentences, first person, no markdown.
Introduce their guild using ONLY the real facts given — never invent teammate names, stats, or events not mentioned.`;

    const user = `New teammate: ${context.employeeName}. Guild: ${context.guildName}. ${context.memberHighlight ?? "No specific teammate activity to mention."} ${context.guildResourceGap ?? ""} Write their welcome message.`;

    try {
      return await getAIProvider().completeText(system, user);
    } catch {
      return `Welcome to ${context.guildName}, ${context.employeeName}! I'm ${context.companionName} — I'll help you track quests, level up, and see how the guild's doing. Glad you're here.`;
    }
  }

  /**
   * Onboarding: a one-time "welcome quest" generated alongside (not instead
   * of) a brand-new employee's first daily quiz — a small, low-stakes first
   * task that makes them visible to their new team, rather than the same
   * generic skill quiz everyone gets every day.
   */
  async generateWelcomeQuest(context: {
    employeeName: string;
    guildName?: string;
    jobRole?: string | null;
  }): Promise<GeneratedAdventureContent> {
    const system = `You are the AI Dungeon Master for Skibidi-Sprint, a workplace gamification app.
Generate ONE short "welcome quest" — a brand-new employee's very first task, on their first day. It should help them make a small, visible first contribution to their new team (e.g. introducing themselves, sharing something about their background, asking a question in a team channel) — NOT a generic skill quiz or solo learning task.
Respond ONLY with JSON matching: { "title": string, "description": string, "xpReward": number (15-30), "coinReward": number (10-20), "resourceType": "knowledge"|"gold"|"influence"|"materials", "resourceAmount": number (5-15) }`;

    const user = `New employee: ${context.employeeName}. Guild: ${context.guildName ?? "no guild yet"}. Role: ${context.jobRole ?? "unspecified"}. Generate their day-one welcome quest.`;

    try {
      return await getAIProvider().completeJSON<GeneratedAdventureContent>(system, user);
    } catch {
      return FALLBACK_WELCOME_QUEST;
    }
  }

  /**
   * The real, multi-turn companion chat — distinct from
   * generateCompanionDialogue (one-shot dashboard greeting, no memory of
   * being replied to). Grounded in the employee's actual current state so
   * it can answer real questions ("how many coins do I have", "what's
   * pending") instead of only ever narrating at them. Never invents
   * numbers not given in context.
   */
  async chat(
    context: {
      companionName: string;
      species: string;
      employeeName: string;
      level: number;
      xp: number;
      coins: number;
      guildName?: string;
      pendingAdventureTitles: string[];
      dailyQuizStatus: "not_generated" | "pending" | "completed";
    },
    history: ChatTurn[]
  ): Promise<string> {
    const system = `You are ${context.companionName}, a ${context.species} AI companion in Skibidi-Sprint, a workplace gamification app. You live in a chat panel and are having a real back-and-forth conversation with ${context.employeeName}, not delivering a one-off greeting.
Be warm, encouraging, a little playful — like a coach and friend. Speak in first person, keep replies conversational and SHORT (1-4 sentences unless genuinely asked for more detail), no markdown.
Here is ${context.employeeName}'s real current state — use it to answer questions accurately, and NEVER invent numbers or facts not given here:
- Level ${context.level}, ${context.xp} total XP, ${context.coins} coins.
- Guild: ${context.guildName ?? "not in a guild yet"}.
- Pending adventures: ${context.pendingAdventureTitles.length > 0 ? context.pendingAdventureTitles.join(", ") : "none"}.
- Daily skill quiz: ${context.dailyQuizStatus === "pending" ? "generated, not yet answered" : context.dailyQuizStatus === "completed" ? "already completed today" : "not generated yet today"}.
If asked about anything outside this app (unrelated general knowledge, code help, etc.), gently redirect back to being their companion — you're not a general assistant.`;

    try {
      return await getAIProvider().completeChat(system, history);
    } catch {
      return `Hmm, I'm having trouble thinking clearly right now — mind trying that again in a moment, ${context.employeeName}?`;
    }
  }
}

export const AIService = new AIServiceImpl();
