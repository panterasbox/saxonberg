/**
 * Sweepable — ⭐ **a thing you sweep, and it says what comes up**
 * (controller-liquidity W7c, D13 rung 1): the protocol behind `sweep`.
 *
 * `sweep` was three acts decided by what the target turned out to be — a
 * floor swept into a heap, a grate raked of its ash, a flue brushed of its
 * soot. They are one act with three hosts: the thing is swept with what the
 * sweeper has to hand, and what comes up — and how long it takes — is the
 * thing's. A floor decides what a broom takes up (`FloorMixin.sweepInto` —
 * everything on an earth floor, only the debris on a scrubbed one); a fire
 * decides what is in its grate (`Burner.rakeGrate`); a flued fire takes the
 * brush up its chimney (`Flued.sweepChimney`) when the sweeper has one.
 *
 * **Implementers:** `FloorMixin`, `BurnerMixin`, `FluedMixin` (overriding
 * its fire's grate when a brush is to hand).
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
  ActRefusal<'nothing-to-sweep'>;

/** What the begin words need. */
export type SweepBegin =
  | { kind: 'floor'; broom: boolean }
  | { kind: 'grate' }
  | { kind: 'flue' };

/** What a sweep came to. */
export type SweepFacts =
  /** The floor swept: the kinds taken up and the heap they went into (`null` — nothing worth it). */
  | { kind: 'floor'; kinds: Record<string, number>; heap: Stuff | null }
  /** The grate raked: the ash, in heaps (none — hardly any). */
  | { kind: 'grate'; ash: readonly Stuff[] }
  /** The flue swept: the soot that came down, and what of it was gathered. */
  | { kind: 'flue'; sootKg: number; taken: readonly Stuff[] };

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
