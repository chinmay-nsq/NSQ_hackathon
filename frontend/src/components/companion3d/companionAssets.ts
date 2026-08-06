/**
 * Maps each companion species to its 3D model file. Drop a `.glb` for each
 * species into `public/models/companions/` using these exact filenames —
 * nothing else needs to change. Species with no file yet fall back to a
 * simple animated placeholder shape (see PlaceholderCreature).
 */
export const COMPANION_MODEL_PATH: Record<string, string> = {
  dragon: "/models/companions/dragon.glb",
  robot: "/models/companions/robot.glb",
  fox: "/models/companions/fox.glb",
  owl: "/models/companions/owl.glb",
  panda: "/models/companions/panda.glb",
};

export const COMPANION_FALLBACK_COLOR: Record<string, string> = {
  dragon: "#e0655a",
  robot: "#8a97a8",
  fox: "#e8895a",
  owl: "#a583c9",
  panda: "#4a4a4a",
};
