import { getAIProvider } from "@/factories/AIProviderFactory";
import { GeneratedAdventureContent } from "@/factories/AdventureFactory";

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
  }): Promise<GeneratedAdventureContent> {
    const system = `You are the AI Dungeon Master for KingdomOS, a workplace gamification app.
Generate ONE short solo adventure (a small daily task) for an employee.
Respond ONLY with JSON matching: { "title": string, "description": string, "xpReward": number (10-40), "coinReward": number (5-25), "resourceType": "knowledge"|"gold"|"influence"|"materials", "resourceAmount": number (3-15) }
Keep it realistic for a workplace: learning, reflection, wellness, or peer appreciation. No fantasy jargon in the description itself, just the framing.`;

    const user = `Employee: ${context.employeeName}, Department: ${context.department}. Recent activity: ${context.recentActivity || "none yet"}. Generate today's solo adventure.`;

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
    const system = `You are the AI Dungeon Master for KingdomOS. Generate ONE short guild (team) adventure — a small collaborative task for a whole department team.
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
    recentMemory?: string;
  }): Promise<string> {
    const system = `You are ${context.companionName}, a ${context.species} AI companion in KingdomOS, a workplace gamification app.
You are warm, encouraging, and a little playful — like a coach and friend. Speak in first person, 1-3 sentences, no markdown.
You know about the employee's guild progress and pending adventures. Reference concrete numbers naturally, the way this example does:
"Good morning! Your guild is only 120 Knowledge away from upgrading the Forge. Completing today's learning adventure will help everyone."`;

    const user = `Employee: ${context.employeeName}. Guild: ${context.guildName ?? "no guild yet"}. Resource gap: ${context.guildResourceGap ?? "none"}. Pending adventures: ${context.pendingAdventures}. Recent memory: ${context.recentMemory ?? "none"}. Generate today's greeting.`;

    try {
      return await getAIProvider().completeText(system, user);
    } catch {
      return `Good morning, ${context.employeeName}! You have ${context.pendingAdventures} adventure(s) waiting. Let's make today count!`;
    }
  }

  async generateWeeklyStory(context: { events: string[] }): Promise<string> {
    const system = `You are the AI Story Engine for KingdomOS. Write a short, warm narrative recap (3-5 sentences) of the week's events in the kingdom, in a light fantasy storytelling tone, based ONLY on the real events given. Do not invent events not listed.`;

    const user = `Events this week:\n${context.events.map((e) => `- ${e}`).join("\n")}\n\nWrite the weekly kingdom story.`;

    try {
      return await getAIProvider().completeText(system, user);
    } catch {
      return `This week, the kingdom's guilds pressed forward together. ${context.events.join(" ")}`;
    }
  }
}

export const AIService = new AIServiceImpl();
