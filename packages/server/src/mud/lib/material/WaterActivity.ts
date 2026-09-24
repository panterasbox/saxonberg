/**
 * WaterActivityMixin — ⭐ **the water state of a particular piece of matter, and
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
import { Evaporation } from './Evaporation';
import Location from '../stuff/Location';
import type { Container } from '../spatial/Container';
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
export interface WaterState {
  /** `[0, 1]` — `1` is as-harvested; drying lowers it. */
  moisture: number;
  /** `[0, 1]` — `0` is untreated; curing raises it. */
  solute: number;
}

/** Seeded-literal fallbacks — pre-warm / test safe. */
const WATER_DEFAULTS = {
  SECONDS_PER_HOUR: 3600,
  /** Fraction of the moisture gap closed per game-hour while rehydrating. */
  REHYDRATION_PER_HOUR: 0.02,
  /** Fraction of the gap closed per game-hour while drying, before the
   * air's evaporation factor and the support's exposure scale it. */
  DRYING_PER_HOUR: 0.04,
  /** Exposure of a thing lying on bare ground, against a rack's 1.0. */
  GROUND_EXPOSURE: 0.35,
  /** Air temperature (K) assumed where no scope answers — 15 °C. */
  AMBIENT_TEMP_K: 288,
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
 * call to it. `Freshness` reads the water state (that is the whole point of
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
const WATER_CHANNELS: readonly string[] = ['vision', 'smell'];

/**
 * ⭐ **The water state's own field on the blend payload, declared here.** Same
 * move `Freshness` makes one file over: the gauge has to hang on something
 * per-instance, and the payload's own module has no business knowing what
 * a water activity is.
 */
declare module '../bulk/Bulkable' {
  interface BulkPayload {
    /** The per-instance water state of this matter (absent ⇒ untreated). */
    water?: WaterState;
    /** Game-seconds the blend's `water` was last reconciled. */
    waterStamp?: number;
  }
}

/** Append a cured-state line to a host's long description — never a number. */
function waterAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  if (opts?.filter && !opts.filter.some((c) => WATER_CHANNELS.includes(c))) {
    return text;
  }
  if (!MixinApi.isWaterActive(host)) return text;
  if (host.isDestroyed()) return text;
  const line = WaterActivity.phraseFor(host.getWaterState());
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/**
 * How much of a host the air reaches, `[0, 1]`. `0` is **enclosed** —
 * nothing dries.
 *
 * ⭐ Three rungs, and they are the whole exposure model:
 *
 *   - **enclosed** (`0`) — the immediate container is not a `Location`: a
 *     body's inventory, a sack, a chest, a pot. A ham in a closed sack
 *     does not dry, which is honest and is what keeps the store sparse
 *     for every carried and stored good in the world.
 *   - **on a support** — the support's own {@link Surfaced.getAirExposure}
 *     (default `1`). A rack, a hook, a slatted shelf; an author turns it
 *     down for a close surface.
 *   - **on bare ground** — the `cure.groundExposure` dial (`0.35`): one
 *     face to the air and nothing underneath, which is exactly why turf
 *     is built into an openwork lattice rather than heaped.
 *
 * ⚠ `ContainmentApi.placeOn` moves an item into **the surface's
 * container** and then stamps `restingOn`, so the container is the room
 * either way and `getRestingOn()` is the only thing that tells a racked
 * thing from a dropped one. That is why this reads the support and not
 * the container.
 */
function exposureOf(host: Stuff): number {
  if (!MixinApi.isContainable(host)) return 0;
  const where = host.getContainer();
  if (where === null) return 0;
  // ⚠ `instanceof Location` rather than a mixin predicate: a `Vessel` is
  // Atmospheric too, and the question here is "is this the open world or
  // the inside of something". The `Display.ts` precedent.
  if (!(where instanceof Location)) return 0;
  const support = host.getRestingOn();
  if (support !== null) return clamp01(support.getAirExposure());
  return clamp01(
    dial(AppSettingKeys.cureGroundExposure, WATER_DEFAULTS.GROUND_EXPOSURE),
  );
}

/**
 * The `Location` a host is exposed in, or `null` when it is enclosed —
 * the scope the air is read from.
 */
function exposedScopeOf(host: Stuff): (Stuff & Container) | null {
  if (!MixinApi.isContainable(host)) return null;
  const where = host.getContainer();
  if (where === null || !(where instanceof Location)) return null;
  return where as unknown as Stuff & Container;
}

/**
 * The water-activity arithmetic, in ONE place — the {@link Freshness} shape, for the
 * same reason: a discrete cut and a blend in a pot must not drift.
 *
 * ⚠ Everything here is pure over its arguments EXCEPT the two slot methods
 * at the end, which read and write a `BulkSlot`'s payload. Same documented
 * exception, same reasoning: this is water-activity POLICY, and `lib/bulk` should
 * carry the `water` field the way it carries `freshness`, as data.
 */
export class WaterActivity {
  /**
   * A gauge bound to the slot it measures. ⭐ The model lives in this
   * class's statics (pure, shared); the READS and WRITES of one slot's
   * payload live on an instance of it — the `Lock` shape, where
   * `opensFor`/`issueKeyTo` are instance methods beside the type-level
   * `mintKeyway`.
   *
   * ⚠ Deliberately NOT methods on `BulkSlot`: `bulk.md` has the bulk
   * substrate carry only what subsystems declare onto `BulkPayload`, so
   * the slot must not learn what spoilage is. Spoilage holding a
   * reference to a slot keeps that direction intact while putting the
   * verb on an object.
   */
  constructor(private readonly slot: BulkSlot) {}

  /** The untreated state — the identity of the water-activity derivation. */
  public static untreated(): WaterState {
    return { moisture: 1, solute: 0 };
  }

  /** Whether a state is the untreated identity (nothing to say, nothing to store). */
  static isUntreated(water: WaterState | null | undefined): boolean {
    if (!water) return true;
    return water.moisture >= 1 && water.solute <= 0;
  }

  /** A payload's water state, or `null` when it carries none. */
  private static stateOf(payload: BulkPayload | null | undefined): WaterState | null {
    const water = payload?.water;
    if (!water) return null;
    return {
      moisture: clamp01(water.moisture),
      solute: clamp01(water.solute),
    };
  }

  /**
   * Apply a treatment: the STRONGER of what the matter already had and
   * what the act does to it. A second, weaker cure never un-cures — which
   * is the asymmetry stated as arithmetic rather than as a guard, and what
   * makes hurdles stack across two separate acts (salt it, then dry it).
   */
  public static applyTreatment(
    water: WaterState | null,
    treatment: { moisture?: number; solute?: number },
  ): WaterState {
    const base = water ?? WaterActivity.untreated();
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
    a: WaterState | null,
    amountA: number,
    b: WaterState | null,
    amountB: number,
  ): WaterState {
    const left = a ?? WaterActivity.untreated();
    const right = b ?? WaterActivity.untreated();
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
   * Integrate the exchange of water with the surrounding air over
   * `elapsedS` game-seconds. Exponential approach to the equilibrium,
   * closed-form in both directions so a season costs the same as a minute.
   *
   * ⭐⭐ **Two-way, and the asymmetry moved.** It used to be one-way — the
   * prohibition read *"nothing dries on its own"*, on the fear that a
   * passive drying arm would quietly preserve every ration in the pantry.
   * Run the shipped numbers and the fear answers itself: equilibrium
   * moisture **is** ambient humidity and the microbial floor sits at
   * `a_w` 0.60 against a default 0.97, so passive drying only crosses the
   * floor below about **62 % ambient humidity**. A damp cellar preserves
   * nothing; a dry loft preserves slowly; an arid place preserves well.
   * All three are correct, and the preserving trades' product becomes
   * *making air drier than the weather* rather than being the only way to
   * take water out.
   *
   * ⭐ **The asymmetry that survives is exposure, not direction.** Drying
   * needs the air to reach the water, so it is gated by `drying` being
   * supplied at all: omit it and this is exactly the shipped one-way arm,
   * which is what a ham in a closed sack, a chest or a pack gets. That is
   * what keeps the store sparse.
   *
   * @param rate the **rehydration** rate, as a parameter with the dial as
   *   its default — so the body is a function of its arguments and the
   *   signature names the setting the answer moves with.
   * @param drying the drying half: the air ({@link Evaporation}, which
   *   carries the vapour deficit, the wind and the heat) and how much of
   *   the matter that air reaches. ⚠ `drying.air.humidityPct` and
   *   `humidityPct` describe the same air; the argument is kept separate so
   *   the enclosed callers' signature is untouched.
   */
  public static advanceMoisture(
    moisture: number,
    elapsedS: number,
    humidityPct: number,
    rate = dial(
      AppSettingKeys.cureRehydrationPerHour,
      WATER_DEFAULTS.REHYDRATION_PER_HOUR,
    ),
    drying?: { air: Evaporation; exposure: number; ratePerHour?: number },
  ): number {
    const from = clamp01(moisture);
    if (!(elapsedS > 0)) return from;
    const target = WaterActivity.equilibriumMoisture(humidityPct);
    const hours = elapsedS / WATER_DEFAULTS.SECONDS_PER_HOUR;

    if (target > from) {
      // Re-wetting. Always available — a dried thing left somewhere damp
      // softens back whether it is in a sack or on a rack.
      if (!(rate > 0)) return from;
      return clamp01(from + (target - from) * (1 - Math.exp(-rate * hours)));
    }
    if (target >= from) return from; // at equilibrium: nothing moves

    // Drying. Enclosed matter has no `drying` half and does not lose water.
    if (drying === undefined) return from;
    const exposure = clamp01(drying.exposure);
    if (!(exposure > 0)) return from;
    const base =
      drying.ratePerHour ??
      dial(AppSettingKeys.cureDryingPerHour, WATER_DEFAULTS.DRYING_PER_HOUR);
    const k = base * exposure * drying.air.evaporationFactor();
    if (!(k > 0)) return from;
    return clamp01(from - (from - target) * (1 - Math.exp(-k * hours)));
  }


  /**
   * The relative humidity (%) a host's surroundings hold — the cheap,
   * SYNCHRONOUS read (`BiomeApi.localHumidityFor`), because the reconcile
   * runs off a getter and cannot await. It walks the containment chain's
   * authored overrides and biome defaults exactly as the full resolve
   * does, and skips only the zone tier and the weather deviation.
   * @internal read by this module only — ambient humidity behind the water clock.
   *
   */
  static ambientHumidityOf(host: Stuff): number {
    if (MixinApi.isContainable(host)) {
      const where = host.getContainer();
      if (where !== null && MixinApi.isContainer(where)) {
        const pct = BiomeApi.localHumidityFor(where);
        if (pct !== null) return pct;
      }
    }
    return dial(
      AppSettingKeys.cureAmbientHumidity,
      WATER_DEFAULTS.AMBIENT_HUMIDITY_PCT,
    );
  }

  /**
   * The player-facing line for a treated thing — two axes, band words, no
   * number anywhere. `null` for untreated matter, which says nothing at
   * all rather than saying "fresh".
   */
  public static phraseFor(
    water: WaterState | null,
    /**
     * ⭐ The four band edges, **as one parameter defaulting to the
     * dials.** An object rather than four positional numbers because
     * four bare numbers at a call site say nothing about which is which —
     * and the point of the change is that the dependency be READABLE, not
     * merely present.
     */
    bands: {
      driedAt: number;
      dryingAt: number;
      curedAt: number;
      curingAt: number;
    } = {
      driedAt: dial(AppSettingKeys.cureBandDriedAt, WATER_DEFAULTS.BAND_DRIED_AT),
      dryingAt: dial(AppSettingKeys.cureBandDryingAt, WATER_DEFAULTS.BAND_DRYING_AT),
      curedAt: dial(AppSettingKeys.cureBandCuredAt, WATER_DEFAULTS.BAND_CURED_AT),
      curingAt: dial(AppSettingKeys.cureBandCuringAt, WATER_DEFAULTS.BAND_CURING_AT),
    },
  ): string | null {
    if (!water) return null;
    const dried =
      water.moisture <= bands.driedAt
        ? 'thoroughly dried'
        : water.moisture < bands.dryingAt
          ? 'partly dried'
          : null;
    const cured =
      water.solute >= bands.curedAt
        ? 'heavily salted'
        : water.solute > bands.curingAt
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
   * surroundings — the bulk twin of `WaterActivityMixin.getWaterState()`.
   *
   * ⭐ **Sparse by construction.** A slot whose matter is untreated has no
   * `water` record and never gets one: there is nothing to integrate, so
   * nothing is written. Only a treated blend (which something had to
   * treat) carries the two scalars and the stamp.
   */
  state(): WaterState | null {
    const payload = this.slot.getPayload();
    const water = WaterActivity.stateOf(payload);
    if (!water || !payload) return null;
    const nowS = nowSeconds();
    if (nowS === null) return water;
    const stamp = payload.waterStamp ?? 0;
    if (stamp === 0 || nowS <= stamp) {
      this.slot.setPayload({ ...payload, waterStamp: nowS });
      return water;
    }
    const moisture = WaterActivity.advanceMoisture(
      water.moisture,
      nowS - stamp,
      WaterActivity.ambientHumidityOf(this.slot.getHolder()),
    );
    const next: WaterState = { moisture, solute: water.solute };
    this.slot.setPayload({ ...payload, water: next, waterStamp: nowS });
    return next;
  }

  /**
   * Stamp a blend's water state outright — the craft's treatment step and
   * the pour's blend. A slot holding nothing has no matter to be a state
   * OF, so that is a no-op; and stamping the untreated identity clears the
   * record rather than storing two default scalars forever.
   */
  stampState(water: WaterState | null): void {
    if (this.slot.getMaterial() === null) return;
    const payload = this.slot.getPayload() ?? {};
    if (WaterActivity.isUntreated(water)) {
      if (payload.water === undefined) return;
      const { water: _drop, waterStamp: _drops, ...rest } = payload;
      this.slot.setPayload(rest);
      return;
    }
    const nowS = nowSeconds() ?? 0;
    this.slot.setPayload({
      ...payload,
      water: { moisture: clamp01(water!.moisture), solute: clamp01(water!.solute) },
      waterStamp: nowS,
    });
  }
}

export interface WaterActive {
  /** The current water state (reconciles rehydration on read). */
  getWaterState(): WaterState;
  /** How much of the material's own water is left, `[0, 1]`. */
  getMoisture(): number;
  /** How much of the remaining water is bound by solute, `[0, 1]`. */
  getSolute(): number;
  /** Set both axes outright — the treatment step and the test seam. */
  setWaterState(water: WaterState): void;
  /** Apply a treatment, taking the stronger of each axis. */
  treat(treatment: { moisture?: number; solute?: number }): void;
  /** Reconcile the elapsed rehydration (sync). */
  reconcileWater(): void;

  // Public so the Hydrator can reflect into them; in-class code reads them
  // directly. Not the inter-Stuff contract (that's the method surface).
  _moisture: number;
  _solute: number;
  waterClockStamp: number;
}

export function WaterActivityMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class WaterActivityMixin extends Base implements WaterActive {
    static _mixinName = 'WaterActivityMixin';

    static fieldMeta: FieldMeta = {
      _moisture: { persistent: true },
      _solute: { persistent: true },
      waterClockStamp: { persistent: true },
    };

    /** Derived water-state line appended to the host's long description. */
    static markupAugmenters: MarkupAugmenter[] = [waterAugmenter];

    /** `[0, 1]`; `1` = as-harvested (the sparse default). */
    public _moisture = 1;
    /** `[0, 1]`; `0` = untreated (the sparse default). */
    public _solute = 0;
    /** Game-seconds stamp of the last reconcile; `0` = never treated. */
    public waterClockStamp = 0;

    /** Reentry guard — a reconcile must never recurse through a read. */
    private _reconcilingCure = false;

    // ---------- reads ----------

    public getWaterState(): WaterState {
      if (!this._reconcilingCure) this.reconcileWater();
      return { moisture: clamp01(this._moisture), solute: clamp01(this._solute) };
    }

    public getMoisture(): number {
      return this.getWaterState().moisture;
    }

    public getSolute(): number {
      return this.getWaterState().solute;
    }

    // ---------- writes ----------

    public setWaterState(water: WaterState): void {
      if (!Number.isFinite(water.moisture) || !Number.isFinite(water.solute)) return;
      this._moisture = clamp01(water.moisture);
      this._solute = clamp01(water.solute);
      const nowS = nowSeconds();
      if (nowS !== null) this.waterClockStamp = nowS;
    }

    public treat(treatment: { moisture?: number; solute?: number }): void {
      this.setWaterState(WaterActivity.applyTreatment(this.getWaterState(), treatment));
    }

    // ---------- reconcile-on-read ----------

    /**
     * Exchange water with the surrounding air over elapsed game-time —
     * both ways.
     *
     * ⭐⭐ **The sparse-storage guarantee, restated rather than lost.** The
     * rule used to be *untreated matter returns before it reads the clock*,
     * which worked because nothing dried. Now something does, so the rule
     * becomes: **a read that would change nothing writes nothing.** Two
     * cases satisfy it, and between them they cover every good in the
     * world that is not being deliberately dried:
     *
     *   - **enclosed and untreated** — a ration in a pack, a cut in a
     *     chest, a sack in a pantry. `exposure` is `0` and `moisture` is
     *     `1`: nothing to lose, nothing to regain, no stamp written. This
     *     is the common case by a wide margin.
     *   - **exposed at equilibrium** — a cut in saturated air, or a thing
     *     already sitting at the moisture its air holds. The air is read
     *     (cheap and sync), neither direction can move, and the clock is
     *     left alone.
     *
     * ⚠ **The bounded approximation, said out loud.** The gate consults the
     * air *as it reads now*. So matter still at full moisture that sat
     * through a dry spell and is first looked at during a wet one loses
     * that spell: its clock had never started. Anything already below
     * `1` has a stamp and integrates the whole window exactly, segment by
     * segment. The trade is deliberate — the alternative is stamping every
     * fresh Provision in every open room on every `look`.
     *
     * ⭐ **The window is WALKED, not sampled.** A dry day and a wet one do
     * opposite things and their average does neither, so an absence is
     * integrated through `BiomeApi.airSegmentsFor` — the same exactness the
     * soil's rain integral has, for the same reason.
     */
    public reconcileWater(): void {
      if (this._reconcilingCure) return;

      const self = this as unknown as Stuff;
      const exposure = exposureOf(self);

      // Enclosed and untreated: nothing to lose, nothing to regain.
      if (exposure <= 0 && this._moisture >= 1) return;

      const scope = exposure > 0 ? exposedScopeOf(self) : null;
      const airNow =
        scope === null
          ? new Evaporation(
              WaterActivity.ambientHumidityOf(self),
              0,
              WATER_DEFAULTS.AMBIENT_TEMP_K,
            )
          : BiomeApi.airFor(scope);
      const target = WaterActivity.equilibriumMoisture(airNow.humidityPct);
      const canWet = target > this._moisture;
      const canDry =
        exposure > 0 &&
        target < this._moisture &&
        airNow.evaporationFactor() > 0;
      if (!canWet && !canDry) return; // nothing would change; write nothing

      const nowS = nowSeconds();
      if (nowS === null) return;

      if (this.waterClockStamp === 0) {
        this.waterClockStamp = nowS;
        return;
      }
      const elapsed = nowS - this.waterClockStamp;
      if (elapsed <= 0) {
        this.waterClockStamp = nowS;
        return;
      }

      this._reconcilingCure = true;
      try {
        if (exposure <= 0 || scope === null) {
          // Enclosed: the one-way arm, unchanged. No `drying` half.
          this._moisture = WaterActivity.advanceMoisture(
            this._moisture,
            elapsed,
            WaterActivity.ambientHumidityOf(self),
          );
          this.waterClockStamp = nowS;
          return;
        }

        let moisture = this._moisture;
        for (const seg of BiomeApi.airSegmentsFor(
          scope,
          this.waterClockStamp,
          nowS,
        )) {
          if (!(seg.durationS > 0)) continue;
          moisture = WaterActivity.advanceMoisture(
            moisture,
            seg.durationS,
            seg.air.humidityPct,
            undefined,
            { air: seg.air, exposure },
          );
        }
        this._moisture = moisture;
        this.waterClockStamp = nowS;
      } finally {
        this._reconcilingCure = false;
      }
    }
  };
}
