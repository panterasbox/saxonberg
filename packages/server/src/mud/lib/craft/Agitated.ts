/**
 * Agitated — ⭐ **a vessel whose contents you work by stirring it**
 * (controller-liquidity W7c, D13 rung 1): the protocol behind `stir`.
 *
 * `stir` was three arms decided by what the vessel turned out to be — a
 * compounding vessel was asked for its knead plan, a hand-worked charge (a
 * churn) was worked by hand, and a build had its method recorded. They are
 * one act: working what is in a vessel until it comes together. The VESSEL
 * plans it — how long, how hard, and what came of it — so the duration a
 * churn takes and the pace a good shaker gives live on the vessel, and the
 * verb engages the plan it is handed.
 *
 * **Implementers:** `CompoundingMixin` (its knead plan, asked with the word
 * the matter wants), `HandWorkedMixin` (the churn's charge), and
 * `ManualBuildMixin` (records the working the vessel names — a shaker
 * shakes, a mixing glass stirs).
 *
 * ⭐ Facts and a reason, never words: the `stir` controller words every
 * member of {@link AgitateRefusal}, {@link AgitateBegin} and
 * {@link AgitateFacts}; the compounding members are `knead`'s own, worded
 * by the same words (D4).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ActPlan } from './ActPlan';
import type { KneadBegin, KneadFacts, KneadRefusal } from './KneadVessel';
import type { HandWorkFacts } from './HandWorked';
import type { BuildMethod } from './ManualBuild';

/** Who is stirring. */
export interface AgitateRequest {
  actor: Stuff;
}

/** ⭐ Every reason a stir is refused — the knead reasons (a build's empty buffer is `empty-build`). */
export type AgitateRefusal = KneadRefusal;

/** What the begin words need. */
export type AgitateBegin =
  | KneadBegin
  /** A build, worked by the method the vessel names. */
  | { kind: 'build'; method: BuildMethod }
  /** A charge worked by hand (a churn). */
  | { kind: 'hand' };

/** What a stir came to. */
export type AgitateFacts =
  | KneadFacts
  /** The build was worked; its method recorded. */
  | { kind: 'built'; method: BuildMethod }
  /** The charge was worked — what it came to, or `null`: nothing in it. */
  | { kind: 'hand-worked'; result: HandWorkFacts | null };

/** A stir plan. */
export type AgitatePlan = ActPlan<AgitateBegin, AgitateFacts, AgitateRefusal>;

/** A vessel that plans the working of what it holds. */
export interface Agitated {
  /** The plan, a refusal, or `null` when this vessel has nothing to say. */
  agitatePlanFor(req: AgitateRequest): Promise<AgitatePlan | AgitateRefusal | null>;
}

export function AgitatedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class AgitatedMixin extends Base implements Agitated {
    static _mixinName: string = 'AgitatedMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook The working this vessel plans — `null` when it has nothing to say. */
    public async agitatePlanFor(_req: AgitateRequest): Promise<AgitatePlan | AgitateRefusal | null> {
      return null;
    }
  };
}
