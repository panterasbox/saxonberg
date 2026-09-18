/**
 * ThermalDose — **how much cooking a thing has had**, as an integral over
 * time and temperature rather than a flag set by the verb that made it.
 *
 * ⭐⭐ The distinction this gauge exists for: `resolveSpoilage` already
 * models the *microbial* consequence of heat, but nothing modelled the
 * *culinary* one. A loaf was done because `bake` said so, and then stayed
 * done forever inside a 500 K oven. Doneness is a **dose**: the food
 * accumulates it while it is hot and keeps accumulating after the working
 * ends, which is the whole of "you left it in too long".
 *
 * The model is the thermal-death-time (F-value) form, borrowed from food
 * science and used here for browning rather than killing:
 *
 * ```
 *   doseS   += INTEGRAL 10^((T(s) - Tref) / z) ds     for T >= floorK
 *   scorchS += INTEGRAL 1 ds                          for T >  ceilingK
 * ```
 *
 * `z` is the temperature interval that changes the rate tenfold. ⚠ This
 * is a **browning** z (≈ 33 K), NOT the kill's (`Freshness`'s Arrhenius
 * `Ea = 200 kJ/mol` is roughly z ≈ 7 K near 333 K). The two curves are
 * genuinely different physics and **must not be re-based onto one
 * integrator** — a single z would make either the kill or the browning a
 * lie. See spoilage.md.
 *
 * ⭐ **Why the integral and not a sample.** A body in an oven is on a
 * Newton trajectory, not at a constant temperature, and the rate is
 * exponential in T — so a rectangle over the gap would under-read a
 * warm-up badly. The gauge stores the temperature at its last reconcile
 * and integrates along `Decay.toward` between the two samples (Simpson,
 * sub-stepped), which reproduces the real trajectory whenever the ambient
 * was constant across the gap — the same assumption `ThermalMixin` itself
 * makes. That is a dose.
 *
 * ⚠ **No far-past guard and no linkdead freeze** — `Freshness`'s
 * reasoning applies unchanged: an item has no Interactive, and *a loaf
 * left in an oven overnight burns*. `ThermalMixin`'s own guard keeps the
 * loaf's temperature stamped hot across the gap, and this gauge bills it.
 *
 * A discrete food carries the gauge on {@link ThermalDoseMixin}'s fields;
 * a dish in a pot carries it on `BulkPayload.dose` and reconciles through
 * the vessel. Both call the statics here, so the two can never drift.
 *
 * See [docs/subsystems/spoilage.md] + [thermal.md].
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { BulkSlot } from '../bulk/Bulkable';
import type { Recipe } from '../craft/Recipe';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { TemplatePaths } from '../paths';
import { Decay } from '../Decay';
import type { MarkupAugmenter } from '../../api/mml';

/**
 * ⭐ **The dose's own field on the blend payload, declared here.** The
 * gauge hangs per-instance and the payload is that something — but
 * `lib/bulk` has no business knowing what a doneness dose is. Declared
 * from the folder that owns it (the five-extender pattern).
 */
declare module '../bulk/Bulkable' {
  interface BulkPayload {
    /** Accumulated cooking dose, scorch time, and the sample they ran from. */
    dose?: { doseS: number; scorchS: number; stamp: number; tempK: number };
  }
}

/**
 * The player-facing doneness band. `raw` through `burnt` is the dose
 * ladder; `scorched` is the *separate* ceiling breach, and a thing can be
 * both (an outside burnt by too fierce a fire while the middle is still
 * underdone — which is exactly what a too-hot oven does).
 */
export type DonenessBand =
  | 'raw'
  | 'underdone'
  | 'done'
  | 'overdone'
  | 'burnt';

/** The gauge's stored state — identical on a mixin host and a payload. */
export interface DoseState {
  /** Accumulated equivalent seconds at the reference temperature. */
  doseS: number;
  /** Accumulated seconds spent above the ceiling. */
  scorchS: number;
  /** Game-seconds stamp of the last reconcile; `0` = never touched. */
  stamp: number;
  /** The host's temperature (K) at that stamp — the integral's left edge. */
  tempK: number;
}

/** Seeded-literal fallbacks — pre-warm / test safe. */
const DOSE_DEFAULTS = {
  /**
   * The reference temperature (K) the dose is denominated in — water's
   * boiling point, so "one second of dose" is one second of simmering.
   */
  REFERENCE_K: 373,
  /**
   * ⭐ The browning decade interval (K): every `z` kelvin above the
   * reference multiplies the rate by ten. NOT the kill's z — see header.
   */
  Z_K: 33,
  /** Below this (K) nothing cooks, however long you wait. */
  FLOOR_K: 323,
  /** Where sugars char, for matter whose working states no ceiling. */
  DEFAULT_CEILING_K: 470,
  /** Seconds above the ceiling that read as scorched. */
  SCORCHED_AT_S: 60,
  /** The hold a recipe that authors none is taken to have (game-seconds). */
  DEFAULT_HOLD_S: 1200,
  /** Doneness ratio band edges. */
  BAND_UNDERDONE_AT: 0.5,
  BAND_DONE_AT: 1,
  BAND_OVERDONE_AT: 1.5,
  BAND_BURNT_AT: 3,
  /** Simpson sub-intervals across a reconcile gap (even, >= 2). */
  SUB_STEPS: 8,
  /** Ambient a materialless / non-Thermal host reads (K). */
  AMBIENT_K: 293,
} as const;

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

/** The senses doneness answers to: you see it and you smell it. */
const DONENESS_CHANNELS: readonly string[] = ['vision', 'smell'];

/**
 * The player-facing phrase per band (never a raw number — the
 * banding-is-presentation rule). `done` says nothing: a thing that came
 * out right is just the thing.
 */
const DONENESS_PHRASE: Record<Exclude<DonenessBand, 'done'>, string> = {
  raw: 'It is raw.',
  underdone: 'It is not cooked through.',
  overdone: 'It has caught a little too much heat.',
  burnt: 'It is burnt through, black and bitter.',
};

/** Said in addition to the band when the fire itself was too fierce. */
const SCORCHED_PHRASE = 'The outside is scorched black.';

/** The band a ruined working's output is written down to. */
const RUINED_BAND = 'poor';

/**
 * Append the doneness line(s) to a host's long description. A host that
 * has never been near heat says nothing.
 */
function donenessAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  if (opts?.filter && !opts.filter.some((c) => DONENESS_CHANNELS.includes(c))) {
    return text;
  }
  if (!MixinApi.isDosed(host)) return text;
  if (host.isDestroyed()) return text;
  const dosed = host as unknown as Dosed;
  const lines: string[] = [];
  const band = dosed.getDonenessBand();
  if (band !== 'done') {
    // A thing that has taken no heat at all is not "raw", it is uncooked
    // matter nobody has tried to cook — say nothing.
    if (band !== 'raw' || dosed.getDoseSeconds() > 0) {
      lines.push(DONENESS_PHRASE[band]);
    }
  }
  if (dosed.isScorched()) lines.push(SCORCHED_PHRASE);
  if (lines.length === 0) return text;
  const added = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${added}` : added;
}

/**
 * The doneness arithmetic, in ONE place — the `Freshness` shape.
 *
 * Everything here is pure over its arguments EXCEPT the slot seam at the
 * end, which reads and writes a `BulkSlot`'s payload. It lives here for
 * the same reason `Freshness`'s does: this is doneness POLICY, and
 * `lib/bulk` should carry the `dose` field as data without importing the
 * subsystem that means something by it.
 */
export class ThermalDose {
  /** A slot-bound instance — the bulk half of the gauge. */
  constructor(private readonly slot: BulkSlot) {}

  // ───────────────────────── the dials ─────────────────────────
  // ⭐ Every static on this class is `@internal`, and that is the honest
  // disposition rather than an escape: the AUTHOR surface of doneness is
  // `ThermalDoseMixin`'s methods on a food (`getDonenessBand`,
  // `isScorched`). These are the arithmetic behind them, read by this
  // module, the crafting seams and the tests. The `Freshness` precedent,
  // verbatim.

  /** @internal the reference temperature the dose is denominated in. */
  static referenceK(): number {
    return dial('thermal.dose.referenceK', DOSE_DEFAULTS.REFERENCE_K);
  }
  /** @internal the browning decade interval. */
  static zK(): number {
    const z = dial('thermal.dose.zK', DOSE_DEFAULTS.Z_K);
    return z > 0 ? z : DOSE_DEFAULTS.Z_K;
  }
  /** @internal below this nothing cooks. */
  static floorK(): number {
    return dial('thermal.dose.floorK', DOSE_DEFAULTS.FLOOR_K);
  }
  /** @internal the char point for a working stating no ceiling. */
  static defaultCeilingK(): number {
    return dial(
      'thermal.dose.defaultCeilingK',
      DOSE_DEFAULTS.DEFAULT_CEILING_K,
    );
  }
  /** @internal seconds above the ceiling that read as scorched. */
  static scorchedAtS(): number {
    return dial('thermal.dose.scorchedAtS', DOSE_DEFAULTS.SCORCHED_AT_S);
  }
  /**
   * @internal the default hold.
   *
   * ⭐ The hold a recipe that authors none is taken to have. **The hold is
   * never zero**: a working that reaches a temperature holds it for as
   * long as the working takes, and `holdS: 0` in a shipped recipe means
   * "the author did not say", not "instantaneously".
   */
  static defaultHoldS(): number {
    return dial('thermal.dose.defaultHoldS', DOSE_DEFAULTS.DEFAULT_HOLD_S);
  }

  // ───────────────────────── the model ─────────────────────────

  /**
   * @internal the instantaneous rate.
   *
   * The instantaneous dose rate (equivalent reference-seconds per real
   * second) at `tempK`. Zero below the floor — a thing in a warm room is
   * not slowly cooking.
   */
  static rateAt(tempK: number): number {
    if (!Number.isFinite(tempK) || tempK < ThermalDose.floorK()) return 0;
    return Math.pow(10, (tempK - ThermalDose.referenceK()) / ThermalDose.zK());
  }

  /**
   * @internal the quadrature.
   *
   * Integrate the dose accrued over `elapsedS` game-seconds while the
   * host relaxed from `fromK` toward `ambientK` on time constant `tau`.
   *
   * ⭐ Simpson's rule over the true Newton trajectory. A rectangle would
   * be wrong by a lot here (the rate is exponential in T and T is moving
   * fast early), and sub-stepping the closed form costs eight `exp`s.
   * `tau <= 0` is a massless marker sitting at ambient immediately.
   */
  static integrate(
    fromK: number,
    ambientK: number,
    elapsedS: number,
    tau: number,
  ): { doseS: number; scorchS: number; endK: number; ceilingCrossS: number } {
    if (!(elapsedS > 0)) {
      return { doseS: 0, scorchS: 0, endK: fromK, ceilingCrossS: 0 };
    }
    const n = DOSE_DEFAULTS.SUB_STEPS;
    const h = elapsedS / n;
    const at = (s: number): number =>
      tau > 0 ? Decay.toward(fromK, ambientK, s, tau) : ambientK;

    let doseS = 0;
    // Simpson: h/3 * (f0 + 4f1 + 2f2 + ... + 4f(n-1) + fn)
    for (let i = 0; i <= n; i += 1) {
      const w = i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2;
      doseS += w * ThermalDose.rateAt(at(i * h));
    }
    doseS *= h / 3;

    return {
      doseS: doseS > 0 ? doseS : 0,
      scorchS: 0,
      endK: at(elapsedS),
      ceilingCrossS: 0,
    };
  }

  /**
   * @internal the ceiling-breach clock.
   *
   * Seconds of `elapsedS` spent above `ceilingK` on the same trajectory.
   * The crossing is monotone (a Newton relaxation never turns around), so
   * it is found by bisection rather than sampled — a coarse sample would
   * miss a short, fierce blast, which is precisely the case that scorches.
   */
  static scorchOver(
    fromK: number,
    ambientK: number,
    elapsedS: number,
    tau: number,
    ceilingK: number,
  ): number {
    if (!(elapsedS > 0) || !Number.isFinite(ceilingK) || ceilingK <= 0) {
      return 0;
    }
    const at = (s: number): number =>
      tau > 0 ? Decay.toward(fromK, ambientK, s, tau) : ambientK;
    const startAbove = at(0) > ceilingK;
    const endAbove = at(elapsedS) > ceilingK;
    if (startAbove && endAbove) return elapsedS;
    if (!startAbove && !endAbove) return 0;
    // Monotone: exactly one crossing. Bisect for it.
    let lo = 0;
    let hi = elapsedS;
    for (let i = 0; i < 40; i += 1) {
      const mid = (lo + hi) / 2;
      if (at(mid) > ceilingK === startAbove) lo = mid;
      else hi = mid;
    }
    const crossing = (lo + hi) / 2;
    return startAbove ? crossing : elapsedS - crossing;
  }

  /**
   * @internal the working's ceiling.
   *
   * The ceiling (K) a working states, or the default char point. A recipe
   * with `maxHeatK: 0` (the sentinel) states none.
   */
  static ceilingFor(recipe: Recipe | null): number {
    const authored = recipe?.getMaxHeatK() ?? 0;
    return authored > 0 ? authored : ThermalDose.defaultCeilingK();
  }

  /**
   * @internal the ratio the bands read.
   *
   * ⭐ **Doneness as a RATIO, not a count.** `doseS` is denominated at the
   * reference temperature; a recipe asking for `holdS` at
   * `requiresHeatK` therefore wants
   * `holdS * 10^((requiresHeatK - Tref)/z)` reference-seconds, and the
   * ratio of what the food has to what the recipe wanted is the number
   * the bands read. A recipe is its own yardstick: a sear and a braise
   * are both "done" at 1.
   */
  static donenessOf(doseS: number, recipe: Recipe | null): number {
    if (!(doseS > 0)) return 0;
    if (recipe === null) {
      // No working to be judged against — read against one reference
      // minute, enough to tell a warmed thing from a cooked one.
      return doseS / 60;
    }
    const wanted =
      ThermalDose.wantedDoseS(recipe.getRequiresHeatK(), recipe.getHoldS());
    return wanted > 0 ? doseS / wanted : 0;
  }

  /** @internal the reference-seconds a working at `tempK` for `holdS` asks for. */
  static wantedDoseS(tempK: number, holdS: number): number {
    const hold = holdS > 0 ? holdS : ThermalDose.defaultHoldS();
    const rate = ThermalDose.rateAt(tempK);
    return rate > 0 ? hold * rate : 0;
  }

  /** @internal band a doneness ratio (presentation only). */
  static bandFor(doneness: number): DonenessBand {
    const D = DOSE_DEFAULTS;
    if (doneness >= D.BAND_BURNT_AT) return 'burnt';
    if (doneness >= D.BAND_OVERDONE_AT) return 'overdone';
    if (doneness >= D.BAND_DONE_AT) return 'done';
    if (doneness >= D.BAND_UNDERDONE_AT) return 'underdone';
    return 'raw';
  }

  /** @internal has it spent long enough above its ceiling to read scorched? */
  static isScorched(scorchS: number): boolean {
    return scorchS >= ThermalDose.scorchedAtS();
  }

  /**
   * @internal the reconcile step.
   *
   * Advance a stored gauge to `nowS` against the host's live temperature
   * and trajectory. Pure: the caller stores what comes back.
   */
  static advance(
    state: DoseState,
    nowS: number,
    currentK: number,
    ambientK: number,
    tau: number,
    ceilingK: number,
  ): DoseState {
    if (state.stamp === 0 || nowS <= state.stamp) {
      return { ...state, stamp: nowS, tempK: currentK };
    }
    const elapsed = nowS - state.stamp;
    // ⚠ The integral runs from the LAST SAMPLE, not from the current
    // temperature: `tempK` is where the food was when we last looked, and
    // everything between then and now is what we are billing for.
    const { doseS } = ThermalDose.integrate(
      state.tempK,
      ambientK,
      elapsed,
      tau,
    );
    const scorchS = ThermalDose.scorchOver(
      state.tempK,
      ambientK,
      elapsed,
      tau,
      ceilingK,
    );
    return {
      doseS: state.doseS + doseS,
      scorchS: state.scorchS + scorchS,
      stamp: nowS,
      tempK: currentK,
    };
  }

  /** @internal a fresh, untouched gauge. */
  static empty(stamp = 0, tempK: number = DOSE_DEFAULTS.AMBIENT_K): DoseState {
    return { doseS: 0, scorchS: 0, stamp, tempK };
  }

  /** @internal game-seconds now, or `null` when no world clock. */
  static nowSeconds(): number | null {
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      return null;
    }
    return WorldClockApi.getNow().rawValue();
  }

  // ───────────────────── the slot seam (impure) ─────────────────────

  /**
   * A blend's dose, reconciled on read against its holder's temperature —
   * the bulk half of the gauge, twin of
   * `ThermalDoseMixin.getDoseSeconds()`. A slot holding nothing has no
   * matter to be a gauge of.
   */
  state(ceilingK = ThermalDose.defaultCeilingK()): DoseState {
    const payload = this.slot.getPayload();
    const nowS = ThermalDose.nowSeconds();
    const holder = this.slot.getHolder();
    const currentK = ThermalDose.holderTemperatureK(holder);
    const stored = payload?.dose;
    if (!stored) {
      if (this.slot.isEmpty() || nowS === null) {
        return ThermalDose.empty(0, currentK);
      }
      const seeded = ThermalDose.empty(nowS, currentK);
      if (payload) this.slot.setPayload({ ...payload, dose: seeded });
      return seeded;
    }
    if (nowS === null) return stored;
    const next = ThermalDose.advance(
      stored,
      nowS,
      currentK,
      ThermalDose.holderAmbientK(holder, currentK),
      ThermalDose.holderTau(holder),
      ceilingK,
    );
    this.slot.setPayload({ ...this.slot.getPayload(), dose: next });
    return next;
  }

  /**
   * Stamp a blend's dose outright — the mint's "this came out of the
   * working exactly as long as it needed" call, and the test seam.
   */
  stampDose(doseS: number, scorchS = 0): void {
    const payload = this.slot.getPayload();
    if (!payload) return;
    const nowS = ThermalDose.nowSeconds() ?? 0;
    this.slot.setPayload({
      ...payload,
      dose: {
        doseS: doseS > 0 ? doseS : 0,
        scorchS: scorchS > 0 ? scorchS : 0,
        stamp: nowS,
        tempK: ThermalDose.holderTemperatureK(this.slot.getHolder()),
      },
    });
  }

  /** @internal the holder's temperature (K), or the ambient default. */
  static holderTemperatureK(holder: Stuff | null): number {
    if (holder !== null && MixinApi.isThermal(holder)) {
      return holder.getTemperature().rawValue();
    }
    return DOSE_DEFAULTS.AMBIENT_K;
  }

  /** @internal the holder's cached ambient (K) — the asymptote. */
  static holderAmbientK(holder: Stuff | null, fallback: number): number {
    if (holder !== null && MixinApi.isThermal(holder)) {
      const a = (holder as unknown as { lastAmbientK?: number }).lastAmbientK;
      if (typeof a === 'number' && Number.isFinite(a)) return a;
    }
    return fallback;
  }

  /** @internal the holder's time constant (s), 0 for a massless marker. */
  static holderTau(holder: Stuff | null): number {
    if (holder !== null && MixinApi.isThermal(holder)) {
      return holder.getTau().rawValue();
    }
    return 0;
  }
}

/** The doneness capability surface. */
export interface Dosed {
  /** Accumulated dose in reference-seconds (reconciles on read). */
  getDoseSeconds(): number;
  /** Accumulated seconds above the ceiling (reconciles on read). */
  getScorchSeconds(): number;
  /** Current banded doneness against this host's own working. */
  getDonenessBand(): DonenessBand;
  /** Has the fire been too fierce for too long? */
  isScorched(): boolean;
  /** Reconcile the elapsed dose (sync). */
  reconcileDose(): void;
  /** Stamp the gauge outright — the mint, and the test seam. */
  stampThermalDose(doseS: number, scorchS?: number): void;

  // Public so the Hydrator can reflect into them.
  _doseS: number;
  _scorchS: number;
  doseClockStamp: number;
  doseSampleK: number;
}

export function ThermalDoseMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class ThermalDoseMixin extends Base implements Dosed {
    static _mixinName: string = 'ThermalDoseMixin';

    static fieldMeta: FieldMeta = {
      _doseS: { persistent: true },
      _scorchS: { persistent: true },
      doseClockStamp: { persistent: true },
      doseSampleK: { persistent: true },
    };

    /** Derived doneness line appended to the host's long description. */
    static markupAugmenters: MarkupAugmenter[] = [donenessAugmenter];

    /** Accumulated reference-seconds; `0` = never near heat. */
    public _doseS = 0;
    /** Accumulated seconds above the ceiling. */
    public _scorchS = 0;
    /** Game-seconds stamp of the last reconcile; `0` = never touched. */
    public doseClockStamp = 0;
    /** The host's temperature at that stamp — the integral's left edge. */
    public doseSampleK = 0;

    /** Reentry guard — a reconcile must never recurse through a read. */
    private _reconcilingDose = false;

    // ---------- reads ----------

    public getDoseSeconds(): number {
      if (!this._reconcilingDose) this.reconcileDose();
      return this._doseS;
    }

    public getScorchSeconds(): number {
      if (!this._reconcilingDose) this.reconcileDose();
      return this._scorchS;
    }

    public getDonenessBand(): DonenessBand {
      return ThermalDose.bandFor(
        ThermalDose.donenessOf(this.getDoseSeconds(), this.doseRecipe()),
      );
    }

    public isScorched(): boolean {
      return ThermalDose.isScorched(this.getScorchSeconds());
    }

    // ---------- writes ----------

    public stampThermalDose(doseS: number, scorchS = 0): void {
      if (!Number.isFinite(doseS)) return;
      this._doseS = doseS > 0 ? doseS : 0;
      this._scorchS = Number.isFinite(scorchS) && scorchS > 0 ? scorchS : 0;
      const nowS = ThermalDose.nowSeconds();
      if (nowS !== null) this.doseClockStamp = nowS;
      this.doseSampleK = this.doseTemperatureK();
    }

    // ---------- reconcile-on-read ----------

    /**
     * Accrue the dose over elapsed game-time. ⚠ **No far-past guard and
     * no linkdead freeze** — a loaf left in an oven overnight burns.
     */
    public reconcileDose(): void {
      if (this._reconcilingDose) return;
      const self = this as unknown as Stuff;
      // Nothing that is not Thermal has a temperature to integrate.
      if (!MixinApi.isThermal(self)) return;

      const nowS = ThermalDose.nowSeconds();
      if (nowS === null) return;

      const currentK = this.doseTemperatureK();

      // First touch: seed the sample; integrate nothing from epoch.
      if (this.doseClockStamp === 0) {
        this.doseClockStamp = nowS;
        this.doseSampleK = currentK;
        return;
      }

      this._reconcilingDose = true;
      try {
        const next = ThermalDose.advance(
          {
            doseS: this._doseS,
            scorchS: this._scorchS,
            stamp: this.doseClockStamp,
            tempK: this.doseSampleK,
          },
          nowS,
          currentK,
          (self as unknown as { lastAmbientK: number }).lastAmbientK,
          self.getTau().rawValue(),
          ThermalDose.ceilingFor(this.doseRecipe()),
        );
        this._doseS = next.doseS;
        this._scorchS = next.scorchS;
        this.doseClockStamp = next.stamp;
        this.doseSampleK = next.tempK;
        this.writeDownIfRuined();
      } finally {
        this._reconcilingDose = false;
      }
    }

    /**
     * ⭐ **A ruined thing is a POOR thing** — burnt through, or scorched
     * black because the fire was too fierce, writes the host's Grade down
     * to the bottom band.
     *
     * Monotone minimum, the `Maturing.applyBatchGrade` shape: it only ever
     * lowers, so nothing can be nursed back by cooling it down. That
     * one-way property is load-bearing — a grade that could be recovered
     * is a grade worth grinding, which is the failure our whole band model
     * exists to avoid.
     *
     * ⚠ No new terminal object and no burnt template: burnt is **the
     * object with the band**. The player is holding the loaf they ruined.
     */
    private writeDownIfRuined(): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isGraded(self)) return;
      const ruined =
        ThermalDose.isScorched(this._scorchS) ||
        ThermalDose.bandFor(
          ThermalDose.donenessOf(this._doseS, this.doseRecipe()),
        ) === 'burnt';
      if (!ruined) return;
      const graded = self as unknown as {
        getGradeBand(): string;
        setGradeBand(band: string): void;
      };
      if (graded.getGradeBand() === RUINED_BAND) return;
      graded.setGradeBand(RUINED_BAND);
    }

    /** This host's live temperature (K). */
    private doseTemperatureK(): number {
      const self = this as unknown as Stuff;
      return MixinApi.isThermal(self)
        ? self.getTemperature().rawValue()
        : DOSE_DEFAULTS.AMBIENT_K;
    }

    /**
     * The working this host was made by, whose `requiresHeatK`/`holdS`
     * are the yardstick its doneness is read against. `null` for matter
     * nobody cooked to a recipe — a cut in a pan, judged against the
     * reference alone.
     */
    private doseRecipe(): Recipe | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isCrafted(self)) return null;
      return doseRecipeFor(self.getRecipe());
    }
  };
}

/**
 * Resolve a stamped recipe reference into its `Recipe`. Held as a
 * module-local indirection so `lib/thermal` does not import the recipe
 * catalogue's singleton at module scope.
 */
function doseRecipeFor(recipeRef: string): Recipe | null {
  if (!recipeRef || recipeRef.length === 0) return null;
  // ⚠ A craft mark may be a ferment mark (`ferment:<key>`) rather than a
  // recipe id — those name no working and have no hold to be judged by.
  if (recipeRef.includes(':')) return null;
  const catalogue = StuffApi.findByTemplatePath(
    '/platform/idea/RecipeCatalogue',
  ) as unknown as { getRecipe?(id: string): Recipe | null } | null;
  if (catalogue === null || typeof catalogue.getRecipe !== 'function') {
    return null;
  }
  try {
    return catalogue.getRecipe(recipeRef);
  } catch {
    return null;
  }
}
