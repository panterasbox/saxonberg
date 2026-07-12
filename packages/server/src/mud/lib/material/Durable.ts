/**
 * DurableMixin — the **wear-state axis** of a physical object: a thing that
 * wears out with **use, not the clock** (economy Law 2: you dull the knife
 * by cutting, never by time on the wall).
 *
 * Lives in `lib/material/` alongside the other physical-object axes — a made
 * thing has a *material* ({@link TangibleMixin}), a *form* ({@link
 * ConstructedMixin}), and a *condition* (this). The generic durable-good
 * sink: a `0..1 condition` gauge that starts pristine and drops via
 * `wear()`.
 *
 * Deliberately **NOT** "tool" — a weapon, a piece of armor, and a crafting
 * shaker are all *durable goods*, but only the shaker is a tool. Crafting's
 * `ToolMixin` (capabilities) composes this at the use site
 * (`ToolMixin(DurableMixin(…))`); armor and weapons compose it directly
 * (durability alone, no inert capability list). The clean split that stops
 * "is-a tool" from meaning "wears out". Narrow via `MixinApi.isDurable`.
 *
 * Composed on a `Thing` (or any Stuff). Opt-in repair is a later increment.
 */

import type { MixinConstructor } from '../mixin';

export interface Durable {
  /** Wear gauge, 0 (worn out) .. 1 (pristine). */
  getCondition(): number;
  setCondition(value: number): void;
  /** Decrement condition by `amount` (clamped at 0). The wear-on-use seam. */
  wear(amount?: number): void;
}

/** Default per-use wear when a consumer doesn't specify. */
export const WEAR_PER_USE = 0.01;

export function DurableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class DurableMixin extends Base implements Durable {
    static _mixinName = 'DurableMixin';

    static persistentFields = ['condition'];

    /**
     * 0..1 wear gauge; default pristine.
     *
     * @runtimeState
     */
    private _condition: number = 1;

    protected get condition(): number {
      return this._condition;
    }
    protected set condition(value: number) {
      // Per-field invariant on the accessor: clamp into 0..1.
      this._condition = Math.max(0, Math.min(1, value));
    }

    getCondition(): number {
      return this._condition;
    }

    setCondition(value: number): void {
      this.condition = value;
    }

    wear(amount: number = WEAR_PER_USE): void {
      if (!Number.isFinite(amount) || amount < 0) return;
      this.condition = this._condition - amount;
    }
  };
}
