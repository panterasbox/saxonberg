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

/**
 * ⭐ Programmatic-contract violation: an act that WRITES — puts something
 * into the world — was asked of a subject that stands nowhere
 * (`environment === null`). The pot that breaks needs the place it stood
 * for its sherds; a spill needs a floor.
 *
 * Reads never throw this: detachment is a normal state for a read (the
 * matrix in `docs/subsystems/spatial.md` § Detached Stuff). A write never
 * skips silently and never invents a place: it checks its subject BEFORE
 * it changes anything, and throws this. The command boundary absorbs it as
 * a `controller-error` note and records an author diagnostic; a scheduled
 * root records and swallows it — so the defect is told, not buried.
 */
export class DetachedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DetachedError';
  }
}
