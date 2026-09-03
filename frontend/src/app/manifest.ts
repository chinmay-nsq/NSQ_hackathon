import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Skibidi-Sprint — Team Engagement, Reinvented",
    short_name: "Skibidi-Sprint",
    description:
      "Every task becomes a quest. Every team, a party. Every company, a world worth showing up for — powered by an AI that actually pays attention.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0d12",
    theme_color: "#2867e4",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
