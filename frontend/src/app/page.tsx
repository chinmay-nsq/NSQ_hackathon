"use client";

import "./landing.css";
import { useRouter } from "next/navigation";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { CompanionSpotlight } from "@/components/landing/CompanionSpotlight";
import { StatsSection } from "@/components/landing/StatsSection";
import { CTASection } from "@/components/landing/CTASection";
import { MagneticCursor } from "@/components/landing/MagneticCursor";
import { SoundToggle } from "@/components/landing/SoundToggle";
import { SoundPrompt } from "@/components/landing/SoundPrompt";
import { useScrollReactiveAudio } from "@/lib/audio/useScrollReactiveAudio";

export default function LandingPage() {
  const router = useRouter();
  useScrollReactiveAudio();

  return (
    <div className="landing-page">
      <MagneticCursor />
      <SoundToggle />
      <SoundPrompt />

      <HeroSection onEnter={() => router.push("/login")} />
      <ProblemSection />
      <SolutionSection />
      <FeatureShowcase />
      <CompanionSpotlight />
      <StatsSection />
      <CTASection />
    </div>
  );
}
