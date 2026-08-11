import { api } from "@/lib/api";
import { Adventure } from "@/lib/types";

/**
 * If the employee doesn't have today's AI-generated solo quiz yet, silently
 * generates it and returns the adventures list with it included — so the
 * daily quiz is just waiting whenever a user lands on the dashboard or
 * Adventures page, no manual "New Solo Adventure" click required.
 * `generateSolo` is idempotent (returns the existing one if already
 * generated today), so calling this on every page load is safe.
 */
export async function ensureDailyQuiz(adventures: Adventure[]): Promise<Adventure[]> {
  const hasSoloToday = adventures.some((a) => a.type === "SOLO" && a.aiGenerated);
  if (hasSoloToday) return adventures;

  try {
    const generated = await api.post<{ adventure: Adventure }>("/adventures/solo/generate");
    return [generated.adventure, ...adventures];
  } catch {
    // Silent — the page just won't show a daily quiz yet; the Adventures
    // page's manual "New Solo Adventure" button still works as a fallback.
    return adventures;
  }
}
