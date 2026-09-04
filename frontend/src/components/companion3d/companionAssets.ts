/**
 * Maps each companion character to its portrait image and accent color —
 * the same characters used on the landing page (see
 * src/components/landing/petData.ts).
 */
export const COMPANION_IMAGE_PATH: Record<string, string> = {
  michael: "/michael.png",
  jim: "/jim.png",
  pam: "/pam.png",
  dwight: "/dwight.png",
  stanley: "/stanley.png",
};

export const COMPANION_FALLBACK_COLOR: Record<string, string> = {
  michael: "#3f5a9c",
  jim: "#6aa6e0",
  pam: "#d98fae",
  dwight: "#d8a12a",
  stanley: "#8c5a3c",
};
