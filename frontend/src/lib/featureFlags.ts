/**
 * Lightning-bolt animation + sound, app-wide (loading states, deck
 * transitions, hero CTA burst, feature-roadmap reveal). Flip back to true
 * to restore it everywhere at once — every call site below checks this
 * instead of being deleted, so it's a one-line revert.
 */
export const THUNDERBOLT_ENABLED = false;
