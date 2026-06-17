/**
 * D-CORE-10.1 onboarding wizard — the three keystone-free steps, in order.
 * The keys double as the `onboarding.steps.*` / `onboarding.<key>.*` message
 * keys. Kept tiny and dependency-free so tests can assert the step model
 * (count, order) without rendering.
 */
export const WZ_STEP_KEYS = ["explain", "invite", "scopes"] as const;
export type WzStepKey = (typeof WZ_STEP_KEYS)[number];
export const WZ_STEP_COUNT = WZ_STEP_KEYS.length;

/** Clamp an (untrusted, persisted) resume step into the valid range. */
export const clampStep = (n: number): number =>
  Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), 0), WZ_STEP_COUNT - 1) : 0;
