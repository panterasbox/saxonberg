/**
 * VesselKindMixin — ⭐ **what KIND of vessel this is: `coupe`, `keg`,
 * `vat`, `sack`.**
 *
 * The par key. It is what ties an empty vessel to the product that is
 * that vessel filled, what a claim matches on when a craft goes looking
 * for somewhere to put a drink, and what lets an emptied vessel say *"the
 * can is empty"* instead of reciting its authored row.
 *
 * ⚠⚠ **It lived on `BulkableMixin`, and that is the shape of mistake this
 * whole decomposition is about.** `Bulkable` is continuous volume —
 * litres, a material, a capacity, a closure. A vessel KIND is a different
 * concern that merely *depends on* being a vessel, and putting it on the
 * volume mixin meant a floor puddle, a garden bed, a plant pot, an air
 * tank and a watering can all carried a par key they will never have.
 *
 * ⭐ It also had a second victim, one level down: the utensil kind was
 * stored in this same `category`, so *"this is a spoon"* required *"this
 * is a bulk vessel"* — which is why a horn spoon is a `CraftVessel` with
 * an interior slot it never fills. That is W6's to fix, and this mixin is
 * what makes it possible.
 *
 * Composed by the classes that actually have a kind: `Bottle`, `Vat`,
 * `CraftVessel` (and everything below it). Not by the substrate.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/** The method surface a kinded vessel offers other Stuff. */
export interface VesselKind {
  getCategory(): string;
  setCategory(value: string): void;
}

export function VesselKindMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class VesselKindMixin extends Base implements VesselKind {
    static _mixinName = 'VesselKindMixin';

    static fieldMeta: FieldMeta = {
      category: { persistent: true, authorable: true },
    };

    /** The vessel kind (`coupe`, `can`, `keg`, `sack`). */
    public category: string = '';

    getCategory(): string {
      return this.category;
    }
    setCategory(value: string): void {
      this.category = value;
    }
  };
}
