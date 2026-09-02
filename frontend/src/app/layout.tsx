import type { Metadata } from "next";
import { Anton, Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { StructuredData } from "@/components/StructuredData";

// Landing page ("/") only — a distinct, always-dark visual world.
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

// Body copy across the whole authenticated app.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Headings across the app — a grotesque with enough character to stay
// playful, but none of the display font's shouting.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const SITE_URL = "https://skibidi-sprint.vercel.app";
const TITLE = "Skibidi-Sprint — Team Engagement, Reinvented";
const DESCRIPTION =
  "Every task becomes a quest. Every team, a party. Every company, a world worth showing up for — powered by an AI that actually pays attention.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Skibidi-Sprint",
    images: [
      {
        url: "/image.png",
        width: 1788,
        height: 880,
        alt: "Skibidi-Sprint — work feels like a game you want to play.",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/image.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${anton.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen">
        <StructuredData />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <AppShell>{children}</AppShell>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
