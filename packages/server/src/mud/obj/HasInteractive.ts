/**
 * HasInteractive — the typed handle for "this Stuff has one or more
 * connected `Interactive` objects."
 *
 * Both `Avatar` (multiplexing — many Interactives can drive one Avatar)
 * and `Login` (transient, single Interactive) implement it. The
 * interface gives policy/messaging code a stable name to talk about
 * "which HasInteractive did this?" instead of branching on
 * `instanceof Avatar || instanceof Login`.
 *
 * Use the `isHasInteractive` predicate to narrow. It's a structural
 * (duck-typed) check — that's a small carve-out from the broader
 * no-duck-typing rule, justified because this is a plain interface
 * (not a mixin), the contract is centralized here, and the alternative
 * of branching on `instanceof` would couple consumers to every
 * concrete class that ever gets a connection.
 */

import type { Interactive } from './Interactive';

export interface HasInteractive {
  /**
   * Connected `Interactive` objects driving this Stuff.
   * Empty set when nothing is connected. The set is read-only — to
   * mutate connections, go through the implementing class's own API
   * (e.g., `Avatar.addInteractive` / `removeInteractive`).
   */
  getInteractives(): ReadonlySet<Interactive>;
}

/**
 * Structural predicate. Narrows `obj` to `HasInteractive` when
 * `getInteractives` is callable.
 */
export function isHasInteractive(obj: unknown): obj is HasInteractive {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as { getInteractives?: unknown }).getInteractives === 'function'
  );
}
