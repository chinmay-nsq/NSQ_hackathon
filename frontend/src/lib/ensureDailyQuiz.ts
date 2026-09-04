import { api } from "@/lib/api";
import { Assignment } from "@/lib/types";

/**
 * If the employee doesn't have today's AI-generated solo quiz yet, silently
 * generates it and returns the assignments list with it included — so the
 * daily quiz is just waiting whenever a user lands on the dashboard or
 * Assignments page, no manual "New Solo Assignment" click required.
 * `generateSolo` is idempotent (returns the existing one if already
 * generated today), so calling this on every page load is safe.
 */
export async function ensureDailyQuiz(assignments: Assignment[]): Promise<Assignment[]> {
  const hasSoloToday = assignments.some((a) => a.type === "SOLO" && a.aiGenerated);
  if (hasSoloToday) return assignments;

  try {
    const generated = await api.post<{ assignment: Assignment }>("/assignments/solo/generate");
    return [generated.assignment, ...assignments];
  } catch {
    // Silent — the page just won't show a daily quiz yet; the Assignments
    // page's manual "New Solo Assignment" button still works as a fallback.
    return assignments;
  }
}
