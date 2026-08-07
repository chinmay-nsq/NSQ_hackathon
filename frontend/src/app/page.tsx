"use client";

import "./landing.css";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { PetGallery } from "@/components/landing/PetGallery";
import { CompanionSpotlight } from "@/components/landing/CompanionSpotlight";
import { StatsSection } from "@/components/landing/StatsSection";
import { CTASection } from "@/components/landing/CTASection";
import { MagneticCursor } from "@/components/landing/MagneticCursor";
import { SoundToggle } from "@/components/landing/SoundToggle";
import { SoundPrompt } from "@/components/landing/SoundPrompt";
import { ScrollProgressLine } from "@/components/landing/ScrollProgressLine";
import { useScrollReactiveAudio } from "@/lib/audio/useScrollReactiveAudio";
import { ambientEngine } from "@/lib/audio/ambientEngine";
import { musicEngine } from "@/lib/audio/musicEngine";

export default function LandingPage() {
  const router = useRouter();
  useScrollReactiveAudio();

  useEffect(() => {
    return () => {
      ambientEngine.stop();
      musicEngine.stop();
    };
  }, []);

  return (
    <div className="landing-page">
      <MagneticCursor />
      <ScrollProgressLine />
      <SoundToggle />
      <SoundPrompt />

      <HeroSection onEnter={() => router.push("/login")} />
      <ProblemSection />
      <SolutionSection />
      <FeatureShowcase />
      <PetGallery />
      <CompanionSpotlight />
      <StatsSection />
      <CTASection />
    </div>
  );
}
