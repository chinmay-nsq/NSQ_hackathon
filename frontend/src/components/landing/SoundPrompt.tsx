"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { useAmbientAudio } from "@/lib/audio/useAmbientAudio";

const SEEN_KEY = "weatherline_sound_prompt_seen";

/** A one-time, dismissible prompt inviting the visitor to turn on ambient sound. */
export function SoundPrompt() {
  const { enabled, hasInteracted, hasStoredPreference, enable } = useAmbientAudio();
  // Always false on first render (must match SSR, which has no sessionStorage)
  // — the real "already seen" state is applied after mount.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(SEEN_KEY) === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(true);
    }
  }, []);

  // A returning visitor with sound already on is silently resumed by
  // SoundAutoResume on their first click — no need to prompt them again.
  if (enabled || hasInteracted || hasStoredPreference || dismissed) return null;

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
