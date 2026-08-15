import type { Metadata } from "next";
import { ShowPptClient } from "./ShowPptClient";

export const metadata: Metadata = {
  title: "Pitch Deck — Skibidi-Sprint",
  description: "The live presentation deck for Skibidi-Sprint.",
  robots: { index: false, follow: false },
};

export default function ShowPptPage() {
  return <ShowPptClient />;
}
