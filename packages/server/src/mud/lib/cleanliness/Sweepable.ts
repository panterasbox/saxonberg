/**
 * Sweepable — ⭐ **a thing you sweep, and it says what comes up**
 * (controller-liquidity W7c, D13 rung 1; slimmed in W18): the protocol
 * behind `sweep`.
 *
 * Two hosts, one act, one result: a FLOOR swept with a broom (or bare
 * hands) into a heap (`FloorMixin.sweepInto` — everything on an earth
 * floor, only the debris on a scrubbed one), and a flued fire's CHIMNEY
 * swept with a flue brush (`Flued.sweepChimney` — the soot comes down).
 * Either way the sweeper takes something up off a surface: so many kg, of
 * these kinds, and what of it is now in their hands. How long it takes is
 * the thing's.
 *
 * ⚠ Raking a grate is NOT a sweep (owner, 2026-11-10): W7c had a third
 * host here (`BurnerMixin`, its grate's ash) and a three-way union result;
 * the grate is `rake`'s now (`Burner.rakePlan`), and a fire with no flue is
 * not swept at all.
 *
 * **Implementers:** `FloorMixin`, `FluedMixin`.
 *
 * ⭐ Facts and a reason, never words: the `sweep` controller words every
 * member of {@link SweepRefusal}, {@link SweepBegin} and {@link SweepFacts}.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ActPlan, ActRefusal } from '../craft/ActPlan';

/** Who sweeps, and with what. */
export interface SweepRequest {
  actor: Stuff;
  /** A broom (`sweeping`) is to hand — a floor goes three times as fast. */
  broom: boolean;
  /** A flue brush (`flue-brushing`) is to hand — a chimney can be swept. */
  brush: boolean;
}

/** ⭐ Every reason a sweep is refused. */
export type SweepRefusal =
  /** A floor that takes no soil (bare rock, water) — nothing a broom could take up. */
  | ActRefusal<'nothing-to-sweep'>
  /** A chimney wants a flue brush — a broom does not go up a flue. */
  | ActRefusal<'no-brush'>;

/** What the begin words need: what the sweeper is sweeping with. */
export interface SweepBegin {
  tool: 'broom' | 'brush' | 'hands';
}

/** What a sweep came to — the same shape for a floor and a flue. */
export interface SweepFacts {
  /** What came up, kg (`0` — nothing worth the name). */
  kg: number;
  /** What it was, by kind (`soot`, `grit`, `crumbs`, …), kg each. */
  kinds: Record<string, number>;
  /** What of it is now in the sweeper's hands — a heap, a lump of soot; empty when it fell where it fell. */
  taken: readonly Stuff[];
}

/** A sweep plan. */
export type SweepPlan = ActPlan<SweepBegin, SweepFacts, SweepRefusal>;

/** A thing you sweep. */
export interface Sweepable {
  /** Sweep this with what `req` has to hand: the plan, a refusal, or `null` (nothing to sweep). */
  sweepPlanFor(req: SweepRequest): SweepPlan | SweepRefusal | null;
}

export function SweepableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SweepableMixin extends Base implements Sweepable {
    static _mixinName: string = 'SweepableMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook The sweep this thing plans — `null` when there is nothing to sweep. */
    public sweepPlanFor(_req: SweepRequest): SweepPlan | SweepRefusal | null {
      return null;
    }
  };
}
