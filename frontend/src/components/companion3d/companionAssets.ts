/**
 * Maps each companion species to its portrait image and accent color —
 * the same characters used on the landing page (see
 * src/components/landing/petData.ts).
 */
export const COMPANION_IMAGE_PATH: Record<string, string> = {
  barbarian: "/barb.png",
  wizard: "/wizard-nobg.png",
  witch: "/witch-nobg.png",
  hog_rider: "/hog-nobg.png",
  balloon: "/baloon-nobg.png",
  dragon: "/dragon.png",
  lava_hound: "/lava_hound.png",
};

export const COMPANION_FALLBACK_COLOR: Record<string, string> = {
  barbarian: "#e0655a",
  wizard: "#e8a23a",
  witch: "#4ac4d9",
  hog_rider: "#c98b5e",
  balloon: "#d9503c",
  dragon: "#9b5de5",
  lava_hound: "#e8622c",
};
