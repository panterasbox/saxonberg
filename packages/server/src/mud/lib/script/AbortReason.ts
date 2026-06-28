/**
 * AbortReason — the script-specific abort vocabulary.
 *
 * Coroutine cancellation (P5) reuses the engagement subsystem's
 * `AbortReasonRegistry` (the declaration-merge interface in
 * `@saxonberg/types`) rather than forking a parallel vocabulary. The
 * engagement module (`lib/activity/Engaged.ts`) already registers
 * `cancelled` / `replaced` / `preconditions-changed` / `host-destroyed`
 * / `thrown`; this module adds the three reasons a *script* can stop
 * for that the engagement layer doesn't name:
 *
 *  - `barge-in` — a player barged into the actor mid-step; the engaged
 *    activity aborted and the abort propagated to the script's await.
 *  - `step-declined` — a dispatched command declined (resolve/validate/
 *    controller said no) and the script chose to halt.
 *  - `resource-limit` — the tiered total ceiling (steps / dispatch-count
 *    / recursion depth) was exceeded; the interpreter stops gracefully.
 *
 * The values are `true`-keyed registry augmentations, exactly like the
 * engagement reasons; `SCRIPT_ABORT_REASONS` is the runtime array for
 * iteration/validation. `host-destroyed` and `cancelled` (already in the
 * registry) are also legitimate script aborts — they are simply not
 * re-declared here.
 */

declare module "@saxonberg/types" {
  interface AbortReasonRegistry {
    "barge-in": true;
    "step-declined": true;
    "resource-limit": true;
  }
}

/**
 * The abort reasons a running script can terminate with, as a runtime
 * array (the registry augmentation above is compile-time only). Spans
 * both the reasons declared here and the engagement-layer reasons a
 * script legitimately surfaces.
 */
export const SCRIPT_ABORT_REASONS = [
  "barge-in",
  "step-declined",
  "resource-limit",
  "host-destroyed",
  "cancelled",
] as const;

/** A reason a running script can be aborted with. */
export type ScriptAbortReason = (typeof SCRIPT_ABORT_REASONS)[number];
