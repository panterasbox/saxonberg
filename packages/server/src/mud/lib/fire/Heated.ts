/**
 * Heated — ⭐ **a thing you take to the fire and hold there until it has
 * taken the heat** (controller-liquidity W7c, D13 rung 1): the protocol
 * behind `heat`.
 *
 * `heat` was three acts decided by what the target turned out to be — a
 * build latched the heat, a tool was held in the flame until it was
 * sterile, and anything else that held heat was SET ON the fire. The first
 * two are one act on two kinds of thing: the thing is brought to the fire
 * in reach, held there, and at the end takes what the fire gave it. What
 * taking it means is the THING's ({@link Heated.takeHeat}): a build latches
 * the hottest heat it reached (and a tempered piece loses its temper), an
 * instrument held in a dry flame is sterilized. The third act was never
 * heating — it was `put <pot> on <hearth>`, and the world heats it there.
 *
 * **IS for:** a build in progress (`ManualBuildMixin` composes it) and an
 * instrument kept clean (the medicine and kitchen tools that compose it).
 * **IS NOT for:** a vat, a pail, a kettle — a vessel warms by being SET ON
 * a fire (`put`), and the furnace couple makes the fire's heat its ambient.
 *
 * ⭐ Facts and a reason, never words: the `heat` controller words every
 * member of {@link HeatRefusal} and {@link HeatTaken}.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ActPlan, ActRefusal } from '../craft/ActPlan';
import { MixinApi } from '../../api/mixin';

/** A plain hold in the flame — real milliseconds the hands are busy. */
const HOLD_MS = 4000;
/** Watts a plain hold costs. */
const HOLD_W = 100;
/** An instrument held in the flame is held this long, game-seconds (cleanliness D14: ≥ 60 s). */
const FLAME_HOLD_S = 60;

/** ⭐ Every reason the act is refused — before it starts, or as it lands. */
export type HeatRefusal =
  /** No fire in reach hot enough to work with. */
  | ActRefusal<'insufficient-heat'>
  /** The fire died while the thing was in it. */
  | ActRefusal<'fire-out'>;

/** How the thing is brought to the fire — the begin words' one fact. */
export interface HeatBegin {
  /** `work` — a build worked in the heat; `hold` — held in the flame and turned. */
  manner: 'work' | 'hold';
}

/**
 * ⭐ What taking the heat did — each host adds its own fact. A fact a host
 * did not set is absent.
 */
export interface HeatTaken {
  /** The heat the thing took, K. */
  heatK: number;
  /** A build latched the heat (its recipes read it at the finish). */
  latched?: boolean;
  /** A hardened piece lost its temper in the fire. */
  annealed?: boolean;
  /** An instrument held in the flame — whether it came out sterile. */
  sterile?: boolean;
}

/** A heat plan. */
export type HeatPlan = ActPlan<HeatBegin, HeatTaken, HeatRefusal>;

/** A thing you take to the fire. */
export interface Heated {
  /** Bring this to the fire in `actor`'s reach: the plan, or why not. */
  heatPlanFor(actor: Stuff): HeatPlan | HeatRefusal;
  /**
   * @hook What taking `heatK` does to this thing. Default: nothing but the
   * heat itself. A host adds its fact and returns `super`'s with it.
   */
  takeHeat(heatK: number): HeatTaken;
  /** @hook How the thing is brought to the fire — the begin words' fact. */
  heatManner(): HeatBegin['manner'];
  /** @hook How long the hands are busy, ms, and how hard. */
  heatEffort(): { durationMs: number; effortW: number };
}

/** The heat the actor's reach offers — a fire in reach, or `0`. */
function reachableK(actor: Stuff): number {
  return MixinApi.isThermal(actor) ? actor.reachableHeatK() : 0;
}

export function HeatedMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class HeatedMixin extends Base implements Heated {
    static _mixinName: string = 'HeatedMixin';
    static _mixinKind = 'protocol' as const;

    public heatPlanFor(actor: Stuff): HeatPlan | HeatRefusal {
      if (reachableK(actor) <= 0) return { ok: false, reason: 'insufficient-heat' };
      const { durationMs, effortW } = this.heatEffort();
      return {
        ok: true,
        durationMs,
        effortW,
        facts: { manner: this.heatManner() },
        onComplete: () => {
          // Re-read at completion — the fire may have died mid-step; the
          // thing takes the heat the fire actually had at the finish.
          const finalK = reachableK(actor);
          const self = this as unknown as Stuff;
          if (self.isDestroyed() || finalK <= 0) return { ok: false, reason: 'fire-out' };
          return { ok: true, facts: this.takeHeat(finalK) };
        },
      };
    }

    /**
     * @hook The thing takes the heat. ⭐ The default is the instrument's own
     * act — a DRY heat, past the spores: a soilable thing held in the flame
     * for a minute at the fire's heat (cleanliness D14).
     */
    public takeHeat(heatK: number): HeatTaken {
      const self = this as unknown as Stuff;
      if (!MixinApi.isSoilable(self)) return { heatK };
      self.holdAtHeat(heatK, FLAME_HOLD_S, { wet: false });
      return { heatK, sterile: self.cleanTier() === 'sterile' };
    }

    /** @hook Held in the flame and turned. */
    public heatManner(): HeatBegin['manner'] {
      return 'hold';
    }

    /** @hook A plain hold. */
    public heatEffort(): { durationMs: number; effortW: number } {
      return { durationMs: HOLD_MS, effortW: HOLD_W };
    }
  };
}
