/**
 * How a task movement reads in the standup room.
 *
 * These lines are written in the first person, addressed to the team,
 * because the room renders every message — typed or automatic — as the same
 * chat bubble. A card moving to review should sound like the person saying
 * "this is ready", not like an audit log entry sitting under the
 * conversation.
 *
 * Keyed by the column the card landed in: where it went is what the team
 * needs to hear. `**bold**` around the title is rendered by the client's
 * mini-markdown, same as companion chat.
 */
type MoveColumn = "todo" | "in_review" | "needs_rework" | "done";

const MOVE_LINE: Record<MoveColumn, (title: string) => string> = {
  todo: (t) => `Hey team, I've put **${t}** back on the To Do pile — picking it up shortly.`,
  in_review: (t) => `Hi team, **${t}** is up for review — grab it whenever you have a minute.`,
  needs_rework: (t) => `Heads up team, **${t}** needs another pass, so I've moved it to Needs Rework.`,
  done: (t) => `Hey team, **${t}** is done and off the board.`,
};

/** The line posted when someone drags a card into a new column. */
export function taskMovedLine(to: MoveColumn, title: string): string {
  return MOVE_LINE[to](title);
}

/** Someone sent their own work off for a manager to look at. */
export function taskSubmittedLine(title: string): string {
  return `Hi team, I've just submitted **${title}** for review.`;
}

/** Someone finished a task outright — no approval step in the way. */
export function taskCompletedLine(title: string): string {
  return `Hey team, **${title}** is finished — that one's done.`;
}

/** A reviewer accepted someone's submission. */
export function taskApprovedLine(title: string): string {
  return `Hi team, I've reviewed **${title}** and it looks good — approved.`;
}

/** A reviewer sent a submission back instead of accepting it. */
export function taskReworkLine(title: string): string {
  return `Hey team, I've sent **${title}** back for another pass — notes are on the card.`;
}
