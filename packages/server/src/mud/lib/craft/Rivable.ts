/**
 * Rivable — ⭐ **a thing that opens along its grain under a froe**
 * (controller-liquidity D14).
 *
 * `rive` is the forestry trade's verb: set a froe on the end grain, strike
 * it in, lever, and the wood opens along its own fibres. What that MEANS is
 * the wood's: a felled bole gives a length as a stack of billets; a billet
 * gives whatever a recipe rives out of one (a blank, a stave). Whether it
 * opens at all is the wood's `cleavability`. The froe is the verb's to
 * check; the plan is the target's.
 *
 * It was the `rive` key of `Cuttable`'s ten-verb answer map; that map is
 * gone (D14 — cutting is several acts, each its own small protocol).
 */

import type { Stuff } from '../stuff/Stuff';
import type { MixinConstructor } from '../mixin';
import type { ActPlan, ActRefusal } from './ActPlan';
import type { CraftingFailure } from './CraftingDecline';

/** What the request names: who rives, with what, and the word for what into. */
export interface RiveRequest {
  actor: Stuff;
  /** The froe the verb checked. */
  froe: Stuff;
  /** The word for what to rive it into (`rive billet into shakes`), or `''`. */
  into: string;
}

/** `rive` — a length off a bole into billets, or a billet into a recipe's piece. */
export type RiveBegin = { kind: 'bole'; bole: Stuff } | { kind: 'billet' };

export type RiveDone =
  /** Billets off a bole; `left` lengths still in it (0: the butt, gone — `boleName`). */
  | { kind: 'billets'; count: number; wandered: boolean; left: number; bole: Stuff; boleName: string }
  /** A billet riven into a recipe's piece (`riven` — the billet, named before it went). */
  | { kind: 'piece'; riven: string; output: Stuff }
  /** The bole or the rover was gone when it landed. */
  | { kind: 'gone' };

/** ⭐ Every reason the wood refuses a riving — `RiveController` words each. */
export type RiveRefusal =
  | ActRefusal<'not-rivable'>
  | ActRefusal<'will-not-rive', { woodName: string }>
  | ActRefusal<'bole-spent'>
  | ActRefusal<'not-rivable-into', { word: string; choices: readonly string[] }>
  | ActRefusal<'nothing-to-rive'>
  | ActRefusal<'which-rive', { names: readonly string[] }>
  /** The craft refused — `failure` is the crafting failure, said as a craft says it. */
  | ActRefusal<'craft-refused', { failure: CraftingFailure }>;

export type RivePlan = ActPlan<RiveBegin, RiveDone, RiveRefusal>;

/** A thing that opens along its grain. */
export interface Rivable {
  rivePlanFor(req: RiveRequest): Promise<RivePlan | RiveRefusal>;
}

/**
 * ⭐ **`RivableMixin` — the froe's protocol, as a mixin.**
 *
 * IS: wood in the round or split once — a felled bole, a billet. IS NOT:
 * sawn stock (a board's fibres were cut across, and a froe follows nothing
 * in it), nor any tool.
 *
 * ⚠ The default REFUSES (`not-rivable`); a host overrides `rivePlanFor`.
 */
export function RivableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class RivableMixin extends Base implements Rivable {
    static _mixinName: string = 'RivableMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook The riving this wood plans, or a refusal; the default refuses. */
    public async rivePlanFor(_req: RiveRequest): Promise<RivePlan | RiveRefusal> {
      return { ok: false, reason: 'not-rivable' };
    }
  };
}
