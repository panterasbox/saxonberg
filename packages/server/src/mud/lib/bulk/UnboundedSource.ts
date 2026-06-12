/**
 * UnboundedSourceMixin — makes a {@link BulkableMixin} holder an
 * **inexhaustible source**: a slot you can draw from forever that never
 * depletes (the coffee urn, a spring, a tap).
 *
 * This is a deliberately narrow capability, kept OUT of the base
 * `Bulkable` substrate — the base interface knows nothing about
 * unbounded sources. The mixin composes onto a Bulkable host and
 * overrides three generic slot-policy seams:
 *
 *   - `getBulkAvailable` → `∞` (an unbounded amount to draw FROM).
 *   - `isBulkEmpty` → false whenever a material is assigned (a stored
 *     amount of zero doesn't mean empty — the well is always full).
 *   - `debitBulk` → no-op (drawing from it never decrements anything).
 *
 * Everything else (capacity as a *destination*, closure, the MQL
 * surface, the verbs) is unchanged. Compose it only on holders that
 * are genuinely a source; bounded vessels stay plain Bulkable.
 *
 * This is NOT a regenerating well (a scheduled refill that tops the
 * slot back up over game-time) — that richer model is deferred; `∞` is
 * the simpler demonstration of the source end of the holder dial.
 */

import type { MixinConstructor } from '../mixin';
import { Mixins } from '../mixin';
import type { AnyConstructor } from '../../api/mixin';
import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Bulkable, BulkAffordance } from './Bulkable';

export function UnboundedSourceMixin<
  TBase extends MixinConstructor<Stuff & Bulkable>,
>(Base: TBase) {
  return class UnboundedSourceMixin extends Base {
    static _mixinName = 'UnboundedSourceMixin';

    /**
     * Composition check (run once at first registration): the override
     * targets `Bulkable`'s slot-policy methods, so the host must
     * compose `BulkableMixin`.
     */
    static __validateComposition__(ctor: AnyConstructor): void {
      const name = (ctor as { name?: string }).name ?? 'class';
      if (!MixinApi.hasMixin(ctor, Mixins.Bulkable)) {
        throw new Error(
          `${name} composes UnboundedSourceMixin without BulkableMixin; ` +
            `the unbounded-source override needs the bulk slots it overrides.`,
        );
      }
    }

    public getBulkAvailable(_affordance: BulkAffordance): number {
      return Infinity;
    }

    public isBulkEmpty(affordance: BulkAffordance): boolean {
      // `this` is the composed Bulkable host; the generic base loses the
      // mixin surface, so reach it through the interface.
      return (
        (this as unknown as Bulkable).getBulkMaterialPath(affordance) === null
      );
    }

    public debitBulk(_affordance: BulkAffordance, _litres: number): void {
      // No-op: an inexhaustible source never depletes.
    }
  };
}
