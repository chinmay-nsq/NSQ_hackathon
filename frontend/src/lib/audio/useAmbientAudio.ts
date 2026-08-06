"use client";

import { useCallback, useState } from "react";
import { ambientEngine } from "./ambientEngine";

const STORAGE_KEY = "weatherline_sound_enabled";

function readStoredPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function useAmbientAudio() {
  const [enabled, setEnabled] = useState(readStoredPreference);
  const [hasInteracted, setHasInteracted] = useState(false);

  const enable = useCallback(() => {
    ambientEngine.start();
    setEnabled(true);
    setHasInteracted(true);
    window.localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const disable = useCallback(() => {
    ambientEngine.setMuted(true);
    setEnabled(false);
    window.localStorage.setItem(STORAGE_KEY, "false");
  }, []);

  const toggle = useCallback(() => {
    if (enabled) {
      disable();
    } else {
      enable();
    }
  }, [enabled, disable, enable]);

  return { enabled, hasInteracted, enable, disable, toggle };
}
