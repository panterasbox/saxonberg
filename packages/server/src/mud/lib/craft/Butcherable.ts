/**
 * Butcherable — ⭐ **a dead body that keeps a ledger of what is still on
 * it** (controller-liquidity D14).
 *
 * `butcher` is the cooking trade's verb. The species says what a body
 * yields (`Species.dressOut`); the BODY says the condition it died in and
 * which lines are still on it, and marks a line taken. A side is worked to
 * order — lift the loin to sell, come back for the rest — because the body
 * keeps the ledger, and it goes when every line is off it.
 *
 * The plan is never engaged: a butchering is instant and the verb mints the
 * cuts. The body answers the facts (its {@link ButcherCarcass}) and its
 * `onComplete` says whether the yield the knife asked about is now all off.
 *
 * ⭐ **The default is the body with no ledger**: every line counts as on
 * it, taking one marks nothing, and it is spent when the knife is done — so
 * a body that carries no record still breaks down once, whole. `Corpse`
 * overrides it with its tissue record.
 *
 * It was the `butcher` key of `Cuttable`'s ten-verb answer map; that map is
 * gone (D14 — cutting is several acts, each its own small protocol).
 */

import type { Stuff } from '../stuff/Stuff';
import type { MixinConstructor } from '../mixin';
import type { ActPlan } from './ActPlan';

/** One line of a species' yield, as the butcher asks the carcass about it. */
export interface CarcassLine {
  /** The cut row's path. */
  cut: string;
  /** The muscles it claims (empty = a whole line, kept by its path). */
  tissues: readonly string[];
}

/**
 * ⭐ The carcass ledger a body answers `butcher` with: the condition it
 * died in, and which lines are still on it. A line taken is marked here.
 */
export interface ButcherCarcass {
  /** The condition frozen at the kill, or `null` when none was stamped. */
  fleshPct: number | null;
  /** Is this line still on the body? */
  stillOn(line: CarcassLine): boolean;
  /** Mark this line taken off the body. */
  take(line: CarcassLine): void;
}

/** Every line of the species' yield is off the body — it goes. */
export interface ButcherDone {
  spent: boolean;
}

/** A butchering's plan — it never refuses; the verb's gates come first. */
export type ButcherPlan = ActPlan<ButcherCarcass, ButcherDone, never>;

/** A body the butcher's knife asks for its ledger. */
export interface Butcherable {
  /** `lines` — every line of the species' yield, for the spent check. */
  butcherPlanFor(actor: Stuff, lines: readonly CarcassLine[]): Promise<ButcherPlan>;
}

/**
 * ⭐ **`ButcherableMixin` — the carcass ledger, as a mixin.**
 *
 * IS: a dead body that can be broken down (`Corpse`). IS NOT: a live
 * animal — that is slaughtered first, and then it is butchered; so the
 * mixin is never on `Creature`.
 */
export function ButcherableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class ButcherableMixin extends Base implements Butcherable {
    static _mixinName: string = 'ButcherableMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook The body's ledger; the default keeps none and is spent at once. */
    public async butcherPlanFor(_actor: Stuff, _lines: readonly CarcassLine[]): Promise<ButcherPlan> {
      return {
        ok: true,
        durationMs: 0,
        effortW: 0,
        facts: { fleshPct: null, stillOn: () => true, take: () => undefined },
        onComplete: () => ({ ok: true, facts: { spent: true } }),
      };
    }
  };
}
