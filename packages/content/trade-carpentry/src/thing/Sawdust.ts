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
 * ⭐ `PoolableMixin` (storage-and-ice W2): the icehouse holds sawdust as
 * its PACKING, a line by wetness band (`sawdust|dry`, `sawdust|soaked`),
 * keeping its saturation — so packing dug out of a wet house comes out
 * reading wet, and the store's own physics soaks it with meltwater.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { StackableMixin } from '@saxonberg/server/mud/lib/stuff/Stackable';
import { PoolableMixin } from '@saxonberg/server/mud/lib/storage/Poolable';
import type { PoolRole } from '@saxonberg/server/mud/lib/storage/StoreLine';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

// ⚠ Poolable OVER Stackable: the store pools heaps by band, and the stack
// substrate still merges two loose heaps on a floor.
const SawdustBase = PoolableMixin(StackableMixin(Good));

export default class Sawdust extends SawdustBase {
  /** ⭐ Sawdust pools by its wetness band: wet packing is its own line. */
  public override poolKey(): string {
    const self = this as unknown as Stuff;
    const band = MixinApi.isWet(self) ? self.getWetnessBand() : 'dry';
    return `sawdust|${band}`;
  }

  public override poolState(): Record<string, number> {
    const self = this as unknown as Stuff;
    return { saturation: MixinApi.isWet(self) ? self.getWetness() : 0 };
  }

  /** Stamp a line's saturation onto a heap (a dry stamp, then wetted to it). */
  public override applyPoolState(state: Record<string, number>): void {
    const self = this as unknown as Stuff;
    if (!MixinApi.isWet(self)) return;
    const target = Math.max(0, Math.min(1, state.saturation ?? 0));
    self.wet(target - self.getWetness());
  }

  /** Sawdust is what a store keeps its stock IN. */
  public override poolRole(): PoolRole {
    return 'packing';
  }

  public override canMergeWith(other: Stuff): boolean {
    if (!super.canMergeWith(other)) return false;
    const self = this as unknown as Stuff;
    if (!MixinApi.isWet(self) || !MixinApi.isWet(other)) return true;
    return self.getWetnessBand() === other.getWetnessBand();
  }
}
