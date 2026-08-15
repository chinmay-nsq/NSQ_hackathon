"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import "../landing.css";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeatureRoadmap } from "@/components/landing/FeatureRoadmap";
import { MagneticCursor } from "@/components/landing/MagneticCursor";
import { AmbientParticles } from "@/components/landing/AmbientParticles";

export function HowItWorksClient() {
  return (
    <div className="landing-page relative min-h-screen">
      <AmbientParticles />
      <MagneticCursor />

      <Link
        href="/"
        data-cursor="magnetic"
        className="fixed top-6 left-6 z-50 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-white/70 backdrop-blur-sm transition-colors hover:border-white/30 hover:text-white sm:left-12"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </Link>

      <HowItWorks />
      <FeatureRoadmap />
    </div>
  );
}
