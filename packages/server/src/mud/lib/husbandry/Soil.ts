/**
 * SoilMixin — **soil that keeps its own time**: a moisture reserve and a
 * nutrient reserve, integrated over elapsed game-time against the weather
 * that fell on it.
 *
 * This is the half of cultivation that is about the GROUND rather than
 * about the plants standing in it. It was written self-contained inside
 * {@link CultivableMixin} — two checkpoints of its own, no reach into the
 * plant slot except through one summed number — precisely so that it could
 * travel the day something other than a pot or a bed had soil. A field is
 * that day.
 *
 * ## Two checkpoints, and why they are two
 *
 * - **the soil window** ({@link Soil.reconcileSoil}) — drains moisture by
 *   whatever is drinking, scaled by warmth, over its own elapsed window.
 * - **the sky edge** ({@link Soil.restampWatershed}) — credits rain, on a
 *   stamp of its **own**, because resolving *which locality covers this
 *   ground* is asynchronous while the reconcile that wants the answer is
 *   synchronous. ⚠⚠ Unresolved must never read as zero; see
 *   {@link SoilMixin.rainClockStamp}.
 *
 * They are separate stamps rather than one, so a ground whose soil window
 * is empty may still have a month of rain to credit.
 *
 * ## The two hooks — everything host-specific, and nothing else
 *
 * The lift needed exactly two seams, which is the measure of how
 * self-contained this already was:
 *
 * - {@link Soil.soilWaterDemandPerGameDay} — *who is drinking?* A bed
 *   answers with the summed demand of its occupants; bare ground with the
 *   sward standing on it; a host with neither answers `0` and its soil
 *   only ever gains.
 * - {@link Soil.soilCatchmentAreaM2} — *how much sky does this catch?*
 *   `mm × m² = litres`, and the m² is the host's business. A pot answers
 *   `0` and is watered by hand, which is correct: a houseplant is
 *   furniture, not production.
 *
 * Host constraint is `Stuff & Reserved` and nothing more — no Container,
 * no Slotted, no Bulkable — so a **Location** can compose it. That is the
 * whole point of the lift.
 *
 * ⚠ Note what is NOT here: **the seeded half of soil** — texture,
 * drainage, aspect, depth, native pH. Those have exactly one consumer (a
 * field) and live in the farming pack. The derived half has three
 * (`PlantPot`, `GardenBed`, `Field`), which is why it is kernel.
 *
 * See [docs/subsystems/husbandry.md] and [docs/subsystems/soil.md].
 */

import { Mixins, type MixinConstructor, type FieldMeta } from "../mixin";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { WorldClockApi } from "../../api/worldclock";
import { AppApi } from "../../api/app";
import { AddressApi } from "../../api/address";
import { BiomeApi } from "../../api/biome";
import { WeatherApi } from "../../api/weather";
import { ParcelApi } from "../../api/parcel";
import { AccessApi } from "../../api/access";
import { EmploymentApi } from "../../api/employment";
import { PersistableApi } from "../../api/persistable";
import { ContainmentApi } from "../../api/containment";
import { LandUses } from "../parcel/LandUse";
import { AppSettingKeys } from "../config/AppSettings";
import { TemplatePaths } from "../paths";
import { Quantity } from "../quantity";
import type { Reserved } from "../reserve/Reserved";
import type { Stuff } from "../stuff/Stuff";
import type { Growing, HarvestRefusal } from "./Growing";
import type { Plantable, PlantBegin, PlantDone, PlantRefusal, ZonedAgainst } from "./Plantable";
import type { ActDone, ActPlan } from "../craft/ActPlan";
import type { Tooled } from "../craft/Tool";
import type { Container } from "../spatial/Container";
import type Locality from "../../platform/idea/Locality";

const SECONDS_PER_GAME_DAY = 86_400;

/**
 * The most steps one soil window is walked in — daily up to this, longer
 * steps beyond it. Every step stays well inside the weather walk's
 * 30-day segment cap, so no rain is dropped off the front of a window.
 */
const SOIL_MAX_STEPS = 180;

/**
 * The fraction of newly-worked organic matter available as nitrogen
 * immediately. ⭐ Small on purpose: most of muck's value is next year's
 * and the year after's, which is what makes it an investment rather than
 * a fertiliser.
 */
const IMMEDIATE_MINERALIZATION = 0.15;

/**
 * Fraction of standing organic matter that mineralises into nitrogen per
 * GAME day (D89). ⭐ Slow — a fifth of it a game year — which is what
 * *the long game* means, and the mechanical reason **land you farmed
 * well is better land**.
 */
const MINERALIZATION_PER_GAME_DAY = 0.0006;

/**
 * Fraction of the structure deficit that rest and roots rebuild per GAME
 * day. ⚠ Far slower than poaching destroys it, and that asymmetry is
 * what makes a wet autumn expensive for years.
 */
const STRUCTURE_RECOVERY_PER_GAME_DAY = 0.002;

/** The soil's water reserve key (theme `cultivation`). */
export const SOIL_MOISTURE_RESERVE_KEY = "moisture";
/** The soil's nutrient reserve key — nitrogen, the limiting nutrient. */
export const SOIL_NITROGEN_RESERVE_KEY = "nitrogen";

/**
 * ⭐ **Organic matter — the long game**, and the reserve that earns its
 * place on its own (D16).
 *
 * Slow, built by exactly what ranching produces, and the mechanical
 * reason **land you farmed well is better land**: permanence you can
 * sell, and the reason your own survey record is worth having. It
 * mineralises slowly into nitrogen, which is why muck applied this year
 * is still feeding the field in three.
 */
export const SOIL_ORGANIC_MATTER_RESERVE_KEY = "organicMatter";

/**
 * ⭐ **Structure — why you do not graze wet clay** (D16, D17).
 *
 * Built by rest and roots; destroyed by hooves on wet ground. It is the
 * one interlock that runs ranching→farming as a HARM rather than a
 * benefit, which is what makes *"put the herd on the tired field"* a
 * judgement rather than a free move.
 */
export const SOIL_STRUCTURE_RESERVE_KEY = "structure";

/**
 * ⭐⭐ **Crude protein is nitrogen × 6.25** (D14) — how feed is actually
 * valued and sold, and the constant that makes soil fertility and
 * dietary protein **one accounting**.
 *
 * The engine had both halves and had never connected them: soil carries
 * a nitrogen reserve, and `Material` carries `nutrients` /
 * `nutrientAmounts` where `stew-meat` authors `protein: 26000`. This is
 * the join, and it closes the faucet **mechanically** — harvested matter
 * carries away the nitrogen it took — and **pedagogically**, because the
 * player watches fertility become feed value become growth become
 * fertility.
 */
export const PROTEIN_PER_NITROGEN = 6.25;

/** The theme every soil reserve carries. */
export const SOIL_RESERVE_THEME = "cultivation";

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === "" || raw == null) return fallback;
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
 * What a ground answers when a verb names (or does not name) a part of it
 * — *at the top end* (field population D5). `part` is `null` on one-piece
 * ground. A refusal carries its own line: the ground decides and says
 * why, the controller only sends it.
 */
export type PartResolution =
  | { ok: true; part: (Stuff & Soil) | null }
  | {
      ok: false;
      reason: "part-unnamed" | "not-a-part-here";
      line: string;
    };

/** ⭐ `sow`: broadcast `seed` over this ground (controllers-are-io D11). */
export interface SowRequest {
  by: Stuff;
  seed: Stuff & Plantable;
  /** `--at <part>`: which part of a divided field. */
  part: (Stuff & Soil) | null;
  /** A seed drill within reach: rows, at its own share of the rate. */
  drill: (Stuff & Tooled) | null;
}

/** Felt cost of one cast, percentage points of a fresh body (D5). */
const SOW_FELT_COST = 5;

/**
 * The identity of a piece of ground for the parcel registry: the persistence
 * KEY when it has one (a plotted field is cloned per lot and shares its
 * template path), else the template path.
 */
function groundPath(ground: Stuff): string {
  // ⚠ Only an EXPLICIT key — an establishing context's per-instance key
  // (a lot's parcel extent). A keyless host stashes a scope-derived owner
  // there, which is no path at all, so the parcel registry would answer
  // *nobody's ground* and a stranger could sow the university's field.
  const keyed =
    MixinApi.isPersistable(ground) && ground.isPersistenceKeyExplicit()
      ? ground.getPersistenceKey()
      : null;
  return keyed ?? ground.getTemplatePath() ?? "";
}

/**
 * ⭐ **Who may sow** (cover build D6): whoever holds the ground's parcel, or a
 * hand on shift for a business that works it — the IceSheet precedent. Ground
 * no parcel covers is not policed (*measure nothing, police nothing*).
 */
async function maySow(by: Stuff, ground: Stuff): Promise<boolean> {
  const covering = await ParcelApi.coveringParcelOf(groundPath(ground));
  if (!covering) return true;
  const extent = covering.getExtent();
  const held = await AccessApi.heldExtents(by);
  if (held.some((e) => extent === e || extent.startsWith(`${e}/`))) return true;
  if (!MixinApi.isEmployed(by)) return false;
  return EmploymentApi.operatorsAt(ground).some((b) =>
    by.isOnShiftFor(b.getOrganizationPath()),
  );
}

/**
 * The square metres a piece of ground covers: the host's own figure when it
 * answers `soilCatchmentAreaM2` (a field's area IS the sky it catches), else
 * unbounded — ground that never said how big it is is never "full".
 */
function groundAreaM2(ground: Stuff & Soil): number {
  const m2 = ground.soilCatchmentAreaM2();
  return m2 > 0 ? m2 : Number.POSITIVE_INFINITY;
}

/**
 * The sowing landed. Re-checks that the sower still stands on the ground and
 * still holds the seed, then spends the seed, creates or widens the crop,
 * settles whose it is, and captures.
 */
async function landSowing(
  req: SowRequest,
  ground: Stuff & Soil & Container,
  crop: Stuff & Growing,
  fresh: boolean,
  area: number,
  rate: number,
): Promise<ActDone<PlantDone, PlantRefusal>> {
  const { by, seed, part } = req;
  const discard = async (): Promise<void> => {
    if (fresh && !crop.isDestroyed()) await StuffApi.destruct(crop);
  };
  if (by.isDestroyed() || seed.isDestroyed() || crop.isDestroyed()) {
    await discard();
    return { ok: false, reason: "walked-off", facts: {} };
  }
  const here = MixinApi.isContainable(by) ? by.getContainer() : null;
  if ((here as Stuff | null) !== (ground as Stuff)) {
    await discard();
    return { ok: false, reason: "walked-off", facts: {} };
  }
  await seed.spendSeed(area * rate);
  ground.reconcileSoil();
  if (fresh) {
    crop.setSownAreaM2(area);
    // ⭐ Rooted in the part it was sown into, by key, BEFORE the move —
    // so it never reads the whole field's soil, even for a moment.
    if (part) crop.setGroundPart(part.soilPartKey());
    if (MixinApi.isContainable(crop)) ContainmentApi.move(crop, ground);
  } else {
    crop.addSownAreaM2(area);
  }
  try {
    await ground.ensureCropTitle();
  } catch (err) {
    console.warn("Soil: settling the crop title failed:", err);
  }
  try {
    await PersistableApi.captureHostOf(crop);
    await PersistableApi.captureHostOf(ground);
  } catch (err) {
    console.warn("Soil: capture after sowing failed:", err);
  }
  try {
    if (MixinApi.isAdvancing(by)) {
      await by.creditDeed({
        discipline: crop.getDiscipline(),
        difficulty: "trivial",
        outcome: "success",
      });
    }
  } catch (err) {
    console.warn("Soil: recording the deed failed:", err);
  }
  return {
    ok: true,
    facts: {
      kind: "sown",
      crop,
      part,
      phrase: crop.cropAreaPhrase(groundAreaM2(part ?? ground)),
    },
  };
}

/** The public surface soil offers — the ground's own state. */
export interface Soil {
  /**
   * ⭐ **Broadcast a seed over this ground** (cover build D4). One act covers
   * `husbandry.sowHandM2` (a strip across the field), or less when the seed
   * or the ground runs out; seed is spent at the crop's own rate, so a third
   * of a field's seed sows a third of it. The first act creates the crop; a
   * later act of the same kind widens it. ⭐ On a divided field the cast goes
   * into the PART named, and fills that part up to its own area. Choosing
   * where is the player's job; the game never picks for them.
   */
  sowPlanFor(
    req: SowRequest,
  ): Promise<ActPlan<PlantBegin, PlantDone, PlantRefusal> | PlantRefusal>;
  /**
   * ⭐ Which stand a harvest of `stand` means on this ground, given the part
   * named: the ground decides whether one must be named, and says so.
   */
  harvestPartFor(req: {
    stand: Stuff & Growing;
    part: (Stuff & Soil) | null;
  }): { ok: true; stand: Stuff & Growing } | HarvestRefusal;
  /**
   * ⭐ The parcel's verdict on cultivating at `site`, or null: a site on a
   * use that admits no cultivation. ⚠ UNPARCELLED GROUND IS NOT POLICED —
   * `landUseOf` is total and answers `wild` for ground nobody has claimed,
   * but "nobody has zoned this" is not "this is zoned against you".
   */
  cultivationZoningAt(site: Stuff): Promise<ZonedAgainst | null>;
  // ---------- the soil window ----------

  /** Reconcile the soil over elapsed game-time. Sync, read-triggered. */
  reconcileSoil(): void;
  /**
   * Root-zone moisture as a fraction `[0, 1]`, reconciled. `null` when
   * this ground authors no moisture reserve at all.
   */
  soilMoistureFraction(): number | null;
  /**
   * The MEAN moisture fraction across the window the last reconcile just
   * closed — what a plant integrating that same window should see. Falls
   * back to the current fraction when no window has closed.
   */
  meanSoilMoistureFraction(): number | null;
  /** Nutrient level as a fraction `[0, 1]`, or `null` when unauthored. */
  nutrientFraction(): number | null;
  /** Pour water in. Returns the litres actually absorbed (headroom-capped). */
  waterSoil(litres: number): number;
  /** Feed the soil. Returns the fraction actually absorbed. */
  feedSoil(fraction: number): number;
  /** Draw nutrient out — what a harvested crop exports. */
  drawNutrient(fraction: number): number;
  /** Organic matter as a fraction `[0, 1]`, or `null` when unmodelled. */
  organicMatterFraction(): number | null;
  /** Structure as a fraction `[0, 1]`, or `null` when unmodelled. */
  structureFraction(): number | null;
  /**
   * Work organic matter in — muck, compost, residues, green manure.
   * ⭐ It credits NITROGEN as well, but only a little of it now: the
   * rest mineralises over years, which is why a well-mucked field is
   * still feeding you in three.
   */
  addOrganicMatter(fraction: number): number;
  /**
   * ⚠ **Poach the ground** (D17) — hooves on wet soil. Destroys
   * structure in proportion to how WET it is and how fine the texture,
   * so the same herd on the same field is harmless in August and ruinous
   * in November.
   */
  poach(intensity: number, poachingFactor: number): number;
  /**
   * ⭐ Nitrogen fixed out of the ATMOSPHERE by legumes in the sward
   * (D15) — a genuine faucet in reality, and the one that makes the
   * legume rotation derivable rather than a bonus.
   */
  fixNitrogen(fraction: number): number;

  // ---------- the sky edge ----------

  /**
   * Resolve the covering locality + sky exposure this ground integrates
   * rain against. Async, and the ONLY async step in the rain edge.
   */
  restampWatershed(): Promise<void>;
  /**
   * Litres of rain this ground has absorbed since it was placed. `null`
   * while the covering locality is **unresolved** — which is NOT the
   * same statement as "no rain has fallen".
   */
  rainfallAbsorbedLitres(): number | null;
  /** Whether the sky edge has resolved its locality + exposure yet. */
  isWatershedResolved(): boolean;
  /**
   * Settle both checkpoints and (re-)resolve where this ground is — what
   * a host calls the moment it is placed, or restored into a place.
   */
  settleSoilPlacement(): void;

  // ---------- the two host hooks ----------

  /**
   * @hook Summed water demand of everything drawing on this soil, in the
   * reserve's own units per **game day**. Default `0` — soil nobody
   * drinks from only ever gains.
   *
   * ⚠ It must be a PURE read of authored profiles and must never
   * reconcile anything: reading an occupant's own moisture here would
   * re-enter that occupant's reconcile, which reads this soil. The
   * reentry guard braces it; this contract is the belt.
   */
  soilWaterDemandPerGameDay(): number;
  /**
   * @hook Square metres of sky this ground catches rain from. Default
   * `0` — ground the sky cannot find is watered by hand.
   */
  soilCatchmentAreaM2(): number;
  /**
   * @hook Fraction of the standing nitrogen a millimetre of rain carries
   * past the roots. ⭐ The host answers, because only the host knows its
   * own TEXTURE: sand leaks and clay holds. That is D2's multiplication
   * made concrete — the seeded character modulating a derived reserve.
   */
  soilLeachRate(): number;
  /**
   * @hook Why this ground refuses a SOWING right now, in words, or
   * `null` when it may be sown (cover build D4). Default `null` — a pot
   * or a bed is never refused by its ground. A field answers *not
   * ploughed for the season* or *a different crop stands in it*: the
   * seedbed is the ground's state, so the verb asks the ground.
   */
  sowingRefusal(): string | null;
  /**
   * @hook How hard the drinkers draw across the window `fromS..toS`, as a
   * multiplier on their demand. Default: the shipped warmth read (a
   * thermal host's last ambient). Ground that knows its season — a field
   * — answers the window's MEAN, so a winter nobody watched does not
   * drink like a summer (cover build).
   */
  soilDrawFactor(fromS: number, toS: number): number;
  /**
   * @hook Settle WHOSE the crop standing in this ground is, before a
   * harvest mints from it or right after a sowing creates it (cover
   * build D6). Default resolves at once — a pot's plant is whoever
   * planted it. A field stamps its crop to the business that works it.
   * ⛔ Called by the ACTS that need it (sow, harvest), never by a read.
   */
  ensureCropTitle(): Promise<void>;

  // ---------- ⭐ a soil made of parts (field population D3) ----------

  /**
   * @hook The named parts this ground is divided into; `[]` = one piece
   * (the default, and every pot, bed and unpatched field). When a ground
   * HAS parts, its own reads and writes aggregate over them — so a
   * caller that asks the whole field gets the whole field's answer, and
   * the parts keep the soil.
   */
  soilParts(): readonly (Stuff & Soil)[];
  /**
   * @hook This ground's key as a PART of a larger ground (`top-end`);
   * `''` for whole ground. A plant standing in the larger ground binds to
   * its part by this key.
   */
  soilPartKey(): string;
  /**
   * @hook Topsoil depth in metres, or `null` when unmodelled (a pot has
   * a volume, not a depth). The roots read it.
   */
  soilDepthM(): number | null;
  /**
   * @hook Square metres of THIS ground's own soil that lie between its
   * parts — the unmarked ground of a tract (tracts build D25). Default:
   * the catchment less every part's. Counted as one more term in every
   * aggregate read only when it is `> 0` and the host keeps a moisture
   * reserve of its own, so a pot, a bed and a field cut wholly into
   * parts read exactly as before.
   */
  soilRemainderAreaM2(): number;
  /**
   * @hook The word for one of this ground's parts in a refusal — *"Which
   * part? Name one: …"*. Default `'part'`; a tract answers `'field'`.
   */
  soilPartNoun(): string;
  /** The part whose key is `key`, or `null` (an empty key is whole ground). */
  soilPart(key: string): (Stuff & Soil) | null;
  /**
   * Why an act on this ground must name a part, in words, or `null` when
   * it need not (one piece, or a single part).
   */
  soilPartRefusal(): string | null;
  /**
   * Resolve the part an act names — or, naming none, whether that is
   * enough here. See {@link PartResolution}.
   */
  resolvePartFor(named: (Stuff & Soil) | null): PartResolution;
  /**
   * Litres this ground can still take before it is full, reconciled —
   * summed over its parts when it has them. What `water` sizes its
   * measure against.
   */
  soilMoistureHeadroomL(): number;
  /**
   * Points of nitrogen this ground can still take, reconciled — the
   * area-weighted mean over its parts when it has them (the reserve is a
   * per-cent: feeding a divided field raises every part alike). What
   * `feed` sizes its measure against.
   */
  soilNutrientHeadroom(): number;
  /**
   * The area crop rooted in `part` of this ground — the whole ground when
   * `part` is `null` — or `null` when nothing is sown there. ⭐ Asked of a
   * PART itself (`water the top end`), it answers the crop rooted in that
   * part: a part holds nothing, so it asks the ground it is fixed to.
   * What `water`/`feed` aimed at ground reach before the soil (field
   * population D18).
   */
  rootedAreaCrop(part: (Stuff & Soil) | null): (Stuff & Growing) | null;
}

/**
 * Requires a base that already composes `Reserved` — composed at the CALL
 * SITE, the `FixtureMixin(… Containable)` precedent, because nesting it
 * inside this factory would collapse TypeScript's inference through the
 * returned class and strip the `Stuff` baseline from every consumer.
 */
export function SoilMixin<TBase extends MixinConstructor<Stuff & Reserved>>(
  Base: TBase,
) {
  return class SoilMixin extends Base implements Soil {
    /**
     * ⚠ Annotated `string` on purpose, and it is load-bearing.
     *
     * `Mixins` is declared `as const`, so `Mixins.Soil` carries the
     * literal type `"SoilMixin"`. A mixin returning `{ … } & TBase`
     * intersects its statics with the base's, and two **disjoint string
     * literals intersect to `never`** — which reduces the entire composed
     * constructor to `never`, so the composer fails with *"Type 'never' is
     * not a constructor function type"* several files away with nothing
     * pointing back here.
     *
     * The sibling mixins get away with a bare `'SlottedMixin'` because a
     * *fresh* literal widens to `string`; one read off a `const`-asserted
     * object does not. This annotation restores the widening while keeping
     * the registry constant as the single source of truth.
     */
    static _mixinName: string = Mixins.Soil;

    /**
     * The soil's two checkpoints travel with the ground they belong to.
     *
     * ⭐ Every one is `runtimeState` — engine-written, never authored —
     * and that is load-bearing for ground that is a FIXTURE (a field's
     * patch, field population R4): a fixture's state rides its host's
     * record only for `persistent && runtimeState` fields, so a stamp
     * marked `persistent` alone would come back zero on a restart and the
     * window it closed would re-open from nothing.
     */
    static fieldMeta: FieldMeta = {
      soilClockStamp: { persistent: true, runtimeState: true },
      _soilMeanMoisture: { persistent: true, runtimeState: true },
      // The sky edge's own checkpoint + the identity it integrates
      // against. All four persist: an unresolved ref that came back
      // resolved must not forget it across a restart, and the stamp is
      // the thing that makes the back-fill exact.
      rainClockStamp: { persistent: true, runtimeState: true },
      _rainLocalityPath: { persistent: true, runtimeState: true },
      _rainSkyExposed: { persistent: true, runtimeState: true },
      _rainResolved: { persistent: true, runtimeState: true },
      _rainAbsorbedLitres: { persistent: true, runtimeState: true },
    };

    /**
     * The prerequisite surface, narrowed. TypeScript does not carry a
     * mixin's base *constraint* into `this` inside the returned class
     * body, so the composed `Reserved` methods are reached through this
     * cast — the `LoadBearing` idiom.
     */
    private get soilHost(): Stuff & Reserved {
      return this as unknown as Stuff & Reserved;
    }

    // ---------- the two host hooks ----------

    /** See {@link Soil.soilWaterDemandPerGameDay}. */
    public soilWaterDemandPerGameDay(): number {
      return 0;
    }

    /** See {@link Soil.soilCatchmentAreaM2}. */
    public soilCatchmentAreaM2(): number {
      return 0;
    }

    /**
     * See {@link Soil.soilLeachRate}. The default is a loam's, so ground
     * that models no texture still leaks at a believable rate rather
     * than at none.
     */
    public soilLeachRate(): number {
      return 0.0006;
    }

    /** See {@link Soil.soilDrawFactor}. */
    public soilDrawFactor(_fromS: number, _toS: number): number {
      return this.soilWarmth();
    }

    /** See {@link Soil.cultivationZoningAt}. */
    public async cultivationZoningAt(site: Stuff): Promise<ZonedAgainst | null> {
      const where = groundPath(site);
      const covering = await ParcelApi.coveringParcelOf(where);
      const use = ParcelApi.landUseOf(where);
      if (!covering || LandUses.permitsAnyCultivation(use)) return null;
      return {
        summary: LandUses.summaryOf(use),
        // ⭐ The record names the USE, as the sentence does.
        detail: `${where} is zoned ${use} and admits no cultivation`,
      };
    }

    /** See {@link Soil.harvestPartFor}. */
    public harvestPartFor(req: {
      stand: Stuff & Growing;
      part: (Stuff & Soil) | null;
    }): { ok: true; stand: Stuff & Growing } | HarvestRefusal {
      const r = this.resolvePartFor(req.part);
      if (!r.ok) {
        return { ok: false, reason: r.reason, facts: { line: r.line, detail: r.line } };
      }
      if (!r.part) return { ok: true, stand: req.stand };
      const there = req.stand.standIn(r.part);
      if (!there) {
        return {
          ok: false,
          reason: "nothing-sown-there",
          facts: {
            part: r.part,
            detail: `no ${req.stand.getPresentation()} rooted in ${r.part.getPresentation()}`,
          },
        };
      }
      return { ok: true, stand: there };
    }

    /** See {@link Soil.sowPlanFor}. */
    public async sowPlanFor(
      req: SowRequest,
    ): Promise<ActPlan<PlantBegin, PlantDone, PlantRefusal> | PlantRefusal> {
      const self = this as unknown as Stuff & Soil;
      if (!MixinApi.isContainer(self)) {
        return { ok: false, reason: "no-ground", facts: {} };
      }
      const ground: Stuff & Soil & Container = self;
      const { by, seed, drill } = req;
      const growsInto = seed.getGrowsIntoPath();
      if (!growsInto) return { ok: false, reason: "seed-names-no-plant", facts: { seed } };
      // Whose ground it is outranks what state it is in: a stranger is told
      // it is not theirs, never that it wants ploughing or that another
      // crop stands on it.
      const zoned = await this.cultivationZoningAt(ground);
      if (zoned) {
        return { ok: false, reason: "land-use-forbids-cultivation", facts: { zoned } };
      }
      if (!(await maySow(by, ground))) return { ok: false, reason: "not-held", facts: {} };
      // Which part of the ground — the GROUND decides whether one must be
      // named, and says so in its own words.
      const resolved = this.resolvePartFor(req.part);
      if (!resolved.ok) {
        return { ok: false, reason: resolved.reason, facts: { line: resolved.line } };
      }
      const part = resolved.part;
      // What already stands here decides what may be added to it — the
      // holder's question, once it is theirs.
      const standing = this.rootedAreaCrop(part);
      if (standing && standing.getTemplatePath() !== growsInto) {
        // ⭐ Another row may still be this crop: the bench's stands are
        // `extends:` rows over one wheat. Ask the crop the seed makes.
        const made = await StuffApi.clone<Stuff>(growsInto);
        const same = MixinApi.isGrowing(made) && standing.isSameKindAs(made);
        await StuffApi.destruct(made);
        if (!same) {
          return { ok: false, reason: "other-crop-stands", facts: { standing } };
        }
      }
      const refusal = this.sowingRefusal();
      if (refusal) {
        return { ok: false, reason: "ground-refuses-sowing", facts: { line: refusal } };
      }
      // The crop row's seed rate. Read off the crop already standing, or
      // off a fresh clone that becomes the crop (and is discarded on a
      // refusal) — no row is read twice.
      let fresh: (Stuff & Growing) | null = null;
      let crop: Stuff & Growing;
      if (standing) {
        crop = standing;
      } else {
        const made = await StuffApi.clone<Stuff>(growsInto);
        if (!MixinApi.isGrowing(made)) {
          await StuffApi.destruct(made);
          return { ok: false, reason: "seed-names-no-plant", facts: { seed } };
        }
        fresh = made;
        crop = made;
      }
      const rate = seed.sowingRateFor(crop, drill);
      if (!(rate > 0)) {
        if (fresh) await StuffApi.destruct(fresh);
        return { ok: false, reason: "not-broadcast", facts: { seed } };
      }
      const groundM2 = groundAreaM2(part ?? ground);
      const free = Math.max(0, groundM2 - (standing ? standing.getSownAreaM2() : 0));
      const pass =
        drill && drill.getSwathM2() > 0
          ? drill.getSwathM2()
          : dial(AppSettingKeys.husbandrySowHandM2, 400);
      const area = Math.min(pass, seed.seedMassKg() / rate, free);
      if (!(area >= 1)) {
        if (fresh) await StuffApi.destruct(fresh);
        return free >= 1
          ? { ok: false, reason: "too-little-seed", facts: { seed } }
          : part
            ? { ok: false, reason: "part-sown", facts: { part } }
            : { ok: false, reason: "ground-full", facts: {} };
      }
      const durationMs = Math.round(3000 + area * 10);
      return {
        ok: true,
        durationMs,
        effortW: MixinApi.isExerting(by)
          ? by.wattsForFeltCost(SOW_FELT_COST, durationMs / 1000)
          : 0,
        facts: { seed, part, drill },
        onComplete: () => landSowing({ ...req, part }, ground, crop, fresh !== null, area, rate),
        onAbort: () => {
          if (fresh && !fresh.isDestroyed()) void StuffApi.destruct(fresh);
        },
      };
    }

    /** See {@link Soil.sowingRefusal}. */
    public sowingRefusal(): string | null {
      return null;
    }

    /** See {@link Soil.ensureCropTitle}. */
    public async ensureCropTitle(): Promise<void> {
      /* host hook */
    }

    // ---------- ⭐ a soil made of parts (field population D3) ----------

    /** See {@link Soil.soilParts}. Default: one piece. */
    public soilParts(): readonly (Stuff & Soil)[] {
      return [];
    }

    /** See {@link Soil.soilPartKey}. Default: whole ground. */
    public soilPartKey(): string {
      return "";
    }

    /** See {@link Soil.soilDepthM}. Default: unmodelled. */
    public soilDepthM(): number | null {
      return null;
    }

    /** See {@link Soil.soilRemainderAreaM2}. */
    public soilRemainderAreaM2(): number {
      const parts = this.soilParts();
      if (parts.length === 0) return 0;
      const marked = parts.reduce(
        (sum, p) => sum + Math.max(0, p.soilCatchmentAreaM2()),
        0,
      );
      return Math.max(0, this.soilCatchmentAreaM2() - marked);
    }

    /** See {@link Soil.soilPartNoun}. */
    public soilPartNoun(): string {
      return "part";
    }

    /** See {@link Soil.soilPart}. */
    public soilPart(key: string): (Stuff & Soil) | null {
      if (!key) return null;
      return this.soilParts().find((p) => p.soilPartKey() === key) ?? null;
    }

    /** See {@link Soil.soilPartRefusal}. */
    public soilPartRefusal(): string | null {
      const parts = this.soilParts();
      if (parts.length <= 1) return null;
      const names = parts.map((p) => p.presentationPhrase().definite());
      const last = names.pop() ?? "";
      const list = names.length > 0 ? `${names.join(", ")} or ${last}` : last;
      return `Which ${this.soilPartNoun()}? Name one: ${list}.`;
    }

    /** See {@link Soil.resolvePartFor}. */
    public resolvePartFor(named: (Stuff & Soil) | null): PartResolution {
      const parts = this.soilParts();
      if (named === null) {
        const refusal = this.soilPartRefusal();
        if (refusal !== null) {
          return { ok: false, reason: "part-unnamed", line: refusal };
        }
        return { ok: true, part: parts[0] ?? null };
      }
      if (parts.includes(named)) return { ok: true, part: named };
      const self = this as unknown as Stuff;
      const what = named.presentationPhrase().definite();
      return {
        ok: false,
        reason: "not-a-part-here",
        line: `${what.charAt(0).toUpperCase()}${what.slice(1)} is not a part of ${self.presentationPhrase().definite()}.`,
      };
    }

    /** See {@link Soil.rootedAreaCrop}. */
    public rootedAreaCrop(
      part: (Stuff & Soil) | null,
    ): (Stuff & Growing) | null {
      const self = this as unknown as Stuff & Soil;
      const bed = part ?? self;
      // A part is a fixture, not a container: its crops stand in the
      // ground it is fixed to and root in it by key.
      const holder: Stuff | null = MixinApi.isContainer(self)
        ? self
        : MixinApi.isAdornment(self)
          ? self.getAdornedTo()
          : null;
      if (!holder || !MixinApi.isContainer(holder)) return null;
      return (
        (holder.getContents() as Stuff[]).find(
          (c): c is Stuff & Growing =>
            MixinApi.isGrowing(c) && c.isAreaCrop() && c.getBed() === bed,
        ) ?? null
      );
    }

    /** See {@link Soil.soilMoistureHeadroomL}. */
    public soilMoistureHeadroomL(): number {
      const parts = this.dividedInto();
      if (parts.length > 0) {
        const own = this.remainderCounts()
          ? this.reserveHeadroom(SOIL_MOISTURE_RESERVE_KEY)
          : 0;
        return parts.reduce((sum, p) => sum + p.soilMoistureHeadroomL(), own);
      }
      return this.reserveHeadroom(SOIL_MOISTURE_RESERVE_KEY);
    }

    /** See {@link Soil.soilNutrientHeadroom}. */
    public soilNutrientHeadroom(): number {
      const parts = this.dividedInto();
      if (parts.length > 0) {
        return (
          this.meanOverParts(
            parts,
            (p) => p.soilNutrientHeadroom(),
            () => this.reserveHeadroom(SOIL_NITROGEN_RESERVE_KEY),
          ) ?? 0
        );
      }
      return this.reserveHeadroom(SOIL_NITROGEN_RESERVE_KEY);
    }

    /** A reserve's room left, after a reconcile; `0` when unauthored. */
    private reserveHeadroom(key: string): number {
      this.reconcileSoil();
      const reserve = this.soilHost.getReserve(key);
      if (!reserve) return 0;
      return Math.max(
        0,
        reserve.capacity.rawValue() - reserve.current.rawValue(),
      );
    }

    /**
     * ⭐ Whether this ground's OWN soil is a term beside its parts — the
     * unmarked remainder of a tract (tracts build D25): it has area left
     * over and a moisture reserve to hold it.
     */
    private remainderCounts(): boolean {
      return (
        this.soilRemainderAreaM2() > 0 &&
        this.soilHost.hasReserve(SOIL_MOISTURE_RESERVE_KEY)
      );
    }

    /**
     * The parts an aggregate read walks — none while the read is asking
     * this ground's OWN term (the remainder), so the shipped direct body
     * answers it.
     */
    private dividedInto(): readonly (Stuff & Soil)[] {
      return this._soilOwnTerm ? [] : this.soilParts();
    }

    /** Run `read` as this ground's own term, not the aggregate. */
    private ownTerm<T>(read: () => T): T {
      const was = this._soilOwnTerm;
      this._soilOwnTerm = true;
      try {
        return read();
      } finally {
        this._soilOwnTerm = was;
      }
    }

    /**
     * Each part's share of the whole, by the sky it catches (its area),
     * and the remainder's share as the last entry (`0` when it does not
     * count); equal shares over the parts when no part declares an area.
     */
    private partWeights(parts: readonly (Stuff & Soil)[]): {
      parts: number[];
      own: number;
    } {
      const areas = parts.map((p) => Math.max(0, p.soilCatchmentAreaM2()));
      const own = this.remainderCounts() ? this.soilRemainderAreaM2() : 0;
      const total = areas.reduce((a, b) => a + b, own);
      if (!(total > 0)) {
        return { parts: parts.map(() => 1 / parts.length), own: 0 };
      }
      return { parts: areas.map((a) => a / total), own: own / total };
    }

    /**
     * The area-weighted mean of a per-part read, over the parts that
     * answer it (`null` from a part that models nothing drops out and
     * the rest re-weight) and the remainder's own read when it counts;
     * `null` when none answers.
     */
    private meanOverParts(
      parts: readonly (Stuff & Soil)[],
      read: (part: Stuff & Soil) => number | null,
      own: () => number | null,
    ): number | null {
      const weights = this.partWeights(parts);
      let sum = 0;
      let weight = 0;
      parts.forEach((p, i) => {
        const v = read(p);
        if (v === null) return;
        const w = weights.parts[i] ?? 0;
        sum += v * w;
        weight += w;
      });
      if (weights.own > 0) {
        const v = own();
        if (v !== null) {
          sum += v * weights.own;
          weight += weights.own;
        }
      }
      return weight > 0 ? sum / weight : null;
    }

    /**
     * Spread an EXTENSIVE amount (litres) over the parts — and the
     * remainder — by area share; returns the sum each actually took.
     */
    private spreadOverParts(
      parts: readonly (Stuff & Soil)[],
      amount: number,
      apply: (part: Stuff & Soil, share: number) => number,
      own: (share: number) => number,
    ): number {
      const weights = this.partWeights(parts);
      const taken = parts.reduce(
        (sum, p, i) => sum + apply(p, amount * (weights.parts[i] ?? 0)),
        0,
      );
      return weights.own > 0 ? taken + own(amount * weights.own) : taken;
    }

    /**
     * Apply an INTENSIVE amount (points of a per-cent reserve) to every
     * part alike — and to the remainder — feeding a divided field raises
     * each part as much as it would raise the field whole; returns the
     * area-weighted mean each took, which is what the whole ground's own
     * reserve would have moved by.
     */
    private applyToParts(
      parts: readonly (Stuff & Soil)[],
      apply: (part: Stuff & Soil) => number,
      own: () => number,
    ): number {
      return this.meanOverParts(parts, apply, own) ?? 0;
    }

    // ---------- soil state: its OWN checkpoint ----------

    /**
     * Game-seconds stamp of the last soil reconcile; `0` = never touched.
     * The soil has a stamp **of its own** — that is the whole reason
     * moisture can live here without splitting one checkpoint across two
     * objects. The ground re-derives from its own stamp; the plant only
     * reads. Two self-contained checkpoints, not one shared one.
     */
    public soilClockStamp = 0;

    /**
     * Mean moisture fraction across the window the last reconcile closed.
     * `-1` = no window yet (report the instantaneous value instead).
     */
    public _soilMeanMoisture = -1;

    /** Reentry guard — the soil reconcile must never recurse. */
    private _reconcilingSoil = false;

    /** True while an aggregate read asks this ground's own remainder term. */
    private _soilOwnTerm = false;

    /**
     * Integrate the soil over elapsed game-time: drain moisture by the
     * **summed** demand of whatever is drinking, scaled by warmth.
     *
     * Draining by summed demand rather than letting each drinker debit as
     * it is read is what removes the read-order artifact: whoever touches
     * the ground first triggers the same total drain, so looking at plant
     * A before plant B gives the same world as B before A.
     */
    public reconcileSoil(): void {
      if (this._reconcilingSoil) return;
      const nowS = this.soilNowSeconds();
      if (nowS === null) return;

      // ⭐ A ground made of parts reconciles each part on its own stamp
      // (field population D3); a divided field holds no reserve of its
      // own, so the shipped body below then stamps and returns.
      const parts = this.soilParts();
      if (parts.length > 0) {
        this._reconcilingSoil = true;
        try {
          for (const part of parts) part.reconcileSoil();
        } finally {
          this._reconcilingSoil = false;
        }
      }

      const reserved = this.soilHost;
      if (!reserved.hasReserve(SOIL_MOISTURE_RESERVE_KEY)) {
        this.soilClockStamp = nowS;
        return;
      }

      // First touch: seed the stamp, integrate nothing. The sky still
      // gets its say — ground whose soil window is empty may have a
      // month of rain to credit, on the rain edge's OWN stamp.
      if (this.soilClockStamp === 0) {
        this.integrateRainfall(nowS);
        this.soilClockStamp = nowS;
        return;
      }
      const from = this.soilClockStamp;
      const elapsed = nowS - from;
      if (elapsed <= 0) {
        this.integrateRainfall(nowS);
        this.soilClockStamp = nowS;
        return;
      }

      // ⭐⭐ **A long window is walked, not lumped** (cover build B31).
      // Rain fell across the window the plants were drinking through, a
      // day at a time. Integrated as one lump — all the rain poured in
      // first, capped at the ground's capacity, then the whole window's
      // drink taken out — a field nobody read for a season came back
      // bone dry while the same field read monthly stayed moist. So the
      // sky pours in, then the window drains, one step at a time; the
      // rain edge keeps its own stamp throughout.
      const steps = Math.min(
        SOIL_MAX_STEPS,
        Math.max(1, Math.ceil(elapsed / SECONDS_PER_GAME_DAY)),
      );
      this._reconcilingSoil = true;
      try {
        let meanSum = 0;
        let meanSteps = 0;
        let at = from;
        for (let i = 1; i <= steps; i++) {
          const to = i === steps ? nowS : from + (elapsed * i) / steps;
          this.integrateRainfall(to);
          const mean = this.drainSoilBetween(at, to);
          if (mean !== null) {
            meanSum += mean;
            meanSteps++;
          }
          at = to;
        }
        if (meanSteps > 0) this._soilMeanMoisture = meanSum / meanSteps;
        this.integrateNutrientCycle(elapsed / SECONDS_PER_GAME_DAY);
        this.soilClockStamp = nowS;
      } finally {
        this._reconcilingSoil = false;
      }
    }

    /**
     * Drain one step of the soil window, `[fromS, toS)`, and return the
     * step's mean moisture fraction (null when the ground holds no water
     * reserve). The drain is linear in time, so the mean is the midpoint
     * UNLESS the soil ran dry partway: then it is a triangle over the
     * fraction of the step before empty.
     */
    private drainSoilBetween(fromS: number, toS: number): number | null {
      const reserved = this.soilHost;
      const reserve = reserved.getReserve(SOIL_MOISTURE_RESERVE_KEY);
      const capacity = reserve ? reserve.capacity.rawValue() : 0;
      if (!(capacity > 0)) return null;
      const start = reserve ? reserve.current.rawValue() : 0;
      // ⭐ The draw is scaled by the step's evaporative demand — a host
      // that knows its season answers for it (cover build).
      const warmth = this.soilDrawFactor(fromS, toS);
      // Summed demand — more drinkers empty the ground faster, which is
      // water competition emerging from the same source of truth the
      // shared-soil root competition comes from. No new rule.
      const demandPerDay = this.soilWaterDemandPerGameDay();
      const draw = demandPerDay * ((toS - fromS) / SECONDS_PER_GAME_DAY) * warmth;
      const startF = clamp01(start / capacity);
      if (!(draw > 0)) return startF;
      const end = Math.max(0, start - draw);
      const endF = clamp01(end / capacity);
      reserved.adjustReserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(-(start - end), "L"),
      );
      return end > 0 ? (startF + endF) / 2 : (startF * (start / draw)) / 2;
    }

    // ---------- the sky edge: rain reaches soil ----------

    /**
     * Game-seconds stamp of the last rainfall integration; `0` = never.
     *
     * ⭐⭐ **The rain edge has a checkpoint of its OWN, and that is the
     * whole safety property.** Resolving which locality covers this
     * ground is asynchronous (an address walk); the reconcile that wants
     * the answer is synchronous. So there is a window — sometimes a long
     * one, across a restart — in which the ground genuinely does not
     * know where it is.
     *
     * ⚠⚠ **Unresolved must never read as zero.** The requirements name
     * this the build's highest risk, and this codebase has been bitten
     * three times by a cache nothing warms reading null forever while
     * hand-constructed tests stayed green. So: while
     * {@link _rainResolved} is false this stamp does **not advance**,
     * and the first successful resolve therefore integrates the entire
     * backlog. "Not yet resolved" and "resolved to nothing" are
     * different values, and only the second one credits zero rain.
     */
    public rainClockStamp = 0;

    /**
     * Template path of the covering `Locality`, or `null` for ground
     * that resolves none. The **identity** is cached (async, once); the
     * **state** — how much fell — is derived live from it on every read.
     */
    public _rainLocalityPath: string | null = null;

    /** Whether the resolve found this ground under open sky. */
    public _rainSkyExposed = false;

    /**
     * Whether {@link restampWatershed} has ever completed. The tri-state
     * lives here rather than in `_rainLocalityPath === null`, because
     * ground in a cellar legitimately resolves NO locality and must be
     * distinguishable from ground that has not looked yet.
     */
    public _rainResolved = false;

    /** Running total of litres of rain absorbed — a legibility figure. */
    public _rainAbsorbedLitres = 0;

    /**
     * The in-flight resolve, or `null`. Holding the **promise** rather
     * than a boolean is what makes a second caller *coalesce* onto the
     * first instead of returning early from a walk that has not finished
     * — `await ground.restampWatershed()` has to mean the ref is resolved
     * when it returns, whichever call actually did the work.
     */
    private _rainResolvePromise: Promise<void> | null = null;

    /**
     * Resolve the covering locality and sky exposure, then let the next
     * reconcile integrate everything since the last stamp.
     *
     * The one `await` in the rain edge, kept off the read path — the
     * shape `ThermalMixin.restamp` established for `lastAmbientK`, for
     * the same reason: a reconcile-on-read consumer must not await a
     * walk. Triggered on placement ({@link settleSoilPlacement}) and
     * kicked lazily from the reconcile when the ref is still unresolved,
     * so ground restored from a snapshot into a room it never "moved"
     * into heals itself on the next read rather than staying blind
     * forever.
     */
    public restampWatershed(): Promise<void> {
      const inFlight = this._rainResolvePromise;
      if (inFlight !== null) return inFlight;
      const started = this.resolveWatershedRef();
      this._rainResolvePromise = started;
      return started;
    }

    /** The walk itself; {@link restampWatershed} owns the coalescing. */
    private async resolveWatershedRef(): Promise<void> {
      try {
        const scope = this.watershedScope();
        if (scope === null) {
          // Not anywhere yet. Leave the ref UNRESOLVED — unplaced ground
          // has no sky, and resolving it to "nothing" here would swallow
          // the rain it catches once it IS put down.
          return;
        }
        const locality = await AddressApi.resolveLocalityFor(scope);
        // ⭐ Warm the place's climate-site memo in the same act, so the
        // integral below decides rain-or-snow at THIS place's temperature
        // rather than the realm default (the climate build).
        if (MixinApi.isAtmospheric(scope)) await scope.resolveClimateSite();
        this._rainLocalityPath = locality?.getTemplatePath() ?? null;
        // ⭐ Rain reaches the bed only under an open top (rubber build):
        // a glasshouse's beds stay dry whatever the biome says.
        this._rainSkyExposed = BiomeApi.exposureOf(scope)?.rainReaches() ?? false;
        this._rainResolved = true;
      } catch {
        // A failed walk leaves the ref UNRESOLVED rather than resolving
        // it to nothing: the stamp stays put and the backlog survives.
      } finally {
        this._rainResolvePromise = null;
      }
    }

    /**
     * @hook The scope the address walk and the sky-exposure read run
     * against.
     *
     * Ground that is CARRIED — a pot, a bed — asks its **container**: the
     * pot is not a place, the room it stands in is. Ground that IS a place
     * overrides this to answer *itself*, because there is nothing outside
     * it to ask.
     *
     * ⚠ The default deliberately returns `null` rather than falling back
     * to `this` when there is no container. Unplaced ground has no sky,
     * and resolving it to "nothing" here would swallow the rain it
     * catches once it IS put down.
     */
    protected watershedScope(): (Stuff & Container) | null {
      const self = this as unknown as Stuff;
      const container = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (container === null || !MixinApi.isContainer(container as Stuff)) {
        return null;
      }
      return container as Stuff & Container;
    }

    /** See {@link Soil.isWatershedResolved}. */
    public isWatershedResolved(): boolean {
      return this._rainResolved;
    }

    /** See {@link Soil.rainfallAbsorbedLitres}. */
    public rainfallAbsorbedLitres(): number | null {
      if (!this._rainResolved) return null;
      this.reconcileSoil();
      return this._rainAbsorbedLitres;
    }

    /**
     * Integrate rainfall over this ground's own window and pour it in.
     *
     * `mm × m² = litres`, with no invented field on either side: the
     * millimetres come from {@link WeatherApi.precipitationBetween} and
     * the square metres from {@link Soil.soilCatchmentAreaM2}.
     *
     * ⭐ **A pot therefore catches nothing, and that is correct.** A pot
     * draws zero land because a houseplant is furniture rather than
     * production — so it is watered by hand, exactly as it ships. Ground
     * that *is* production is ground the sky can find.
     */
    private integrateRainfall(nowS: number): void {
      // First touch: open the window and integrate nothing. This runs
      // BEFORE the resolved check on purpose — the window has to START
      // at the earliest honest moment (the ground exists and the clock
      // is running), or an unresolved ref would have no backlog to
      // back-fill and the whole checkpoint would be decoration.
      if (this.rainClockStamp === 0) {
        this.rainClockStamp = nowS;
        if (!this._rainResolved) void this.restampWatershed();
        return;
      }

      // ⚠⚠ UNRESOLVED: the stamp does **not** advance. The window stays
      // open, the backlog accrues, and the first successful resolve
      // integrates all of it. Reading zero here instead would be the
      // silent failure this build's highest-risk item is named after —
      // it looks exactly like a dry month.
      if (!this._rainResolved) {
        void this.restampWatershed();
        return;
      }

      const from = this.rainClockStamp;
      if (nowS <= from) {
        this.rainClockStamp = nowS;
        return;
      }
      this.rainClockStamp = nowS;

      // Resolved, but under a roof or with no catchment: the window
      // closes with zero rain, which is an ANSWER rather than an absence.
      if (!this._rainSkyExposed) return;
      // A divided ground's own soil catches only the sky over its
      // remainder; each part catches its own (tracts build D25).
      const areaM2 =
        this.soilParts().length > 0
          ? this.soilRemainderAreaM2()
          : this.soilCatchmentAreaM2();
      if (areaM2 <= 0) return;

      const locality = this._rainLocalityPath === null
        ? null
        : (StuffApi.findByTemplatePath(
            this._rainLocalityPath,
          ) as Locality | null);

      const scope = this.watershedScope();
      const site =
        scope !== null && MixinApi.isAtmospheric(scope)
          ? scope.climateSite()
          : null;
      const fell = WeatherApi.precipitationBetween(
        Quantity.of(from, "s"),
        Quantity.of(nowS, "s"),
        locality,
        site,
      );
      // Liquid only. What fell as snow — decided by the temperature at
      // this place, since the climate build — lies on the ground (the
      // floor's snow) and melts into the watershed's integral, not the
      // soil's (soil.md § winter).
      const litres = fell.liquid.rawValue() * areaM2;
      if (litres <= 0) return;
      this._rainAbsorbedLitres += this.creditReserve(
        SOIL_MOISTURE_RESERVE_KEY,
        litres,
        "L",
      );
      // ⭐⭐ **The honest opening OUT** (D15): rain carries nitrate past
      // the roots. It is why fertility does not accumulate to infinity,
      // why you incorporate manure rather than leaving it on top, and
      // why you do not spread before a storm.
      //
      // ⚠ It LEAVES the ledger, and where it goes is a civics build's —
      // agricultural runoff is the classic nonpoint-source case, with a
      // downstream victim who can name the upstream cause (D18), and
      // shipping a shallow version here would spend a good idea cheaply.
      const nitrogen = this.soilHost.getReserve(SOIL_NITROGEN_RESERVE_KEY);
      if (nitrogen && areaM2 > 0) {
        const mm = litres / areaM2;
        const lost = Math.min(
          nitrogen.current.rawValue(),
          nitrogen.current.rawValue() * mm * this.soilLeachRate(),
        );
        if (lost > 0) {
          this.soilHost.adjustReserve(
            SOIL_NITROGEN_RESERVE_KEY,
            Quantity.of(-lost, "%"),
          );
        }
      }
    }

    /** Root-zone moisture `[0, 1]`, reconciled; null when unauthored. */
    public soilMoistureFraction(): number | null {
      const parts = this.dividedInto();
      if (parts.length > 0) {
        return this.meanOverParts(
          parts,
          (p) => p.soilMoistureFraction(),
          () => this.ownTerm(() => this.soilMoistureFraction()),
        );
      }
      if (!this._reconcilingSoil) this.reconcileSoil();
      return this.reserveFraction(SOIL_MOISTURE_RESERVE_KEY);
    }

    /** The window-mean a plant integrating the same window should read. */
    public meanSoilMoistureFraction(): number | null {
      const parts = this.dividedInto();
      if (parts.length > 0) {
        return this.meanOverParts(
          parts,
          (p) => p.meanSoilMoistureFraction(),
          () => this.ownTerm(() => this.meanSoilMoistureFraction()),
        );
      }
      const current = this.soilMoistureFraction();
      if (current === null) return null;
      return this._soilMeanMoisture < 0 ? current : this._soilMeanMoisture;
    }

    /**
     * Nutrient level `[0, 1]`; null when this ground authors none.
     *
     * ⚠ It RECONCILES, and that was a real bug before the ledger
     * existed: with nothing but `feed` and `drawNutrient` moving it, a
     * stale read was indistinguishable from a fresh one. Now that
     * organic matter mineralises INTO this reserve over game-time, a
     * read that skipped the reconcile would report last week's
     * fertility — and the test that caught it was the one asserting
     * muck is an investment.
     */
    public nutrientFraction(): number | null {
      const parts = this.dividedInto();
      if (parts.length > 0) {
        return this.meanOverParts(
          parts,
          (p) => p.nutrientFraction(),
          () => this.ownTerm(() => this.nutrientFraction()),
        );
      }
      if (!this._reconcilingSoil) this.reconcileSoil();
      return this.reserveFraction(SOIL_NITROGEN_RESERVE_KEY);
    }

    /**
     * Pour water in — reconcile first (so the window that just ended is
     * credited at its true dryness), then fill up to headroom. Returns the
     * litres actually absorbed, so a verb can say "it is already full".
     */
    public waterSoil(litres: number): number {
      if (!Number.isFinite(litres) || litres <= 0) return 0;
      const parts = this.dividedInto();
      if (parts.length > 0) {
        return this.spreadOverParts(
          parts,
          litres,
          (p, l) => p.waterSoil(l),
          (l) => this.ownTerm(() => this.waterSoil(l)),
        );
      }
      this.reconcileSoil();
      return this.creditReserve(SOIL_MOISTURE_RESERVE_KEY, litres, "L");
    }

    /** See {@link Soil.organicMatterFraction}. */
    public organicMatterFraction(): number | null {
      const parts = this.dividedInto();
      if (parts.length > 0) {
        return this.meanOverParts(
          parts,
          (p) => p.organicMatterFraction(),
          () => this.ownTerm(() => this.organicMatterFraction()),
        );
      }
      this.reconcileSoil();
      return this.reserveFraction(SOIL_ORGANIC_MATTER_RESERVE_KEY);
    }

    /** See {@link Soil.structureFraction}. */
    public structureFraction(): number | null {
      const parts = this.dividedInto();
      if (parts.length > 0) {
        return this.meanOverParts(
          parts,
          (p) => p.structureFraction(),
          () => this.ownTerm(() => this.structureFraction()),
        );
      }
      this.reconcileSoil();
      return this.reserveFraction(SOIL_STRUCTURE_RESERVE_KEY);
    }

    /** See {@link Soil.addOrganicMatter}. */
    public addOrganicMatter(fraction: number): number {
      if (!Number.isFinite(fraction) || fraction <= 0) return 0;
      const parts = this.dividedInto();
      if (parts.length > 0) {
        return this.applyToParts(
          parts,
          (p) => p.addOrganicMatter(fraction),
          () => this.ownTerm(() => this.addOrganicMatter(fraction)),
        );
      }
      this.reconcileSoil();
      const applied = this.creditReserve(
        SOIL_ORGANIC_MATTER_RESERVE_KEY,
        fraction,
        "%",
      );
      // ⭐ A little of it is available NOW and most of it is not. That
      // one line is why muck is a long investment rather than a
      // fertiliser — and why a synthetic-nitrogen tier would mean
      // something to a player who has spent a winter short of it.
      this.creditReserve(
        SOIL_NITROGEN_RESERVE_KEY,
        applied * IMMEDIATE_MINERALIZATION,
        "%",
      );
      return applied;
    }

    /** See {@link Soil.poach}. */
    public poach(intensity: number, poachingFactor: number): number {
      if (!Number.isFinite(intensity) || intensity <= 0) return 0;
      const parts = this.dividedInto();
      if (parts.length > 0) {
        return this.applyToParts(
          parts,
          (p) => p.poach(intensity, poachingFactor),
          () => this.ownTerm(() => this.poach(intensity, poachingFactor)),
        );
      }
      const reserved = this.soilHost;
      const structure = reserved.getReserve(SOIL_STRUCTURE_RESERVE_KEY);
      if (!structure) return 0;
      this.reconcileSoil();
      // ⚠⚠ WETNESS is the multiplier, and it is the whole rule. Dry
      // ground takes hooves; saturated ground is destroyed by them —
      // which is why *put the herd on the tired field* is a judgement
      // about the WEATHER rather than about the field.
      const wetness = this.reserveFraction(SOIL_MOISTURE_RESERVE_KEY) ?? 0;
      const damage = intensity * poachingFactor * wetness * wetness;
      if (damage <= 0) return 0;
      const taken = Math.min(damage, structure.current.rawValue());
      reserved.adjustReserve(
        SOIL_STRUCTURE_RESERVE_KEY,
        Quantity.of(-taken, "%"),
      );
      return taken;
    }

    /** See {@link Soil.fixNitrogen}. */
    public fixNitrogen(fraction: number): number {
      if (!Number.isFinite(fraction) || fraction <= 0) return 0;
      const parts = this.dividedInto();
      if (parts.length > 0) {
        return this.applyToParts(
          parts,
          (p) => p.fixNitrogen(fraction),
          () => this.ownTerm(() => this.fixNitrogen(fraction)),
        );
      }
      return this.creditReserve(SOIL_NITROGEN_RESERVE_KEY, fraction, "%");
    }

    /**
     * ⭐⭐ **The two slow reserves, integrated** — and between them they
     * are why the ledger CLOSES rather than merely balancing.
     *
     * Organic matter mineralises into nitrogen a little at a time over
     * years; structure rebuilds toward whole, slower than hooves take it
     * away. Neither is a faucet: every gram of nitrogen arriving here
     * came out of organic matter somebody put in.
     *
     * ⚠ Called from inside the soil reconcile's own guard, so it reads
     * raw reserves rather than the fraction accessors, which reconcile.
     */
    private integrateNutrientCycle(days: number): void {
      if (days <= 0) return;
      const reserved = this.soilHost;
      const om = reserved.getReserve(SOIL_ORGANIC_MATTER_RESERVE_KEY);
      if (om) {
        const released = om.current.rawValue() * MINERALIZATION_PER_GAME_DAY * days;
        const taken = Math.min(released, om.current.rawValue());
        if (taken > 0) {
          reserved.adjustReserve(
            SOIL_ORGANIC_MATTER_RESERVE_KEY,
            Quantity.of(-taken, "%"),
          );
          this.creditReserve(SOIL_NITROGEN_RESERVE_KEY, taken, "%");
        }
      }
      const structure = reserved.getReserve(SOIL_STRUCTURE_RESERVE_KEY);
      if (structure) {
        const deficit =
          structure.capacity.rawValue() - structure.current.rawValue();
        if (deficit > 0) {
          this.creditReserve(
            SOIL_STRUCTURE_RESERVE_KEY,
            deficit * STRUCTURE_RECOVERY_PER_GAME_DAY * days,
            "%",
          );
        }
      }
    }

    /** Feed the soil; returns the fraction actually absorbed. */
    public feedSoil(fraction: number): number {
      if (!Number.isFinite(fraction) || fraction <= 0) return 0;
      const parts = this.dividedInto();
      if (parts.length > 0) {
        return this.applyToParts(
          parts,
          (p) => p.feedSoil(fraction),
          () => this.ownTerm(() => this.feedSoil(fraction)),
        );
      }
      return this.creditReserve(SOIL_NITROGEN_RESERVE_KEY, fraction, "%");
    }

    /** Draw nutrient out — what a harvested crop exports. */
    public drawNutrient(fraction: number): number {
      if (!Number.isFinite(fraction) || fraction <= 0) return 0;
      const parts = this.dividedInto();
      if (parts.length > 0) {
        return this.applyToParts(
          parts,
          (p) => p.drawNutrient(fraction),
          () => this.ownTerm(() => this.drawNutrient(fraction)),
        );
      }
      const reserved = this.soilHost;
      const reserve = reserved.getReserve(SOIL_NITROGEN_RESERVE_KEY);
      if (!reserve) return 0;
      const taken = Math.min(fraction, reserve.current.rawValue());
      if (taken <= 0) return 0;
      reserved.adjustReserve(
        SOIL_NITROGEN_RESERVE_KEY,
        Quantity.of(-taken, reserve.current.unit),
      );
      return taken;
    }

    /**
     * Settle both checkpoints and re-resolve where this ground is.
     *
     * Called the moment ground is placed — which for a bed is `onMoved`,
     * and for a field is registration. Being put down is the earliest
     * honest moment to open the soil's window: ground nobody looks at
     * until later would otherwise stamp itself then, silently skipping
     * the whole elapsed window and handing its occupants a full reserve
     * they should long since have drunk.
     *
     * The watershed re-resolve is fire-and-forget — the read path never
     * awaits, and until it lands the rain stamp holds.
     */
    public settleSoilPlacement(): void {
      this.reconcileSoil();
      void this.restampWatershed();
    }

    /** A reserve's current level as a fraction, or null when unauthored. */
    private reserveFraction(key: string): number | null {
      const reserve = this.soilHost.getReserve(key);
      if (!reserve) return null;
      const capacity = reserve.capacity.rawValue();
      if (capacity <= 0) return null;
      return clamp01(reserve.current.rawValue() / capacity);
    }

    /** Credit a reserve up to its headroom; returns the amount applied. */
    protected creditReserve(
      key: string,
      amount: number,
      unit: "L" | "%",
    ): number {
      const reserved = this.soilHost;
      const reserve = reserved.getReserve(key);
      if (!reserve) return 0;
      const headroom =
        reserve.capacity.rawValue() - reserve.current.rawValue();
      const applied = Math.min(amount, Math.max(0, headroom));
      if (applied <= 0) return 0;
      reserved.adjustReserve(key, Quantity.of(applied, unit));
      return applied;
    }

    /**
     * Warmth multiplier on evaporation — the same shape `GrowingMixin`
     * applies to transpiration, read off this ground's own thermal state
     * when it has one.
     */
    private soilWarmth(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isThermal(self)) return 1;
      try {
        const k = self.lastAmbientK;
        const reference = dial(AppSettingKeys.husbandryWarmthReferenceK, 295);
        const factor = dial(AppSettingKeys.husbandryWarmthFactor, 0.03);
        return Math.max(0.1, 1 + (k - reference) * factor);
      } catch {
        return 1;
      }
    }

    /** Game-seconds now, or null when no world clock (pre-boot / tests). */
    private soilNowSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      return WorldClockApi.getNow().rawValue();
    }
  };
}
