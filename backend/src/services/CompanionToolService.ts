import { ToolDefinition } from "@/factories/AIProviderFactory";
import { AdventureService } from "./AdventureService";
import { GuildRepository } from "@/repositories/GuildRepository";
import { MANUAL_ADVENTURE_XP, MANUAL_ADVENTURE_COINS } from "@/factories/AdventureFactory";
import { Role } from "@prisma/client";

/**
 * Every route the companion is allowed to send someone to — a closed list,
 * never invented by the model. Kept in sync by hand with AppSidebar.tsx's
 * NAV_ITEMS; there's no single shared source of truth to import from since
 * the sidebar list mixes in role-gating logic this doesn't need.
 */
const NAVIGABLE_ROUTES: Record<string, string> = {
  dashboard: "/app",
  adventures: "/adventures",
  teams: "/teams",
  rewards: "/rewards",
  trading: "/trading",
  "weekly recap": "/recap",
  approvals: "/approvals",
  admin: "/admin",
  profile: "/profile",
};

export const CHAT_TOOLS: ToolDefinition[] = [
  {
    name: "create_task",
    description:
      "Creates a small solo task for the current employee themself, based on what they described. Use this when they ask you to create/add/make a task, todo, or reminder for themselves.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short task title, under 15 words." },
        description: { type: "string", description: "One or two sentences describing what to do." },
      },
      required: ["title", "description"],
    },
  },
  {
    name: "assign_task",
    description:
      "Manager/admin only: assigns a small task to a named teammate on the manager's own team. Use this when a manager asks you to assign/give a task to someone by name. If you don't know who's on their team, call list_team_members first.",
    parameters: {
      type: "object",
      properties: {
        assigneeName: { type: "string", description: "The teammate's name, as close as possible to how the manager said it." },
        title: { type: "string", description: "Short task title, under 15 words." },
        description: { type: "string", description: "One or two sentences describing what to do." },
      },
      required: ["assigneeName", "title", "description"],
    },
  },
  {
    name: "list_team_members",
    description: "Manager/admin only: lists the real names of everyone on the manager's own team(s). Use this before assign_task if you're not sure of someone's exact name.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "navigate",
    description: `Sends the employee to a specific page in the app when they ask where something is or ask to be taken/shown there. Valid destinations: ${Object.keys(NAVIGABLE_ROUTES).join(", ")}. Never invent a destination outside this list.`,
    parameters: {
      type: "object",
      properties: {
        destination: { type: "string", enum: Object.keys(NAVIGABLE_ROUTES) },
      },
      required: ["destination"],
    },
  },
];

interface ToolContext {
  employeeId: string;
  employeeRole: Role;
}

/** Executes one tool call and returns a short, model-readable result string. Never throws — failures become a result the model can explain to the user. */
export async function executeCompanionTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ content: string; navigateTo?: string }> {
  try {
    switch (toolName) {
      case "create_task": {
        const title = String(args.title ?? "").trim();
        const description = String(args.description ?? "").trim();
        if (!title || !description) return { content: "Missing a title or description — ask the employee for more detail." };
        const adventure = await AdventureService.createManualSolo(ctx.employeeId, title, description);
        return { content: `Created task "${adventure.title}" (id ${adventure.id}). It needs manager approval once completed, same as any manually-created task.` };
      }

      case "list_team_members": {
        if (ctx.employeeRole === "EMPLOYEE") {
          return { content: "This employee isn't a manager — they have no team to list." };
        }
        const guilds = await GuildRepository.findManagedByWithMembers(ctx.employeeId);
        const names = guilds.flatMap((g) => g.members.map((m) => m.name));
        if (names.length === 0) return { content: "They don't manage any guild with members yet." };
        return { content: `Team members: ${names.join(", ")}.` };
      }

      case "assign_task": {
        if (ctx.employeeRole === "EMPLOYEE") {
          return { content: "This employee isn't a manager — they can't assign tasks to others." };
        }
        const assigneeName = String(args.assigneeName ?? "").trim();
        const title = String(args.title ?? "").trim();
        const description = String(args.description ?? "").trim();
        if (!assigneeName || !title || !description) {
          return { content: "Missing the teammate's name, a title, or a description — ask for what's missing." };
        }

        const guilds = await GuildRepository.findManagedByWithMembers(ctx.employeeId);
        const allMembers = guilds.flatMap((g) => g.members);
        const match = allMembers.find((m) => m.name.toLowerCase() === assigneeName.toLowerCase());
        if (!match) {
          const names = allMembers.map((m) => m.name).join(", ") || "nobody yet";
          return { content: `No exact match for "${assigneeName}" on their team. Team members are: ${names}. Ask them to confirm the name.` };
        }

        await AdventureService.assignSolo(
          ctx.employeeId,
          [match.id],
          title,
          description,
          MANUAL_ADVENTURE_XP,
          MANUAL_ADVENTURE_COINS
        );
        return { content: `Assigned "${title}" to ${match.name}.` };
      }

      case "navigate": {
        const destination = String(args.destination ?? "").trim();
        const path = NAVIGABLE_ROUTES[destination];
        if (!path) return { content: `"${destination}" isn't a real page — don't navigate, just explain.` };
        return { content: `Navigating to ${destination}.`, navigateTo: path };
      }

      default:
        return { content: `Unknown tool "${toolName}".` };
    }
  } catch (err) {
    return { content: err instanceof Error ? `That didn't work: ${err.message}` : "That didn't work." };
  }
}

export type { ToolContext };
