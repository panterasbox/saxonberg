/**
 * CuredMixin — ⭐ **the water state of a particular piece of matter, and
 * the acts that change it.**
 *
 * A Material tabulates a water activity: how much of its water a microbe
 * can actually use. That number is a fact about *stew meat*, and it was
 * the only water fact the engine had — so every cut of meat in the world
 * kept exactly as well as every other one, forever, and salting was a
 * seasoning.
 *
 * This mixin is the per-instance half. Two scalars describe the matter,
 * and between them they say everything drying and curing do:
 *
 *   - **`moisture`** `[0, 1]` — how much of the material's own water is
 *     still in it. `1` is as-harvested (and derives the Material's
 *     tabulated `a_w` exactly). Drying lowers it.
 *   - **`solute`** `[0, 1]` — how much of the remaining water is bound up
 *     by dissolved salt or sugar. `0` is untreated. Curing raises it.
 *
 * Water activity then derives, multiplicatively:
 *
 *   `a_w = a_w(material) · moisture · (1 − solute)`
 *
 * ⭐ **The multiplication is the whole design.** It is real hurdle
 * technology: drying and salting are the same lever seen twice, so they
 * **stack** rather than compete (salt cod is both, and keeps better than
 * either), and partial treatment earns partial benefit with nobody
 * enumerating "salt cod" anywhere. `moisture: 1, solute: 0` is the
 * identity, which is why nothing already in the world behaves differently.
 *
 * ⚠⚠ **This is NOT the spoilage gauge, and the split is deliberate.**
 * {@link FreshnessMixin} carries a *population living in the matter*; this
 * carries *the matter's own water state*. They coincide on `Provision`
 * today and they will not for long — leather, timber and grain are all
 * dried and none of them rot on a microbial curve. Folding water activity
 * into the spoilage gauge would make a tannery compose a microbial load in
 * order to express drying.
 *
 * **The asymmetry, and it is the lesson.** Curing does not reverse: salt
 * that went in stays in, and `solute` has no passive arm at all. Drying
 * does: a dried thing left somewhere damp slowly softens back toward the
 * ambient equilibrium. So a dry store is worth building and a steamy
 * kitchen is the worst place to hang a ham.
 *
 * ⚠ **The passive arm only ever RAISES moisture.** Nothing dries on its
 * own — drying is an *act*, and a gauge that quietly dried everything in
 * the pantry would both undo that and change how every shipped row
 * behaves. An untreated instance (`moisture: 1`) therefore reads and
 * writes NOTHING: the reconcile returns before it touches the clock, which
 * is the same sparse-storage ordering `FreshnessMixin` learned the hard
 * way.
 *
 * See [docs/subsystems/spoilage.md].
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { BulkPayload, BulkSlot } from '../bulk/Bulkable';
import { MixinApi } from '../../api/mixin';
import { BiomeApi } from '../../api/biome';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { TemplatePaths } from '../paths';
import type { MarkupAugmenter } from '../../api/mml';

/**
 * The per-instance water state: how much of the material's water is left,
 * and how much of what is left is bound by solute.
 */
export interface CureState {
  /** `[0, 1]` — `1` is as-harvested; drying lowers it. */
  moisture: number;
  /** `[0, 1]` — `0` is untreated; curing raises it. */
  solute: number;
}

/** Seeded-literal fallbacks — pre-warm / test safe. */
const CURE_DEFAULTS = {
  SECONDS_PER_HOUR: 3600,
  /** Fraction of the moisture gap closed per game-hour while rehydrating. */
  REHYDRATION_PER_HOUR: 0.02,
  /** Relative humidity (%) assumed where nothing authors one. */
  AMBIENT_HUMIDITY_PCT: 60,
  /** Moisture at/below which a thing reads thoroughly dried. */
  BAND_DRIED_AT: 0.5,
  /** Moisture below which a thing reads partly dried. */
  BAND_DRYING_AT: 0.85,
  /** Solute at/above which a thing reads heavily cured. */
  BAND_CURED_AT: 0.35,
  /** Solute above which a thing reads lightly cured. */
  BAND_CURING_AT: 0.05,
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

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Game-seconds now, or `null` when no world clock (pre-boot / tests).
 *
 * ⚠ Deliberately a local twin of `nowSeconds()` rather than a
 * call to it. `Freshness` reads the cure state (that is the whole point of
 * this file), so importing it back would close a cycle inside
 * `lib/material` for six lines of clock guard. The dependency runs one
 * way: spoilage reads the water state, the water state reads the clock.
 */
function nowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}

/**
 * The senses a treatment answers to. ⭐ Deliberately the same pair the
 * spoilage band uses — you SEE that a ham is dry and salt-crusted and you
 * SMELL the smoke — but a **separate line**, never a fifth freshness band.
 * The population and the water state are different facts, and one gauge
 * reporting both is how the split gets quietly undone at render time.
 */
const CURE_CHANNELS: readonly string[] = ['vision', 'smell'];

/**
 * ⭐ **The cure's own field on the blend payload, declared here.** Same
 * move `Freshness` makes one file over: the gauge has to hang on something
 * per-instance, and the payload's own module has no business knowing what
 * a water activity is.
 */
declare module '../bulk/Bulkable' {
  interface BulkPayload {
    /** The per-instance water state of this matter (absent ⇒ untreated). */
    cure?: CureState;
    /** Game-seconds the blend's `cure` was last reconciled. */
    cureStamp?: number;
  }
}

/** Append a cured-state line to a host's long description — never a number. */
function cureAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  if (opts?.filter && !opts.filter.some((c) => CURE_CHANNELS.includes(c))) {
    return text;
  }
  if (!MixinApi.isCured(host)) return text;
  if (host.isDestroyed()) return text;
  const line = Cure.phraseFor(host.getCureState());
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/**
 * The cure arithmetic, in ONE place — the {@link Freshness} shape, for the
 * same reason: a discrete cut and a blend in a pot must not drift.
 *
 * ⚠ Everything here is pure over its arguments EXCEPT the two slot methods
 * at the end, which read and write a `BulkSlot`'s payload. Same documented
 * exception, same reasoning: this is cure POLICY, and `lib/bulk` should
 * carry the `cure` field the way it carries `freshness`, as data.
 */
export class Cure {
  /** The untreated state — the identity of the water-activity derivation. */
  public static untreated(): CureState {
    return { moisture: 1, solute: 0 };
  }

  /** Whether a state is the untreated identity (nothing to say, nothing to store). */
  public static isUntreated(cure: CureState | null | undefined): boolean {
    if (!cure) return true;
    return cure.moisture >= 1 && cure.solute <= 0;
  }

  /** A payload's water state, or `null` when it carries none. */
  public static stateOf(payload: BulkPayload | null | undefined): CureState | null {
    const cure = payload?.cure;
    if (!cure) return null;
    return {
      moisture: clamp01(cure.moisture),
      solute: clamp01(cure.solute),
    };
  }

  /**
   * Apply a treatment: the STRONGER of what the matter already had and
   * what the act does to it. A second, weaker cure never un-cures — which
   * is the asymmetry stated as arithmetic rather than as a guard, and what
   * makes hurdles stack across two separate acts (salt it, then dry it).
   */
  public static applyTreatment(
    cure: CureState | null,
    treatment: { moisture?: number; solute?: number },
  ): CureState {
    const base = cure ?? Cure.untreated();
    const moisture =
      treatment.moisture === undefined
        ? base.moisture
        : Math.min(base.moisture, clamp01(treatment.moisture));
    const solute =
      treatment.solute === undefined
        ? base.solute
        : Math.max(base.solute, clamp01(treatment.solute));
    return { moisture, solute };
  }

  /**
   * Blend two water states by mass — the pour rule, matching
   * {@link Freshness.blendLoads}. Tipping half a jar of brine into fresh
   * stock partly cures the stock; it does not launder the brine.
   */
  public static blend(
    a: CureState | null,
    amountA: number,
    b: CureState | null,
    amountB: number,
  ): CureState {
    const left = a ?? Cure.untreated();
    const right = b ?? Cure.untreated();
    const total = amountA + amountB;
    if (!(total > 0)) return { ...left };
    return {
      moisture: clamp01(
        (clamp01(left.moisture) * amountA + clamp01(right.moisture) * amountB) /
          total,
      ),
      solute: clamp01(
        (clamp01(left.solute) * amountA + clamp01(right.solute) * amountB) /
          total,
      ),
    };
  }

  /**
   * The moisture a thing settles at in air of this relative humidity — the
   * equilibrium a dried thing climbs back toward. A dry store holds a ham
   * dry; a steamy kitchen softens it.
   */
  public static equilibriumMoisture(humidityPct: number): number {
    return clamp01(humidityPct / 100);
  }

  /**
   * Integrate rehydration over `elapsedS` game-seconds. Exponential
   * approach to the equilibrium, closed-form so a season costs the same as
   * a minute.
   *
   * ⚠ **One-way, and deliberately.** Moisture only ever rises here. Drying
   * is an act; nothing in the world dries on its own, and a passive arm
   * that lowered moisture would quietly preserve every ration in the
   * pantry.
   */
  public static advanceMoisture(
    moisture: number,
    elapsedS: number,
    humidityPct: number,
  ): number {
    const from = clamp01(moisture);
    if (!(elapsedS > 0)) return from;
    const target = Cure.equilibriumMoisture(humidityPct);
    if (target <= from) return from; // one-way: nothing dries by itself
    const rate = dial(
      AppSettingKeys.cureRehydrationPerHour,
      CURE_DEFAULTS.REHYDRATION_PER_HOUR,
    );
    if (!(rate > 0)) return from;
    const hours = elapsedS / CURE_DEFAULTS.SECONDS_PER_HOUR;
    const closed = 1 - Math.exp(-rate * hours);
    return clamp01(from + (target - from) * closed);
  }

  /**
   * The relative humidity (%) a host's surroundings hold — the cheap,
   * SYNCHRONOUS read (`BiomeApi.localHumidityFor`), because the reconcile
   * runs off a getter and cannot await. It walks the containment chain's
   * authored overrides and biome defaults exactly as the full resolve
   * does, and skips only the zone tier and the weather deviation.
   */
  public static ambientHumidityOf(host: Stuff): number {
    if (MixinApi.isContainable(host)) {
      const where = host.getContainer();
      if (where !== null && MixinApi.isContainer(where)) {
        const pct = BiomeApi.localHumidityFor(where);
        if (pct !== null) return pct;
      }
    }
    return dial(
      AppSettingKeys.cureAmbientHumidity,
      CURE_DEFAULTS.AMBIENT_HUMIDITY_PCT,
    );
  }

  /**
   * The player-facing line for a treated thing — two axes, band words, no
   * number anywhere. `null` for untreated matter, which says nothing at
   * all rather than saying "fresh".
   */
  public static phraseFor(cure: CureState | null): string | null {
    if (!cure) return null;
    const dried =
      cure.moisture <= dial(AppSettingKeys.cureBandDriedAt, CURE_DEFAULTS.BAND_DRIED_AT)
        ? 'thoroughly dried'
        : cure.moisture < dial(AppSettingKeys.cureBandDryingAt, CURE_DEFAULTS.BAND_DRYING_AT)
          ? 'partly dried'
          : null;
    const cured =
      cure.solute >= dial(AppSettingKeys.cureBandCuredAt, CURE_DEFAULTS.BAND_CURED_AT)
        ? 'heavily salted'
        : cure.solute > dial(AppSettingKeys.cureBandCuringAt, CURE_DEFAULTS.BAND_CURING_AT)
          ? 'lightly salted'
          : null;
    if (dried && cured) return `It has been ${dried} and ${cured}.`;
    if (dried) return `It has been ${dried}.`;
    if (cured) return `It has been ${cured}.`;
    return null;
  }

  // ───────────────────── the slot seam (impure) ─────────────────────

  /**
   * A blend's water state, **reconciled on read** against the holder's
   * surroundings — the bulk twin of `CuredMixin.getCureState()`.
   *
   * ⭐ **Sparse by construction.** A slot whose matter is untreated has no
   * `cure` record and never gets one: there is nothing to integrate, so
   * nothing is written. Only a treated blend (which something had to
   * treat) carries the two scalars and the stamp.
   */
  public static stateFor(slot: BulkSlot): CureState | null {
    const payload = slot.getPayload();
    const cure = Cure.stateOf(payload);
    if (!cure || !payload) return null;
    const nowS = nowSeconds();
    if (nowS === null) return cure;
    const stamp = payload.cureStamp ?? 0;
    if (stamp === 0 || nowS <= stamp) {
      slot.setPayload({ ...payload, cureStamp: nowS });
      return cure;
    }
    const moisture = Cure.advanceMoisture(
      cure.moisture,
      nowS - stamp,
      Cure.ambientHumidityOf(slot.getHolder()),
    );
    const next: CureState = { moisture, solute: cure.solute };
    slot.setPayload({ ...payload, cure: next, cureStamp: nowS });
    return next;
  }

  /**
   * Stamp a blend's water state outright — the craft's treatment step and
   * the pour's blend. A slot holding nothing has no matter to be a state
   * OF, so that is a no-op; and stamping the untreated identity clears the
   * record rather than storing two default scalars forever.
   */
  public static stampState(slot: BulkSlot, cure: CureState | null): void {
    if (slot.getMaterial() === null) return;
    const payload = slot.getPayload() ?? {};
    if (Cure.isUntreated(cure)) {
      if (payload.cure === undefined) return;
      const { cure: _drop, cureStamp: _drops, ...rest } = payload;
      slot.setPayload(rest);
      return;
    }
    const nowS = nowSeconds() ?? 0;
    slot.setPayload({
      ...payload,
      cure: { moisture: clamp01(cure!.moisture), solute: clamp01(cure!.solute) },
      cureStamp: nowS,
    });
  }
}

export interface Cured {
  /** The current water state (reconciles rehydration on read). */
  getCureState(): CureState;
  /** How much of the material's own water is left, `[0, 1]`. */
  getMoisture(): number;
  /** How much of the remaining water is bound by solute, `[0, 1]`. */
  getSolute(): number;
  /** Set both axes outright — the treatment step and the test seam. */
  setCureState(cure: CureState): void;
  /** Apply a treatment, taking the stronger of each axis. */
  treat(treatment: { moisture?: number; solute?: number }): void;
  /** Reconcile the elapsed rehydration (sync). */
  reconcileCure(): void;

  // Public so the Hydrator can reflect into them; in-class code reads them
  // directly. Not the inter-Stuff contract (that's the method surface).
  _moisture: number;
  _solute: number;
  cureClockStamp: number;
}

export function CuredMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class CuredMixin extends Base implements Cured {
    static _mixinName = 'CuredMixin';

    static fieldMeta: FieldMeta = {
      _moisture: { persistent: true },
      _solute: { persistent: true },
      cureClockStamp: { persistent: true },
    };

    /** Derived cure line appended to the host's long description. */
    static markupAugmenters: MarkupAugmenter[] = [cureAugmenter];

    /** `[0, 1]`; `1` = as-harvested (the sparse default). */
    public _moisture = 1;
    /** `[0, 1]`; `0` = untreated (the sparse default). */
    public _solute = 0;
    /** Game-seconds stamp of the last reconcile; `0` = never treated. */
    public cureClockStamp = 0;

    /** Reentry guard — a reconcile must never recurse through a read. */
    private _reconcilingCure = false;

    // ---------- reads ----------

    public getCureState(): CureState {
      if (!this._reconcilingCure) this.reconcileCure();
      return { moisture: clamp01(this._moisture), solute: clamp01(this._solute) };
    }

    public getMoisture(): number {
      return this.getCureState().moisture;
    }

    public getSolute(): number {
      return this.getCureState().solute;
    }

    // ---------- writes ----------

    public setCureState(cure: CureState): void {
      if (!Number.isFinite(cure.moisture) || !Number.isFinite(cure.solute)) return;
      this._moisture = clamp01(cure.moisture);
      this._solute = clamp01(cure.solute);
      const nowS = nowSeconds();
      if (nowS !== null) this.cureClockStamp = nowS;
    }

    public treat(treatment: { moisture?: number; solute?: number }): void {
      this.setCureState(Cure.applyTreatment(this.getCureState(), treatment));
    }

    // ---------- reconcile-on-read ----------

    /**
     * Climb back toward the ambient equilibrium over elapsed game-time.
     *
     * ⭐⭐ **Untreated matter returns before it reads the clock, and that
     * ordering IS the sparse-storage guarantee.** A cut at `moisture: 1`
     * has nothing to regain, so a `look` at one writes no stamp — the
     * lesson `FreshnessMixin` records about the first `look` at an anvil,
     * applied one mixin over.
     */
    public reconcileCure(): void {
      if (this._reconcilingCure) return;
      if (this._moisture >= 1) return; // nothing to regain; touch nothing

      const nowS = nowSeconds();
      if (nowS === null) return;

      if (this.cureClockStamp === 0) {
        this.cureClockStamp = nowS;
        return;
      }
      const elapsed = nowS - this.cureClockStamp;
      if (elapsed <= 0) {
        this.cureClockStamp = nowS;
        return;
      }

      this._reconcilingCure = true;
      try {
        const self = this as unknown as Stuff;
        this._moisture = Cure.advanceMoisture(
          this._moisture,
          elapsed,
          Cure.ambientHumidityOf(self),
        );
        this.cureClockStamp = nowS;
      } finally {
        this._reconcilingCure = false;
      }
    }
  };
}
