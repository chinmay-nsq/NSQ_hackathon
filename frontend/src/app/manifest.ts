import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Skibidi-Sprint — Team Engagement, Reinvented",
    short_name: "Skibidi-Sprint",
    description:
      "Every task becomes a quest. Every team, a party. Every company, a world worth showing up for — powered by an AI that actually pays attention.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0908",
    theme_color: "#ff5a36",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
