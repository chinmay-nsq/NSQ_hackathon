import type { Role } from "@/lib/types";

/**
 * "Adventures" is renamed per role: managers see "Tasks", everyone else
 * sees "Sprint" — same underlying feature/routes, just different labels.
 * Centralized here so every surface (nav, page headers, buttons) stays
 * consistent instead of hand-rolling the same role check everywhere.
 */
export function taskWord(role: Role | undefined, opts?: { plural?: boolean }): string {
  const isManager = role === "MANAGER" || role === "ADMIN";
  if (isManager) return opts?.plural === false ? "Task" : "Tasks";
  return "Sprint";
}

/**
 * The account's designation, shown wherever the UI used to show the
 * gamification rank (e.g. "Novice") — that rank never actually changes as
 * someone levels up, so it read as a stale placeholder. This is real and
 * always accurate instead, derived straight from role.
 */
export function roleLabel(role: Role | undefined): string {
  if (role === "MANAGER") return "Leader";
  if (role === "ADMIN") return "Admin";
  return "Member";
}
