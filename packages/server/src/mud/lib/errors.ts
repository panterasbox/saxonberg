/**
 * Cross-cutting error and rejection types.
 *
 * Home for "we're saying no, with a reason" shapes that the engine
 * uses everywhere — both **thrown** errors (the usual JS sense) and
 * **returned** rejections (e.g. Witness veto results, where exceptions
 * for flow control would be an anti-pattern but the conceptual shape
 * is identical to a thrown one).
 *
 * Subsystem-specific exceptions stay with their subsystem
 * (`lib/security/errors.ts`, `api/containment.ts`'s `ContainmentError`,
 * etc.). This file is for shapes that any subsystem might use.
 */

/**
 * Return shape for "may I do this?" predicate hooks — the canonical
 * Witness `can*` veto signature dispatched by the chokepoint Apis
 * (`ContainmentApi.move`, `Mobile.traverse`, `ConnectionApi.transfer`,
 * `StuffApi.destruct`).
 *
 * `{ ok: true }` lets the operation proceed; `{ ok: false, reason }`
 * vetos with a human-readable explanation. The chokepoint Api wraps
 * the reason into the appropriate error type for its layer
 * (`ContainmentError`, `DestructError`, etc.).
 *
 * Hooks that don't care return `undefined` (the optional method
 * isn't implemented at all) — the dispatcher treats that as
 * "no opinion."
 */
export type VetoResult = { ok: true } | { ok: false; reason: string };

/**
 * Programmatic-contract violation thrown by `StuffApi.destruct()` when
 * a target's `canDestruct()` witness vetoes the destruction. Mirrors
 * the shape of `ContainmentError` — separately named so callers can
 * catch destruct-specific failures without overlapping the
 * containment surface.
 *
 * `forceDestruct()` does not raise this even when `canDestruct()`
 * returns `{ ok: false }` — the witness still fires for observability,
 * but force-bypass intentionally ignores the veto.
 */
export class DestructError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, opts?: { cause?: unknown }) {
    super(message);
    this.name = 'DestructError';
    if (opts?.cause !== undefined) this.cause = opts.cause;
  }
}
