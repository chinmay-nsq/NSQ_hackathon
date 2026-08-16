export interface TourStep {
  key: string;
  /**
   * Which route the target lives on — the tour navigates here first if the
   * user isn't already on it. `null` means "don't force-navigate", for a
   * step that just floats over wherever the user currently is (e.g. mid-quiz
   * on a dynamic `/adventures/[id]` route the tour can't know ahead of time).
   */
  route: string | null;
  /**
   * Matches a real `data-tour="..."` attribute already on the actual
   * button/element — never a synthetic copy. Omit for a step with no single
   * element to spotlight (e.g. "go finish this multi-step quiz") — that kind
   * of step shows the message with no dimmed cutout.
   */
  target?: string;
  message: string;
  /**
   * If true, the bubble's Next button stays disabled (Skip still works)
   * until the page that owns the real action calls
   * `useOnboardingTourStore.getState().signalAction(step.key)` — right when
   * the real thing actually finishes (e.g. the guild create API call
   * resolves), not just when a button is clicked. No polling: it's a direct
   * signal from the place where the action truly completes.
   */
  requireAction?: boolean;
}

/** Employee/plain-member arc: land on the dashboard, take the first quest, join a team, spend coins. */
export const EMPLOYEE_TOUR_STEPS: TourStep[] = [
  {
    key: "quest",
    route: "/app",
    target: "quest-card",
    message: "Let's start with today's skill quiz — tap it to open it up.",
  },
  {
    key: "quest-complete",
    route: null,
    message: "Answer all 5 questions and hit submit, then hit Next whenever you're ready.",
  },
  {
    key: "adventures",
    route: "/adventures",
    target: "nav-adventures",
    message: "That was one quest — this is where you'll find all of them, past and pending.",
  },
  {
    key: "team",
    route: "/teams",
    target: "nav-teams",
    message: "Nice. Every quest feeds your team's resources too — let's check out Teams next.",
  },
  {
    key: "rewards",
    route: "/rewards",
    target: "nav-rewards",
    message: "This is where your coins actually go — real rewards you can redeem.",
  },
  {
    key: "trading",
    route: "/trading",
    target: "nav-trading",
    message: "You can also trade resources with other teams here at the Trading Post.",
  },
  {
    key: "growth",
    route: "/growth",
    target: "nav-growth",
    message: "Last stop — Growth tracks your real skill and consistency trends over time.",
  },
];

/**
 * Manager/admin arc: same starting point as everyone else (the dashboard),
 * then stand up a team, invite someone, assign real work. "Create team" has
 * no spotlight target on purpose — the trigger button disappears once the
 * dialog opens on top of it, which used to leave the tour spotlighting a
 * stale/hidden element and dimming the (now-open) dialog itself. Instead
 * it's a plain floating message with no dimming at all, so the dialog stays
 * fully usable; it's a hard gate (requireAction — Next stays disabled until
 * the guild is actually created, not just when the dialog is opened).
 * Assigning a task genuinely needs a real teammate on the roster first, but
 * the tour doesn't block on that — it just explains the invite step and
 * lets the user move on with Next whenever they're ready.
 */
export const LEAD_TOUR_STEPS: TourStep[] = [
  {
    key: "go-to-teams",
    route: "/app",
    target: "nav-teams",
    message: "Let's get your team set up — tap Teams in the sidebar.",
  },
  {
    key: "create-team",
    route: "/teams",
    message: "Now let's create your team. Tap \"New team\" above and fill it in.",
    requireAction: true,
  },
  {
    key: "invite-teammate",
    route: null,
    message:
      "Team's up! Open it and tap \"Copy invite link\", then send that link to a teammate. Once someone joins you'll be able to assign them work — hit Next to keep going.",
  },
  {
    key: "adventures",
    route: "/teams",
    target: "nav-adventures",
    message: "Now let's head to Adventures — that's where you'll hand out work.",
  },
  {
    key: "assign-task",
    route: "/adventures",
    target: "assign-task-btn",
    message: "This is where you'll hand out real work once your team has a member — tap here to open it.",
  },
  {
    key: "trading",
    route: "/trading",
    target: "nav-trading",
    message: "Your team can trade resources with other teams here at the Trading Post.",
  },
  {
    key: "growth",
    route: "/growth",
    target: "nav-growth",
    message: "Growth tracks trends for you and your team — accuracy, consistency, and your own review turnaround.",
  },
  {
    key: "approvals",
    route: "/approvals",
    target: "nav-approvals",
    message: "Last stop — this is where you'll review and approve what your team submits.",
  },
];
