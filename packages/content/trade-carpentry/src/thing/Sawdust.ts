/**
 * Sawdust — the heap the saw's kerf leaves on the floor, by the kilogram
 * (storage-and-ice D18). A `Stackable` good whose row authors one
 * kilogram a unit, so a heap's quantity IS its mass in kilograms.
 *
 * ⭐ **Wet sawdust is a different heap.** Two heaps merge only when they
 * read the same wetness band: packing dug out of an icehouse comes out
 * soaked and stays a soaked heap beside the dry one, which is exactly what
 * a keeper sees and what the store's pool key (from W2) keys on. Within a
 * band the survivor keeps its own saturation.
 *
 * W2 composes `PoolableMixin` on top: the icehouse holds sawdust as its
 * packing, a line by wetness band.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { StackableMixin } from '@saxonberg/server/mud/lib/stuff/Stackable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const SawdustBase = StackableMixin(Good);

export default class Sawdust extends SawdustBase {
  /** Kilograms of sawdust in this heap (one unit a kilogram). */
  public getKg(): number {
    return this.getQuantity();
  }

  public override canMergeWith(other: Stuff): boolean {
    if (!super.canMergeWith(other)) return false;
    const self = this as unknown as Stuff;
    if (!MixinApi.isWet(self) || !MixinApi.isWet(other)) return true;
    return self.getWetnessBand() === other.getWetnessBand();
  }
}
