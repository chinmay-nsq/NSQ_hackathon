import { create } from "zustand";
import { api } from "@/lib/api";

interface OnboardingTourState {
  /** Whether the tour is currently overlaid on screen. */
  active: boolean;
  stepIndex: number;
  /**
   * True once the tour has ever finished (completed OR skipped) — the tour
   * never runs again once true. Always starts false on the client; kept in
   * sync with the DB value (`employee.onboardingTourDone`) via `syncDone()`
   * on every `employee` change (not just the first), so a stale/incomplete
   * `employee` snapshot from earlier in the session can never permanently
   * lock this in wrong — never read from localStorage.
   */
  done: boolean;
  /**
   * True once we've received at least one real employee record — used to
   * gate accidental early interaction before we actually know the real
   * `done` state. Sticky: once true, stays true (there's always a real
   * employee snapshot to fall back on after the first fetch).
   */
  doneKnown: boolean;
  /**
   * Set by a page once a real gated action has genuinely completed (e.g.
   * the team was actually created, not just the dialog opened) — a
   * `requireAction` tour step checks this against its own key to decide
   * whether to unlock its Next button. Not polled; pages call
   * `signalAction(key)` themselves right when the real thing happens.
   */
  completedActionKey: string | null;
  /** Syncs `done`/`doneKnown` from the fetched employee record — call on every /auth/me-driven employee update, not just once. */
  syncDone: (onboardingTourDone: boolean) => void;
  start: () => void;
  next: () => void;
  finish: () => void;
  skip: () => void;
  signalAction: (key: string) => void;
}

function persistDone() {
  // Best-effort — if this fails, the tour simply re-offers itself next
  // session, which is a safe failure mode (never a hard error to the user).
  void api.post("/employees/me/onboarding-tour-done").catch(() => {});
}

export const useOnboardingTourStore = create<OnboardingTourState>((set, get) => ({
  active: false,
  stepIndex: 0,
  done: false,
  doneKnown: false,
  completedActionKey: null,

  syncDone(onboardingTourDone) {
    // Once the tour has been finished/skipped locally this session, don't
    // let a subsequent (possibly briefly-stale) employee refetch flip
    // `done` back to false before the persistDone() POST has landed.
    if (get().done && !onboardingTourDone) {
      set({ doneKnown: true });
      return;
    }
    set({ done: onboardingTourDone, doneKnown: true });
  },

  start() {
    if (get().done) return;
    set({ active: true, stepIndex: 0, completedActionKey: null });
  },

  next() {
    set((s) => ({ stepIndex: s.stepIndex + 1, completedActionKey: null }));
  },

  finish() {
    persistDone();
    set({ active: false, done: true });
  },

  skip() {
    persistDone();
    set({ active: false, done: true });
  },

  signalAction(key) {
    set({ completedActionKey: key });
  },
}));
