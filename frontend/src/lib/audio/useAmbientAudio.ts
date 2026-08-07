"use client";

import { useCallback, useEffect, useState } from "react";
import { ambientEngine } from "./ambientEngine";
import { musicEngine } from "./musicEngine";

const STORAGE_KEY = "weatherline_sound_enabled";

export function useAmbientAudio() {
  // Always false on first render (client and server must match to avoid a
  // hydration mismatch) — the real stored preference is applied after mount.
  const [enabled, setEnabled] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    // Deliberate one-time sync from a browser-only source (localStorage) that
    // cannot be read during SSR — reading it in the initializer instead causes
    // a hydration mismatch, since the server has no localStorage to read.
    if (window.localStorage.getItem(STORAGE_KEY) === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnabled(true);
    }
  }, []);

  const enable = useCallback(() => {
    ambientEngine.start();
    musicEngine.start();
    setEnabled(true);
    setHasInteracted(true);
    window.localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const disable = useCallback(() => {
    ambientEngine.setMuted(true);
    musicEngine.setMuted(true);
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
