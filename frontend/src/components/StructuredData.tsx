const SITE_URL = "https://skibidi-sprint.vercel.app";

/** Site-wide JSON-LD — a SoftwareApplication entity so search engines can build a rich result instead of relying on plain text alone. */
export function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Skibidi-Sprint",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "Every task becomes a quest. Every team, a party. Every company, a world worth showing up for — powered by an AI that actually pays attention.",
    image: `${SITE_URL}/image.png`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
