"use client";

import { useCallback, useEffect, useState } from "react";
import { musicEngine } from "./musicEngine";

const STORAGE_KEY = "weatherline_sound_enabled";

export function useAmbientAudio() {
  // Always false on first render (client and server must match to avoid a
  // hydration mismatch) — the real stored preference is applied after mount.
  const [enabled, setEnabled] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  // True if the visitor had sound on last time, but the engine hasn't
  // actually been started yet this session (browsers block audio without a
  // real gesture, so a mount effect can't start it). The very first real
  // click anywhere should honor this instead of requiring a second click.
  const [hasStoredPreference, setHasStoredPreference] = useState(false);

  useEffect(() => {
    // Deliberate one-time sync from a browser-only source (localStorage) that
    // cannot be read during SSR — reading it in the initializer instead
    // causes a hydration mismatch, since the server has no localStorage.
    if (window.localStorage.getItem(STORAGE_KEY) === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasStoredPreference(true);
    }
  }, []);

  const enable = useCallback(() => {
    musicEngine.start();
    setEnabled(true);
    setHasInteracted(true);
    setHasStoredPreference(false);
    window.localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const disable = useCallback(() => {
    musicEngine.setMuted(true);
    setEnabled(false);
    setHasStoredPreference(false);
    window.localStorage.setItem(STORAGE_KEY, "false");
  }, []);

  const toggle = useCallback(() => {
    if (enabled) {
      disable();
    } else {
      enable();
    }
  }, [enabled, disable, enable]);

  return { enabled, hasInteracted, hasStoredPreference, enable, disable, toggle };
}
