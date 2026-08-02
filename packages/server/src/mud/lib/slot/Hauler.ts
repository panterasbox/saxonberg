/**
 * HaulerMixin — hauler side of haulage: "this creature can hitch and pull
 * a cart." The counterpart to `HaulableMixin` (the cart). Carries the
 * live ref to the cart being pulled and folds the cart's draft load into
 * the bearer's encumbrance via `getHaulDraft()` (read by
 * `LoadBearingMixin.getBorneBurden`).
 *
 * **Composed where it's earned, not on the `Creature` base** — on the
 * player `Character` stack (every player self-hauls a handcart) and on
 * the dedicated `HaulingCreature` class (draft beasts). Most creatures
 * never haul, so the base stays clean (the encumbrance doc's "compose the
 * mixin, not the class tree" rule).
 *
 * The hitch coupling is a Pattern-B live ref (`_hauling` here ↔
 * `_hauledBy` on `HaulableMixin`), a symmetric R2.2 pair with an R2.3
 * self-heal, which is now DECLARED (`{ ref: 'instance' }`) rather than
 * written into the getter. `hitch`/`unhitch` keep both sides atomic; `onDestruct`
 * clears the back-ref. The ref is **runtime-only** (not persisted) — a
 * reloaded hauler wakes up un-hitched. See `docs/ref-shapes.md`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Quantity } from '../quantity';
import type { Stuff } from '../stuff/Stuff';
import type { Haulable } from './Haulable';

/** The public surface added by HaulerMixin. */
export interface Hauler {
  /** The cart currently hitched (R2.3 self-heal), or null. */
  getHauledCart(): (Stuff & Haulable) | null;
  /** Whether a cart is currently hitched. */
  isHitched(): boolean;
  /** Hitch a cart — becomes this creature's hauled cart (atomic pair). */
  hitch(cart: Stuff & Haulable): void;
  /** Release the hitched cart, if any (clears both sides). */
  unhitch(): void;
  /** Effective-kg draft this creature bears for its hitched cart (0 if none). */
  getHaulDraft(): Quantity<'kg'>;
}

export function HaulerMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class HaulerMixin extends Base implements Hauler {
    static _mixinName = 'HaulerMixin';

    static fieldMeta: FieldMeta = {
      // The hitch coupling, hauler side. Symmetric with
      // `Haulable._hauledBy`; self-heals on read as every instance ref
      // does.
      _hauling: { ref: 'instance', lifetime: 'weak' },
    };

    /** Live ref to the hitched cart — runtime-only, never persisted. */
    private _hauling: (Stuff & Haulable) | null = null;

    public getHauledCart(): (Stuff & Haulable) | null {
      return this._hauling;
    }

    public isHitched(): boolean {
      return this.getHauledCart() !== null;
    }

    public hitch(cart: Stuff & Haulable): void {
      // Drop any existing cart first (one hauler pulls one cart in v1).
      this.unhitch();
      this._hauling = cart;
      cart.setHauledBy(this as unknown as Stuff & Hauler);
    }

    public unhitch(): void {
      const cart = this._hauling;
      this._hauling = null;
      if (cart) cart.setHauledBy(null);
    }

    public getHaulDraft(): Quantity<'kg'> {
      return this.getHauledCart()?.getDraftLoad() ?? Quantity.of(0, 'kg');
    }

    /** R2.2 reciprocal clear — let go of the cart before chaining super. */
    public onDestruct(): void {
      this.unhitch();
      super.onDestruct();
    }
  };
}
