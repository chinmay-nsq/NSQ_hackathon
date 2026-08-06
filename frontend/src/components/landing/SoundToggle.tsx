"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useAmbientAudio } from "@/lib/audio/useAmbientAudio";

export function SoundToggle() {
  const { enabled, toggle } = useAmbientAudio();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={enabled ? "Mute ambient sound" : "Enable ambient sound"}
      className="fixed right-6 top-6 z-50 flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:border-white/30 hover:text-white"
    >
      {enabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
    </button>
  );
}
