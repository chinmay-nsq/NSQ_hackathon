import { getAIProvider, ChatTurn, ToolDefinition, ToolCallRequest, ToolCallResult } from "@/factories/AIProviderFactory";
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

/** A closed set of destinations an observation can point at — chosen BY the AI from this fixed enum (never a free-text URL), the same discipline as the companion chat's navigate tool. */
export type GrowthObservationTopic = "adventures" | "teams" | "approvals" | "growth";

export interface GrowthObservation {
  text: string;
  /** Omitted when the observation isn't actionable (e.g. "not enough data yet"). */
  topic?: GrowthObservationTopic;
}

export interface GrowthInsight {
  headline: string;
  observations: GrowthObservation[];
}

/**
 * A closed set of destinations the dashboard companion greeting can point
 * at — decided entirely by CompanionService from real conditions (quiz
 * pending, an assigned task waiting, a manager's team lagging), NEVER by
 * asking the AI to pick one. The AI only ever sees the resulting text; it
 * never chooses or produces a route itself.
 */
export type DialogueActionTopic = "adventures" | "approvals" | "teams";

export interface DialogueAction {
  topic: DialogueActionTopic;
  label: string;
}

export interface ChatContext {
  companionName: string;
  species: string;
  employeeName: string;
  employeeRole: string;
  level: number;
  xp: number;
  coins: number;
  /** The guild this employee is a MEMBER of — separate from managedGuildNames below, since a manager can lead a guild without also being a member of it. */
  guildName?: string;
  /** Manager/admin only: guild(s) this employee LEADS. A manager who created a guild is its leader via this, not necessarily a member of it. */
  managedGuildNames: string[];
  pendingAdventureTitles: string[];
  dailyQuizStatus: "not_generated" | "pending" | "completed";
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

// Used only if the AI call fails — deliberately generic since it has no real
// numbers to fall back on; the frontend still shows the real computed stats
// regardless, this only covers the AI-phrased headline/observations.
const FALLBACK_GROWTH_INSIGHT: GrowthInsight = {
  headline: "Keep going — your trend is still building.",
  observations: [{ text: "Complete a few more quests this week to unlock a clearer trend.", topic: "adventures" }],
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

  /**
   * Employee's own growth insight — given ALREADY-COMPUTED real trend
   * numbers (never raw rows), phrases 2-3 short grounded observations. The
   * AI is never asked to compute or invent a number, only to describe ones
   * it's handed — the source of truth for every figure is GrowthService.
   */
  async generateEmployeeGrowthInsight(context: {
    employeeName: string;
    skillCurrentPct: number | null;
    skillDeltaPct: number | null;
    currentStreakDays: number;
    longestGapDays: number | null;
    thisWeekXp: number;
    rollingAvgXp: number;
    outputDeltaPct: number | null;
  }): Promise<GrowthInsight> {
    const system = `You are a growth-insight writer for Skibidi-Sprint, a workplace gamification app.
You are given ALREADY-COMPUTED real numbers about one employee's own trend over recent weeks. Do not invent, estimate, or recompute any numbers — only reference the numbers given.
Respond ONLY with JSON matching: { "headline": string (max 90 chars, one punchy factual sentence), "observations": [{ "text": string (max 140 chars, grounded in a specific number from the input), "topic": "adventures" | "growth" | omit }] (2-3 items) }
"topic" tags what the observation is ABOUT so the UI can offer a "go there" button — use "adventures" for anything about quiz accuracy, streaks, or XP/quest output (since that's where quests and the daily quiz live), "growth" for a meta-observation about the trend itself with no single obvious destination, or omit "topic" entirely if the observation isn't actionable (e.g. "not enough data yet"). Never invent a topic outside this list.
Tone: encouraging but concrete and specific — never generic praise ("great job!") without a number attached. Never mention "kingdom", fantasy framing, or invented narrative — this is a real stats summary, not a story.
If a number is null (not enough data yet), do not fabricate a value for it — write around it or omit that dimension from the observations.`;

    const user = `Employee: ${context.employeeName}.
Quiz accuracy this week: ${context.skillCurrentPct ?? "not enough data"}%. Change vs earlier in the window: ${context.skillDeltaPct ?? "not enough data"} percentage points.
Current activity streak: ${context.currentStreakDays} consecutive day(s). Longest gap between active days in this window: ${context.longestGapDays ?? "not enough data"} day(s).
This week's XP: ${context.thisWeekXp}. Their own recent rolling average XP/week: ${context.rollingAvgXp}. Change vs their own average: ${context.outputDeltaPct ?? "not enough data"}%.
Write their growth insight.`;

    try {
      const result = await getAIProvider().completeJSON<GrowthInsight>(system, user);
      return isValidGrowthInsight(result) ? clampGrowthInsight(result) : FALLBACK_GROWTH_INSIGHT;
    } catch {
      return FALLBACK_GROWTH_INSIGHT;
    }
  }

  /** Manager's team growth insight — aggregate-only, never names or implies a specific member. */
  async generateTeamGrowthInsight(context: {
    memberCount: number;
    skillCurrentPct: number | null;
    skillDeltaPct: number | null;
    avgActiveDaysThisWeek: number | null;
  }): Promise<GrowthInsight> {
    const system = `You are a growth-insight writer for Skibidi-Sprint, a workplace gamification app.
You are given ALREADY-COMPUTED real numbers about a manager's TEAM'S collective trend (not any one individual). Do not invent, estimate, or recompute any numbers, and never name or imply a specific team member — this is aggregate-only, anonymized by design.
Respond ONLY with JSON matching: { "headline": string (max 90 chars), "observations": [{ "text": string (max 140 chars, grounded in a specific number from the input), "topic": "teams" | "growth" | omit }] (2-3 items) }
"topic" tags what the observation is ABOUT so the UI can offer a "go there" button — use "teams" for anything about the team/guild, "growth" for a meta-observation with no single obvious destination, or omit "topic" if the observation isn't actionable. Never invent a topic outside this list.
Tone: factual and useful to a manager deciding where to focus — never generic. Never mention "kingdom", "guild" narrative, or fantasy framing.`;

    const user = `Team size: ${context.memberCount} member(s).
Team's average quiz accuracy this week: ${context.skillCurrentPct ?? "not enough data"}%. Change vs earlier in the window: ${context.skillDeltaPct ?? "not enough data"} percentage points.
Average active days per member this week: ${context.avgActiveDaysThisWeek ?? "not enough data"}.
Write the team's growth insight.`;

    try {
      const result = await getAIProvider().completeJSON<GrowthInsight>(system, user);
      return isValidGrowthInsight(result) ? clampGrowthInsight(result) : FALLBACK_GROWTH_INSIGHT;
    } catch {
      return FALLBACK_GROWTH_INSIGHT;
    }
  }

  /** Manager's own leadership-effectiveness insight — review turnaround speed + assignment volume, NOT their personal XP. */
  async generateManagerSelfGrowthInsight(context: {
    currentAvgTurnaroundHours: number | null;
    turnaroundDeltaPct: number | null;
    turnaroundSampleSize: number;
    assignedThisWeek: number;
    approvedThisWeek: number;
  }): Promise<GrowthInsight> {
    const system = `You are a growth-insight writer for Skibidi-Sprint, a workplace gamification app.
You are given ALREADY-COMPUTED real numbers about a manager's OWN effectiveness as a reviewer/lead — review turnaround speed and assignment/approval volume. This is NOT about their personal XP or quests completed as an individual contributor. Do not invent, estimate, or recompute any numbers.
Respond ONLY with JSON matching: { "headline": string (max 90 chars), "observations": [{ "text": string (max 140 chars, grounded in a specific number from the input), "topic": "approvals" | "growth" | omit }] (2-3 items) }
"topic" tags what the observation is ABOUT so the UI can offer a "go there" button — use "approvals" for anything about turnaround speed, assigning, or approving work, "growth" for a meta-observation with no single obvious destination, or omit "topic" if the observation isn't actionable. Never invent a topic outside this list.
IMPORTANT on direction: a LOWER turnaround-hours number, or a NEGATIVE turnaroundDeltaPct, means they are reviewing FASTER (an improvement) — do not describe a negative delta as "declining" or "slower".
If turnaroundSampleSize is very small (fewer than 3), explicitly caveat that the trend is based on limited data rather than stating it with confidence.
Tone: factual, useful for self-reflection on leadership effectiveness. Never mention "kingdom" or fantasy framing.`;

    const user = `Average review turnaround time this week: ${context.currentAvgTurnaroundHours ?? "not enough data"} hours, based on ${context.turnaroundSampleSize} reviewed submission(s) in the window.
Change vs earlier in the window: ${context.turnaroundDeltaPct ?? "not enough data"}% (negative = faster).
Tasks assigned this week: ${context.assignedThisWeek}. Tasks approved this week: ${context.approvedThisWeek}.
Write their leadership growth insight.`;

    try {
      const result = await getAIProvider().completeJSON<GrowthInsight>(system, user);
      return isValidGrowthInsight(result) ? clampGrowthInsight(result) : FALLBACK_GROWTH_INSIGHT;
    } catch {
      return FALLBACK_GROWTH_INSIGHT;
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
    /** From GrowthService — real trend signal so a returning user's greeting can reference something specific, not just generic praise. Omitted (not null) when there's not enough history yet. */
    currentStreakDays?: number;
    outputDeltaPct?: number | null;
  }): Promise<string> {
    const system = `You are ${context.companionName}, a ${context.species} AI companion in Skibidi-Sprint, a workplace gamification app.
You are warm, encouraging, and a little playful — like a coach and friend. Speak in first person, 1-3 sentences, no markdown.
You know about the employee's guild progress, pending adventures, and (when given) their real activity streak and week-over-week XP trend. Reference concrete numbers naturally, the way these examples do:
"Good morning! Your guild is only 120 Knowledge away from upgrading the Forge. Completing today's learning adventure will help everyone."
"You're on a 4-day streak — keep it going! Your XP is up 30% from your usual week too."
Never claim they completed something they haven't — only say a quiz/adventure is "done" if you are explicitly told it is. Never invent a streak or XP trend number not given to you.
If told their daily skill quiz is still unanswered, you MUST nudge them to go take it — that's the single most important thing to mention.`;

    const quizLine =
      context.dailyQuizStatus === "pending"
        ? "Their daily skill quiz is generated and waiting, not yet answered — encourage them to complete it today."
        : context.dailyQuizStatus === "completed"
          ? "Their daily skill quiz is already done for today — congratulate them, don't ask them to do it again."
          : "Their daily skill quiz hasn't been generated yet — don't mention it either way.";

    const streakLine =
      context.currentStreakDays !== undefined && context.currentStreakDays > 1
        ? ` They're on a ${context.currentStreakDays}-day activity streak.`
        : "";
    const trendLine =
      context.outputDeltaPct !== undefined && context.outputDeltaPct !== null
        ? ` Their XP this week is ${context.outputDeltaPct >= 0 ? "up" : "down"} ${Math.abs(context.outputDeltaPct)}% vs their recent average.`
        : "";

    const user = `Employee: ${context.employeeName}. Guild: ${context.guildName ?? "no guild yet"}. Resource gap: ${context.guildResourceGap ?? "none"}. Pending adventures: ${context.pendingAdventures}. ${quizLine}${streakLine}${trendLine} Recent memory: ${context.recentMemory ?? "none"}. Generate today's greeting.`;

    try {
      return await getAIProvider().completeText(system, user);
    } catch {
      if (context.dailyQuizStatus === "pending") {
        return `Hey ${context.employeeName}! Your daily skill quiz is ready and waiting — 5 questions, 5 coins each. Let's knock it out!`;
      }
      return `Good morning, ${context.employeeName}! You have ${context.pendingAdventures} adventure(s) waiting. Let's make today count!`;
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
Generate ONE short "welcome quest" — a brand-new employee's very first task, on their first day. It should help them make a small, visible first contribution to their new team (e.g. introducing themselves to the team, sharing something about their background, asking their manager or teammates a question) — NOT a generic skill quiz or solo learning task.
This app has no chat/channel feature — NEVER invent or name a specific channel (e.g. "#some-channel"), Slack, Teams, or any other messaging tool. Phrase the task generically instead, like "introduce yourself to your team" or "share this with your manager" — leave HOW/WHERE up to the employee's own workplace.
Respond ONLY with JSON matching: { "title": string, "description": string, "xpReward": number (15-30), "coinReward": number (10-20), "resourceType": "knowledge"|"gold"|"influence"|"materials", "resourceAmount": number (5-15) }`;

    const user = `New employee: ${context.employeeName}. Guild: ${context.guildName ?? "no guild yet"}. Role: ${context.jobRole ?? "unspecified"}. Generate their day-one welcome quest.`;

    try {
      return await getAIProvider().completeJSON<GeneratedAdventureContent>(system, user);
    } catch {
      return FALLBACK_WELCOME_QUEST;
    }
  }

  /** Shared system prompt builder for both the plain and tool-enabled chat paths — kept identical so behavior doesn't drift between them. */
  buildChatSystemPrompt(context: ChatContext): string {
    return `You are ${context.companionName}, a ${context.species} AI companion in Skibidi-Sprint, a workplace gamification app. You live in a chat panel and are having a real back-and-forth conversation with ${context.employeeName}, not delivering a one-off greeting.
Be warm, encouraging, a little playful — like a coach and friend. Speak in first person, keep replies conversational and SHORT (1-4 sentences) UNLESS the situation calls for structure.

FORMATTING — this is rendered by a strict markdown parser, follow it exactly or it will show up broken:
- Bold: **like this**. Inline code: \`like this\`.
- MANDATORY: whenever your answer names 3 or more distinct things — features, capabilities, steps, options — you MUST format them as a real markdown list, one item per line, each line starting with "- " (bullets) or "1. " (numbered). This applies EVEN IF you're also writing a sentence of lead-in text before the list.
- NEVER enumerate 3+ items inside a single run-on sentence, whether separated by commas, "and", or asterisks (e.g. "I can help with X, Y, and Z" naming 3+ things, or "I can: * do X * do Y", are BOTH WRONG — both must become a real line-broken list instead).
- Only use a single asterisk (*) for bullets when it starts its own line; never use a lone "*" as punctuation or a separator elsewhere.
- Outside of 3+-item enumerations, default to short plain sentences — don't force a list where one isn't needed.

Here is ${context.employeeName}'s real current state — use it to answer questions accurately, and NEVER invent numbers or facts not given here:
- Role: ${context.employeeRole}.
- Level ${context.level}, ${context.xp} total XP, ${context.coins} coins.
- Guild membership: ${context.guildName ?? "not a member of any guild"}.
- Guild(s) they LEAD as manager: ${context.managedGuildNames.length > 0 ? context.managedGuildNames.join(", ") : "none"}. IMPORTANT: a manager can lead a guild without being a member of it — "not a member of any guild" does NOT mean they have no team. If they lead a guild, they DO have teammates (see the list_team_members tool) — never tell them otherwise.
- Pending adventures: ${context.pendingAdventureTitles.length > 0 ? context.pendingAdventureTitles.join(", ") : "none"}.
- Daily skill quiz: ${context.dailyQuizStatus === "pending" ? "generated, not yet answered" : context.dailyQuizStatus === "completed" ? "already completed today" : "not generated yet today"}.

If asked what Skibidi-Sprint is, what you (the companion) can help with, or anything enumerating features/capabilities, answer using ONLY real features, formatted as a real markdown list per the FORMATTING rule above — for example:
"Here's what I can help with:
- **Adventures** — your daily AI skill quiz plus solo/team tasks that earn XP and coins
- **Rewards** — spend coins on real perks
- **Trading Post** — resell redeemed rewards to teammates
- **Teams** — your guild's shared progress and resources
I can also create tasks or jump you to any page, right from this chat."
(Managers/admins also get Approvals — reviewing submitted tasks — and assigning tasks to teammates, as additional list items.) Never write this kind of answer as a single paragraph.

TOOLS — you have create_task, navigate, and (managers/admins only) list_team_members and assign_task.
Only call a tool when the employee is CLEARLY asking you to DO something right now, not when they're asking a question about what you can do or how something works.
- "What tasks can you create?" / "What can you do?" / "How does X work?" → these are QUESTIONS. Answer them in words. Do NOT call any tool.
- "Create a task to review the API docs" / "Add a task for X" → this is a REQUEST. Call create_task.
- If the employee's task request is vague (e.g. just "create a task for me" with no detail), ASK what the task should be before calling create_task — never invent an arbitrary task on their behalf.
- If a manager-only tool is requested by a plain employee, explain you can't do that for them — don't call the tool.
When genuinely unsure whether something is a question or a request, treat it as a question and answer in words.

If asked about anything outside this app (unrelated general knowledge, code help, etc.), gently redirect back to being their companion — you're not a general assistant.`;
  }

  /**
   * The real, multi-turn companion chat — distinct from
   * generateCompanionDialogue (one-shot dashboard greeting, no memory of
   * being replied to). Grounded in the employee's actual current state so
   * it can answer real questions ("how many coins do I have", "what's
   * pending") instead of only ever narrating at them. Never invents
   * numbers not given in context. No tools — used only as the error-path
   * fallback when the tool-enabled path can't be used.
   */
  async chat(context: ChatContext, history: ChatTurn[]): Promise<string> {
    const system = this.buildChatSystemPrompt(context);
    try {
      return await getAIProvider().completeChat(system, history);
    } catch {
      return `Hmm, I'm having trouble thinking clearly right now — mind trying that again in a moment, ${context.employeeName}?`;
    }
  }

  /** Same as chat(), but lets the model request tools (create/assign a task, navigate) instead of just replying. */
  chatWithTools(context: ChatContext, history: ChatTurn[], tools: ToolDefinition[]) {
    const system = this.buildChatSystemPrompt(context);
    return getAIProvider().completeChatWithTools(system, history, tools);
  }

  /** Continues a tool-calling turn after the tool(s) have actually run — returns the model's final natural-language reply. */
  chatToolReply(
    context: ChatContext,
    history: ChatTurn[],
    calls: ToolCallRequest[],
    results: ToolCallResult[]
  ) {
    const system = this.buildChatSystemPrompt(context);
    return getAIProvider().completeChatToolReply(system, history, calls, results);
  }
}

const GROWTH_OBSERVATION_TOPICS: GrowthObservationTopic[] = ["adventures", "teams", "approvals", "growth"];

function isValidGrowthInsight(v: unknown): v is GrowthInsight {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as GrowthInsight).headline === "string" &&
    Array.isArray((v as GrowthInsight).observations)
  );
}

/** Coerces one raw observation entry to a safe shape — accepts either the new { text, topic? } object or a bare string (in case the model reverts to the old shape), always producing a valid GrowthObservation or null if it's unusable. */
function coerceObservation(raw: unknown): GrowthObservation | null {
  if (typeof raw === "string") {
    const text = raw.trim();
    return text.length > 0 ? { text: text.slice(0, 160) } : null;
  }
  if (typeof raw !== "object" || raw === null) return null;

  const obj = raw as { text?: unknown; topic?: unknown };
  if (typeof obj.text !== "string" || obj.text.trim().length === 0) return null;

  const topic =
    typeof obj.topic === "string" && GROWTH_OBSERVATION_TOPICS.includes(obj.topic as GrowthObservationTopic)
      ? (obj.topic as GrowthObservationTopic)
      : undefined;

  return { text: obj.text.trim().slice(0, 160), topic };
}

function clampGrowthInsight(v: GrowthInsight): GrowthInsight {
  const headline = v.headline.slice(0, 120).trim();
  const observations = v.observations
    .map(coerceObservation)
    .filter((o): o is GrowthObservation => o !== null)
    .slice(0, 3);
  return observations.length > 0
    ? { headline: headline || FALLBACK_GROWTH_INSIGHT.headline, observations }
    : FALLBACK_GROWTH_INSIGHT;
}

export const AIService = new AIServiceImpl();
