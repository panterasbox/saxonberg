/**
 * ExertingMixin — ⭐⭐ **one exertion event, every producer.**
 *
 * The body did not know it was working. Five places debited endurance
 * in `%` points before the nutrition-and-fitness build — mining, farming,
 * the smelt, the loaded traverse, the limp — and the quern, the anvil,
 * the loom and a spell cost nothing at all. This mixin is the one verb
 * they all call instead: `exert({ durationS, powerW })` — metabolic
 * watts over game-seconds, which is joules, which is a unit the engine
 * already speaks.
 *
 * Three chokepoints emit it, one per producer family, and none of them
 * knows what the body does with it:
 *
 *   - **`SchedulerRegistry`** at a durative activity's completion (and
 *     pro-rata at a cancel), reading an optional `effortW` the activity
 *     declares. An activity that declares none is not work — a search,
 *     a dressing — and is excluded by construction, not by a type test.
 *   - **`LocomotionLogic.engageAround`** after a successful self-powered
 *     traverse, via {@link Exerting.exertTraverse}: the walk's watts
 *     scaled by the mode's `costMultiplier` and the load. Riders and
 *     `forceMove` never reach it — the walked-vs-rode exclusion stays
 *     structural.
 *   - **`Character.onExchangeResolved`** — one combat exchange, via
 *     {@link Exerting.exertExchange}.
 *
 * And four things read it, in order, inside `exert`:
 *
 *   1. **Endurance** (now) — only the EXCESS over what the body can
 *      sustain debits. That is the aerobic threshold: a walk is free,
 *      a conditioned body holds a run, and the felt cost of every
 *      shipped act is preserved at its reference duration by the watts
 *      each site declares (`Exerting.felt-cost.test.ts` pins them).
 *   2. **Wind** (over sessions) — duration at a pace you can hold.
 *   3. **Lean** (over months) — overload against the body's own ceiling,
 *      paid for in protein. A load you have outgrown trains nothing.
 *   4. **Heat** — `1 − η` of the work, deposited on the thermal seam
 *      ({@link depositWorkHeat} → `ThermalRegulation.absorbHeatLoad`).
 *
 * ⭐ **Reach is a body read, not a number.** {@link Exerting.canSustainPace}
 * is what breaks a fresh body's run to a walk; {@link Exerting.canExert}
 * is the double-shift refusal; the climb's rest line is the same read
 * narrated. Nothing here renders a figure.
 *
 * Every rate is a per-read dial (`body.*` / `exertion.*`, shipped in
 * `platform/content/settings/body.yaml`), so `config` turns a season up
 * inside one session. See docs/subsystems/exertion.md.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Reserved } from '../reserve';
import type { LocomotionMode } from '../../platform/idea/LocomotionMode';
import { Quantity } from '../quantity';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import type { Vitals } from '../vitals/Vitals';
import { MqlSubscriptionApi } from '../../api/mql-subscription';
import { LOAD_BEARING_DEFAULTS } from '../encumbrance/LoadBearing';
import {
  COMPETENCE_BANDS,
  type CompetenceBandName,
} from '../advancement/CompetenceBand';

/** One exertion: metabolic watts held for game-seconds. */
export interface Exertion {
  /** Game-seconds the effort lasted. */
  durationS: number;
  /** Metabolic power (W) over that duration. */
  powerW: number;
}

export interface Exerting {
  /** The one verb every producer calls. See the module doc for what it does. */
  exert(e: Exertion): void;
  /**
   * Would this effort leave the body under the exhaustion floor? The
   * double-shift refusal: every step verb asks before it starts.
   */
  canExert(powerW: number, durationS: number): boolean;
  /** The one refusal line, owned here so every verb says the same thing. */
  exhaustionRefusal(): string;
  /**
   * Can the body hold this pace right now? True when the mode's power is
   * within what it can sustain, or while endurance is still above the
   * pace floor. What breaks a fresh body's run to a walk.
   */
  canSustainPace(mode: LocomotionMode): boolean;
  /** Metabolic watts this body sustains indefinitely — the base, raised by wind. */
  sustainableW(): number;
  /** Peak metabolic watts — mass × peak W/kg × the lean margin. */
  ceilingW(): number;
  /** The metabolic power of one traverse in `mode`, load included. */
  traversePowerW(mode: LocomotionMode): number;
  /** The locomotion emit: one traverse in `mode`, narrating the climb's rest line. */
  exertTraverse(mode: LocomotionMode): void;
  /** The combat emit: one exchange. */
  exertExchange(): void;
  /**
   * A conditioning Discipline's band — a threshold read over the named
   * body stock (`wind`, `alcohol-tolerance`), never a Transcript fold.
   */
  conditioningBand(stock: string): CompetenceBandName;
  /** The lean margin on peak power and carry capacity: 0.6 at lean 0, 1.4 at lean 100. */
  leanMargin(): number;
  /**
   * The metabolic watts that cost a FRESH body `debitPct` of endurance
   * over `durationS` — the bridge for an act authored in felt-cost
   * terms (the farming acts, whose durations are abstractions). Body-
   * independent by construction: it reads the base sustainable power,
   * never this body's, so a conditioned body still feels the act as
   * less.
   */
  wattsForFeltCost(debitPct: number, durationS: number): number;
  /**
   * ⭐ How the body is breathing, as a BAND — `fresh` · `tired` ·
   * `winded` (the run has broken) · `spent` (the step verbs refuse).
   * The word the shelf shows and the cue announces; never a number.
   */
  breathBand(): BreathBand;
  /**
   * The three bands the reserves answer for — breath, hunger, thirst —
   * as words. What the shelf's BODY row renders (the build phrase joins
   * it on `Creature`). Never a number.
   */
  bodyState(): BodyState;
  /**
   * Note the body's state to the player: pokes the live self card when
   * any band has turned over, and says the breath cue on a crossing.
   * Called after every exertion and after every metabolism reconcile.
   */
  noteBodyState(): void;
}

/** The breath bands, fresh to spent — a closed, ordinal vocabulary. */
export const BREATH_BANDS = ['fresh', 'tired', 'winded', 'spent'] as const;
export type BreathBand = (typeof BREATH_BANDS)[number];

/**
 * ⭐ The cue on a breath crossing, in the register `self.body` already
 * speaks (*"You're sweating."*). Crossings only — narrating every slice
 * is a nag; the deviation is the story. Recovery gets one line for the
 * whole climb back.
 */
const BREATH_CUE: Readonly<Partial<Record<BreathBand, string>>> = {
  winded: "You're winded.",
  spent: "You're spent.",
};
const BREATH_BACK = "You've got your breath back.";

export const HUNGER_BANDS = ['full', 'fed', 'hungry', 'starving'] as const;
export type HungerBand = (typeof HUNGER_BANDS)[number];
export const THIRST_BANDS = ['fine', 'thirsty', 'parched'] as const;
export type ThirstBand = (typeof THIRST_BANDS)[number];

/** The reserve bands as words — the shelf's BODY row. */
export interface BodyState {
  breath: BreathBand;
  hunger: HungerBand;
  thirst: ThirstBand;
}

/**
 * The band thresholds over `current / capacity`: untrained < 20 % ≤
 * novice < 40 % ≤ competent < 60 % ≤ proficient < 80 % ≤ expert.
 */
const CONDITIONING_BAND_AT: readonly number[] = [0, 0.2, 0.4, 0.6, 0.8];

/** Reference mass for a body that has none (the metabolism figure). */
const REFERENCE_MASS_KG = 70;

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

type ExertingHost = Stuff & Reserved;

export function ExertingMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ExertingMixin extends Base implements Exerting {
    // ⚠ Widened to `string`: a pinned literal here collapses the mixin
    // chain's inferred type hundreds of files away.
    static _mixinName: string = 'ExertingMixin';

    public exert(e: Exertion): void {
      const self = this as unknown as ExertingHost;
      const durationS = Math.max(0, e.durationS);
      const powerW = Math.max(0, e.powerW);
      if (durationS <= 0 || powerW <= 0) return;
      const windBefore = this.conditioningBand('wind');
      const sustain = this.sustainableW();

      // 1. Endurance — the excess only. Effort under the aerobic threshold
      //    costs nothing; that is what keeps a walk free.
      //
      //    ⭐⭐ SOFT LIMIT: an exertion spends you down to the spent line
      //    (`exertion.exhaustionFloorPct`) and never past it. A ladder, a
      //    set or an exchange leaves you SPENT — every step verb refuses
      //    at the same line (`canExert`), the run has long since broken to
      //    a walk, and walking, talking, buying and resting all go on.
      //    It never leaves you COLLAPSED: `collapse` (endurance 0) is the
      //    faint that `requiresConscious` reads on fifty-odd verbs,
      //    walking included, and work is not allowed to be the thing
      //    that puts a person there. Collapse stays the acute conditions'
      //    (starvation, dehydration, blood) and the wound's (the limp).
      const excessJ = Math.max(0, powerW - sustain) * durationS;
      const endurance = self.getReserve('endurance');
      if (excessJ > 0 && endurance) {
        const perPct = dial(AppSettingKeys.exertionJoulesPerEndurancePct, 1500);
        if (perPct > 0) {
          const floor = dial(AppSettingKeys.exertionExhaustionFloorPct, 10);
          const room = Math.max(0, endurance.current.rawValue() - floor);
          const debit = Math.min(excessJ / perPct, room);
          if (debit > 0) self.adjustReserve('endurance', Quantity.of(-debit, '%'));
        }
      }

      // 2. Wind — duration at a pace you can hold. A heavy act counts for
      //    its duration and no more; a stroll under the floor counts not
      //    at all.
      if (
        self.hasReserve('wind') &&
        sustain > 0 &&
        powerW >= dial(AppSettingKeys.bodyWindFloorFraction, 0.5) * sustain
      ) {
        const gain =
          dial(AppSettingKeys.bodyWindGainPerHour, 6) *
          (durationS / 3600) *
          Math.min(1, powerW / sustain);
        if (gain > 0) self.adjustReserve('wind', Quantity.of(gain, '%'));
      }

      // 3. Lean — overload against the body's own ceiling, paid in
      //    protein. A load that no longer clears the threshold trains
      //    nothing: the mill stops making you stronger.
      if (self.hasReserve('lean')) {
        const ceiling = this.ceilingW();
        if (
          ceiling > 0 &&
          powerW >= dial(AppSettingKeys.bodyOverloadFraction, 0.7) * ceiling
        ) {
          const gain =
            dial(AppSettingKeys.bodyLeanGainPerHour, 2) *
            (durationS / 3600) *
            (powerW / ceiling);
          const perLean = dial(AppSettingKeys.bodyProteinPerLeanPct, 1.5);
          const protein = self.hasReserve('protein')
            ? (self.getReserve('protein')?.current.rawValue() ?? 0)
            : Infinity;
          const affordable = perLean > 0 ? protein / perLean : gain;
          const banked = Math.min(gain, affordable);
          if (banked > 0) {
            self.adjustReserve('lean', Quantity.of(banked, '%'));
            if (self.hasReserve('protein') && perLean > 0) {
              self.adjustReserve('protein', Quantity.of(-banked * perLean, '%'));
            }
          }
        }
      }

      // 4. Heat — the work you did not get out as work.
      const efficiency = dial(AppSettingKeys.exertionEfficiency, 0.25);
      this.depositWorkHeat(powerW * durationS * (1 - efficiency));

      // 5. Structure — ⭐ real work re-breaks a half-knit bone (D15). The
      //    body was carrying a fracture whose function had come back but
      //    whose structure had not, and it was not ready for this.
      const asStuff = self as unknown as Stuff;
      if (MixinApi.isVitals(asStuff)) {
        const rebroken = (asStuff as unknown as Vitals).stressStructures(
          powerW,
        );
        if (rebroken.length > 0) {
          MessageApi.scene(asStuff)
            .topic('act.deed')
            .toSelf(
              Mml.compose`Something gives — a bone you thought mended was not ready for that, and it goes again.`,
            )
            .send();
        }
      }

      if (this.conditioningBand('wind') !== windBefore) {
        this.onConditioningBandCrossed('wind');
      }
      this.noteBodyState();
    }

    public canExert(powerW: number, durationS: number): boolean {
      const self = this as unknown as ExertingHost;
      const endurance = self.getReserve('endurance');
      if (!endurance) return true;
      const excessJ = Math.max(0, powerW - this.sustainableW()) * Math.max(0, durationS);
      const perPct = dial(AppSettingKeys.exertionJoulesPerEndurancePct, 1500);
      const debit = perPct > 0 ? excessJ / perPct : 0;
      const floor = dial(AppSettingKeys.exertionExhaustionFloorPct, 10);
      return endurance.current.rawValue() - debit >= floor;
    }

    public exhaustionRefusal(): string {
      return "You're too tired for that.";
    }

    public canSustainPace(mode: LocomotionMode): boolean {
      const self = this as unknown as ExertingHost;
      // ⭐ Reach ANDs with function: a body whose locomotion is
      // impaired by a wound cannot hold a pace above a walk however
      // conditioned it is — fitness is not a bandage.
      if (MixinApi.isVitals(self) && self.capacity('locomotion') !== 'full') {
        return false;
      }
      if (this.traversePowerW(mode) <= this.sustainableW()) return true;
      const endurance = self.getReserve('endurance');
      if (!endurance) return true;
      return (
        endurance.current.rawValue() >= dial(AppSettingKeys.exertionPaceFloorPct, 50)
      );
    }

    public sustainableW(): number {
      const self = this as unknown as ExertingHost;
      const wind = self.hasReserve('wind') ? this.stockFraction('wind') : 0;
      return (
        dial(AppSettingKeys.exertionBaseSustainableW, 300) *
        (1 + dial(AppSettingKeys.bodyWindSustainGain, 1.5) * wind)
      );
    }

    public ceilingW(): number {
      const self = this as unknown as ExertingHost;
      // Every body is Tangible; the predicate keeps a test fixture that
      // composes only the reserves honest rather than duck-typed.
      const mass = MixinApi.isTangible(self)
        ? self.getMass().rawValue() || REFERENCE_MASS_KG
        : REFERENCE_MASS_KG;
      return mass * dial(AppSettingKeys.bodyPeakWPerKg, 12) * this.leanMargin();
    }

    /** The last bands noted — runtime only, so the first note is silent. */
    private _notedBreath: BreathBand | null = null;
    private _notedBodyState: string | null = null;

    public breathBand(): BreathBand {
      const self = this as unknown as ExertingHost;
      const endurance = self.getReserve('endurance');
      if (!endurance) return 'fresh';
      const cap = endurance.capacity.rawValue();
      const pct = cap > 0 ? (endurance.current.rawValue() / cap) * 100 : 0;
      if (pct <= dial(AppSettingKeys.exertionExhaustionFloorPct, 10)) return 'spent';
      if (pct < dial(AppSettingKeys.exertionPaceFloorPct, 50)) return 'winded';
      if (pct < dial(AppSettingKeys.exertionFreshPct, 70)) return 'tired';
      return 'fresh';
    }

    public bodyState(): BodyState {
      const self = this as unknown as ExertingHost;
      const pct = (key: string): number | null => {
        const r = self.getReserve(key);
        if (!r) return null;
        const cap = r.capacity.rawValue();
        return cap > 0 ? (r.current.rawValue() / cap) * 100 : 0;
      };
      // The satiation lines are metabolism's own: surplus above 70 banks
      // flesh, deficit at 25 draws on it; hydration throttles recovery
      // under 30. The words sit on those lines rather than inventing new ones.
      const sat = pct('satiation');
      const hunger: HungerBand =
        sat === null || sat >= 70 ? 'full' : sat >= 25 ? 'fed' : sat > 0 ? 'hungry' : 'starving';
      const hyd = pct('hydration');
      const thirst: ThirstBand =
        hyd === null || hyd >= 30 ? 'fine' : hyd > 0 ? 'thirsty' : 'parched';
      return { breath: this.breathBand(), hunger, thirst };
    }

    public noteBodyState(): void {
      const self = this as unknown as Stuff;
      if (self.isDestroyed()) return;
      const breath = this.breathBand();
      const state = JSON.stringify(this.bodyState());
      // The first read of a session seeds silently; only a CHANGE speaks.
      if (this._notedBreath !== null && breath !== this._notedBreath) {
        const was = BREATH_BANDS.indexOf(this._notedBreath);
        const now = BREATH_BANDS.indexOf(breath);
        const winded = BREATH_BANDS.indexOf('winded');
        // Going DOWN names the band you have reached; coming back up says
        // so once, when you are no longer short of breath. Spent → winded
        // is still short of breath and says nothing.
        const line =
          now > was
            ? (BREATH_CUE[breath] ?? null)
            : was >= winded && now < winded
              ? BREATH_BACK
              : null;
        if (line) {
          try {
            MessageApi.scene(self)
              .topic('self.body')
              .toSelf(Mml.compose`${line}`)
              .send();
          } catch {
            // a bare body (no Sensor) has no cue surface; the state still notes
          }
        }
      }
      if (this._notedBodyState !== null && state !== this._notedBodyState) {
        const subject = self.getIdentityPath();
        if (subject) MqlSubscriptionApi.notifyDurableSubject(subject);
      }
      this._notedBreath = breath;
      this._notedBodyState = state;
    }

    /** Metabolism has integrated a gap — breath may have come back. */
    protected onMetabolismReconciled(): void {
      const parent = (Base.prototype as { onMetabolismReconciled?: () => void })
        .onMetabolismReconciled;
      if (typeof parent === 'function') parent.call(this);
      this.noteBodyState();
    }

    public wattsForFeltCost(debitPct: number, durationS: number): number {
      const base = dial(AppSettingKeys.exertionBaseSustainableW, 300);
      if (durationS <= 0 || debitPct <= 0) return base;
      return (
        base +
        (dial(AppSettingKeys.exertionJoulesPerEndurancePct, 1500) * debitPct) /
          durationS
      );
    }

    public leanMargin(): number {
      const self = this as unknown as ExertingHost;
      if (!self.hasReserve('lean')) return 1;
      return 0.6 + 0.8 * this.stockFraction('lean');
    }

    public traversePowerW(mode: LocomotionMode): number {
      const self = this as unknown as ExertingHost;
      let loadFactor = 1;
      if (MixinApi.isLoadBearing(self)) {
        const ratio = self.getLoadRatio();
        const over = Math.max(0, ratio - LOAD_BEARING_DEFAULTS.LIGHT_LOAD_FLOOR);
        if (Number.isFinite(over)) {
          loadFactor += dial(AppSettingKeys.exertionLoadPowerPerRatio, 1 / 6) * over;
        }
      }
      return dial(AppSettingKeys.exertionWalkW, 300) * mode.getCostMultiplier() * loadFactor;
    }

    public exertTraverse(mode: LocomotionMode): void {
      const self = this as unknown as ExertingHost;
      const powerW = this.traversePowerW(mode);
      // ⭐ The climb without the rest — the same read narrated. A body
      // whose sustainable power is under the climb's stops for breath;
      // a conditioned one pays nothing and says nothing.
      if (mode.getName() === 'climb' && powerW > this.sustainableW()) {
        MessageApi.scene(self)
          .topic('act.deed')
          .toSelf(Mml.compose`You have to stop on the way to get your breath.`)
          .send();
      }
      this.exert({
        durationS: dial(AppSettingKeys.exertionTraverseNominalS, 60),
        powerW,
      });
    }

    public exertExchange(): void {
      this.exert({
        durationS: dial(AppSettingKeys.exertionCombatExchangeS, 6),
        powerW: dial(AppSettingKeys.exertionCombatExchangeW, 700),
      });
    }

    public conditioningBand(stock: string): CompetenceBandName {
      const self = this as unknown as ExertingHost;
      if (!self.hasReserve(stock)) return 'untrained';
      const fraction = this.stockFraction(stock);
      let at = 0;
      for (let i = 0; i < CONDITIONING_BAND_AT.length; i++) {
        if (fraction >= CONDITIONING_BAND_AT[i]!) at = i;
      }
      return COMPETENCE_BANDS[at] ?? 'untrained';
    }

    /** `current / capacity` of a stock, in `[0, 1]`; 0 when absent. */
    protected stockFraction(key: string): number {
      const self = this as unknown as ExertingHost;
      const r = self.getReserve(key);
      if (!r) return 0;
      const cap = r.capacity.rawValue();
      if (cap <= 0) return 0;
      return Math.max(0, Math.min(1, r.current.rawValue() / cap));
    }

    /**
     * ⭐ **Exertion is heat.** `1 − η` of every exertion lands on the
     * body's internal heat load (`ThermalRegulation.absorbHeatLoad`),
     * which the thermal slice sheds by sweating — costing hydration,
     * damped by what the body wears (a coat halves the shedding), and
     * stopped past the wet-bulb ceiling. So a shift at the anvil in a
     * coat is a wetter, thirstier shift, with no wiring of its own: the
     * heat build already prices all of that. Also the place an exertion
     * will deposit sweat on a `Soilable` body the day room-condition
     * ships one.
     */
    protected depositWorkHeat(joules: number): void {
      if (joules <= 0) return;
      const self = this as unknown as Stuff;
      if (MixinApi.isThermalRegulation(self)) self.absorbHeatLoad(joules);
    }

    /**
     * A conditioning stock's band crossed a threshold in either
     * direction. Re-derive conferrals so a band-gated verb (none ship on
     * `wind` today; the swim is the first) appears or goes without an
     * append to the Transcript.
     */
    protected onConditioningBandCrossed(_stock: string): void {
      const self = this as unknown as Stuff;
      if (MixinApi.isAdvancing(self)) void self.refreshConferrals();
    }
  };
}
