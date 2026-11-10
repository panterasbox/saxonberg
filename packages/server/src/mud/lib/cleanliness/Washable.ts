/**
 * Washable — ⭐ **a thing you wash at water** (controller-liquidity W7c, D13
 * rung 1): the protocol behind `wash`.
 *
 * `wash` was two acts decided by what was named — the things went into the
 * water together, and bare `wash` washed your hands — with the batch's
 * orchestration in the controller. They are one act: something is washed
 * at the water in reach by ONE wash's chemistry (`WashSpec` — the water's
 * heat and hardness, the cleansers, the effort). What washing it means is
 * the thing's: a good is washed by its own `washSite` with the rest of the
 * load as its co-wash (where an unfast dye's colour goes); a BODY washed by
 * its owner washes the layer at each hand (`HygieneMixin` overrides — the
 * gloves come clean and the hands under them stay as they were).
 *
 * **Implementers:** `SoilableMixin` composes it (every soilable thing is
 * washed by the default below); `HygieneMixin` overrides for the hands.
 *
 * ⭐ Facts and a reason, never words: the `wash` controller words every
 * member of {@link WashRefusal}, {@link WashBegin} and {@link WashFacts}.
 * ⚠ `not-washed-so` carries the thing's own sentence (`washRefusal` — a
 * strewn earth floor says why it is not scrubbed): that prose is the
 * thing's and predates the protocol.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ActPlan, ActRefusal } from '../craft/ActPlan';
import type { WashOutcome, WashSpec } from './Soilable';
import { CleanserUse } from './CleanserUse';
import { MixinApi } from '../../api/mixin';

/** One plain wash, real milliseconds; a hard one is `effort` of them. */
const WASH_MS = 3000;
/** A plain wash's watts; a scrub's. */
const WASH_W = 200;
const SCRUB_W = 350;

/** One wash — who is washing, and the water and soap it is done with. */
export interface WashRequest {
  actor: Stuff;
  spec: WashSpec;
  /** The rest of the load going into the same water with this thing. */
  alongside?: readonly Stuff[];
}

/** ⭐ Every reason a wash is refused. */
export type WashRefusal =
  /** The thing says why it is not washed so (its own sentence). */
  | ActRefusal<'not-washed-so', { why: string }>
  /** Nothing in the load will wash clean. */
  | ActRefusal<'not-washable'>
  /** A body with no hands to wash. */
  | ActRefusal<'no-hands'>;

/** What the begin words need. */
export type WashBegin =
  | { kind: 'things'; items: readonly Stuff[] }
  | { kind: 'hands'; gloved: boolean };

/** What a wash came to. */
export type WashFacts =
  | { kind: 'things'; results: readonly { item: Stuff; outcome: WashOutcome }[] }
  | { kind: 'hands'; gloved: boolean; clean: boolean };

/** A wash plan. */
export type WashPlan = ActPlan<WashBegin, WashFacts, WashRefusal>;

/** A thing you wash at water. */
export interface Washable {
  /** Wash this (and the rest of the load) by `req.spec`: the plan, or why not. */
  washPlanFor(req: WashRequest): WashPlan | WashRefusal;
  /**
   * @hook How long one wash by `spec` takes, ms, and how hard: `effort`
   * washes' worth of time; a scrub costs more.
   */
  washPaceFor(spec: WashSpec): { durationMs: number; effortW: number };
}

export function WashableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class WashableMixin extends Base implements Washable {
    static _mixinName: string = 'WashableMixin';
    static _mixinKind = 'protocol' as const;

    public washPaceFor(spec: WashSpec): { durationMs: number; effortW: number } {
      return { durationMs: WASH_MS * spec.effort, effortW: spec.effort > 1 ? SCRUB_W : WASH_W };
    }

    /**
     * @hook ⭐ The load washed together: this thing and everything
     * `alongside` it that washes (each its own `washSite`, the load its
     * co-wash), the cleansers spent once per thing washed.
     */
    public washPlanFor(req: WashRequest): WashPlan | WashRefusal {
      const self = this as unknown as Stuff;
      const load = [self, ...(req.alongside ?? [])].filter((t) => MixinApi.isSoilable(t));
      const items = load.filter((t) => MixinApi.isSoilable(t) && t.washRefusal() === null);
      if (items.length === 0) {
        for (const t of load) {
          const why = MixinApi.isSoilable(t) ? t.washRefusal() : null;
          if (why !== null) return { ok: false, reason: 'not-washed-so', facts: { why } };
        }
        return { ok: false, reason: 'not-washable' };
      }
      const spec = req.spec;
      return {
        ok: true,
        ...this.washPaceFor(spec),
        facts: { kind: 'things', items },
        onComplete: () => {
          const washed = items.filter((t) => !t.isDestroyed());
          const coWashed = { ...spec, coWashed: washed };
          const results: { item: Stuff; outcome: WashOutcome }[] = [];
          for (const item of washed) {
            if (!MixinApi.isSoilable(item)) continue;
            results.push({ item, outcome: item.washSite(coWashed, '') });
          }
          new CleanserUse(spec.cleansers).spend(results.length);
          return { ok: true, facts: { kind: 'things', results } };
        },
      };
    }
  };
}
