"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { useAmbientAudio } from "@/lib/audio/useAmbientAudio";

const SEEN_KEY = "weatherline_sound_prompt_seen";

function wasAlreadySeen(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(SEEN_KEY) === "true";
}

/** A one-time, dismissible prompt inviting the visitor to turn on ambient sound. */
export function SoundPrompt() {
  const { enabled, hasInteracted, enable } = useAmbientAudio();
  const [dismissed, setDismissed] = useState(wasAlreadySeen);

  if (enabled || hasInteracted || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    window.sessionStorage.setItem(SEEN_KEY, "true");
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <button
        type="button"
        onClick={() => {
          enable();
          handleDismiss();
        }}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-white/70 backdrop-blur-sm transition-colors hover:border-coral/50 hover:text-white"
      >
        <Volume2 className="size-3.5" />
        Turn on sound
      </button>
    </div>
  );
}
