// A standalone contest (not tied to an Event) gets this long to run before
// syncLifecycle in lib/lifecycle.ts closes it automatically. Contests
// entered into an Event inherit that Event's closesAt instead.
export const SUBMISSION_DEFAULT_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
