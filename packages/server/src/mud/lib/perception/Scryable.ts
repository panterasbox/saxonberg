/**
 * Scryable / ScryFocus — capability seam for the `scry` verb.
 *
 * A `Scryable` instrument (mirror, crystal ball, telescope) exposes
 * a per-target predicate the controller consults when deciding
 * whether the avatar can perceive an at-a-distance target through
 * this instrument. v1 is intentionally lenient — the predicate
 * returns `true` for anything the instrument considers in scope —
 * but the seam is in place so future authoring can scope mirrors
 * by zone, tune crystal balls to topics, etc.
 *
 * `ScryFocus` is a lighter shape — an opaque "focus token" the
 * controller passes back into `scry` for a follow-on view (the
 * mirror remembers what you last looked at). v1 doesn't surface a
 * controller for it; the interface is documented now to claim the
 * shape before content lands.
 */

import type { Stuff } from '../stuff/Stuff';
import type { VetoResult } from '../errors';

/**
 * An object that can act as a scry instrument. Implementations live
 * in content (mirror, crystal ball) and identify themselves via the
 * structural marker `_isScryable` so the verb's auto-resolver can
 * filter them out of `getContents()` / `getFixtures()` walks
 * without a hard mixin dependency.
 */
export interface Scryable {
  /** Marker for cheap structural detection. */
  readonly _isScryable: boolean;

  /**
   * Predicate-shaped veto. `{ ok: true }` allows the scry to render
   * via this instrument; `{ ok: false, reason }` declines (out of
   * range, target obscured, etc.) so the controller can surface a
   * specific failure or fall through to other instruments.
   */
  canScryFor(target: Stuff): VetoResult;
}

/**
 * Optional instrument-side state for "remember what we last looked
 * at." Crystal-ball-style instruments may compose this; mirrors
 * may not. v1 ships no consumer.
 */
export interface ScryFocus {
  getScryFocus(): Stuff | null;
  setScryFocus(target: Stuff | null): void;
}
