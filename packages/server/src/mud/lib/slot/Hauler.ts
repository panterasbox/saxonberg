/**
 * HaulerMixin — hauler side of haulage: "this creature can hitch and pull
 * a cart." The counterpart to `HaulableMixin` (the cart). Carries the
 * live ref to the cart being pulled and folds the cart's draft load into
 * the bearer's encumbrance via `getHaulDraft()` (read by
 * `LoadBearingMixin.getBorneBurden`).
 *
 * **Composed where it's earned, not on the `Creature` base** — on the
 * player `Character` stack (every player self-hauls a handcart) and on
 * the dedicated `platform/agent/DraftAnimal` class (draft beasts).
 * ⚠ `hitch.yaml:35` gates its target on this mixin and is its ONLY
 * reader — zero `MixinApi.isHauler` narrowings, zero affordance statics
 * — so that arg gate is the whole of its reachability, and a host that
 * loses it loses `hitch` silently at the binder. Most creatures
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
import type { VetoResult } from '../errors';
import { ExecutionContextApi } from '../../api/execution-context';
import type { ActPlan, ActRefusal } from '../craft/ActPlan';
import { MixinApi } from '../../api/mixin';
import { SubscriptionApi } from '../../api/subscription';
import { AccessApi } from '../../api/access';

/**
 * ⭐ Every reason a hitch refuses — `HitchController` words each
 * (controller-liquidity W8). `hitch-refused` carries the cart's own veto
 * (`Haulable.canHitch`), which is the cart's sentence.
 */
export type HitchRefusal =
  | ActRefusal<'hitch-refused', { veto: string }>
  | ActRefusal<'already-hitched'>
  | ActRefusal<'hands-on-cart', { hands: number; held: Stuff[] }>;

/** What a hitch's words need: the cart, who pulls it, and whether by hand. */
export interface HitchFacts {
  cart: Stuff & Haulable;
  hauler: Stuff & Hauler;
  /** The actor took the handle themselves (no beast between). */
  byHand: boolean;
}

/** A hitch: instant (`durationMs: 0`); the coupling is made at completion. */
export type HitchPlan = ActPlan<HitchFacts, HitchFacts, HitchRefusal>;

/** The public surface added by HaulerMixin. */
export interface Hauler {
  /** The cart currently hitched (R2.3 self-heal), or null. */
  getHauledCart(): (Stuff & Haulable) | null;
  /** Whether a cart is currently hitched. */
  isHitched(): boolean;
  /** Hitch a cart — becomes this creature's hauled cart (atomic pair). */
  hitch(cart: Stuff & Haulable): void;
  /**
   * ⭐ May `actor` couple `cart` to me, and if so the hitch (controller-
   * liquidity W8): the cart's own veto first (`canHitch`), then whether I
   * already pull something, then — when the actor is taking the handle
   * themselves — whether they have the hands the cart's handles take
   * (`Carrying.freeHands` against `getHandedness`; a harnessed beast
   * claims no hands). Overload never
   * refuses here: the cost surfaces at move time.
   */
  hitchPlanFor(cart: Stuff & Haulable, actor: Stuff): Promise<HitchPlan | HitchRefusal>;
  /**
   * Release the hitched cart, as `by` (clears both sides). ⭐ Asks the
   * cart's `canUnhitch(this, by)` first (controller-liquidity D9); the hauler
   * letting go of its own cart always may. Nothing hitched → `{ok: true}`.
   */
  unhitch(by: Stuff): VetoResult;
  /**
   * ⭐ The harness SLIPS from `cart` — uncoupled as this hauler's OWN act
   * (call-security pass D6), so no third party's veto applies: re-hitching
   * elsewhere, a teleport of either side. A no-op unless `cart` is the one
   * this hauler pulls. Returns whether it was uncoupled.
   */
  slipFrom(cart: Stuff): boolean;
  /** Effective-kg draft this creature bears for its hitched cart (0 if none). */
  getHaulDraft(): Quantity<'kg'>;
}

export function HaulerMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class HaulerMixin extends Base implements Hauler {
    static _mixinName = 'HaulerMixin';

    static fieldMeta: FieldMeta = {
      // The hitch coupling, hauler side. The reciprocal clear on
      // destruct is DECLARED — `hitch`/`unhitch` stay, because they are
      // the atomic setter pair, not cleanup.
      _hauling: {
        ref: 'instance',
        lifetime: 'symmetric',
        inverse: '_hauledBy',
      },
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
      const held = this.getHauledCart();
      if (held) this.slipFrom(held);
      this._hauling = SubscriptionApi.fireFieldChange(this, 'hauling', this._hauling, cart);
      cart.setHauledBy(this as unknown as Stuff & Hauler);
    }

    public async hitchPlanFor(
      cart: Stuff & Haulable,
      actor: Stuff,
    ): Promise<HitchPlan | HitchRefusal> {
      const self = this as unknown as Stuff & Hauler;
      const veto = await cart.canHitch(self, actor);
      if (!veto.ok) {
        return { ok: false, reason: 'hitch-refused', facts: { veto: veto.reason || 'It will not couple.' } };
      }
      if (this.isHitched()) return { ok: false, reason: 'already-hitched' };
      const byHand = self.stuffId === actor.stuffId;
      // ⭐ The handles take the hands the cart says (size and carrying D18).
      // A body with fewer hands than the handles gives all it has.
      const need = MixinApi.isCarrying(self) ? Math.min(cart.getHandedness(), self.handSlots().length) : 0;
      if (byHand && MixinApi.isCarrying(self) && self.freeHands() < need) {
        return {
          ok: false,
          reason: 'hands-on-cart',
          facts: { hands: need, held: self.heldThings() },
        };
      }
      const facts: HitchFacts = { cart, hauler: self, byHand };
      return {
        ok: true,
        durationMs: 0,
        effortW: 0,
        facts,
        onComplete: () => {
          self.hitch(cart);
          return { ok: true, facts };
        },
      };
    }

    public unhitch(by: Stuff): VetoResult {
      // who is acting must be who is named (call-security pass D5)
      AccessApi.requireActor(by);
      const cart = this._hauling;
      if (!cart) return { ok: true };
      const veto = cart.canUnhitch(this as unknown as Stuff, by);
      if (!veto.ok) return veto;
      this._hauling = SubscriptionApi.fireFieldChange(this, 'hauling', this._hauling, null);
      cart.setHauledBy(null);
      return { ok: true };
    }

    public slipFrom(cart: Stuff): boolean {
      const held = this._hauling;
      if (!held || held.stuffId !== cart.stuffId) return false;
      const self = this as unknown as Stuff;
      return ExecutionContextApi.runAsSelf(() => this.unhitch(self)).ok;
    }

    public getHaulDraft(): Quantity<'kg'> {
      return this.getHauledCart()?.getDraftLoad() ?? Quantity.of(0, 'kg');
    }

  };
}
