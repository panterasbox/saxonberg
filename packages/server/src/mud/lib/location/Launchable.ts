/**
 * Launchable — ⭐ **water that says where a boat goes in and comes out**
 * (controller-liquidity W8, Appendix B). A boat is a thing in a water
 * place, so launching it is moving it from where it lies — a bank, a
 * landing, a ship's deck — into the water beside there, and recovering it
 * is the reverse. Which water, and whether there is any, is the water's
 * business: the river's warren answers for a bank on its line or a ship
 * lying on it, the sea's for a ship stopped at sea.
 *
 * The boat (the transport mod's) asks each water it knows; before this the
 * launch and recover controllers held the two warrens' paths and called
 * them by shape. The kernel protocol is the meeting point, so the asker
 * narrows on `MixinApi.isLaunchable` and never on the water mod's classes.
 *
 * IS: a body of water that holds boats (a river's reaches, the sea's
 * patches). IS NOT: a pond with no edge to launch from, nor a boat.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';

/** Water that says where a boat goes in and where it comes out. */
export interface Launchable {
  /** Where a boat lying at `from` goes into this water, or `null` (none beside there). */
  launchPlaceFor(from: Stuff): Promise<(Stuff & Container) | null>;
  /** Where a boat afloat at `from` comes out of this water, or `null` (nowhere to lift her onto). */
  recoverPlaceFor(from: Stuff): Promise<(Stuff & Container) | null>;
}

/**
 * ⭐ **`LaunchableMixin` — the launch protocol, as a mixin.** The defaults
 * answer `null` (no water beside anything); a host overrides both.
 */
export function LaunchableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class LaunchableMixin extends Base implements Launchable {
    static _mixinName: string = 'LaunchableMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook Where a boat goes in; the default knows no water. */
    public async launchPlaceFor(_from: Stuff): Promise<(Stuff & Container) | null> {
      return null;
    }

    /** @hook Where a boat comes out; the default knows no water. */
    public async recoverPlaceFor(_from: Stuff): Promise<(Stuff & Container) | null> {
      return null;
    }
  };
}
