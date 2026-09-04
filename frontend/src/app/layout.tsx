import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { StructuredData } from "@/components/StructuredData";

// Body copy across the whole authenticated app.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Headings across the app — a grotesque that keeps its odd bits (flat-sided
// bowls, cut terminals) so the UI still reads as playful, without any of the
// old display face's shouting. Pulling in the optical-size axis lets the
// browser's default font-optical-sizing tune the letterforms per heading
// size, from the 13px sidebar brand up to a 30px page title.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
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
      className={`${inter.variable} ${bricolage.variable} ${jetbrainsMono.variable} antialiased`}
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
