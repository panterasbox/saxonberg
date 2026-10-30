/**
 * GrowingMixin — the living-world growth model (husbandry phase 1).
 *
 * A growing host's condition is a pure function of
 * `(profile, clock stamp, water, light, root room, interventions)`,
 * reconciled lazily on read over elapsed **game-time** — no tick, no
 * scheduler, no presence gate. Three inputs each produce a satisfaction in
 * `[0, 1]` and growth runs at the **minimum** of them (Liebig's law):
 *
 *   - **water** — the host's root-zone `moisture` reserve (a `Reserved`
 *     reserve the host's template authors), drained by evapotranspiration
 *     and refilled by `waterPlant`;
 *   - **light** — the lux where the host sits, integrated as a segmented
 *     window (`_lastLux` holds the window's level; `reconcileGrowth`
 *     re-samples at the end, and the host's move hook closes the window at
 *     the moment of a move);
 *   - **root room** — the host seam `rootRoom()` (soil litres, or `null`
 *     for an unpotted plant), against the profile's per-stage demand. The
 *     ratio is **floored**, so a root-bound plant holds at a visible band
 *     and stalls but never dies of it.
 *
 * Vigor relaxes exponentially toward the limiting satisfaction; maturity
 * accrues only in good condition, advancing the four growth stages;
 * flowering latches at `mature` in thriving condition and sets one seed per
 * episode via the `onFloweringLatched` host hook.
 *
 * **The fruit cycle (polycarpy).** A profile authoring `fruitSetCount` +
 * `fruitFillDays` bears repeatedly: the flowering latch SETS a crop
 * instead of dropping a seed (the yield IS the crop — `onFloweringLatched`
 * never fires), `_fruitFill` advances toward ripe at the limiting rate,
 * and the worst-limiting verdict RE-SEEDS at the set — so a pick grades
 * the cycle that made it (set → harvest), never the tree's whole life.
 * The plant survives; `settleCycle()` re-opens the next window. A
 * monocarp (no cycle fields) is byte-identical to phase 1. See
 * docs/subsystems/husbandry.md § The fruit cycle.
 *
 * ### The clock rule — deliberately NOT `Wet.ts`'s
 *
 * This mixin copies `Wet.ts`'s skeleton (decomposed scalar persistence, a
 * reentry guard, dial-driven rates, banded presentation) but **excludes its
 * far-past guard and its linkdead freeze**. A plant is not a body: owned
 * things integrate the full absence — that is the entire point of the
 * family clock. Long gaps are bounded by a **step cap** (`ceil(elapsed /
 * step)` capped at `husbandry.maxSteps`, `dt` growing to compensate), never
 * a time cap. See docs/subsystems/husbandry.md.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Soil } from './Soil';
import type { Difficulty } from '../advancement/ActSignature';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { PerceptionApi } from '../../api/perception';
import { BiomeApi } from '../../api/biome';
import { ZoneApi } from '../../api/zone';
import { WeatherApi } from '../../api/weather';
import type { ClimateSite } from '../weather/WeatherType';
import { AppSettingKeys } from '../config/AppSettings';
import { TemplatePaths } from '../paths';
import { Quantity } from '../quantity';
import type { Light } from '../perception/Light';
import Place from '../stuff/Place';
import type { MarkupAugmenter } from '../../api/mml';
import { Seeded } from '../Seeded';
import {
  CompetenceBand,
  COMPETENCE_HALF_WIDTH,
  type CompetenceBandName,
} from '../advancement/CompetenceBand';

/** The four growth stages, in order. */
export const GROWTH_STAGES = [
  'seedling',
  'young',
  'established',
  'mature',
] as const;

/** A growth stage — one of {@link GROWTH_STAGES}. */
export type GrowthStage = (typeof GROWTH_STAGES)[number];

/** The player-facing condition band (presentation, never a raw number). */
export type ConditionBand =
  | 'thriving'
  | 'healthy'
  | 'stressed'
  | 'failing'
  | 'dead';

/** The named limiting factor, or null when nothing is limiting. */
export type LimitingFactor =
  | 'water'
  | 'light'
  | 'root'
  | 'nutrient'
  | 'cold'
  | null;

/**
 * The authored reaction norm — how THIS plant responds to the three
 * inputs. Lives on the plant template's `data` (phase 5 migrates it onto
 * `Species`). All plain scalars, so it round-trips as a default fields
 * slice with no marshaller.
 */
export interface GrowthProfileData {
  /** Root-zone moisture fraction at/above which water satisfaction is 1. */
  moistureHappyAt: number;
  /** Moisture fraction at/below which water satisfaction is 0. */
  moistureWiltAt: number;
  /** Litres transpired per game-day at neutral warmth (the ET rate). */
  litresPerGameDay: number;
  /** Lux at/above which light satisfaction is 1. */
  luxHappyAt: number;
  /** Lux at/below which light satisfaction is 0. */
  luxDarkAt: number;
  /**
   * ⭐ **Winter is not a mode; it is cold and short days at a place**
   * (farmstead D10). Kelvin at/below which growth stops — the base
   * temperature every agronomist's growing-degree-day sum is measured
   * against, and about 278 K (5 °C) for a temperate grass or cereal.
   *
   * Three consequences fall out of it being a temperature rather than a
   * season flag, and all three are the point:
   *
   *   - the dorm houseplant does not die every real month, because a
   *     heated room in February is a warm place;
   *   - ⭐ **the greenhouse falls out for free** — somewhere warm and lit
   *     in winter is an *economic* decision against the shipped fuel
   *     chain rather than an architectural unlock;
   *   - the mechanism is identical indoors, outdoors, under glass and
   *     underground, so an author extends it without asking for a flag.
   *
   * ⚠ Optional. A profile authoring neither this nor {@link warmHappyK}
   * is never cold-limited, which is how every plant that shipped before
   * winter existed keeps behaving exactly as it did.
   */
  coldStopK?: number;
  /** Kelvin at/above which warmth satisfaction is 1 (~288 K temperate). */
  warmHappyK?: number;
  /** Litres of soil each stage's roots demand (the pot ceiling). */
  rootDemand: Record<GrowthStage, number>;
  /** Cumulative well-kept game-days to reach each post-seedling stage. */
  daysToStage: { young: number; established: number; mature: number };
  /**
   * Fruits minted per ripe pick — polycarps only. With `fruitFillDays`,
   * the PAIR is the polycarp marker (both > 0 ⇔ polycarp; no flag). An
   * annual or ornamental authors neither: no fields, no branch,
   * byte-identical to phase 1.
   */
  fruitSetCount?: number;
  /**
   * Well-kept game-days from set to ripe — fill advances by
   * `limiting × dt / (fruitFillDays × DAY)` while the window is open.
   *
   * Deferred dials whose home is HERE when demand arrives (seams, not
   * fields): **thinning** (trade set count against fill rate),
   * **alternate bearing** (a mast-year modulation of the set count),
   * **over-ripe** (fill past 1 decaying toward drop — pairs with the
   * preservation slate's spoilage).
   */
  fruitFillDays?: number;
  /**
   * The fraction of {@link fruitSetCount} this plant reaches with NO
   * pollinator — `1` when absent, which is wind- or self-pollinated and
   * byte-identical to every row that shipped before pollination existed.
   * An insect-pollinated crop authors `0.5`: half a crop on its own, a
   * full one when something works the bloom.
   *
   * ⭐ Authors author the CAUSE (what pollinates this plant), never the
   * effect. Nothing on the plant asks who pollinated it — a pollinator
   * pushes through {@link Growing.pollinate}, so the plant never has to
   * know the bees exist.
   */
  pollinationBaseline?: number;
  /**
   * ⭐ **The area crop** (cover build, D2). Kilograms of seed sown per
   * square metre — what makes this plant sowable BY AREA on a field.
   * Absent = planted one at a time (a pot, a bed, a tree): `sow` refuses
   * to broadcast it, and every row that shipped before arable is
   * byte-identical.
   */
  seedRateKgPerM2?: number;
  /**
   * The yield-to-seed ratio — the number every agrarian history quotes
   * (wheat about six, barley seven, cane about ten over its sett). The
   * standing crop at ripeness is `sownAreaM2 × seedRateKgPerM2 ×
   * yieldRatio`, so a third of the seed sown is a third of the yield and
   * there is no yield table anywhere.
   */
  yieldRatio?: number;
  /**
   * The fraction of yield a ratoon loses each cycle it is cut and
   * regrows (cane about 0.12). Absent = 0: a coppice stool keeps its
   * vigor, and a monocarp has only one cycle to lose nothing over.
   */
  yieldDeclinePerCycle?: number;
}

/** What one swath of an area crop gave (see {@link Growing.takeSwath}). */
export interface SwathTaken {
  /** Kilograms of crop the swath cut. */
  kg: number;
  /** Square metres actually cut (the remainder of the crop at most). */
  areaCut: number;
  /** True when this swath took the last of the standing crop. */
  last: boolean;
}

/** The stage of an area crop as a farmer names it (never a number). */
export type CropStage =
  | 'emerging'
  | 'tillering'
  | 'in-ear'
  | 'ripening'
  | 'ripe'
  | 'dead';

/**
 * What a pulled stem's roots tell the hand that pulled it (field
 * population D7) — the ground's story, read off the plant: thin soil,
 * no room, dry, waterlogged, or nothing wrong.
 */
export type RootsBand = 'shallow' | 'cramped' | 'well-down' | 'dry' | 'sodden';

/**
 * ⭐ The read a SPECIMEN carries — what it had where it stood, stamped at
 * the pull (field population D7). A pulled stem does not grow, so its
 * cause is the one it was pulled with, never what a hand or a pocket
 * would make of it now.
 */
export interface SpecimenRecord {
  /** The ground it was pulled from, as a reader names it (*the upper bench*). */
  from: string;
  /** The part's key (`top-end`), or `''` for one-piece ground. */
  part: string;
  /** The part as a reader names it (*the top end*), or `''`. */
  partName: string;
  /** The factor limiting it when it was pulled. */
  limiting: LimitingFactor;
  /** What its roots showed. */
  roots: RootsBand;
  /** Whether that factor was holding it back BADLY (the proficient read). */
  severe: boolean;
  /** The factor behind the first (the expert read), or `null`. */
  next: LimitingFactor;
}

/**
 * ⭐ A crop read at a competence band (field population D9/D11). Every
 * field is what THAT band can tell — a finer field is `null` below the
 * band that reads it, so a caller acting on the read (a farm hand)
 * cannot know more than its eyes do. `lines` is the same read in words.
 */
export interface CropRead {
  band: CompetenceBandName;
  stage: CropStage;
  condition: ConditionBand;
  /** Novice and up: whether something is short. `null` below. */
  short: boolean | null;
  /** Competent and up: what is short. `null` below, or when nothing is. */
  cause: LimitingFactor;
  /** Proficient and up: how badly. `null` below, or when nothing is short. */
  severity: 'badly' | 'a little' | null;
  /** Expert: what runs short next. `null` below, or when nothing will. */
  next: LimitingFactor;
  /**
   * With a seed only: the moisture fraction as THIS reader takes it —
   * the truth plus a seeded error inside the band's bracket.
   */
  moisture?: number | null;
  /** With a seed only: the nutrient fraction, observed the same way. */
  nutrient?: number | null;
  /** The read in words — never a digit. */
  lines: string[];
}

const SECONDS_PER_GAME_DAY = 86_400;
/** Containment hops the light sample climbs before giving up. */
const MAX_LIGHT_HOPS = 8;

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

/** Linear ramp: 0 at/below `lo`, 1 at/above `hi`. */
function ramp(x: number, lo: number, hi: number): number {
  if (hi <= lo) return x >= hi ? 1 : 0;
  return clamp01((x - lo) / (hi - lo));
}

export interface Growing {
  /** Current vigor `[0, 1]` — the condition score (reconciles on read). */
  getVigor(): number;
  /** Current banded condition (presentation). */
  getConditionBand(): ConditionBand;
  /** Current growth stage (reconciles on read). */
  getGrowthStage(): GrowthStage;
  /** Whether the plant is currently flowering (reconciles on read). */
  isFlowering(): boolean;
  /**
   * Root-zone moisture as a fraction `[0, 1]` (reconciles on read).
   * Reads the SOIL the plant is rooted in — phase 2 moved the water out
   * of the plant and into the ground. An unrooted plant reads 0.
   */
  getSoilMoisture(): number;
  /**
   * Litres this plant transpires per game-day at neutral warmth — a
   * **pure, non-reconciling** read of the authored profile.
   *
   * ⚠ The soil sums this across its occupants to drain itself. It must
   * never reconcile: the soil's reconcile calls it, and a reconcile here
   * would read the soil's moisture, which would re-enter the soil.
   */
  waterDemandPerGameDay(): number;
  /**
   * The WORST limiting satisfaction this plant has ever recorded — a
   * monotone minimum, seeded at 1. Harvest quality reads it, which is
   * what makes farming reward your worst moment rather than your
   * average: a plant nursed back looks fine and still grades badly.
   */
  getWorstLimiting(): number;
  /**
   * Whether this plant bears on the FRUIT CYCLE (polycarpy): the profile
   * authors both `fruitSetCount` and `fruitFillDays`. The fields are the
   * marker — there is no flag.
   */
  isPolycarp(): boolean;
  /**
   * Fill fraction of the set crop, `[0, 1]` (reconciles on read). Ripe ⇔
   * 1; always 0 for a monocarp.
   */
  getFruitFill(): number;
  /**
   * Close the cycle after a pick: clear the set crop, the fill, and the
   * flowering latch so the next thriving reconcile opens a NEW window
   * (which re-seeds the worst-limiting verdict at its set). Harvest calls
   * this; the plant survives.
   */
  settleCycle(): void;
  /**
   * The `/trade/farming/thing/crop/…` template a harvest mints, mirroring the host's
   * seed path exactly (the same instantiate-don't-resolve identity-ref
   * variant). Null for an ornamental that yields nothing — a houseplant
   * is not harvestable, and saying so costs one null.
   */
  getHarvestTemplatePath(): string | null;
  setHarvestTemplatePath(value: string | null): void;
  /**
   * Percentage points of nitrogen this crop takes out of the bed when it
   * is harvested — the export that makes an unfed bed yield worse each
   * time. Authored per species; 0 for a plant that draws nothing.
   */
  getNutrientDraw(): number;
  setNutrientDraw(value: number): void;
  /**
   * The tool CAPABILITY kind a harvest of this plant needs (`'cutting'`
   * for a coppice stool), or `''` when it is taken by hand — a carrot is
   * pulled. Authored per species: *what it is cut with* is a fact about
   * the plant, not about the verb.
   */
  getHarvestTool(): string;
  setHarvestTool(value: string): void;
  /**
   * The Discipline this plant's keeping exercises — what `plant` and
   * `harvest` credit. `horticulture` unless the row says otherwise
   * (`silviculture` for a stool or a standard).
   */
  getDiscipline(): string;
  setDiscipline(value: string): void;
  /**
   * Whether this can be harvested right now: it must yield something, be
   * mature, and be alive. Reconciles on read (through `getGrowthStage`),
   * so an absence that ripened it counts.
   */
  isHarvestable(): boolean;
  /** A harvestable plant of this kind beside this one, or null. */
  ripeSibling(): (Stuff & Growing) | null;
  /**
   * The ground this is rooted in, or null when unrooted: the slot host
   * when it sits in one (a pot, a garden bed — *a pot is a bed with one
   * slot*), else ⭐ **the soil-bearing ground it stands in** (a field —
   * cover build D1). A plant has no business knowing which; a caller
   * that needs the slot surface narrows with `MixinApi.isCultivable`.
   */
  getBed(): (Stuff & Soil) | null;
  /**
   * How hard it is to move this to another pot — the `horticulture`
   * difficulty the `repot` verb credits. Root disturbance scales with
   * what there is to disturb, so a seedling is trivial and a grown plant
   * is not.
   */
  transplantDifficulty(): Difficulty;
  /**
   * Water the plant: reconcile, then credit the moisture reserve up to its
   * headroom. Returns the litres actually absorbed (0 when dead or when no
   * moisture reserve is authored).
   */
  waterPlant(litres: number): number;
  /**
   * The factor currently capping growth, or null when nothing is limiting
   * (or the plant is dead — a dead plant has no cause line).
   */
  getLimitingFactor(): LimitingFactor;
  /** Reconcile growth over elapsed game-time (sync, read-triggered). */
  reconcileGrowth(): void;
  /**
   * Tell the plant its surroundings just changed: close the integrated
   * light window at its true level and re-sample. Called by the host's own
   * move hook and by a carrier (a pot) that moved with the plant inside
   * it — see {@link Growing.reconcileGrowth} on why the window has to be
   * segmented at the moment of a move.
   */
  noteEnvironmentChanged(): void;
  /** The authored reaction norm (null until authored). */
  getProfile(): GrowthProfileData | null;
  setProfile(value: GrowthProfileData | null): void;
  /**
   * Raise the share of the set crop that got pollinated by `share`,
   * clamped into `[baseline, 1]`. A no-op outside the fill window (not
   * flowering, no set, or already ripe) — so a pollinator may push
   * blindly and the plant decides whether it lands.
   */
  pollinate(share: number): void;
  /**
   * How many fruits this plant's ripe pick mints: the count LATCHED at
   * the set, scaled by how much of it was pollinated. A plant persisted
   * before the latch existed reads its profile, exactly as before.
   */
  getFruitSetCount(): number;

  // ---------- the area crop (cover build) ----------

  /**
   * Square metres this plant stands over as a CROP — `0` for an
   * individual plant (a pot, a bed, a tree), which is every row that
   * shipped before arable. See {@link GrowthProfileData.seedRateKgPerM2}.
   */
  getSownAreaM2(): number;
  setSownAreaM2(value: number): void;
  /** Widen the crop by `m2` — a later sowing of the same kind. */
  addSownAreaM2(m2: number): void;
  /** Whether this is an area crop (a sown area over a sowable profile). */
  isAreaCrop(): boolean;
  /** Square metres still standing to be cut this cycle. */
  standingAreaM2(): number;
  /**
   * Kilograms the standing crop holds right now: the whole yield of the
   * unharvested area while it is harvestable, `0` before. Reconciles.
   */
  standingYieldKg(): number;
  /**
   * Cut up to `areaM2` of the standing crop: reduces what stands and
   * returns what came off. `last` says the crop is exhausted for the
   * cycle — the caller ends a monocarp or settles a ratoon.
   */
  takeSwath(areaM2: number): SwathTaken;
  /**
   * Close a ratoon's cycle after its last swath: settle the fruit cycle,
   * restore the full area to stand again, and count the cycle (the
   * decline reads it).
   */
  settleRatoon(): void;
  /** How many times this ratoon has been cut down and regrown. */
  getCycleCount(): number;
  /**
   * Kilograms cut but not yet made up into a whole good — carried to the
   * next swath so nothing is lost to rounding.
   */
  getHarvestCarryKg(): number;
  setHarvestCarryKg(value: number): void;
  /** The crop's stage as a farmer names it. */
  getCropStage(): CropStage;
  /** *"a young crop, tillering"* — the stage in words. */
  cropStagePhrase(): string;
  /**
   * How much of `ofAreaM2` the standing crop covers, in words — *"over
   * about a third of it"*. Never a number.
   */
  cropAreaPhrase(ofAreaM2: number): string;
  /** True when a ratoon has been cut so often its yield is failing. */
  isTiredRatoon(): boolean;

  // ---------- ⭐ the patch, the specimen, the banded read (field population) ----------

  /**
   * The key of the PART of its ground this plant stands in (`top-end`),
   * or `''` for the whole ground. {@link Growing.getBed} resolves it; a
   * key naming no part falls back to the whole ground.
   */
  getGroundPart(): string;
  setGroundPart(value: string): void;
  /**
   * What a specimen pulled from this crop is called (*stem of wheat*);
   * `''` keeps the row's own description.
   */
  getSpecimenNoun(): string;
  setSpecimenNoun(value: string): void;
  /** Whether this is a pulled specimen — a record, which does not grow. */
  isSpecimen(): boolean;
  /** The specimen's stamped read, or `null` for a living plant. */
  getSpecimen(): SpecimenRecord | null;
  /**
   * The area crop of this one's kind standing in `part` of the same
   * ground — this plant included — or `null` when that part has none.
   */
  standIn(part: Stuff & Soil): (Stuff & Growing) | null;
  /**
   * Whether `other` is a crop of this one's kind — the same row, or a row
   * that cuts to the same crop (the bench's three stands are three
   * `extends:` rows over one wheat).
   */
  isSameKindAs(other: Stuff & Growing): boolean;
  /** What this plant's roots would show if it were pulled now. */
  rootsBand(): RootsBand;
  /** Feed the ground this plant is rooted in; returns the points taken. */
  feedPlant(points: number): number;
  /** Litres the ground under this plant can still take. */
  waterHeadroomL(): number;
  /** Points of nitrogen the ground under this plant can still take. */
  nutrientHeadroom(): number;
  /**
   * ⭐ The read at `band` — see {@link CropRead}. With a `seed` it also
   * carries the moisture and nutrient as that reader takes them.
   */
  readFor(band: CompetenceBandName, seed?: number): CropRead;
  /** {@link Growing.readFor}'s words alone. */
  readLines(band: CompetenceBandName): string[];
  /**
   * The seeded variation a specimen pulled here now carries on its vigor
   * — the same spot in the same cycle gives the same stem.
   */
  specimenVariation(): number;
  /**
   * A reader's seed for {@link Growing.readFor} today — per reader, per
   * part, per game day: the same hand misjudges the same patch the same
   * way all day, and differently tomorrow.
   */
  readSeedFor(reader: Stuff): number;
  /**
   * Mint an individual of this plant's own kind carrying its growth —
   * cut (`opts.cut`, the default) as a specimen with the read stamped on
   * it, or left living (the labeled plant). Unplaced: the caller puts it
   * where it goes.
   */
  takeSpecimen(
    variation: number,
    opts?: { cut?: boolean },
  ): Promise<Stuff & Growing>;

  // Public so the applier can reflect into them; in-class code reads them
  // directly. Not the inter-Stuff contract (that's the method surface).
  growthClockStamp: number;
  _vigor: number;
  _maturity: number;
  growthStage: string;
  _flowering: boolean;
  _seedSet: boolean;
  _lastLux: number;
  _worstLimiting: number;
  _fruitFill: number;
  _fruitSetCount: number;
  _pollination: number;
  profile: GrowthProfileData | null;
  _specimen: SpecimenRecord | null;
}

/**
 * An area crop's stage as a farmer names it. A grain's words, and the
 * ones the requirements name — emerging, tillering, in ear, ripening,
 * ripe — because a field of wheat is the crop people read off a field.
 */
const CROP_STAGE_OF: Record<GrowthStage, CropStage> = {
  seedling: 'emerging',
  young: 'tillering',
  established: 'in-ear',
  mature: 'ripening',
};

const CROP_STAGE_PHRASE: Record<CropStage, string> = {
  emerging: 'just emerging',
  tillering: 'a young crop, tillering',
  'in-ear': 'in ear, the ears filling',
  ripening: 'ripening',
  ripe: 'ripe and ready to cut',
  dead: 'dead where it stands',
};

/**
 * A fraction of ground in words — never a number. The bands are the
 * ones a person eyeing a field would say aloud.
 */
function areaFractionPhrase(f: number): string {
  if (f >= 0.97) return 'over all of it';
  if (f >= 0.85) return 'over nearly all of it';
  if (f >= 0.7) return 'over about three-quarters of it';
  if (f >= 0.58) return 'over about two-thirds of it';
  if (f >= 0.42) return 'over about half of it';
  if (f >= 0.29) return 'over about a third of it';
  if (f >= 0.2) return 'over about a quarter of it';
  if (f > 0) return 'over a strip of it';
  return '';
}

/** The player-facing size phrase per stage (how big, never a number). */
const STAGE_PHRASE: Record<GrowthStage, string> = {
  seedling: 'It is still a seedling.',
  young: 'It is a young plant.',
  established: 'It is well established.',
  mature: 'It is fully grown.',
};

/** The mature-and-flowering variant — the one stage that reads differently. */
const FLOWERING_PHRASE = 'It is fully grown, and in flower.';

/** The ripe polycarp — outranks the flowering phrase (a filling crop still
 * reads as flowering; a ripe one reads as the thing you can pick). */
const RIPE_PHRASE = 'It is fully grown, heavy with fruit.';

/** The player-facing band phrase (state, never cause). */
const CONDITION_PHRASE: Record<Exclude<ConditionBand, 'dead'>, string> = {
  thriving: 'It is thriving.',
  healthy: 'It looks healthy.',
  stressed: 'It looks stressed.',
  failing: 'It is failing.',
};

/** The plain-language cause line per limiting factor. */
const CAUSE_PHRASE: Record<Exclude<LimitingFactor, null>, string> = {
  water: 'The soil is dry.',
  light: 'It is not getting enough light.',
  root: 'It has outgrown its pot.',
  nutrient: 'The soil is spent.',
  cold: 'It is too cold here for it to be doing anything.',
};

/*
 * ⭐ The BANDED crop read (field population D9). One exhaustive record per
 * rung, so adjacent bands always read differently and every band's
 * sentence is implied by the next one's: the beginner sees the stage and
 * how it looks; the novice, that something is short; the competent,
 * what; the proficient, how badly; the expert, what runs short behind
 * it. Never a digit, and never a different truth.
 */

/** A crop's stage as the short read names it. */
const CROP_STAGE_WORD: Record<CropStage, string> = {
  emerging: 'just up',
  tillering: 'tillering',
  'in-ear': 'in ear',
  ripening: 'ripening',
  ripe: 'ripe',
  dead: 'dead',
};

/** How a living crop looks, as the untrained eye takes it. */
const CROP_CONDITION_WORD: Record<Exclude<ConditionBand, 'dead'>, string> = {
  thriving: 'looks strong',
  healthy: 'looks well',
  stressed: 'looks poor',
  failing: 'is failing',
};

/** The cause, read off ground (the competent rung). */
const CROP_CAUSE_PHRASE: Record<Exclude<LimitingFactor, null>, string> = {
  water: 'The soil is dry there.',
  light: 'It is not getting enough light.',
  root: 'Its roots have run out of room.',
  nutrient: 'The soil is spent there.',
  cold: 'It is too cold there for it to be doing anything.',
};

/** How badly (the proficient rung). */
const CROP_SEVERITY_PHRASE: Record<
  Exclude<LimitingFactor, null>,
  { badly: string; little: string }
> = {
  water: {
    badly: 'The ground is down near the wilting point.',
    little: 'It is only a little dry.',
  },
  light: {
    badly: 'It is all but in the dark.',
    little: 'It is only a little short of light.',
  },
  root: {
    badly: 'Its roots have nowhere left to go.',
    little: 'Its roots are only a little cramped.',
  },
  nutrient: {
    badly: 'The nitrogen is all but gone.',
    little: 'The nitrogen is only a little low.',
  },
  cold: {
    badly: 'It is far too cold for it.',
    little: 'It is only a little too cold for it.',
  },
};

/** What is short BEHIND the first factor (the expert rung). */
const CROP_NEXT_PHRASE: Record<Exclude<LimitingFactor, null>, string> = {
  water: 'Behind that, the soil is drying.',
  light: 'Behind that, the light is poor.',
  root: 'Behind that, the roots are cramped.',
  nutrient: 'Behind that, the nitrogen is low.',
  cold: 'Behind that, it is cold.',
};

/** The factor that would run short first, as a noun (the expert rung, all well). */
const CROP_FACTOR_NOUN: Record<Exclude<LimitingFactor, null>, string> = {
  water: 'the water',
  light: 'the light',
  root: 'the room for its roots',
  nutrient: 'the nitrogen',
  cold: 'the warmth',
};

/** What a pulled stem's roots show. */
const ROOTS_PHRASE: Record<RootsBand, string> = {
  shallow:
    'Its roots are short and spread flat — they met something hard not far down.',
  cramped: 'Its roots are a tight knot; they have run out of room.',
  'well-down': 'Its roots go well down into dark, crumbly soil.',
  dry: 'The soil on its roots is dry and falls away as dust.',
  sodden: 'Its roots come up sodden and pale, smelling sour.',
};

/**
 * Topsoil shallower than this stops a cereal's roots (metres) — a crop
 * on it reads `shallow` when pulled. About a hand's span: the top end of
 * a bench where *the soil runs out up here*.
 */
const SHALLOW_TOPSOIL_M = 0.2;

/** A moisture fraction at/above this is waterlogged ground. */
const SODDEN_AT = 0.95;

/** A limiting satisfaction at/below this is holding a crop back BADLY. */
const SEVERE_AT = 0.3;

/**
 * The vigor a specimen's seeded variation can move by, either way — a
 * stem is that stand, give or take one plant's luck.
 */
const SPECIMEN_VARIATION = 0.1;

/** FNV-1a 32-bit string hash — deterministic and process-independent. */
function hashString(text: string): number {
  let v = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    v ^= text.charCodeAt(i);
    v = Math.imul(v, 0x01000193);
  }
  return v >>> 0;
}

/**
 * Append the plant's **size, condition and cause** to its long description,
 * in that order — how big it is, how it is doing, and why. All three are
 * prose and never a number.
 *
 * The three lines are deliberately different kinds of statement. Size is a
 * physical fact. The band describes *state*, never cause. The cause line
 * names the inferable *reason* and is omitted when nothing is limiting —
 * which is the split phase 7's diagnosis surface generalizes.
 *
 * **Flowering rides the size line**, because it is the one stage that reads
 * differently rather than a fourth kind of statement — and because a
 * flowering plant sets a seed into its pot, which would otherwise appear
 * from nowhere.
 *
 * Reads through the reconcile-on-read getters, so an absent owner's plant
 * reads truthfully.
 */
function conditionAugmenter(text: string, host: Stuff, viewer: Stuff): string {
  if (!MixinApi.isGrowing(host)) return text;
  // ⭐ An area crop and a pulled specimen read at the VIEWER's band
  // (field population D9): the stand is read the way a farmer reads a
  // field, and a beginner sees less of it. A pot, a bed and a labeled
  // plant keep the shipped full read below. The band is the sync digest
  // the look preload warmed (D10); a viewer with no transcript reads
  // the floor.
  if (host.isAreaCrop() || host.isSpecimen()) {
    const reading =
      viewer && MixinApi.isAdvancing(viewer)
        ? viewer.competenceBandCached(host.getDiscipline())
        : CompetenceBand.FLOOR;
    const banded: string[] = [];
    const specimen = host.getSpecimen();
    const bed = specimen === null ? host.getBed() : null;
    const part = host.getGroundPart();
    if (part && bed && bed.soilPartKey() === part) {
      banded.push(`It stands at ${bed.presentationPhrase().definite()}.`);
    }
    banded.push(...host.readLines(reading));
    if (specimen !== null) {
      banded.push(ROOTS_PHRASE[specimen.roots]);
      if (specimen.partName && specimen.from) {
        banded.push(`Taken from ${specimen.partName} of ${specimen.from}.`);
      } else if (specimen.from) {
        banded.push(`Taken from ${specimen.from}.`);
      }
    }
    const read = banded.join(' ');
    return text && text.length > 0 ? `${text}\n\n${read}` : read;
  }
  const band = host.getConditionBand();
  const lines: string[] = [];
  if (band === 'dead') {
    // A dead plant has no size worth reporting and no cause to infer — it
    // is over, and the description says only that.
    lines.push('It is dead.');
  } else {
    const ripe = host.isPolycarp() && host.getFruitFill() >= 1;
    lines.push(
      ripe
        ? RIPE_PHRASE
        : host.isFlowering()
          ? FLOWERING_PHRASE
          : STAGE_PHRASE[host.getGrowthStage()],
    );
    lines.push(CONDITION_PHRASE[band]);
    const limiting = host.getLimitingFactor();
    if (limiting) lines.push(CAUSE_PHRASE[limiting]);
  }
  const suffix = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${suffix}` : suffix;
}

export function GrowingMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class GrowingMixin extends Base implements Growing {
    static _mixinName = 'GrowingMixin';

    static fieldMeta: FieldMeta = {
      growthClockStamp: { persistent: true },
      _vigor: { persistent: true },
      _maturity: { persistent: true },
      growthStage: { persistent: true },
      _flowering: { persistent: true },
      _seedSet: { persistent: true },
      _lastLux: { persistent: true },
      _lastAmbientK: { persistent: true, runtimeState: true },
      _worstLimiting: { persistent: true },
      _fruitFill: { persistent: true },
      _fruitSetCount: { persistent: true },
      _pollination: { persistent: true },
      profile: { persistent: true },
      // The area crop (cover build). An individual plant keeps 0 in
      // all three and is byte-identical.
      sownAreaM2: { persistent: true, authorable: true },
      _cycleCount: { persistent: true, authorable: true },
      _harvestedAreaM2: { persistent: true },
      _harvestCarryKg: { persistent: true },
      // ⭐ Moved off the `Plant` CLASS. `harvest` and `repot` used to
      // narrow with `instanceof Plant` while their specs declared
      // `requires: GrowingMixin` — two predicates for one gate, the
      // same split that let the menu offer `plant` on a rock. The
      // capability is what the verbs actually need, so it lives with
      // the capability. Hydration reflects by NAME, so authored
      // content is untouched by the move.
      harvestTemplatePath: { persistent: true, authorable: true },
      nutrientDraw: { persistent: true, authorable: true },
      harvestTool: { persistent: true, authorable: true },
      discipline: { persistent: true, authorable: true },
      // ⭐ Field population: the part of its ground a plant stands in,
      // what a specimen of it is called, and a specimen's stamped read.
      groundPart: { persistent: true, authorable: true },
      specimenNoun: { persistent: true, authorable: true },
      _specimen: { persistent: true },
    };

    /** Derived condition + cause lines appended to the long description. */
    static markupAugmenters: MarkupAugmenter[] = [conditionAugmenter];

    /** Game-seconds stamp of the last reconcile; `0` = never touched. */
    public growthClockStamp = 0;
    /** Smoothed condition `[0, 1]`; a fresh plant starts `healthy`. */
    public _vigor = 0.7;
    /** Accumulated good game-seconds toward the next stage. */
    public _maturity = 0;
    /** Current stage — one of {@link GROWTH_STAGES}. */
    public growthStage: string = 'seedling';
    /**
     * The ambient temperature this plant last resolved, in kelvin.
     *
     * ⚠⚠ **`-1` means UNRESOLVED, and it reads as *not cold-limited*,
     * never as absolute zero.** Resolving the temperature at a place is
     * asynchronous (the biome chain) and this reconcile is synchronous,
     * so there is a window — sometimes across a restart — in which a
     * plant genuinely does not know how cold it is. The soil's rain edge
     * carries the same tri-state for the same reason, and this codebase
     * has been bitten three times by a cache nothing warms reading a
     * default forever while hand-built tests stayed green.
     */
    public _lastAmbientK = -1;

    /** The in-flight warmth resolve, or `null` — coalesces callers. */
    private _warmthPromise: Promise<void> | null = null;

    /**
     * ⭐ The climate site of the place this plant stands in, and how far
     * the place stood from that climate when the ambient was last
     * resolved (cover build) — so a window integrates WARMTH STEP BY STEP
     * as the season turns (`climate(site, t) + offset`): an open field
     * follows the year, a heated room keeps its heat. Runtime caches;
     * `null` until resolved, when the window falls back to one sample.
     */
    private _climateSite: ClimateSite | null = null;
    private _ambientOffsetK: number | null = null;

    /** Latched at `mature` in thriving condition; cleared on falling back. */
    public _flowering = false;
    /** This flowering episode has already set its seed. */
    public _seedSet = false;
    /** The lux the open window is integrated with (segmented at moves). */
    public _lastLux = 0;
    /**
     * Monotone minimum of the limiting satisfaction over this plant's
     * whole life; 1 until the first reconcile touches it. The quality
     * substrate — see {@link Growing.getWorstLimiting}.
     */
    public _worstLimiting = 1;
    /**
     * Fill fraction of the SET crop, `[0, 1]` — accrues at the limiting
     * rate while a polycarp's cycle window is open (`_seedSet`). Ripe ⇔
     * 1. Always 0 for a monocarp.
     */
    public _fruitFill = 0;
    /**
     * The set count LATCHED at the set moment, or 0 when nothing has set
     * (which is also how a plant persisted before this field existed
     * reads — {@link Growing.getFruitSetCount} falls back to the
     * profile, so the old behaviour is the zero case).
     */
    public _fruitSetCount = 0;
    /**
     * The fraction of the set crop that got pollinated, `[baseline, 1]`.
     * Seeded from the profile's baseline at the set and raised by
     * {@link Growing.pollinate}; never falls.
     */
    public _pollination = 1;
    /** The authored reaction norm (see {@link GrowthProfileData}). */
    public profile: GrowthProfileData | null = null;

    /** Square metres sown; 0 = an individual plant. */
    public sownAreaM2 = 0;
    /** Ratoon cycles cut and regrown — the decline's exponent. */
    public _cycleCount = 0;
    /** Square metres already cut this cycle. */
    public _harvestedAreaM2 = 0;
    /** Kilograms cut but not yet made up into a whole good. */
    public _harvestCarryKg = 0;

    /** Reentry guard — a reconcile must never recurse through a read. */
    private _reconcilingGrowth = false;

    // ---------- reads ----------

    public getVigor(): number {
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      return clamp01(this._vigor);
    }

    public getConditionBand(): ConditionBand {
      const v = this.getVigor(); // reconcile FIRST — the read may latch death
      if (this.isGrowthDead()) return 'dead';
      if (v >= dial(AppSettingKeys.husbandryBandThrivingAt, 0.8)) {
        return 'thriving';
      }
      if (v >= dial(AppSettingKeys.husbandryBandHealthyAt, 0.55)) {
        return 'healthy';
      }
      if (v >= dial(AppSettingKeys.husbandryBandStressedAt, 0.3)) {
        return 'stressed';
      }
      return 'failing';
    }

    public getGrowthStage(): GrowthStage {
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      return (
        GROWTH_STAGES.includes(this.growthStage as GrowthStage)
          ? this.growthStage
          : 'seedling'
      ) as GrowthStage;
    }

    public isFlowering(): boolean {
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      return this._flowering;
    }

    public getSoilMoisture(): number {
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      return this.soilMoisture() ?? 0;
    }

    public waterDemandPerGameDay(): number {
      // PURE — no reconcile. The soil calls this while draining itself.
      return this.profile?.litresPerGameDay ?? 0;
    }

    public getWorstLimiting(): number {
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      return clamp01(this._worstLimiting);
    }

    public isPolycarp(): boolean {
      const p = this.profile;
      return !!p && (p.fruitSetCount ?? 0) > 0 && (p.fruitFillDays ?? 0) > 0;
    }

    public getFruitFill(): number {
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      return clamp01(this._fruitFill);
    }

    /**
     * A pollinator's push. Sync and additive: the caller scales `share`
     * by its own elapsed window, so a hive that reconciles a game-week
     * pushes a week's worth once rather than nudging on a timer.
     *
     * The window is the only gate — flowering, set, and not yet ripe.
     * Nothing here asks WHO pollinated: the direction of the call is the
     * whole coupling, which is why a crop can be pollinated on land its
     * grower does not own by bees they do not keep.
     */
    public pollinate(share: number): void {
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      if (!this._flowering || !this._seedSet) return;
      if (this._fruitFill >= 1) return;
      if (!(share > 0)) return;
      this._pollination = clamp01(this._pollination + share);
    }

    /**
     * The fruits a ripe pick mints. Reads the LATCHED count scaled by
     * pollination, and falls back to the profile when nothing has been
     * latched — which is exactly how every plant persisted before the
     * latch existed behaves, and how a monocarp (no set count) reads.
     */
    public getFruitSetCount(): number {
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      if (this._fruitSetCount > 0) {
        return Math.max(
          1,
          Math.floor(this._fruitSetCount * clamp01(this._pollination)),
        );
      }
      return Math.max(1, Math.floor(this.profile?.fruitSetCount ?? 1));
    }

    public settleCycle(): void {
      this._fruitFill = 0;
      this._seedSet = false;
      this._flowering = false;
      // The episode is over, so its set count goes with it — the next
      // set latches its own, and `getFruitSetCount` reads the profile in
      // between.
      this._fruitSetCount = 0;
      this._pollination = 1;
    }


    // ---------- the area crop (cover build D2) ----------

    public getSownAreaM2(): number {
      return this.sownAreaM2;
    }

    public setSownAreaM2(value: number): void {
      this.sownAreaM2 = Number.isFinite(value) && value > 0 ? value : 0;
    }

    public addSownAreaM2(m2: number): void {
      if (!Number.isFinite(m2) || m2 <= 0) return;
      this.sownAreaM2 += m2;
    }

    public isAreaCrop(): boolean {
      return this.sownAreaM2 > 0 && (this.profile?.seedRateKgPerM2 ?? 0) > 0;
    }

    public standingAreaM2(): number {
      return Math.max(0, this.sownAreaM2 - this._harvestedAreaM2);
    }

    /**
     * Kilograms one square metre gives at ripeness: seed rate × yield
     * ratio, less the ratoon decline compounded over the cycles cut.
     * Two row numbers and one optional third — no yield table.
     */
    private yieldPerM2(): number {
      const p = this.profile;
      if (!p) return 0;
      const rate = p.seedRateKgPerM2 ?? 0;
      const ratio = p.yieldRatio ?? 0;
      const decline = clamp01(p.yieldDeclinePerCycle ?? 0);
      return rate * ratio * Math.pow(1 - decline, Math.max(0, this._cycleCount));
    }

    public standingYieldKg(): number {
      if (!this.isAreaCrop() || !this.isHarvestable()) return 0;
      return this.standingAreaM2() * this.yieldPerM2();
    }

    public takeSwath(areaM2: number): SwathTaken {
      if (!this.isAreaCrop() || !this.isHarvestable()) {
        return { kg: 0, areaCut: 0, last: false };
      }
      const standing = this.standingAreaM2();
      const areaCut = Math.max(0, Math.min(areaM2, standing));
      this._harvestedAreaM2 += areaCut;
      // A sliver under a square metre is not worth another act: the
      // swath that leaves less than that takes it too.
      const left = standing - areaCut;
      const last = left < 1;
      if (last) this._harvestedAreaM2 = this.sownAreaM2;
      const cut = last ? standing : areaCut;
      return { kg: cut * this.yieldPerM2(), areaCut: cut, last };
    }

    public settleRatoon(): void {
      this.settleCycle();
      this._harvestedAreaM2 = 0;
      this._cycleCount += 1;
    }

    public getCycleCount(): number {
      return this._cycleCount;
    }

    public getHarvestCarryKg(): number {
      return this._harvestCarryKg;
    }

    public setHarvestCarryKg(value: number): void {
      this._harvestCarryKg = Number.isFinite(value) && value > 0 ? value : 0;
    }

    public getCropStage(): CropStage {
      if (this.getConditionBand() === 'dead') return 'dead';
      if (this.isHarvestable()) return 'ripe';
      return CROP_STAGE_OF[this.getGrowthStage()];
    }

    public cropStagePhrase(): string {
      return CROP_STAGE_PHRASE[this.getCropStage()];
    }

    public cropAreaPhrase(ofAreaM2: number): string {
      if (!(ofAreaM2 > 0)) return '';
      return areaFractionPhrase(this.standingAreaM2() / ofAreaM2);
    }

    public isTiredRatoon(): boolean {
      const d = clamp01(this.profile?.yieldDeclinePerCycle ?? 0);
      if (d <= 0) return false;
      return Math.pow(1 - d, this._cycleCount) < 0.6;
    }

    /*
     * ⭐ The harvest + rooting surface, moved here from the `Plant`
     * class. `harvest` and `repot` narrowed with `instanceof Plant`
     * while their specs declared `requires: GrowingMixin` — two
     * predicates for one gate, which is the split that let the menu
     * offer `plant` on a rock. Everything below is expressed purely in
     * terms of what this mixin already owns, so the class was never
     * the right home for it; `Plant` was simply the only composer.
     */

    /** The `/stuff/…` template a harvest mints; null yields nothing. */
    public harvestTemplatePath: string | null = null;

    public getHarvestTemplatePath(): string | null {
      return this.harvestTemplatePath;
    }

    public setHarvestTemplatePath(value: string | null): void {
      this.harvestTemplatePath = value;
    }

    /** Nitrogen points a harvest exports from the bed. */
    public nutrientDraw: number = 0;

    public getNutrientDraw(): number {
      return this.nutrientDraw;
    }

    public setNutrientDraw(value: number): void {
      this.nutrientDraw = Math.max(0, value);
    }

    /** The capability kind the cut needs; `''` = by hand. */
    public harvestTool: string = '';

    public getHarvestTool(): string {
      return this.harvestTool;
    }

    public setHarvestTool(value: string): void {
      this.harvestTool = value ?? '';
    }

    /** The Discipline this plant's keeping exercises. */
    public discipline: string = 'horticulture';

    public getDiscipline(): string {
      return this.discipline;
    }

    public setDiscipline(value: string): void {
      this.discipline = value || 'horticulture';
    }

    // ---------- ⭐ the patch, the specimen, the banded read (field population) ----------

    /** The key of the part of its ground this stands in; `''` = whole ground. */
    public groundPart: string = '';

    public getGroundPart(): string {
      return this.groundPart;
    }

    public setGroundPart(value: string): void {
      this.groundPart = typeof value === 'string' ? value : '';
    }

    /** What a specimen of this is called; `''` = the row's own words. */
    public specimenNoun: string = '';

    public getSpecimenNoun(): string {
      return this.specimenNoun;
    }

    public setSpecimenNoun(value: string): void {
      this.specimenNoun = typeof value === 'string' ? value : '';
    }

    /** The read stamped at the pull; `null` for a living plant. */
    public _specimen: SpecimenRecord | null = null;

    public isSpecimen(): boolean {
      return this._specimen !== null;
    }

    public getSpecimen(): SpecimenRecord | null {
      return this._specimen;
    }

    public standIn(part: Stuff & Soil): (Stuff & Growing) | null {
      const self = this as unknown as Stuff & Growing;
      const here = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (!here || !MixinApi.isContainer(here)) return null;
      const candidates = [self, ...(here.getContents() as Stuff[])];
      return (
        candidates.find(
          (c): c is Stuff & Growing =>
            MixinApi.isGrowing(c) &&
            this.isSameKindAs(c) &&
            c.isAreaCrop() &&
            c.getBed() === part,
        ) ?? null
      );
    }

    public rootsBand(): RootsBand {
      const depth = this.getBed()?.soilDepthM() ?? null;
      if (depth !== null && depth < SHALLOW_TOPSOIL_M) return 'shallow';
      if (this.satRoot() < 1) return 'cramped';
      const profile = this.profile;
      const moisture = this.soilMoisture();
      if (profile && moisture !== null) {
        if (moisture <= profile.moistureWiltAt) return 'dry';
        if (moisture >= SODDEN_AT) return 'sodden';
      }
      return 'well-down';
    }

    public feedPlant(points: number): number {
      return this.getBed()?.feedSoil(points) ?? 0;
    }

    public waterHeadroomL(): number {
      return this.getBed()?.soilMoistureHeadroomL() ?? 0;
    }

    public nutrientHeadroom(): number {
      return this.getBed()?.soilNutrientHeadroom() ?? 0;
    }

    public readFor(band: CompetenceBandName, seed?: number): CropRead {
      const rank = CompetenceBand.rank(band);
      const condition = this.getConditionBand();
      const stage = this.getCropStage();
      const read: CropRead = {
        band,
        stage,
        condition,
        short: null,
        cause: null,
        severity: null,
        next: null,
        lines: [],
      };
      if (seed !== undefined) {
        read.moisture = this.observe(this.soilMoisture(), band, seed, 1);
        read.nutrient = this.observe(this.nutrientLevel(), band, seed, 2);
      }
      if (condition === 'dead') {
        read.lines.push('It is dead where it stands.');
        return read;
      }
      const { limiting, severe, next } = this.diagnosis();
      read.lines.push(
        `It is ${CROP_STAGE_WORD[stage]} and ${CROP_CONDITION_WORD[condition]}.`,
      );
      if (rank >= 1) {
        read.short = limiting !== null;
        read.lines.push(
          limiting ? 'It is short of something.' : 'Nothing seems short now.',
        );
      }
      if (rank >= 2) {
        read.cause = limiting;
        read.lines.push(
          limiting ? CROP_CAUSE_PHRASE[limiting] : 'Nothing is holding it back.',
        );
      }
      if (rank >= 3) {
        read.severity = limiting ? (severe ? 'badly' : 'a little') : null;
        read.lines.push(
          limiting
            ? CROP_SEVERITY_PHRASE[limiting][severe ? 'badly' : 'little']
            : 'It has margin to spare.',
        );
      }
      if (rank >= 4) {
        read.next = next;
        read.lines.push(
          limiting
            ? next
              ? CROP_NEXT_PHRASE[next]
              : 'Nothing else is short.'
            : next
              ? `If anything runs short first, it will be ${CROP_FACTOR_NOUN[next]}.`
              : 'Nothing will run short soon.',
        );
      }
      return read;
    }

    public readLines(band: CompetenceBandName): string[] {
      return this.readFor(band).lines;
    }

    public specimenVariation(): number {
      const self = this as unknown as Stuff;
      const ground = MixinApi.isContainable(self) ? self.getContainer() : null;
      const at = ground?.getIdentityPath() ?? '';
      const h = hashString(`${at}#${this.groundPart}#${this._cycleCount}`);
      return (Seeded.unit(h, 1) - 0.5) * SPECIMEN_VARIATION;
    }

    public readSeedFor(reader: Stuff): number {
      const who = reader.getIdentityPath() ?? reader.stuffId;
      const day = Math.floor((this.growthNowSeconds() ?? 0) / SECONDS_PER_GAME_DAY);
      return hashString(`${who}#${this.groundPart}#${day}`);
    }

    public async takeSpecimen(
      variation: number,
      opts: { cut?: boolean } = {},
    ): Promise<Stuff & Growing> {
      const self = this as unknown as Stuff;
      const path = self.getTemplatePath();
      if (!path) {
        throw new Error('takeSpecimen: a plant with no template path has no kind to copy');
      }
      const cut = opts.cut ?? true;
      // Read everything BEFORE the mint — the read is of the plant where
      // it stands, and minting must not be what changes it.
      const vigor = this.getVigor();
      const record = cut ? this.specimenRecord() : null;
      const minted = await StuffApi.clone<Stuff>(path);
      if (!MixinApi.isGrowing(minted)) {
        await StuffApi.destruct(minted);
        throw new Error(`takeSpecimen: '${path}' did not mint a growing thing`);
      }
      // ⚠ Field writes on a plant this call just minted — the applier's
      // carve-out in spirit: nothing else holds it yet.
      minted.growthStage = this.growthStage;
      minted._maturity = this._maturity;
      minted._worstLimiting = this._worstLimiting;
      minted._flowering = this._flowering;
      minted._seedSet = this._seedSet;
      minted._fruitFill = this._fruitFill;
      minted.profile = this.profile;
      minted._vigor = clamp01(vigor + (Number.isFinite(variation) ? variation : 0));
      minted.setSownAreaM2(0);
      minted.setGroundPart(this.groundPart);
      minted._specimen = record;
      if (this.specimenNoun && MixinApi.isVisible(minted)) {
        minted.setShortDescription(this.specimenNoun);
      }
      return minted;
    }

    /**
     * The read a specimen pulled here NOW would carry — its ground, its
     * part, its cause and its roots.
     */
    private specimenRecord(): SpecimenRecord {
      const self = this as unknown as Stuff;
      const ground = MixinApi.isContainable(self) ? self.getContainer() : null;
      const bed = this.getBed();
      const inPart = bed !== null && (bed as Stuff) !== (ground as Stuff | null);
      const { limiting, severe, next } = this.diagnosis();
      return {
        from: ground ? ground.presentationPhrase().definite() : '',
        part: inPart ? bed.soilPartKey() : '',
        partName: inPart ? bed.presentationPhrase().definite() : '',
        limiting,
        roots: this.rootsBand(),
        severe,
        next,
      };
    }

    /**
     * What is short, how badly, and what is short behind it — stamped for
     * a specimen, sampled live for a growing plant (the same five terms
     * {@link Growing.getLimitingFactor} reads).
     */
    private diagnosis(): {
      limiting: LimitingFactor;
      severe: boolean;
      next: LimitingFactor;
    } {
      const stamped = this._specimen;
      if (stamped !== null) {
        return {
          limiting: stamped.limiting,
          severe: stamped.severe,
          next: stamped.next,
        };
      }
      const limiting = this.getLimitingFactor();
      const terms = this.growthTerms();
      const goodAt = dial(AppSettingKeys.husbandryGoodAt, 0.6);
      if (limiting === null) {
        return { limiting, severe: false, next: terms[0]?.factor ?? null };
      }
      const first = terms.find((t) => t.factor === limiting);
      const behind = terms.find((t) => t.factor !== limiting);
      return {
        limiting,
        severe: (first?.sat ?? 1) <= SEVERE_AT,
        next: behind && behind.sat < goodAt ? behind.factor : null,
      };
    }

    /**
     * The five growth terms sampled LIVE, worst first; ties keep the
     * order {@link Growing.getLimitingFactor} names them in.
     */
    private growthTerms(): {
      factor: Exclude<LimitingFactor, null>;
      sat: number;
    }[] {
      const terms: { factor: Exclude<LimitingFactor, null>; sat: number }[] = [
        { factor: 'water', sat: this.satWater(this.soilMoisture()) },
        { factor: 'light', sat: this.satLight(this.sampleLux()) },
        { factor: 'root', sat: this.satRoot() },
        { factor: 'cold', sat: this.satWarmth() },
        { factor: 'nutrient', sat: this.satNutrient() },
      ];
      return terms.sort((a, b) => a.sat - b.sat);
    }

    /**
     * A fraction as a reader at `band` takes it: the truth plus a seeded
     * error inside the band's bracket (`COMPETENCE_HALF_WIDTH`, the
     * instrument's own table) — so the truth is always inside what they
     * read, and a beginner's guess is wider than an expert's.
     */
    private observe(
      truth: number | null,
      band: CompetenceBandName,
      seed: number,
      salt: number,
    ): number | null {
      if (truth === null) return null;
      const u = Seeded.unit(seed, salt) * 2 - 1;
      return clamp01(truth + u * COMPETENCE_HALF_WIDTH[band]);
    }

    /** See {@link Growing.isSameKindAs}. */
    public isSameKindAs(other: Stuff & Growing): boolean {
      const self = this as unknown as Stuff;
      if (other.getTemplatePath() === self.getTemplatePath()) return true;
      const mine = this.harvestTemplatePath;
      return mine !== null && other.getHarvestTemplatePath() === mine;
    }

    /**
     * A harvestable plant of this one's kind standing beside it, or null —
     * so `harvest cane` in a field of ratoons takes the ripe one rather
     * than refusing on whichever stool the name bound first.
     *
     * ⭐ Of this one's KIND (field population W3): the same row or a row
     * that cuts to the same crop, so the bench's `extends:` stands
     * substitute for one another. ⚠ And rooted in the SAME bed — on a
     * divided field the patch is what the player named (`harvest wheat at
     * the middle`), and a ripe stand at the top end is not a substitute
     * for the middle's.
     */
    public ripeSibling(): (Stuff & Growing) | null {
      const self = this as unknown as Stuff;
      const here = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (!here || !MixinApi.isContainer(here)) return null;
      const bed = this.getBed();
      return (
        (here.getContents() as Stuff[]).find(
          (c): c is Stuff & Growing =>
            c !== self &&
            MixinApi.isGrowing(c) &&
            this.isSameKindAs(c) &&
            c.getBed() === bed &&
            c.isHarvestable(),
        ) ?? null
      );
    }

    public isHarvestable(): boolean {
      if (!this.harvestTemplatePath) return false;
      if (this.getGrowthStage() !== 'mature') return false;
      if (this.getConditionBand() === 'dead') return false;
      // A polycarp is harvestable only when the set crop is RIPE — a
      // mature tree between cycles has nothing on it to take.
      if (this.isPolycarp()) return this._fruitFill >= 1;
      return true;
    }

    /*
     * ⚠ `getOccupiedHost` belongs to `SlottableMixin`, which composes
     * OUTSIDE this one on `Plant` — so it cannot be assumed on the
     * base. Asking `MixinApi.isSlottable` is the project's own answer
     * to that (narrow locally rather than demand composition order),
     * and it makes an unslotted grower read its container instead of
     * throwing.
     *
     * ⭐⭐ **Ground is a bed by CONTAINMENT** (cover build D1). The slot
     * host wins when there is one — a pot, a garden bed — and otherwise
     * the soil-bearing ground the plant stands in roots it. A field is
     * not a vessel of soil with an N-slot, so it composes no
     * `Cultivable`; it only has to be ground. Before this, a plant
     * standing in a field read `null`, `satWater(null)` is 0, and every
     * crop authored into a field quietly died of thirst.
     */
    public getBed(): (Stuff & Soil) | null {
      const self = this as unknown as Stuff;
      if (MixinApi.isSlottable(self)) {
        const host = self.getOccupiedHost();
        if (host && MixinApi.isCultivable(host)) return host;
      }
      // ⚠ Only ground that holds NO slot. A pot or a bed roots a plant
      // through its slot — its soil is shared by slot occupancy — so a
      // plant merely sitting in its contents (moved in, not yet seated)
      // is not rooted there.
      const ground = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (
        ground &&
        MixinApi.isSoil(ground) &&
        MixinApi.isContainer(ground) &&
        !MixinApi.isCultivable(ground)
      ) {
        // ⭐ The plant binds to its PART of the ground by key (field
        // population D4); a key naming no part — a patch deleted from a
        // row — falls back to the whole ground, never orphans the crop.
        return ground.soilPart(this.groundPart) ?? ground;
      }
      return null;
    }

    public transplantDifficulty(): Difficulty {
      switch (this.getGrowthStage()) {
        case 'seedling':
          return 'trivial';
        case 'young':
          return 'easy';
        case 'established':
          return 'standard';
        default:
          return 'hard'; // `mature`
      }
    }

    public getProfile(): GrowthProfileData | null {
      return this.profile;
    }

    public setProfile(value: GrowthProfileData | null): void {
      this.profile = value;
    }

    public getLimitingFactor(): LimitingFactor {
      if (this._specimen !== null) return this._specimen.limiting;
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      if (this.isGrowthDead() || !this.profile) return null;
      // The cause line answers "why is it unhappy *now*", so every term
      // is sampled live rather than read off the last integrated window —
      // move a plant into the dark and it says so immediately, before the
      // dark hours have accrued.
      const satWater = this.satWater(this.soilMoisture());
      const satLight = this.satLight(this.sampleLux());
      const satRoot = this.satRoot();
      const satNutrient = this.satNutrient();
      const satWarmth = this.satWarmth();
      const limiting = Math.min(
        satWater,
        satLight,
        satRoot,
        satNutrient,
        satWarmth,
      );
      if (limiting >= dial(AppSettingKeys.husbandryGoodAt, 0.6)) return null;
      if (limiting === satWater) return 'water';
      if (limiting === satLight) return 'light';
      if (limiting === satRoot) return 'root';
      if (limiting === satWarmth) return 'cold';
      return 'nutrient';
    }

    // ---------- interventions ----------

    /**
     * Water the plant — which since phase 2 means **watering the ground it
     * is rooted in**. The verb surface is unchanged (`water <plant>` still
     * works) but the litres land in the soil, where every occupant shares
     * them. An unrooted plant absorbs nothing, because nothing is holding
     * water for it.
     */
    public waterPlant(litres: number): number {
      if (!Number.isFinite(litres) || litres <= 0) return 0;
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      if (this.isGrowthDead()) return 0;
      return this.waterTheSoil(litres);
    }

    // ---------- reconcile-on-read (the lazy integrate) ----------

    /**
     * Integrate growth over elapsed game-time since the last reconcile.
     * **No far-past guard and no linkdead branch** — an owned thing lives
     * the full absence (the family clock); long gaps are bounded by the
     * step cap, never dropped. Dead is terminal. No-op when no world clock
     * is running or no profile is authored.
     */
    public reconcileGrowth(): void {
      if (this._reconcilingGrowth) return;
      // ⭐ A pulled stem is a RECORD (field population D7): it does not
      // grow, and its cause is the one stamped at the pull.
      if (this._specimen !== null) return;

      const nowS = this.growthNowSeconds();
      if (nowS === null) return;
      if (this.isGrowthDead()) return; // terminal

      // First touch: seed the stamp + the light window; integrate nothing.
      //
      // ⚠ Seed the GROUND's stamp in the same breath. The soil owns its
      // own checkpoint and seeds it lazily on first read — so a bed that
      // nobody has looked at would otherwise stamp itself at the moment
      // of the first read and skip the whole elapsed window, handing this
      // plant a full reserve it should long since have drunk. A plant's
      // clock and its ground's clock start together or neither is honest.
      if (this.growthClockStamp === 0) {
        this.growthClockStamp = nowS;
        this._lastLux = this.sampleLux();
        this.soilMoisture();
        void this.restampWarmth();
        return;
      }
      // Ground that has never resolved how cold it is keeps asking. The
      // read path never awaits; until it lands, warmth is unmodelled.
      if (this._lastAmbientK < 0) void this.restampWarmth();

      const elapsed = nowS - this.growthClockStamp;
      if (elapsed <= 0) {
        this.growthClockStamp = nowS;
        return;
      }
      if (!this.profile) {
        this.growthClockStamp = nowS;
        return;
      }

      this._reconcilingGrowth = true;
      try {
        const stepSec = dial(AppSettingKeys.husbandryStepSec, 43_200);
        const maxSteps = dial(AppSettingKeys.husbandryMaxSteps, 2000);
        // A step cap, never a time cap: dt grows with the gap so an absurd
        // absence still integrates fully in bounded work.
        const steps = Math.max(
          1,
          Math.min(Math.ceil(elapsed / stepSec), Math.floor(maxSteps)),
        );
        const dt = elapsed / steps;
        const tau = dial(AppSettingKeys.husbandryVigorTauSec, 3_801_600);
        const goodAt = dial(AppSettingKeys.husbandryGoodAt, 0.6);
        const deathAt = dial(AppSettingKeys.husbandryDeathAt, 0.12);
        // Sampled once before the loop — the ground cannot change
        // mid-window — and re-sampled on a stage advance (root demand is
        // per-stage).
        let satRoot = this.satRoot();
        const satLight = this.satLight(this._lastLux);
        // WATER is now a per-window sample too, exactly like light. The
        // soil owns the drain and reconciles on its own stamp; asking it
        // here is what triggers that, and the MEAN it reports is the
        // right figure for a window this plant is integrating whole.
        const satWater = this.satWater(this.meanSoilMoisture());
        const satNutrient = this.satNutrient();
        // ⭐ Warmth is read PER STEP (cover build): a window can span a
        // season — a piece nobody visited all summer, read in the autumn —
        // and integrating it whole at the reading's warmth froze a summer's
        // growth into an autumn's. The step reads the climate at its own
        // moment plus the place's offset; with no site known, the one
        // sample stands.
        const windowStart = this.growthClockStamp;
        const areaCrop = this.isAreaCrop();

        for (let i = 0; i < steps; i++) {
          // ⭐ A RIPE field crop is finished growing (cover build B36): it
          // stands ready to cut until somebody cuts or grubs it, its grade
          // already set by its worst stretch. Without this a ripe stand
          // nobody had reached by autumn read "dead where it stands" and
          // gave nothing to the sickle (found walking the bench). What an
          // uncut crop loses standing — shattering, lodging — is a later
          // slate's; a pot keeps the shipped rule.
          if (areaCrop && this.currentStage() === 'mature') break;
          const satWarmth = this.satWarmth(windowStart + (i + 0.5) * dt);
          const limiting = Math.min(
            satWater,
            satLight,
            satRoot,
            satNutrient,
            satWarmth,
          );
          if (limiting < this._worstLimiting) this._worstLimiting = limiting;
          // Exponential relaxation toward the limiting satisfaction; the
          // factor is clamped so an oversized dt cannot overshoot.
          const k = Math.min(dt / tau, 1);
          this._vigor = clamp01(this._vigor + (limiting - this._vigor) * k);
          if (limiting >= goodAt) {
            this._maturity += dt;
            if (this.advanceStage()) satRoot = this.satRoot();
          } else if (areaCrop && limiting > deathAt) {
            // ⭐ A FIELD crop develops on its season and is spoiled by its
            // stress, rather than stopped by it (cover build): thin ground
            // gives a late, poor crop — graded by its worst stretch — not
            // one that stands in the ear until the winter kills it. A pot
            // keeps the shipped rule: only a well-kept plant matures.
            this._maturity += (dt * limiting) / goodAt;
            if (this.advanceStage()) satRoot = this.satRoot();
          }
          this.updateFlowering();
          this.accrueFruitFill(limiting, dt);
          if (this._vigor < deathAt) {
            this.latchDead();
            break;
          }
        }
        this.growthClockStamp = nowS;
      } finally {
        this._reconcilingGrowth = false;
      }

      // Close the integrated window: the next one opens at today's light.
      this._lastLux = this.sampleLux();
    }

    public noteEnvironmentChanged(): void {
      this.reconcileGrowth();
      this._lastLux = this.sampleLux();
      // Carrying a pot from a cold yard into a warm kitchen changes the
      // temperature as surely as it changes the light.
      void this.restampWarmth();
    }

    /**
     * Resolve the ambient temperature where this plant is standing.
     *
     * The one `await` on the warmth edge, kept off the read path — the
     * shape `ThermalMixin.restamp` established for `lastAmbientK` and
     * the soil's sky edge repeats, for the same reason: a
     * reconcile-on-read consumer must not await a walk. Holding the
     * PROMISE rather than a boolean makes a second caller coalesce onto
     * the first.
     */
    public restampWarmth(): Promise<void> {
      const inFlight = this._warmthPromise;
      if (inFlight !== null) return inFlight;
      const started = this.resolveWarmth();
      this._warmthPromise = started;
      return started;
    }

    private async resolveWarmth(): Promise<void> {
      try {
        const self = this as unknown as Stuff;
        if (!MixinApi.isContainable(self)) return;
        let env: Stuff | null = self.getContainer();
        for (let hops = 0; hops < MAX_LIGHT_HOPS && env !== null; hops++) {
          if (MixinApi.isContainer(env)) {
            const k = await BiomeApi.resolveTemperatureFor(env as Stuff & Container);
            const value = k?.rawValue();
            if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
              this._lastAmbientK = value;
              await this.resolveClimateOffset(env, value);
              return;
            }
          }
          env = MixinApi.isContainable(env) ? env.getContainer() : null;
        }
      } catch {
        // ⚠ A failed walk leaves the ambient UNRESOLVED rather than
        // resolving it to something: unknown must never read as cold.
      } finally {
        this._warmthPromise = null;
      }
    }

    /**
     * Cache the place's climate site and its offset from that climate now,
     * so warmth can be read at any moment of a window. A failure leaves
     * both null — the single-sample fallback.
     */
    private async resolveClimateOffset(place: Stuff, _ambientK: number): Promise<void> {
      try {
        const nowS = this.growthNowSeconds();
        if (nowS === null) return;
        // ⚠ Only under OPEN SKY: a heated room or a glasshouse does not
        // follow the year, so it keeps its one resolved ambient.
        const exposure = BiomeApi.exposureOf(place as Stuff & Container);
        const open = exposure ? exposure.rainReaches() : BiomeApi.isSkyExposed(place);
        if (!open) {
          this._climateSite = null;
          this._ambientOffsetK = null;
          return;
        }
        const site = await ZoneApi.climateSiteFor(place);
        const climate = dailyMeanClimate(site, nowS);
        if (!Number.isFinite(climate)) return;
        this._climateSite = site;
        // ⚠⚠ ZERO under open sky (cover build B32). The place IS its
        // climate there (the site's own offset is already in the mean);
        // `ambientK - climate` was this moment's weather and hour, and
        // carried across a window it chilled a whole unwatched summer by
        // whatever the night was doing when the place was first read.
        this._ambientOffsetK = 0;
      } catch {
        this._climateSite = null;
        this._ambientOffsetK = null;
      }
    }

    /**
     * The ambient at game-second `atS`: the climate there and then plus
     * the place's own offset, or the last resolved ambient when no site
     * is known. `-1` while unresolved.
     */
    private ambientAt(atS: number | undefined): number {
      if (
        atS === undefined ||
        this._climateSite === null ||
        this._ambientOffsetK === null ||
        this._lastAmbientK < 0
      ) {
        return this._lastAmbientK;
      }
      try {
        const k = dailyMeanClimate(this._climateSite, atS);
        return Number.isFinite(k) ? k + this._ambientOffsetK : this._lastAmbientK;
      } catch {
        return this._lastAmbientK;
      }
    }

    /**
     * Warmth satisfaction — ⭐ **the whole of winter, on the plant side.**
     *
     * `1` when the profile declares no cold response, and `1` while the
     * ambient is unresolved: **unmodelled is not zero**, which is the
     * same rule the nutrient seam already keeps (a pot authors no
     * nitrogen and is therefore never nutrient-limited).
     */
    protected satWarmth(atS?: number): number {
      const profile = this.profile;
      if (!profile) return 1;
      const stop = profile.coldStopK;
      const happy = profile.warmHappyK;
      if (stop === undefined && happy === undefined) return 1;
      const k = this.ambientAt(atS);
      if (k < 0) return 1;
      return ramp(k, stop ?? 278, happy ?? (stop ?? 278) + 10);
    }

    // ---------- host seams ----------

    /**
     * The soil litres available to the roots, or `null` when unpotted.
     * Default `null` — not being in a pot is not a root constraint (an
     * unpotted plant is already in trouble via water). The concrete host
     * overrides to read its pot.
     */
    protected rootRoom(): number | null {
      return null;
    }

    /**
     * The moisture fraction of the ground this plant is rooted in, or
     * `null` when it is rooted in nothing. Default `null`; the concrete
     * host overrides to read its bed.
     *
     * Phase 2 moved water OUT of the plant and into the soil. The
     * objection phase 1 recorded — that it "splits one checkpoint across
     * two objects" — is answered by giving the soil a checkpoint of its
     * own: the bed owns a stamp and a reconcile, and **the plant only
     * reads**. Two self-contained checkpoints, not one shared one.
     */
    protected soilMoisture(): number | null {
      return null;
    }

    /**
     * The MEAN moisture across the window being integrated — what the
     * reconcile loop should use, since it is closing a whole window at
     * once. Defaults to the instantaneous read.
     */
    protected meanSoilMoisture(): number | null {
      return this.soilMoisture();
    }

    /**
     * The nutrient fraction of the ground, or `null` when the ground
     * declares none. Default `null` → `satNutrient` is 1, so **a pot is
     * unchanged**: a houseplant is never nutrient-limited because a pot
     * authors no nitrogen reserve.
     */
    protected nutrientLevel(): number | null {
      return null;
    }

    /**
     * Pour `litres` into the ground this plant is rooted in; returns what
     * was absorbed. Default 0 — nothing is holding water for an unrooted
     * plant. The concrete host overrides to credit its bed.
     */
    protected waterTheSoil(litres: number): number {
      void litres;
      return 0;
    }

    /**
     * Witness for a fresh flowering latch whose episode has not yet set a
     * seed. The concrete host overrides to mint one (async, fire-and-
     * forget — the reconcile is sync). Default no-op.
     */
    protected onFloweringLatched(): void {
      /* host hook */
    }

    /**
     * Sample the lux where this host sits: climb the containment chain
     * past open containers and read the room's light; a sealed-closed
     * container is an honest dark (only its own interior light counts).
     * Protected so the host's move hook can re-sample; 0 on any failure
     * (pre-boot, no perception substrate — the dark default).
     */
    protected sampleLux(): number {
      try {
        const self = this as unknown as Stuff;
        if (!MixinApi.isContainable(self)) return 0;
        let env: Stuff | null = self.getContainer();
        if (!env) return 0;
        for (let hops = 0; hops < MAX_LIGHT_HOPS; hops++) {
          if (MixinApi.isSealable(env) && !env.isOpen()) {
            return this.luxAt(env);
          }
          // ⭐ A PLACE is where the light is (cover build). The climb went
          // on past a field into the warren or zone that holds it — a
          // container with no light — and every crop in a field starved
          // of light in a summer noon. `instanceof Place`: the question
          // is "is this the world or the inside of something" (the
          // `WaterActivity` / `Display` precedent).
          if (env instanceof Place) return this.luxAt(env);
          const parent: Stuff | null = MixinApi.isContainable(env)
            ? env.getContainer()
            : null;
          if (!parent) return this.luxAt(env);
          env = parent;
        }
        return this.luxAt(env);
      } catch {
        return 0;
      }
    }

    // ---------- private machinery ----------

    /**
     * ⭐⭐ **How bright this place GETS, not what it is doing now**
     * (envelope build).
     *
     * A `luxHappyAt` is a claim about a place — *a windowsill suits a
     * peace lily, a corridor does not* — and every profile in the tree
     * was authored when a scope's lux was a constant, so the two
     * readings were the same number. Now a sky-lit scope swings from
     * `pitch-black` to `bright` and back every game day, and `signalAt`
     * would return whatever o'clock this growth window happened to
     * close at: a lily on a sunny windowsill would starve of light
     * because its owner waters it in the evening, which is not a thing
     * sunlight does. `peakSignalAt` reads the day's peak and leaves
     * every lamp alone — a lamp does not have a day.
     */
    private luxAt(loc: Stuff): number {
      if (!MixinApi.isContainer(loc)) return 0;
      const vision = PerceptionApi.modalityByName('vision');
      const light = vision.peakSignalAt(
        loc as Stuff & Container,
      ) as Light | null;
      return light ? light.intensity.rawValue() : 0;
    }

    /**
     * Water satisfaction from a soil-moisture fraction. `null` (unrooted)
     * reads **0**: husbandry.md already said an unpotted plant "is
     * already in trouble via water, since nothing can hold moisture for
     * it" — since phase 2 that sentence is the mechanism rather than a
     * gloss, because there is no private reserve to fall back on.
     */
    private satWater(fraction: number | null): number {
      const profile = this.profile;
      if (!profile) return 1;
      if (fraction === null) return 0;
      return ramp(fraction, profile.moistureWiltAt, profile.moistureHappyAt);
    }

    /**
     * Nutrient satisfaction — the fourth limiting factor, and the one a
     * houseplant never sees: a pot authors no nitrogen reserve, so the
     * seam reads `null` and this returns 1. Only ground that declares
     * nutrient can be limited by it.
     */
    private satNutrient(): number {
      const level = this.nutrientLevel();
      if (level === null) return 1;
      return ramp(
        level,
        dial(AppSettingKeys.husbandryNutrientSpentAt, 0.05),
        dial(AppSettingKeys.husbandryNutrientHappyAt, 0.5),
      );
    }

    private satLight(lux: number): number {
      const profile = this.profile;
      if (!profile) return 1;
      return ramp(lux, profile.luxDarkAt, profile.luxHappyAt);
    }

    /**
     * Root satisfaction — one curve, two behaviours: the ratio of soil
     * volume to the current stage's demand, **floored** at
     * `husbandry.rootFloor` (a pot-bound plant holds at a visible band and
     * never dies of it) and — because the floor sits below
     * `husbandry.goodAt` — stalling maturity, with no special-casing.
     * Unpotted (`rootRoom()` null) reads 1: not being in a pot is not a
     * root constraint.
     */
    private satRoot(): number {
      const profile = this.profile;
      if (!profile) return 1;
      const volume = this.rootRoom();
      if (volume === null) return 1;
      const demand = profile.rootDemand[this.currentStage()];
      if (!Number.isFinite(demand) || demand <= 0) return 1;
      const floor = dial(AppSettingKeys.husbandryRootFloor, 0.4);
      const ratio = volume / demand;
      return ratio >= 1 ? 1 : Math.max(ratio, floor);
    }

    private currentStage(): GrowthStage {
      return GROWTH_STAGES.includes(this.growthStage as GrowthStage)
        ? (this.growthStage as GrowthStage)
        : 'seedling';
    }

    /** Advance the stage on maturity thresholds; true when it moved. */
    private advanceStage(): boolean {
      const profile = this.profile;
      if (!profile) return false;
      const goodDays = this._maturity / SECONDS_PER_GAME_DAY;
      const idx = GROWTH_STAGES.indexOf(this.currentStage());
      let advanced = false;
      let i = idx;
      while (i < GROWTH_STAGES.length - 1) {
        const next = GROWTH_STAGES[i + 1] as Exclude<GrowthStage, 'seedling'>;
        if (goodDays < profile.daysToStage[next]) break;
        this.growthStage = next;
        advanced = true;
        i++;
      }
      return advanced;
    }

    /**
     * Latch flowering at `mature` in thriving condition; clear it (and the
     * episode's seed mark) when vigor falls back. A fresh latch whose
     * episode has not yet set a seed marks it set and fires the host hook
     * — one seed per flowering episode.
     */
    private updateFlowering(): void {
      const thrivingAt = dial(AppSettingKeys.husbandryBandThrivingAt, 0.8);
      const shouldFlower =
        this.currentStage() === 'mature' && this._vigor >= thrivingAt;
      if (shouldFlower && !this._flowering) {
        this._flowering = true;
        if (!this._seedSet) {
          this._seedSet = true;
          if (this.isPolycarp()) {
            // The episode SETS THE CROP instead of dropping a seed — the
            // yield IS the crop, so `onFloweringLatched` never fires for
            // a polycarp. The cycle window opens here: fill starts at
            // zero and the worst-limiting verdict RE-SEEDS, so a pick
            // grades the cycle that made it (set → harvest), never the
            // tree's whole life. A monocarp never re-seeds — its one
            // crop is its one life.
            this._fruitFill = 0;
            this._worstLimiting = 1;
            // ⭐ THE SET MOMENT. The count is latched here rather than
            // re-read at the pick, because what got set is a fact about
            // this episode and the pick happens weeks later. The
            // pollination fraction starts at whatever the plant manages
            // alone; anything working the bloom raises it while the
            // window is open.
            this._fruitSetCount = Math.floor(this.profile?.fruitSetCount ?? 0);
            this._pollination = clamp01(
              this.profile?.pollinationBaseline ?? 1,
            );
          } else {
            this.onFloweringLatched();
          }
        }
      } else if (!shouldFlower && this._flowering) {
        this._flowering = false;
        // A polycarp's SET crop survives the dip — the window stays open
        // precisely so the bad stretch grades the crop. Only a monocarp's
        // episode mark clears (re-arming the one-seed latch).
        if (!this.isPolycarp()) this._seedSet = false;
      }
    }

    /**
     * Advance the set crop toward ripe at the limiting rate. Only while a
     * polycarp's window is open; clamped at 1 (over-ripe is a documented
     * seam on the profile, not a mechanic).
     */
    private accrueFruitFill(limiting: number, dt: number): void {
      if (!this._seedSet || !this.isPolycarp()) return;
      if (this._fruitFill >= 1) return;
      const fillDays = this.profile?.fruitFillDays ?? 0;
      if (fillDays <= 0) return;
      this._fruitFill = Math.min(
        1,
        this._fruitFill + (limiting * dt) / (fillDays * SECONDS_PER_GAME_DAY),
      );
    }

    /**
     * Death latches on the vigor *crossing* (exponential relaxation never
     * reaches zero on its own): vigor pins to exactly 0 and, when the host
     * is an Organism, `lifecycleState` goes `'dead'`. Terminal —
     * `reconcileGrowth` no-ops and `waterPlant` does not revive.
     */
    private latchDead(): void {
      this._vigor = 0;
      this._flowering = false;
      this._seedSet = false;
      this._fruitFill = 0; // death zeroes the cycle — nothing to pick
      this._fruitSetCount = 0;
      this._pollination = 1;
      const self = this as unknown as Stuff;
      if (MixinApi.isOrganism(self)) self.setLifecycleState('dead');
    }

    /** Terminal-state read: the Organism lifecycle when composed, else the
     * pinned-zero vigor latch. */
    private isGrowthDead(): boolean {
      const self = this as unknown as Stuff;
      if (MixinApi.isOrganism(self)) return self.isDead();
      return this._vigor <= 0 && this.growthClockStamp !== 0;
    }


    /**
     * The evaporative multiplier on this plant's own drink at game-second
     * `atS` — the soil's warmth shape (`1 + (K − ref) × factor`, floored at
     * 0.1) read off the ambient THEN, so a walked window follows the
     * season. `1` while the ambient is unresolved: unmodelled is not cold.
     * Read by a host that keeps water of its own (a labeled plant's root
     * zone, field population D6).
     */
    protected transpirationWarmthAt(atS: number): number {
      const k = this.ambientAt(atS);
      if (k < 0) return 1;
      const reference = dial(AppSettingKeys.husbandryWarmthReferenceK, 295);
      const factor = dial(AppSettingKeys.husbandryWarmthFactor, 0.03);
      return Math.max(0.1, 1 + (k - reference) * factor);
    }

    /** Game-seconds now, or `null` when no world clock (pre-boot / tests). */
    protected growthNowSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      return WorldClockApi.getNow().rawValue();
    }
  };
}

/**
 * The climate's mean over the day around `atS` — four samples six hours
 * apart — so a step reads the season, never the hour it happens to land
 * on (a 12-hour step lands on the same hours every day).
 */
function dailyMeanClimate(site: ClimateSite, atS: number): number {
  let sum = 0;
  for (const h of [-9, -3, 3, 9]) {
    sum += WeatherApi.climateAt(site, Quantity.of(atS + h * 3_600, 's')).rawValue();
  }
  return sum / 4;
}
