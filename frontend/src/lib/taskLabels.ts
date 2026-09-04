import type { Role } from "@/lib/types";

/**
 * "Assignments" is renamed per role: managers see "Tasks", everyone else
 * sees "Sprint" — same underlying feature/routes, just different labels.
 * Centralized here so every surface (nav, page headers, buttons) stays
 * consistent instead of hand-rolling the same role check everywhere.
 */
export function taskWord(role: Role | undefined, opts?: { plural?: boolean }): string {
  const isManager = role === "MANAGER" || role === "ADMIN";
  if (isManager) return opts?.plural === false ? "Task" : "Tasks";
  return "Sprint";
}
