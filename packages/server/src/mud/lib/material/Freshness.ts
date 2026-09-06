/**
 * FreshnessMixin — the cross-cutting **spoilage** gauge.
 *
 * Any physical object can go off. What is stored is not "freshness" but
 * its cause: a **microbial load** in `[0, 1]`, the fraction of the
 * spoilage flora's carrying capacity that has actually grown. The band a
 * player reads (`fresh` / `tainted` / `spoiled` / `rotten`), the smell on
 * a `look`, and the ptomaine dose an ingest folds in are all *derived*
 * from that one number — nobody authors "this stew is off".
 *
 * **The rate law is real microbiology, not a decay timer.** Growth is
 * logistic from an inoculum, with the specific growth rate answering to
 * the two things that actually govern a food's shelf life:
 *
 *   `μ = μ_max · f_T(T) · f_aw(a_w)`
 *
 *   - **`f_T`** is Arrhenius over the food's own tabulated activation
 *     energy (`Material.spoilActivationEnergy`, J/mol): warm food spoils
 *     faster, and *how much* faster is a property of the food. Below
 *     freezing the water is not liquid and growth stops (`f_T = 0`) — a
 *     pause, not a reset, which is why a thawed thing resumes where it
 *     left off. Above the kill temperature the population **dies**
 *     exponentially instead of growing: that is what cooking does.
 *   - **`f_aw`** is the water-activity term. Below the floor
 *     (`freshness.awFloor`, ≈ 0.60) nothing grows at all, which is the
 *     whole reason salt, sugar, honey and spirits keep: they are
 *     shelf-stable *by physics*, with no shelf-stable flag anywhere.
 *
 * ⚠ **Narrow, not universal — and this docstring said the opposite until
 * 2026-09-04.** It claimed the mixin "composes onto every `Thing` (beside
 * `WetMixin`)", which was true of an earlier draft and false of the
 * shipped code: it composes on **`Provision` and only `Provision`**
 * (`platform/thing/Provision.ts`), the one class in the library that is
 * food by name. Composing it wide put five spoilage methods on the
 * documented author surface of a rock, a lantern and a pair of socks,
 * against `callable == visible == cared-about`.
 *
 * The wide version was not arbitrary — perishability really is a property
 * of the **Material**, not the class, so "compose everywhere and let inert
 * materials no-op" reads correct. What it costs is the author surface, and
 * `pnpm lint:perishable` is what buys the narrowing back: it fails CI on
 * any row whose Material tabulates a non-zero `spoilActivationEnergy` but
 * whose class does not reach this mixin. Without that gate the narrowing
 * would fail the way this codebase fails worst — **silently**, with a
 * perishable material that simply never rots and nothing anywhere to say
 * so. See `scripts/check-perishable.ts`.
 *
 * Storage is sparse in the `WetMixin` shape regardless: two scalar fields
 * at their `0` defaults until something actually spoils.
 *
 * **Two divergences from `WetMixin`, both deliberate:**
 *
 *   1. **No far-past guard.** Wetness drops a long gap because real
 *      absence never dries you; food rots over the *whole* absence.
 *      Coming back to a week-old stew is the point.
 *   2. **No linkdead freeze.** An item has no `Interactive`, and a
 *      carried ration does not stop rotting because its owner dropped
 *      link.
 *
 * The same arithmetic serves a discrete item (this mixin's own fields)
 * and a bulk blend (`BulkPayload.freshness`, reconciled through its
 * holder) — {@link Freshness} holds it once so the two can never drift.
 *
 * See [docs/subsystems/spoilage.md].
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type Material from './Material';
import type { ToxinTag } from '../metabolism/Metabolic';
import type { BulkPayload, BulkSlot } from '../bulk/Bulkable';
import { Cure, type CureState } from './Cured';
import { Contamination } from './Contaminable';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { TemplatePaths } from '../paths';
import type { MarkupAugmenter } from '../../api/mml';

/** The player-facing spoilage band (presentation, never a raw number). */
export type FreshnessBand = 'fresh' | 'tainted' | 'spoiled' | 'rotten';

/** Seeded-literal fallbacks — pre-warm / test safe. */
const FRESHNESS_DEFAULTS = {
  SECONDS_PER_HOUR: 3600,
  /** The universal gas constant (J/(mol·K)) — a physical constant, not a dial. */
  GAS_CONSTANT: 8.314,
  /** Ambient a materialless / non-Thermal host reads (K). */
  AMBIENT_K: 293,
  /** μ_max (per game-hour) at the reference temperature. */
  MU_MAX_PER_HOUR: 0.35,
  /** The Arrhenius reference temperature (K) — 30 °C, where `f_T = 1`. */
  REFERENCE_K: 303,
  /** Below this (K) the water is ice and growth stops. */
  FREEZING_K: 273,
  /** At/above this (K) the flora dies instead of growing. */
  KILL_K: 333,
  /** Exponential death rate (per game-hour) AT the kill temperature. */
  KILL_RATE_PER_HOUR: 6,
  /**
   * Activation energy (J/mol) of the DEATH curve — what makes the kill a
   * rate rather than a threshold. Steep, and real thermal-death curves
   * are: 60 °C held for minutes and 100 °C held for a moment do the same
   * work, and a lazy warm-through does neither.
   */
  KILL_ACTIVATION_ENERGY: 200000,
  /** Water activity below which nothing grows (the shelf-stable floor). */
  AW_FLOOR: 0.6,
  /** The a_w a perishable Material that tabulates none is assumed to have. */
  AW_DEFAULT: 0.97,
  /** The seed population a perishable host starts from (fraction of K). */
  INOCULUM: 0.002,
  /** Band thresholds on the load. */
  BAND_TAINTED_AT: 0.25,
  BAND_SPOILED_AT: 0.6,
  BAND_ROTTEN_AT: 0.85,
  /** Load at/below which an ingest carries no ptomaine at all. */
  DOSE_ONSET_LOAD: 0.3,
  /** Ptomaine dose (mg) a fully rotten serving carries. */
  DOSE_SCALE_MG: 900,
} as const;

/** The toxin a spoiled ingest carries — the shipped `ptomaine` Condition. */
const SPOILAGE_TOXIN = 'ptomaine';

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

/** The senses spoilage answers to: you see it and you smell it. */
const FRESHNESS_CHANNELS: readonly string[] = ['vision', 'smell'];

/** The player-facing phrase for a non-fresh band (never `fresh`). */
const FRESHNESS_PHRASE: Record<Exclude<FreshnessBand, 'fresh'>, string> = {
  tainted: 'It smells faintly off.',
  spoiled: 'It has gone bad — the smell is unmistakable.',
  rotten: 'It is rotten, crawling and foul.',
};

/**
 * Append a spoilage band line to a host's long description — band only,
 * never a raw number (the banding-is-presentation rule). A fresh (or
 * inert) object says nothing. Reads through the reconcile-on-read getter,
 * so a thing that has sat for a week reads truthfully the moment it is
 * looked at.
 */
function freshnessAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  // ⭐ You SEE that something has turned and you SMELL it; you do not hear
  // it. A per-call filter naming neither channel is a different sense
  // asking, and gets nothing. (No filter at all is the gestalt read — the
  // band belongs there.)
  if (opts?.filter && !opts.filter.some((c) => FRESHNESS_CHANNELS.includes(c))) {
    return text;
  }
  if (!MixinApi.isFresh(host)) return text;
  // A destroyed host is an inert proxy whose every call no-ops to
  // `undefined` — and a thing that no longer exists has no smell. (The eaten
  // ration is the live case: the scene renders after the item is consumed.)
  if (host.isDestroyed()) return text;
  const band = (host as unknown as Fresh).getFreshnessBand();
  const line = band === 'fresh' ? undefined : FRESHNESS_PHRASE[band];
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/**
 * The spoilage arithmetic, in ONE place.
 *
 * A discrete item carries the gauge on its own fields ({@link
 * FreshnessMixin}); a blend carries it on `BulkPayload.freshness` and
 * reconciles through the vessel that holds it. Both call these statics,
 * so a bowl of stew and the roast it was made from can never age by
 * different rules.
 *
 * ⚠ **Purity, and its one documented exception.** Everything here is pure
 * over its arguments EXCEPT the three slot methods at the end
 * ({@link Freshness.loadOf}, {@link Freshness.stampLoad},
 * {@link Freshness.ingestPayloadOf}), which read and write a `BulkSlot`'s
 * payload. They live here rather than on `BulkSlot` on purpose: they are
 * spoilage POLICY — when to seed a gauge, how to reconcile it, what dose
 * an ingest carries — and `lib/bulk` should carry the `freshness` field
 * the way it carries `nutrients` and `toxicity`: as data, without
 * importing the subsystem that means something by it. The alternative put
 * the whole policy on a slot handle and made the bulk substrate depend on
 * spoilage; this is the trade that was chosen, and it is the ONLY impure
 * seam in the file.
 */
/**
 * ⭐ **Spoilage's own field on the blend payload, declared here.** The
 * gauge has to hang on something per-instance, and the payload is that
 * something — but the payload's own module has no business knowing what
 * a microbial load is. Declared from the folder that owns it.
 */
declare module '../bulk/Bulkable' {
  interface BulkPayload {
    /** Microbial load + the game-time it was last reconciled. */
    freshness?: { load: number; stamp: number };
  }
}

export class Freshness {
  /**
   * The specific growth rate (per game-hour) at a temperature, for a
   * material. Returns `0` for an inert material (no tabulated activation
   * energy), for a frozen one, and for one below the water-activity
   * floor. Returns a NEGATIVE rate above the kill temperature — the
   * population is dying, and the caller integrates that as decay.
   */
  public static growthRate(
    material: Material | null,
    tempK: number,
    cure: CureState | null = null,
  ): number {
    if (!material) return 0;
    const ea = material.getSpoilActivationEnergy().rawValue();
    if (!(ea > 0)) return 0; // inert: nothing tabulated, nothing rots

    if (tempK >= dial(AppSettingKeys.freshnessKillK, FRESHNESS_DEFAULTS.KILL_K)) {
      return -Freshness.killRatePerHourAt(tempK);
    }
    if (
      tempK <= dial(AppSettingKeys.freshnessFreezingK, FRESHNESS_DEFAULTS.FREEZING_K)
    ) {
      return 0; // the water is ice — a pause, not a reset
    }

    const aw = Freshness.waterActivityOf(material, cure);
    const floor = dial(AppSettingKeys.freshnessAwFloor, FRESHNESS_DEFAULTS.AW_FLOOR);
    if (aw <= floor) return 0; // salt, sugar, honey, spirits
    // A linear ramp above the floor: full rate at a_w = 1, nothing at the
    // floor. (Real predictive models use a Gibson-type square-root term;
    // the ramp keeps the same monotone shape without pretending to a
    // precision the tabulated a_w values do not have.)
    const fAw = clamp01((aw - floor) / (1 - floor));

    const refK = dial(AppSettingKeys.freshnessReferenceK, FRESHNESS_DEFAULTS.REFERENCE_K);
    const fT = Math.exp(
      (-ea / FRESHNESS_DEFAULTS.GAS_CONSTANT) * (1 / tempK - 1 / refK),
    );
    const muMax = dial(
      AppSettingKeys.freshnessMuMaxPerHour,
      FRESHNESS_DEFAULTS.MU_MAX_PER_HOUR,
    );
    return muMax * fT * fAw;
  }

  /**
   * The water activity of a *particular piece* of this matter: the
   * Material's tabulated base (or the perishable default), scaled by the
   * per-instance water state.
   *
   *   `a_w = a_w(material) · moisture · (1 − solute)`
   *
   * ⭐ **Multiplicative, which is what makes hurdles stack.** Drying and
   * salting are the same lever seen twice — take away the water, or bind
   * what is left — so doing both beats doing either, and partial treatment
   * earns partial benefit, with nobody enumerating "salt cod" anywhere.
   *
   * ⭐ `moisture: 1, solute: 0` is the **identity**. That is why every row
   * already in the world reads exactly as it did before the cure axis
   * existed, and it is pinned by a test rather than assumed.
   */
  public static waterActivityOf(
    material: Material,
    cure: CureState | null = null,
  ): number {
    const tabulated = material.getWaterActivity();
    const base =
      tabulated > 0
        ? clamp01(tabulated)
        : dial(AppSettingKeys.freshnessAwDefault, FRESHNESS_DEFAULTS.AW_DEFAULT);
    if (!cure) return base;
    const moisture = clamp01(cure.moisture);
    const solute = clamp01(cure.solute);
    return clamp01(base * moisture * (1 - solute));
  }

  /**
   * The temperature (K) at/above which the flora dies rather than grows —
   * the pasteurization floor, and the number a working has to reach for a
   * cook to have *killed* anything. Read by the crafting output step as
   * well as by the gauge, so "hot enough to cook" is one fact.
   */
  public static killTemperatureK(): number {
    return dial(AppSettingKeys.freshnessKillK, FRESHNESS_DEFAULTS.KILL_K);
  }

  /**
   * ⭐⭐ **The death rate (per game-hour) at a temperature — because "hot
   * enough" is a RATE, not a line you cross.**
   *
   * Arrhenius over the kill temperature: at exactly `killK` it is the
   * tabulated base rate, and it climbs steeply from there. A long hold at
   * a lower heat and a brief moment at a higher one achieve the same kill;
   * a warm-through barely over the line achieves neither, however long you
   * leave it, which is what makes a simmer, a sear and a lazy reheat three
   * genuinely different acts.
   *
   * ⚠ It used to be a flat dial, so every temperature above 60 °C killed
   * at exactly the same speed and boiling was no better than warming.
   */
  public static killRatePerHourAt(tempK: number): number {
    const killK = dial(AppSettingKeys.freshnessKillK, FRESHNESS_DEFAULTS.KILL_K);
    const base = dial(
      AppSettingKeys.freshnessKillRatePerHour,
      FRESHNESS_DEFAULTS.KILL_RATE_PER_HOUR,
    );
    if (tempK <= killK) return base;
    const ea = dial(
      AppSettingKeys.freshnessKillActivationEnergy,
      FRESHNESS_DEFAULTS.KILL_ACTIVATION_ENERGY,
    );
    return base * Math.exp((ea / FRESHNESS_DEFAULTS.GAS_CONSTANT) * (1 / killK - 1 / tempK));
  }

  /**
   * What survives a working that held the food at `tempK` for `holdS`
   * game-seconds. The **craft's** half of the kill — the same arithmetic
   * `advance` runs on the passive reconcile, called with a recipe's hold
   * instead of elapsed game-time.
   *
   * ⭐ One function, two callers, deliberately: two kill curves that drift
   * apart is the bug this avoids.
   */
  public static killOver(load: number, holdS: number, tempK: number): number {
    const l0 = clamp01(load);
    if (l0 <= 0 || !(holdS > 0)) return l0;
    const killK = dial(AppSettingKeys.freshnessKillK, FRESHNESS_DEFAULTS.KILL_K);
    if (tempK < killK) return l0;
    const hours = holdS / FRESHNESS_DEFAULTS.SECONDS_PER_HOUR;
    const survived = l0 * Math.exp(-Freshness.killRatePerHourAt(tempK) * hours);
    return survived < 1e-6 ? 0 : survived;
  }

  /** The seed population a perishable starts from (fraction of capacity). */
  public static inoculum(): number {
    return dial(AppSettingKeys.freshnessInoculum, FRESHNESS_DEFAULTS.INOCULUM);
  }

  /**
   * Integrate a load forward over `elapsedS` game-seconds at the material's
   * rate for `tempK`. Closed-form, so a week-long gap costs the same as a
   * minute — logistic growth while the rate is positive, exponential death
   * while it is negative.
   */
  public static advance(
    load: number,
    elapsedS: number,
    material: Material | null,
    tempK: number,
    cure: CureState | null = null,
  ): number {
    if (!(elapsedS > 0)) return clamp01(load);
    const mu = Freshness.growthRate(material, tempK, cure);
    if (mu === 0) return clamp01(load);
    const hours = elapsedS / FRESHNESS_DEFAULTS.SECONDS_PER_HOUR;

    if (mu < 0) {
      // Thermal death: N(t) = N₀·e^(−k·t), floored to nothing.
      const killed = clamp01(load) * Math.exp(mu * hours);
      return killed < 1e-6 ? 0 : killed;
    }

    // Logistic from the seed: L(t) = L₀e^(μt) / (1 − L₀ + L₀e^(μt)).
    const l0 = Math.max(clamp01(load), Freshness.inoculum());
    if (l0 >= 1) return 1;
    const g = Math.exp(mu * hours);
    if (!Number.isFinite(g)) return 1;
    return clamp01((l0 * g) / (1 - l0 + l0 * g));
  }

  /** Band a load for presentation. */
  public static bandFor(load: number): FreshnessBand {
    const l = clamp01(load);
    if (l >= dial(AppSettingKeys.freshnessBandRottenAt, FRESHNESS_DEFAULTS.BAND_ROTTEN_AT))
      return 'rotten';
    if (l >= dial(AppSettingKeys.freshnessBandSpoiledAt, FRESHNESS_DEFAULTS.BAND_SPOILED_AT))
      return 'spoiled';
    if (l >= dial(AppSettingKeys.freshnessBandTaintedAt, FRESHNESS_DEFAULTS.BAND_TAINTED_AT))
      return 'tainted';
    return 'fresh';
  }

  /**
   * The ptomaine dose one serving at this load carries — a **curve, not a
   * step**: nothing at all below the onset, then rising superlinearly, so
   * a slightly-off ration is a bad afternoon and a rotten one is a real
   * poisoning. `null` when the load carries no dose at all.
   *
   * The toxin `type` is the shipped `ptomaine` `Condition`; the per-body
   * absorption / clearance / severity bands live on that seed, never here
   * (the same amount-vs-rate split as every other {@link ToxinTag}).
   */
  public static doseFor(load: number): ToxinTag | null {
    const onset = dial(
      AppSettingKeys.freshnessDoseOnsetLoad,
      FRESHNESS_DEFAULTS.DOSE_ONSET_LOAD,
    );
    const l = clamp01(load);
    if (l <= onset || onset >= 1) return null;
    const t = (l - onset) / (1 - onset);
    const scale = dial(
      AppSettingKeys.freshnessDoseScaleMg,
      FRESHNESS_DEFAULTS.DOSE_SCALE_MG,
    );
    const amount = scale * t * t;
    if (amount <= 0) return null;
    return { type: SPOILAGE_TOXIN, amount };
  }

  /**
   * A `BulkPayload` that stands for a `Material` — and it is now nearly
   * empty, which is the decomposition paying off. It used to copy every
   * field a reader consults (nutrients, amounts, toxicity, edibility)
   * because a payload carrying only the ptomaine *"would silently drop
   * the food's real nutrition"*. It cannot any more: `BlendLabel` falls
   * back to the Material for a payload with no composition, so a minimal
   * shadow reads identically to no shadow at all. It exists because the gauge has to hang on something: a slot
   * holding perishable matter needs a place to keep its load, and the
   * payload is the per-instance face of "what this particular matter is".
   * Writing a faithful shadow is therefore a no-op in meaning and the one
   * honest way to say "*this* batch has been out since Tuesday".
   */
  public static materialShadow(_material: Material | null): BulkPayload {
    // ⭐⭐ **Empty, now — and that is the whole decomposition in one
    // function.** This used to copy the Material's name, appearance,
    // keywords, tags, nutrition, amounts, toxins and edibility, because a
    // payload carrying only the ptomaine "would silently drop the food's
    // real nutrition". Every one of those is derived today, with a
    // fallback to the Material, so a shadow that says nothing reads
    // identically to no shadow at all. It survives only as somewhere for
    // `withDose` to hang a formed toxin.
    return {};
  }

  /** Whether a material's own constants let it spoil at all. */
  public static isPerishable(material: Material | null): boolean {
    return !!material && material.getSpoilActivationEnergy().rawValue() > 0;
  }

  /**
   * The payload an ingest of this matter should actually carry: the one
   * it already had, plus the spoilage dose its microbial load has earned.
   *
   * ⭐ The dose is folded HERE, at the read, and never stored — the food
   * does not "contain" ptomaine the way a nightshade contains its alkaloid,
   * it contains a population, and the dose is what that population has
   * produced by the moment you swallow it. Storing it would let a
   * refrigerated pot keep a dose it no longer deserves.
   *
   * When the matter has no payload of its own (a discrete ration, an
   * unblended material) a shadow is synthesized from the Material, because
   * metabolism reads `payload?.toxicity ?? material.getToxicity()` — a
   * payload carrying only the ptomaine would silently drop the food's real
   * nutrition. Returns the payload unchanged (possibly `null`) when the
   * load has earned no dose at all.
   */
  public static withDose(
    payload: BulkPayload | null,
    material: Material | null,
    load: number,
  ): BulkPayload | null {
    const dose = Freshness.doseFor(load);
    if (!dose) return payload;
    const base: BulkPayload = payload ?? Freshness.materialShadow(material);
    // ⭐ A FORMED toxin: the population produced it, no ingredient brought
    // it, and nothing in the composition implies it — so it is carried,
    // not derived. And it rides past the heat filter by construction,
    // because heat stops the growth without un-poisoning what the growth
    // already made.
    const formedToxins = (base.formedToxins ?? []).map((t) => ({ ...t }));
    const existing = formedToxins.find((t) => t.type === dose.type);
    if (existing) existing.amount += dose.amount;
    else formedToxins.push({ ...dose });
    return { ...base, formedToxins };
  }

  /**
   * Blend two loads by mass — the pour rule. Half a spoiled pot into a
   * full fresh one raises the fresh one; it does not launder the spoiled
   * one. (Volume stands in for mass: both sides of a legal transfer are
   * the same material by the time this runs.)
   */
  public static blendLoads(
    loadA: number,
    amountA: number,
    loadB: number,
    amountB: number,
  ): number {
    const total = amountA + amountB;
    if (!(total > 0)) return clamp01(loadA);
    return clamp01((clamp01(loadA) * amountA + clamp01(loadB) * amountB) / total);
  }

  /**
   * The temperature a gauge on this host reads: its own Thermal
   * temperature when it has one, else the neutral ambient. A food class
   * composes `ThermalMixin` precisely so the fridge, the fire and the
   * cellar are all one answer.
   */
  public static hostTemperatureK(host: Stuff): number {
    if (MixinApi.isThermal(host)) {
      try {
        return host.getTemperature().rawValue();
      } catch {
        /* fall through to ambient */
      }
    }
    return dial(AppSettingKeys.freshnessAmbientK, FRESHNESS_DEFAULTS.AMBIENT_K);
  }

  // ───────────────────── the slot seam (impure) ─────────────────────
  // ⚠ The three below read and write a `BulkSlot`'s payload — the file's
  // one documented exception to "pure over its arguments" (see header).

  /**
   * A blend's microbial load, **reconciled on read** against the holder's
   * temperature — the bulk half of the gauge, twin of
   * `FreshnessMixin.getMicrobialLoad()`.
   *
   * `0` for a slot holding nothing, or matter that tabulates no
   * activation energy. ⭐ **Lazy seed:** a slot holding matter that CAN
   * spoil gets a gauge the first time anybody asks, and nothing else
   * does — that is the sparse-storage rule, and it is why a keg of ale, a
   * tap of water and an air tank stay two flat fields forever. The shadow
   * payload written at that moment mirrors the Material field for field,
   * so every `payload ?? material` reader is unaffected by its arrival.
   *
   * The write-back is why a read mutates: the gauge is lazy exactly like
   * the discrete one, and a stew nobody looks at for a week integrates
   * the whole week the moment somebody does.
   */
  public static loadOf(slot: BulkSlot): number {
    const payload = slot.getPayload();
    const gauge = payload?.freshness;
    if (!gauge) {
      if (slot.isEmpty()) return 0;
      const mat = slot.getMaterial();
      if (!Freshness.isPerishable(mat)) return 0;
      const seedAt = Freshness.nowSeconds();
      if (seedAt === null) return 0;
      slot.setPayload({
        ...(payload ?? Freshness.materialShadow(mat)),
        freshness: { load: 0, stamp: seedAt },
      });
      return 0;
    }
    const nowS = Freshness.nowSeconds();
    if (nowS === null) return gauge.load;
    if (gauge.stamp === 0 || nowS <= gauge.stamp) {
      slot.setPayload({ ...payload, freshness: { ...gauge, stamp: nowS } });
      return gauge.load;
    }
    // ⚠ The water state FIRST, and reconciled: a blend that has been
    // rehydrating in a damp cellar spoils at the a_w it has NOW, and
    // `Cure.stateFor` may rewrite the payload — so read it before the
    // freshness write, or the write below stamps over it.
    const cure = Cure.stateFor(slot);
    const load = Freshness.advance(
      gauge.load,
      nowS - gauge.stamp,
      slot.getMaterial(),
      Freshness.hostTemperatureK(slot.getHolder()),
      cure,
    );
    slot.setPayload({ ...slot.getPayload(), freshness: { load, stamp: nowS } });
    return load;
  }

  /**
   * Stamp a blend's microbial load outright — the cook's kill step and
   * the pour's blend. Writes the shadow payload if the slot had none, so
   * a fill can say "this came out of the pot sterile" in one call. A slot
   * holding nothing has no matter to be a gauge OF, so that is a no-op.
   */
  public static stampLoad(slot: BulkSlot, load: number): void {
    const material = slot.getMaterial();
    if (material === null) return;
    const payload = slot.getPayload() ?? Freshness.materialShadow(material);
    const nowS = Freshness.nowSeconds() ?? 0;
    const clamped = load < 0 ? 0 : load > 1 ? 1 : load;
    slot.setPayload({ ...payload, freshness: { load: clamped, stamp: nowS } });
  }

  /**
   * The payload an ingest from this slot should carry — the stored one
   * with the spoilage dose its (reconciled) load has earned folded in.
   * The one seam `drink` / `sip` / `eat` read, so a spoiled pot poisons
   * through every route into a mouth without any of them knowing the word.
   */
  public static ingestPayloadOf(slot: BulkSlot): BulkPayload | null {
    // ⚠ The load FIRST: reading it reconciles (and may seed) the payload,
    // so reading the payload before it would hand back a stale copy.
    const load = Freshness.loadOf(slot);
    // ⚠⚠ The silent half, reconciled the same way and folded the same
    // way. `Contamination.withLoads` also deposits any formed toxin an
    // intoxicating population has made, which is the arm that needs no
    // in-host machinery at all.
    const pathogens = Contamination.loadsFor(slot);
    const withDose = Freshness.withDose(
      slot.getPayload(),
      slot.getMaterial(),
      load,
    );
    return Contamination.withLoads(withDose, pathogens);
  }

  /** Game-seconds now, or `null` when no world clock (pre-boot / tests). */
  public static nowSeconds(): number | null {
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      return null;
    }
    return WorldClockApi.getNow().rawValue();
  }
}

export interface Fresh {
  /** Current microbial load `[0, 1]` (reconciles on read). */
  getMicrobialLoad(): number;
  /** Current banded freshness (presentation). */
  getFreshnessBand(): FreshnessBand;
  /** Whether this host's matter can spoil at all (a tabulated `Ea`). */
  isPerishable(): boolean;
  /** Reconcile the elapsed growth / die-off (sync). */
  reconcileFreshness(): void;
  /**
   * Set the load outright and re-stamp — the cook's kill step, and the
   * test seam. Not the growth path: growth only ever happens in the
   * reconcile.
   */
  setMicrobialLoad(load: number): void;

  // Public so the Hydrator can reflect into them; in-class code reads them
  // directly. Not the inter-Stuff contract (that's the method surface).
  _microbialLoad: number;
  freshnessClockStamp: number;
}

export function FreshnessMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class FreshnessMixin extends Base implements Fresh {
    static _mixinName = 'FreshnessMixin';

    static fieldMeta: FieldMeta = {
      _microbialLoad: { persistent: true },
      freshnessClockStamp: { persistent: true },
    };

    /** Derived spoilage band line appended to the host's long description. */
    static markupAugmenters: MarkupAugmenter[] = [freshnessAugmenter];

    /** Microbial load `[0, 1]`; `0` = untouched (the sparse default). */
    public _microbialLoad = 0;
    /** Game-seconds stamp of the last reconcile; `0` = never touched. */
    public freshnessClockStamp = 0;

    /** Reentry guard — a reconcile must never recurse through a read. */
    private _reconcilingFreshness = false;

    // ---------- reads ----------

    public getMicrobialLoad(): number {
      if (!this._reconcilingFreshness) this.reconcileFreshness();
      return clamp01(this._microbialLoad);
    }

    public getFreshnessBand(): FreshnessBand {
      return Freshness.bandFor(this.getMicrobialLoad());
    }

    public isPerishable(): boolean {
      const mat = this.freshnessMaterial();
      return mat !== null && mat.getSpoilActivationEnergy().rawValue() > 0;
    }

    // ---------- writes ----------

    public setMicrobialLoad(load: number): void {
      if (!Number.isFinite(load)) return;
      this._microbialLoad = clamp01(load);
      const nowS = Freshness.nowSeconds();
      if (nowS !== null) this.freshnessClockStamp = nowS;
    }

    // ---------- reconcile-on-read ----------

    /**
     * Grow (or kill off) the load over elapsed game-time since the last
     * reconcile. ⚠ Deliberately **no far-past guard** and **no linkdead
     * freeze** — food rots over the whole absence, which is the difference
     * between a spoilage gauge and a wetness one.
     */
    public reconcileFreshness(): void {
      if (this._reconcilingFreshness) return;

      // ⭐⭐ **Inertness is checked BEFORE the clock, and that ordering IS
      // the sparse-storage guarantee.** Perishability is a property of the
      // MATERIAL, not the class, so even on `Provision` — the food class —
      // a host can be made of something that never rots, and the gauge has
      // to cost nothing when it is.
      //
      // ⚠ The cost of getting this order wrong was invisible and real. It
      // read the clock and STAMPED it first, so the first `look` at an
      // anvil, a lantern or a chair wrote a non-default
      // `freshnessClockStamp` into that object's snapshot — for matter
      // that can never rot. "Two scalar fields at their defaults" was true
      // only until somebody looked at the thing. Inert matter now reads
      // and writes NOTHING.
      const material = this.freshnessMaterial();
      if (!Freshness.isPerishable(material)) return;

      const nowS = Freshness.nowSeconds();
      if (nowS === null) return;

      // First touch: seed the stamp; integrate nothing from epoch.
      if (this.freshnessClockStamp === 0) {
        this.freshnessClockStamp = nowS;
        return;
      }

      const elapsed = nowS - this.freshnessClockStamp;
      if (elapsed <= 0) {
        this.freshnessClockStamp = nowS;
        return;
      }

      this._reconcilingFreshness = true;
      try {
        const self = this as unknown as Stuff;
        this._microbialLoad = Freshness.advance(
          this._microbialLoad,
          elapsed,
          material,
          Freshness.hostTemperatureK(self),
          MixinApi.isCured(self) ? self.getCureState() : null,
        );
        this.freshnessClockStamp = nowS;
      } finally {
        this._reconcilingFreshness = false;
      }
    }

    /** The Material whose constants govern this host's spoilage. */
    private freshnessMaterial(): Material | null {
      const self = this as unknown as Stuff;
      return MixinApi.isTangible(self) ? self.getMaterial() : null;
    }
  };
}
