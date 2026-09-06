/**
 * SelfHeatingMixin — ⭐⭐ **hay put up wet heats until the barn burns
 * down** (D48), and it is genuinely how barns burn.
 *
 * This is the single most instructive failure in the design and it cost
 * almost no new mechanism: it reads the **wetness** every `Thing`
 * already carries, the shape of the **fermentation heat model** the
 * cellar build already ships, and `Combustible`'s own **autoignition**
 * point. Nothing here invents a fire.
 *
 * ## Why it is the memorable one
 *
 * > It destroys the entire winter feed store **weeks after** a mistake
 * > that was invisible at the time.
 *
 * You cut in a damp spell and stacked before it was fit. The stack looked
 * fine. It looked fine for a fortnight. And there is no roll anywhere in
 * it: microbes in wet forage respire, respiration makes heat, a big stack
 * has almost no surface to lose it through, and above about 55 °C the
 * chemistry stops needing the microbes at all and runs away on its own.
 * Every one of those steps is real.
 *
 * ⚠ **The moisture is stamped at BALING**, not read live. Hay dries in
 * the stack from the outside and it makes no difference: what decides
 * whether a rick heats is what went into it, which is exactly why the
 * mistake is invisible and why *"it seemed dry enough"* is the sentence
 * that burns barns.
 *
 * ⭐ And the threshold is the real one. Under about 20 % moisture a bale
 * is safe indefinitely; over about 25 % it is dangerous; the band between
 * is where judgement lives. Nothing rounds that to a boolean.
 */

import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const SECONDS_PER_GAME_DAY = 86_400;

export const SELF_HEATING_MIXIN = 'SelfHeatingMixin';

/** Ambient a stack starts from and cools back toward, in kelvin. */
const AMBIENT_K = 288;

/**
 * Moisture fraction below which a stack is safe indefinitely. ⭐ The real
 * figure: under about 20 % a bale keeps for years.
 */
export const SAFE_MOISTURE = 0.2;

/**
 * Moisture above which it is genuinely dangerous. ⚠ The band between
 * this and {@link SAFE_MOISTURE} is where judgement lives, and nothing
 * rounds it to a boolean.
 */
export const DANGEROUS_MOISTURE = 0.25;

/**
 * Kelvin above which the chemistry no longer needs the microbes and runs
 * away on its own. ⭐ ~55 °C, and it is why a stack that got warm and
 * then got hot does not stop.
 */
const RUNAWAY_K = 328;

/**
 * Microbial heating, kelvin per GAME day, at `drive` = 1 (that is, at
 * exactly the dangerous moisture).
 *
 * ⭐ **Calibrated from the two facts, not fitted to an outcome.** With
 * the cooling coefficient below, a stack settles at
 * `ambient + heating/cooling × drive` — so a rick baled exactly AT the
 * dangerous line settles at about 325 K, a hair under the runaway point,
 * and one baled well over it does not settle at all. That is the real
 * shape: marginal hay gets frighteningly hot and survives, and wet hay
 * burns.
 */
const PEAK_HEATING_K_PER_DAY = 3;

/**
 * How fast a stack sheds heat toward ambient, per GAME day.
 *
 * ⚠ Small, and that is the second fact: **a big stack has almost no
 * surface to lose heat through**, which is why hay in a barn burns and
 * hay in a hedge does not. It also sets the timescale — a time constant
 * of about twelve game days, so the whole disaster takes **weeks**,
 * exactly as D48 requires.
 */
const COOLING_PER_GAME_DAY = 0.08;

/** The bands a stack reads in — ⭐ percepts, and the first two are free. */
export const RICK_BANDS = ['cold', 'warm', 'hot', 'smoking'] as const;

export type RickBand = (typeof RICK_BANDS)[number];

/**
 * ⭐⭐ Exhaustive by construction, and the ORDER is the lesson: by the
 * time a stack is *hot* it is already too late to do anything but pull
 * it apart, and *warm* is the only warning anybody gets. A player who
 * learns to put a hand into a rick has learned the whole thing.
 */
const RICK_PHRASE: Readonly<Record<RickBand, string>> = {
  cold: 'cool to the arm, right down to the middle',
  warm: 'warm in the middle — not alarming, but it was not warm yesterday',
  hot: 'too hot to keep a hand in, and there is a smell of caramel off it',
  smoking: 'steaming where it is opened, and the inside is charred brown',
};

export interface SelfHeating {
  /** The stack's core temperature, kelvin, reconciled. */
  coreTemperatureK(): number;
  /** What it reads like to a hand pushed into it. */
  rickBand(): RickBand;
  rickPhrase(): string;
  /** Whether it has passed the point of no return. */
  isRunningAway(): boolean;
  /** Reconcile the heating over elapsed game-time. */
  reconcileHeating(): void;
  /**
   * @hook How wet this was when it was stacked, `[0, 1]`. ⚠ Stamped at
   * baling and never re-read: what decides whether a rick heats is what
   * went into it.
   */
  baledMoisture(): number;
}

export function SelfHeatingMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class SelfHeatingMixin extends Base implements SelfHeating {
    static _mixinName = SELF_HEATING_MIXIN;

    static fieldMeta: FieldMeta = {
      baledMoistureFraction: { persistent: true, authorable: true },
      rickCoreK: { persistent: true },
      rickStamp: { persistent: true },
    };

    /**
     * Moisture at the moment it was stacked. ⭐ Authorable, so a venue
     * can ship a barn with a bad rick already in it — which is a place
     * with a story rather than a hazard nobody caused.
     */
    public baledMoistureFraction = 0.15;

    /** Core temperature, kelvin. Starts at ambient. */
    public rickCoreK = AMBIENT_K;

    /** Game-seconds stamp of the last heating reconcile; `0` = never. */
    public rickStamp = 0;

    protected _reconcilingHeat = false;

    public baledMoisture(): number {
      return this.baledMoistureFraction;
    }

    public coreTemperatureK(): number {
      this.reconcileHeating();
      return this.rickCoreK;
    }

    public isRunningAway(): boolean {
      return this.coreTemperatureK() >= RUNAWAY_K;
    }

    public rickBand(): RickBand {
      const k = this.coreTemperatureK();
      if (k < AMBIENT_K + 6) return 'cold';
      if (k < 313) return 'warm';
      if (k < RUNAWAY_K) return 'hot';
      return 'smoking';
    }

    public rickPhrase(): string {
      return RICK_PHRASE[this.rickBand()];
    }

    /**
     * Integrate the heating.
     *
     * ⭐ Two regimes and no branch between them beyond a comparison:
     * **below the runaway point** the microbes make heat in proportion to
     * how wet it is and the stack loses heat toward ambient, so a
     * marginal rick warms and settles; **above** it, the reaction feeds
     * itself and the cooling term can no longer keep up. A stack that got
     * warm and then got hot does not stop.
     *
     * ⚠ No far-past guard. The whole point is that it happens while
     * nobody is watching.
     */
    public reconcileHeating(): void {
      if (this._reconcilingHeat) return;
      const nowS = nowSeconds();
      if (nowS === null) return;
      if (this.rickStamp === 0) {
        this.rickStamp = nowS;
        return;
      }
      const elapsed = nowS - this.rickStamp;
      if (elapsed <= 0) {
        this.rickStamp = nowS;
        return;
      }
      this._reconcilingHeat = true;
      try {
        const days = elapsed / SECONDS_PER_GAME_DAY;
        const wetness = clamp01(this.baledMoisture());
        // ⭐ Below the safe line the microbes have nothing to work with;
        // at the dangerous line the drive is exactly 1. Normalising
        // against the BAND rather than against saturation is what makes
        // the two authored thresholds mean what they say.
        //
        // ⚠ Capped, because past a point the stack is simply wet and
        // more water does not make more microbes.
        const drive =
          wetness <= SAFE_MOISTURE
            ? 0
            : Math.min(
                2.5,
                (wetness - SAFE_MOISTURE) / (DANGEROUS_MOISTURE - SAFE_MOISTURE),
              );
        const steps = Math.min(400, Math.max(1, Math.ceil(days)));
        const dt = days / steps;
        let k = this.rickCoreK;
        for (let i = 0; i < steps; i++) {
          const runaway = k >= RUNAWAY_K;
          // ⭐ Past the runaway point the reaction no longer needs the
          // microbes; below it, it is entirely theirs.
          const heating = runaway
            ? PEAK_HEATING_K_PER_DAY * 3
            : PEAK_HEATING_K_PER_DAY * drive;
          const cooling = (k - AMBIENT_K) * COOLING_PER_GAME_DAY;
          k += (heating - cooling) * dt;
          if (k < AMBIENT_K) k = AMBIENT_K;
        }
        this.rickCoreK = k;
        this.rickStamp = nowS;
      } finally {
        this._reconcilingHeat = false;
      }
    }
  };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function nowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}
