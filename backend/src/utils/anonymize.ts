import { Role } from "@prisma/client";

interface MemberLike {
  name: string;
  companion?: { name: string; species: string } | null;
}

/**
 * Managers see their team members only by companion identity — never real
 * name/email. Admins (and the members themselves) always see real names.
 * A member who hasn't finished onboarding yet (no companion) shows as
 * "New Companion" rather than leaking their real name as a fallback.
 */
export function anonymizeName<T extends MemberLike>(member: T, viewerRole: Role): string {
  if (viewerRole !== Role.MANAGER) return member.name;
  return member.companion?.name ?? "New Companion";
}

/** Strips real identity fields from a member record for a manager's view, keeping the companion's name/species. */
export function anonymizeMember<T extends MemberLike>(
  member: T,
  viewerRole: Role
): Omit<T, "name" | "companion"> & { name: string; species: string | null } {
  const { name: _name, companion, ...rest } = member;
  return {
    ...rest,
    name: anonymizeName(member, viewerRole),
    species: companion?.species ?? null,
  } as Omit<T, "name" | "companion"> & { name: string; species: string | null };
}
