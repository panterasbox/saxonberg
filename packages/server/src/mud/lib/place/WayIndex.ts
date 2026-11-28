/**
 * WayIndexMixin — **this Idea knows the realm's ways** (controller-liquidity
 * W21): asked for a place, it names every place along every way that runs
 * through it.
 *
 * ⭐ The kernel asks the question and never says what a way is. A *way* is
 * a pack's concept — the transport pack's compiled `Lane` — and the kernel
 * may not import a pack. So the kernel declares the capability here, the
 * pack's `LaneCatalogue` composes it, and the pack names its index in the
 * realm's settings (`ways.indexPath`). The `WaterSourceMixin` /
 * `water.sourcePath` shape, one subsystem over.
 *
 * The one consumer is `analyze rooms` (`RoomsReading`): a `roomsScope:
 * corridor` archetype reports across the whole way at once. ⚠ With no pack
 * naming an index the realm has no ways, and a corridor archetype is simply
 * not reported — an absence, said in the reading's docs, never a swallowed
 * error.
 *
 * See [docs/subsystems/logistics.md] § Archetypes.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/** Public shape added by WayIndexMixin. */
export interface WayIndex {
  waysideOf(placePath: string): Promise<string[]>;
}

export function WayIndexMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class WayIndexMixin extends Base implements WayIndex {
    static _mixinName: string = 'WayIndexMixin';

    /**
     * The template path of every place along every way through
     * `placePath` — `placePath` itself among them — or `[]` when no way
     * runs there. A crossroads is on two ways and answers both.
     *
     * @hook Override on the composing Idea. Default: no ways anywhere.
     */
    public async waysideOf(placePath: string): Promise<string[]> {
      void placePath;
      return [];
    }
  };
}
