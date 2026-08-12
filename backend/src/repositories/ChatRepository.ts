import { prisma } from "@/config/db";
import { ChatRole } from "@prisma/client";

// Cap on how many prior turns are sent to the AI as conversation history —
// keeps prompt size (and cost) bounded on a long-running chat, at the cost
// of the companion "forgetting" further back than this within one session.
const HISTORY_TURN_LIMIT = 20;

export const ChatRepository = {
  findRecentForCompanion(companionId: string, take = HISTORY_TURN_LIMIT) {
    return prisma.chatMessage.findMany({
      where: { companionId },
      orderBy: { createdAt: "desc" },
      take,
    });
  },

  create(companionId: string, role: ChatRole, content: string) {
    return prisma.chatMessage.create({ data: { companionId, role, content } });
  },
};
