import type { Metadata } from "next";
import { HowItWorksClient } from "./HowItWorksClient";

const TITLE = "How It Works — Skibidi-Sprint";
const DESCRIPTION =
  "The full feature roadmap — every area of Skibidi-Sprint, from adventures and guilds to the AI companion, broken down for both employees and team leads.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/how-it-works",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
