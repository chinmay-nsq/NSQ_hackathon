import type { MetadataRoute } from "next";

const SITE_URL = "https://skibidi-sprint.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/how-it-works", "/show-ppt", "/login"],
        // Authenticated app surfaces have no public content to index and
        // shouldn't be crawled — keep search engines out of them entirely.
        disallow: [
          "/app",
          "/adventures",
          "/teams",
          "/rewards",
          "/trading",
          "/approvals",
          "/company",
          "/admin",
          "/profile",
          "/onboarding",
          "/recap",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
