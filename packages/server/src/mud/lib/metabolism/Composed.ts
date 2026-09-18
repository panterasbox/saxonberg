/**
 * ComposedMixin — **what a discrete food is made of**, as the same
 * `BlendPart[]` a bulk blend carries on its payload.
 *
 * ⭐⭐ The gap this closes. A blend in a pot has always known its
 * ingredients (`BulkPayload.composition`), and the nutrition label reads
 * them. A *tangible* food knew only its Material — so the moment a chain
 * ended in something you hold rather than something you pour, everything
 * the ingredients knew was lost. A loaf baked from wholemeal flour and a
 * loaf baked from white flour were the same object made of `bread`.
 *
 * That is not a bread problem. A sausage, a cutlet in batter, a pie: the
 * claim **every food can be made of parts** is true of `Provision` by
 * name, which is why the mixin composes there and nowhere narrower. An
 * empty list is the default and costs a single empty array.
 *
 * ⚠ It is NOT on `Thing` — a rock has no ingredients — and NOT on
 * `CraftedMixin`: a chair is crafted and has no nutrition to sum.
 *
 * The five links that carry a composition from a mill to a plate, each of
 * which fails closed and silent:
 *
 *   1. the working stamps the product payload (the mill's bolting)
 *   2. a pour banks the source's parts onto its `BuildContribution`
 *   3. `derivePayload` expands a consumed input's parts instead of
 *      collapsing to its blend identity
 *   4. a maturation product swap keeps the payload
 *   5. a tangible mint writes the merged parts here
 *
 * See [docs/subsystems/bulk.md] + [metabolism.md].
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { BlendPart } from '../bulk/Bulkable';

/** The composition capability surface. */
export interface Composed {
  /** What this food is made of; empty = only its Material speaks for it. */
  getComposition(): readonly BlendPart[];
  /** Replace the composition outright (the mint, and the test seam). */
  setComposition(parts: readonly BlendPart[]): void;

  // Public so the Hydrator can reflect into it.
  composition: BlendPart[];
}

export function ComposedMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class ComposedMixin extends Base implements Composed {
    static _mixinName: string = 'ComposedMixin';

    static fieldMeta: FieldMeta = {
      composition: { persistent: true },
    };

    /**
     * The ingredients, by Material path and servings. Empty is the sparse
     * default and the honest one: a raw cut of meat is not *made of*
     * anything, it simply IS its material, and `BlendLabel` already falls
     * back to the material's own amounts when a composition is empty.
     *
     * ⚠ Authorable: a row may state its own composition, which is how an
     * NPC counter can stock a white loaf before any player has milled
     * flour. That is not a band — it is one row's authored ingredients,
     * and a player's own loaf comes out of the chain with no row at all.
     */
    public composition: BlendPart[] = [];

    public getComposition(): readonly BlendPart[] {
      return this.composition;
    }

    public setComposition(parts: readonly BlendPart[]): void {
      if (!Array.isArray(parts)) return;
      this.composition = parts
        .filter(
          (p): p is BlendPart =>
            !!p &&
            typeof p.materialPath === 'string' &&
            p.materialPath.length > 0 &&
            Number.isFinite(p.servings) &&
            p.servings > 0,
        )
        .map((p) => ({ materialPath: p.materialPath, servings: p.servings }));
    }
  };
}
