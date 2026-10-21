/**
 * BuoyMixin — ⭐ **something in the water that holds another thing up**
 * (underwater drive, run 34): an air bag lashed to an anchor. A water
 * place sends what is dense down to the bed (`WaterPlace.sinks`), and it
 * cannot know what a pack's thing is doing — so before it sinks a thing it
 * asks the buoys in the same water whether any of them holds that thing
 * up. A **protocol mixin** (mixins.md): no state, a name; each host says
 * what it buoys.
 *
 * **IS for:** a lifting bag, a float, a cask lashed to a load — a thing
 * whose own lift keeps ANOTHER thing off the bottom.
 * **IS NOT for:** a thing that floats on its own (its density already
 * says so), or a body treading water (that is the swimmer's own work).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/** The protocol: does this hold `thing` up in the water? */
export interface Buoy {
  buoys(thing: Stuff): boolean;
}

export function BuoyMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class BuoyMixin extends Base implements Buoy {
    static _mixinName = 'BuoyMixin';

    /** @hook Override on the host: whether it holds `thing` up. Default: nothing. */
    public buoys(thing: Stuff): boolean {
      void thing;
      return false;
    }
  };
}
