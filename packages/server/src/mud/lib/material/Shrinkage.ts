/**
 * ShrinkageMixin — *it SEASONS.*
 *
 * How long a 25 mm board of it takes to dry and how much it shrinks doing it.
 * Wood only.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasShrinkage(m)` and never on a material's kind.
 */

import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';
import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface Shrinkage {
  getSeasoningDays(): number;
  getGreenShrinkage(): number;
}

export function ShrinkageMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class ShrinkageMixin extends Base implements Shrinkage {
    static _mixinName = 'ShrinkageMixin';

    static fieldMeta: FieldMeta = {
      // ⭐ Seasoning (assembly D2): how long a 25 mm board of this takes to
      // dry in good drying air, in game-days; and how much it shrinks doing
      // it. Both 0 for anything that does not season — which is every
      // material but wood, so the seasoning clock is vacuous on them.
      seasoningDays: { persistent: true },
      greenShrinkage: { persistent: true },
    };

    /**
     * Indentation hardness as a `Quantity<'MPa'>` — resistance to a
     * concentrated (point / edge) load. A real, tabulated material property
     * (hardened steel ≫ bronze ≫ leather ≫ cloth), Quantity-typed and strict
     * on unit like `density`. The *height* a material lends the response
     * curve for the `edge` / `point` channels; read by `MaterialApi`'s
     * response function. Zero-default until authored (materials stay
     * content — packs supply the roster's values).
     */
    /** Game-days a 25 mm board takes to season in good air; 0 = never seasons. */
    public seasoningDays = 0;
    /** 0..1 — how much it shrinks drying from green; what makes green work warp. */
    public greenShrinkage = 0;

    /**
     * Read indentation hardness. Strict on `Quantity<'MPa'>`; the
     * QuantityMarshaller absorbed authoring-shape coercion at the
     * persistence boundary.
     */
    /** Days to season a 25 mm board in good drying air; 0 = does not season. */
    public getSeasoningDays(): number {
      return Number.isFinite(this.seasoningDays) && this.seasoningDays > 0
        ? this.seasoningDays
        : 0;
    }
    /** 0..1 shrinkage from green to seasoned. */
    public getGreenShrinkage(): number {
      return Math.max(0, Math.min(1, Number(this.greenShrinkage) || 0));
    }
  };
}
