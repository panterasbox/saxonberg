/**
 * ResettableMixin — the marker + contract for the game-time **reset
 * (repop) sweep** (the eviction sibling in `ResidencyLogic`). An object
 * that composes it restores itself on the sweep — the shop's `Stock` tops
 * each line back to par, a respawning fixture re-arms, etc.
 *
 * Two decisions ride the object (engine informs, object decides): `reset()`
 * is *restorative-of-self* (never touches money — Law 2; the shop clones
 * missing items, not coin), and `resetsWhilePresent()` decides whether the
 * sweep should skip it while a player occupies its room. Default is skip
 * (respect a watched room); the shop overrides to `true` (restock while
 * browsed is fine).
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";

/** The reset-sweep contract a resettable object implements. */
export interface Resettable {
  /**
   * Restore self to the authored baseline. Restorative-of-self, never a
   * money leg (Law 2). Default is a no-op; consumers override.
   */
  reset(): void | Promise<void>;
  /**
   * Whether the sweep may reset this object while a player is present in
   * its room. Default `false` (respect the watched room).
   */
  resetsWhilePresent(): boolean;
}

export function ResettableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class ResettableMixin extends Base implements Resettable {
    static _mixinName = "ResettableMixin";

    /**
     * @hook Invoked by the game-time reset sweep (`ResidencyLogic`).
     *   Restorative-of-self; override to top self back up. The base is a
     *   no-op terminal — chain `super.reset()` if an intermediate layer
     *   also resets.
     */
    public reset(): void | Promise<void> {}

    public resetsWhilePresent(): boolean {
      return false;
    }
  }
  return ResettableMixin;
}
