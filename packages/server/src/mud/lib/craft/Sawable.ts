/**
 * Sawable — ⭐ **a thing that answers the saw** (controller-liquidity D14).
 *
 * `saw` is the carpentry trade's verb: a log goes on a sawmill's carriage
 * or over a pit and comes off as boards. The SAW paces the cut — by the
 * log's mass and the race — so the plan a sawable thing answers is never
 * engaged by itself: it is the CHARGE (what goes on the carriage, how green
 * it is) and the TAKE (what the cut consumes of the thing), and the verb
 * calls `onComplete` at the moment the saw comes through.
 *
 * ⭐ A thing answers this only when sawing it is not just weighing it: a
 * felled bole gives one green length at a time and is gone at the butt. A
 * piece of wood with no saw cut of its own — a log off the crown, a billet —
 * is weighed as it is by the verb; it does not compose this.
 *
 * It was the `saw` key of `Cuttable`'s ten-verb answer map; that map is
 * gone (D14 — cutting is several acts, each its own small protocol).
 */

import type { Stuff } from '../stuff/Stuff';
import type { MixinConstructor } from '../mixin';
import type { ActPlan, ActRefusal } from './ActPlan';
import type Material from '../material/Material';

/** What a log puts on the saw carriage, and how green it is. */
export interface SawCharge {
  kg: number;
  /** The wood. */
  material: Material | null;
  /** Seasoned fraction of what went on (a bole is green: 0). */
  seasoned: number;
}

/** What the saw's take left of the log. */
export interface SawTaken {
  /** Lengths still in it; 0 = the butt, and it is gone. */
  left: number;
}

/** ⭐ Every reason a thing refuses the saw — `SawController` words each. */
export type SawRefusal = ActRefusal<'not-sawable'> | ActRefusal<'bole-spent'>;

/** The saw's plan: the charge, and the take at the moment the cut is through. */
export type SawPlan = ActPlan<SawCharge, SawTaken, SawRefusal>;

/** A thing that answers the saw. */
export interface Sawable {
  sawPlanFor(actor: Stuff, saw: Stuff): Promise<SawPlan | SawRefusal>;
}

/**
 * ⭐ **`SawableMixin` — the saw protocol, as a mixin.**
 *
 * IS: a thing whose sawing is its own business — a felled bole, a length at
 * a time. IS NOT: any piece of wood (weighed as it is, by the verb), nor
 * sawn stock (a board is cut, not sawn again).
 *
 * ⚠ The default REFUSES (`not-sawable`); a host overrides `sawPlanFor`.
 */
export function SawableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class SawableMixin extends Base implements Sawable {
    static _mixinName: string = 'SawableMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook The charge and the take, or a refusal; the default refuses. */
    public async sawPlanFor(_actor: Stuff, _saw: Stuff): Promise<SawPlan | SawRefusal> {
      return { ok: false, reason: 'not-sawable' };
    }
  };
}
