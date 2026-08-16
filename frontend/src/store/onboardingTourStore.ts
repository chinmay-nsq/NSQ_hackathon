import { create } from "zustand";
import { api } from "@/lib/api";

interface OnboardingTourState {
  /** Whether the tour is currently overlaid on screen. */
  active: boolean;
  stepIndex: number;
  /**
   * True once the tour has ever finished (completed OR skipped) — the tour
   * never runs again once true. Always starts false on the client; the real
   * source of truth is the DB (`employee.onboardingTourDone`), synced in via
   * `syncDone()` once `/auth/me` resolves — never read from localStorage.
   */
  done: boolean;
  /** True until the initial `/auth/me` fetch has told us the real `done` state — used to gate accidental early interaction before we actually know. */
  doneKnown: boolean;
  /**
   * Set by a page once a real gated action has genuinely completed (e.g.
   * the team was actually created, not just the dialog opened) — a
   * `requireAction` tour step checks this against its own key to decide
   * whether to unlock its Next button. Not polled; pages call
   * `signalAction(key)` themselves right when the real thing happens.
   */
  completedActionKey: string | null;
  /** Syncs `done`/`doneKnown` from the fetched employee record — call once /auth/me resolves. */
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
    if (get().doneKnown) return;
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
