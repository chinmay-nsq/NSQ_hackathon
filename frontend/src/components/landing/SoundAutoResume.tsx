"use client";

import { useEffect } from "react";
import { useAmbientAudio } from "@/lib/audio/useAmbientAudio";

/**
 * If the visitor had sound on last time, browsers still won't let the audio
 * engines start until a real user gesture happens this session. This starts
 * them silently on the very first click/keydown anywhere on the page,
 * instead of requiring the visitor to find and click the sound toggle again.
 */
export function SoundAutoResume() {
  const { hasStoredPreference, enable } = useAmbientAudio();

  useEffect(() => {
    if (!hasStoredPreference) return;

    function handleFirstInteraction() {
      enable();
    }

    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [hasStoredPreference, enable]);

  return null;
}
