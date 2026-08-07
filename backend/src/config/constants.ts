export const RESOURCE_TYPES = ["knowledge", "gold", "influence", "materials"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const COMPANION_SPECIES = [
  "barbarian",
  "wizard",
  "witch",
  "hog_rider",
  "balloon",
  "dragon",
  "lava_hound",
] as const;
export type CompanionSpecies = (typeof COMPANION_SPECIES)[number];

export const XP_PER_LEVEL = 100;
export const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const COMPANION_BOND_XP_PER_ADVENTURE = 10;
