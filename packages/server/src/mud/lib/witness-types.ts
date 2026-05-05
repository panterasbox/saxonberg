/**
 * Shared types for the Witness pattern — the engine's idiom for
 * "X happened to a known target" (object-local hooks dispatched
 * from chokepoint Apis like `ContainmentApi.move`,
 * `Mobile.traverse`, `ConnectionApi.transfer`).
 *
 * One place for the small vocabulary every Witness layer needs to
 * agree on. See [docs/subsystems/events.md](../../../../docs/subsystems/events.md)
 * for the pattern catalog.
 */

/**
 * Return shape for `can*` Witness hooks.
 *
 * `{ ok: true }` lets the operation proceed; `{ ok: false, reason }`
 * vetos with a human-readable explanation. The chokepoint Api wraps
 * the reason into the appropriate error type for its layer
 * (`ContainmentError`, etc.).
 *
 * Hooks that don't care return `undefined` (the optional method
 * isn't implemented at all) — the dispatcher treats that as
 * "no opinion."
 */
export type VetoResult = { ok: true } | { ok: false; reason: string };
