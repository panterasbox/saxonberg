/**
 * ScryableMixin / ScryFocus — capability seam for the `scry` verb.
 *
 * A `Scryable` instrument (mirror, crystal ball, telescope) gates
 * remote perception of a target through the per-target predicate
 * `canScryFor(target)`. v1 ships no concrete instruments — the
 * mixin exists so content authors can compose it onto a `Mirror`
 * or `CrystalBall` class and stamp the right behaviour without a
 * one-off interface dance.
 *
 * Composes on `Visible` because scry is "perceive a remote target
 * the way you'd perceive a colocated one" — the controller renders
 * the target's description surface, which is exactly Visible's
 * contract. Anything Scryable is by definition Visible.
 *
 * `ScryFocus` is a lighter shape — an opaque "focus token" the
 * controller passes back into `scry` for a follow-on view (the
 * mirror remembers what you last looked at). v1 doesn't surface a
 * controller for it; the interface is documented now to claim the
 * shape before content lands.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Visible } from '../description/Visible';
import type { VetoResult } from '../errors';

/**
 * Public shape provided by `ScryableMixin`. Extends `Visible`
 * because Scryable always co-composes with VisibleMixin — the
 * prereq is documented at the type level so consumers narrowing
 * via `MixinApi.isScryable` also reach Visible's
 * `getShort` / `getLong` / etc.
 */
export interface Scryable extends Visible {
  /**
   * Predicate-shaped veto. `{ ok: true }` allows the scry to render
   * via this instrument; `{ ok: false, reason }` declines (out of
   * range, target obscured, etc.) so the controller can surface a
   * specific failure or fall through to other instruments.
   *
   * Subclasses override to gate by zone, target tier, instrument
   * tuning, etc. Default implementation accepts everything.
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

export function ScryableMixin<TBase extends MixinConstructor>(Base: TBase) {
  class ScryableMixin extends Base {
    static _mixinName = 'ScryableMixin';

    /**
     * No persistent fields v1. Future tunable instruments (a mirror
     * with bound-zone state, a crystal ball with focus history) add
     * their own persistent fields when they land.
     */
    static persistentFields: string[] = [];

    /**
     * Default-permissive predicate. Override in concrete instrument
     * classes to scope by zone, target tier, line-of-sight, etc.
     */
    canScryFor(_target: Stuff): VetoResult {
      return { ok: true };
    }
  }
  return ScryableMixin;
}
