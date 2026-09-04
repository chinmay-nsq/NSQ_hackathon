import { StandupMessageKind } from "@prisma/client";
import { prisma } from "@/config/db";

/** Newest-first page size when opening a room; the client reverses for display. */
const PAGE_SIZE = 100;

const MESSAGE_SHAPE = {
  id: true,
  teamId: true,
  kind: true,
  body: true,
  assignmentId: true,
  createdAt: true,
  author: { select: { id: true, name: true, title: true, avatarSeed: true } },
} as const;

export const StandupRepository = {
  create(
    teamId: string,
    authorId: string,
    kind: StandupMessageKind,
    body: string,
    assignmentId?: string
  ) {
    return prisma.standupMessage.create({
      data: { teamId, authorId, kind, body, assignmentId },
      select: MESSAGE_SHAPE,
    });
  },

  /**
   * The most recent slice of a room, oldest-first for rendering. Taking the
   * newest PAGE_SIZE and reversing (rather than the oldest) keeps an
   * established room opening on the live end of the conversation.
   */
  async findRecent(teamId: string) {
    const rows = await prisma.standupMessage.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: MESSAGE_SHAPE,
    });
    return rows.reverse();
  },

  /**
   * Everything posted after a known message — the polling path. Anchored on
   * that message's createdAt rather than on "now minus interval", so a
   * message landing between two polls can never be skipped.
   */
  async findAfter(teamId: string, afterId: string) {
    const anchor = await prisma.standupMessage.findUnique({
      where: { id: afterId },
      select: { createdAt: true },
    });
    if (!anchor) return this.findRecent(teamId);

    return prisma.standupMessage.findMany({
      // Ties on createdAt are broken by id so a message posted in the same
      // millisecond as the anchor is not returned forever, nor lost.
      where: {
        teamId,
        OR: [{ createdAt: { gt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { gt: afterId } }],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: PAGE_SIZE,
      select: MESSAGE_SHAPE,
    });
  },
};
