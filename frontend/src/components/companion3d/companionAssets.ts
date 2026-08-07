/**
 * Maps each companion species to its portrait image and accent color —
 * the same characters used on the landing page (see
 * src/components/landing/petData.ts).
 */
export const COMPANION_IMAGE_PATH: Record<string, string> = {
  barbarian: "/barb.png",
  wizard: "/wizard.png",
  witch: "/witch.png",
};

export const COMPANION_FALLBACK_COLOR: Record<string, string> = {
  barbarian: "#e0655a",
  wizard: "#e8a23a",
  witch: "#4ac4d9",
};
