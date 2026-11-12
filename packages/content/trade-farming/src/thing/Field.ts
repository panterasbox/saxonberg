/**
 * Field — **what you plant: a named part of a tract, with soil, grass and a
 * history of its own** (field population D2; promoted by the tracts build,
 * D24).
 *
 * The top end of the upper bench is thin, stony and dries first; the lane
 * end is deep and holds its water. Before this build a tract had ONE
 * soil, so the whole bench read as one average and nobody could see the
 * top end failing. A field is that part made real: it composes the
 * kernel's `SoilMixin` whole — its own reserves (sized from its area and
 * its leaned sample), its own reconcile, its own rain edge (catchment =
 * its area), its own draw — so nothing in the soil model is written
 * twice. The tract becomes the AGGREGATE: every soil read of a divided
 * tract is the area-weighted answer over its fields (the kernel's parts
 * protocol, `Soil.soilParts`).
 *
 * ## What it is, and what it is not
 *
 *  - **A fixture of the tract** — the `Floor` shape: minted by
 *    `Tract.ensureFields` at `onCreate` (get-or-create at slot
 *    `field:<key>`), never loose contents, never carried (the
 *    Adornment-not-portable invariant fires at `ContainmentApi.move`),
 *    targetable by its name (`look at the top end`) because a fixture is a
 *    peer candidate. ⭐ It keeps its OWN record (tracts build D26), keyed
 *    `<tract key>/<field key>` — reserves, soil and sward stamps, the crop
 *    stamps and the grazing ledger — which the tract's capture walks
 *    (`dependentPersistables`) and its unmarking deletes.
 *  - ⭐ **The grass is the field's** (tracts build D24, D34): a herd
 *    grazes a field, a crop shades one field's sward and not its
 *    neighbor's, and the nitrogen dung puts back lands where the herd
 *    stood. Feeders stand on the tract and feed any field's herd.
 *  - ⛔ **Not a `Location`** — you do not walk to the top end.
 *  - ⛔ **Not a `Container`** — nothing is inside it. Its crops stand in
 *    the tract's contents and root in it by key (`Growing.groundPart`).
 *
 * Composition: `SwardMixin(CharacteredSoilMixin(SoilMixin(ReservedMixin(
 * AdornmentMixin(VisibleMixin(Thing))))))` over the kernel's substrate
 * `Thing` (the `Floor` precedent). `SwardMixin` on a fixture claims only
 * that *a thing that is not a place may carry grass* — true of exactly
 * this one.
 *
 * See docs/subsystems/soil.md § Tracts and fields.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { VisibleMixin } from '@saxonberg/server/mud/lib/description/Visible';
import { AdornmentMixin } from '@saxonberg/server/mud/lib/boundary/Adornment';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve/Reserved';
import { SoilMixin } from '@saxonberg/server/mud/lib/husbandry/Soil';
import type { Growing } from '@saxonberg/server/mud/lib/husbandry/Growing';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import GroundCharacter, {
  TEXTURE_MATERIALS,
  type GroundLean,
  type GroundSample,
} from '@saxonberg/content-ground/src/idea/GroundCharacter';
import {
  CharacteredSoilMixin,
  CROP_TRANSPIRATION_L_PER_M2_DAY,
} from '../lib/CharacteredSoil';
import { SwardMixin, SWARD_RESIDUAL_FRACTION, SWARD_RESERVE_KEY } from '../lib/Sward';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { Reserve } from '@saxonberg/server/mud/lib/reserve/Reserved';
import {
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
  SOIL_ORGANIC_MATTER_RESERVE_KEY,
  SOIL_STRUCTURE_RESERVE_KEY,
} from '@saxonberg/server/mud/lib/husbandry/Soil';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { ActAnswer, ActDone, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import HayBale from './HayBale';
import Tract, { type FieldSpec } from '../location/Tract';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import { MaterialApi } from '@saxonberg/server/mud/api/material';

/** A part's water against the tract's is held within this band (D14). */
const DEPTH_FACTOR_MIN = 0.2;
const DEPTH_FACTOR_MAX = 2;

const SECONDS_PER_GAME_DAY = 86_400;

/** The soil reserves a field carries from, and folds back into, its tract. */
const SOIL_FRACTION_KEYS = [
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
  SOIL_ORGANIC_MATTER_RESERVE_KEY,
  SOIL_STRUCTURE_RESERVE_KEY,
] as const;

/**
 * Game-days a ploughed seedbed stays fit to sow (cover build D4) — about
 * a season. Past it the sward has crept back and the ground wants
 * ploughing again.
 */
const SEEDBED_DAYS = 90;

/**
 * Percentage points of organic matter one kilogram per square metre of
 * sward adds when it is ploughed under (cover build D4): a full sward
 * (0.3 kg/m²) turned in is about one point — the green manure that
 * feeds the next crop, and why breaking a ley grows a good first crop.
 */
const OM_PER_KG_PER_M2_TURNED = 3;

/**
 * Percentage points of organic matter a kilogram of eaten dry matter
 * returns to the field as dung.
 *
 * ⭐ Most of what a ruminant eats comes straight back out — the
 * retention is single digits — which is exactly why grazing cycles
 * fertility in place and why the mouths are what fertility follows.
 */
const MANURE_OM_PER_KG_EATEN = 0.35;

/**
 * Percentage points of nitrogen a fully clover-dominant sward fixes per
 * GAME day (D89).
 *
 * ⭐⭐ **Derived from the historical fact rather than tuned to a target**:
 * *a clover ley fixes about as much nitrogen in a season as a cereal
 * crop takes off, and a bit more.* That surplus is the entire reason the
 * four-course displaced the fallow year, and it is why yields ROSE
 * rather than merely held.
 *
 * The arithmetic: a cereal course draws 18 points here, a season of ley
 * runs ~90 game days, and *a bit more than one cereal* is ~24 points —
 * so 24 / 90 ≈ 0.27. ⚠ Setting it any lower makes the rotation run the
 * ground down, which the control case in `rotation.test.ts` asserts is
 * what happens WITHOUT the ley; setting it higher would make fertility
 * free.
 */
const N_FIXED_PER_GAME_DAY = 0.27;

/**
 * Kelvin below which clover simply is not in flower — well above the
 * grass base, because grass grows in cold a bloom will not open in.
 */
const BLOOM_MIN_K = 285;
/** Day length below which the bloom is over (or has not started). */
const BLOOM_MIN_DAYLIGHT = 0.45;

/**
 * ⭐ One herd's line in a field's grazing ledger (cover build D8; on the
 * field since the tracts build, D34): what it wants, what vessels it will
 * eat from, and what it has been given since it came onto the field. A
 * PLAIN object, never a `Map` (a Map field has no BSON shape).
 */
export interface GrazerEntry {
  /** How the herd reads in `look` — *six head of the college herd*. */
  label: string;
  /** Kilograms of dry matter the herd wants a game day. */
  demandKgPerDay: number;
  /** The feeder kinds its species eats from (`trough`, `hopper`…). */
  feederKinds: string[];
  /** Kilograms it was given (grass + hay) since `since`. */
  fedKg: number;
  /** Kilograms it wanted since `since`. */
  demandKg: number;
  /** Game-seconds the window opened. */
  since: number;
}

/**
 * ⭐ What `look at the top end` reads: the ground's own look phrase, the
 * crop rooted here read at the VIEWER's band, then any plant somebody has
 * labeled here. Sync and pure — an augmenter only reads.
 */
function fieldAugmenter(text: string, host: Stuff, viewer: Stuff): string {
  if (!(host instanceof Field)) return text;
  const lines = host.fieldLines(viewer);
  if (lines.length === 0) return text;
  const block = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${block}` : block;
}

// The soil half composed separately: inference through this many nested
// generic mixin factories in one expression collapses (the `Tract`
// precedent).
const FieldGround = SoilMixin(ReservedMixin(AdornmentMixin(VisibleMixin(Thing))));
// ⭐ `PersistableMixin` outermost (tracts build D26): a field keeps its OWN
// `(scope, key)` record, keyed under its tract, so a field marked at
// runtime survives a restart and dies with its unmarking.
const FieldBase = PersistableMixin(SwardMixin(CharacteredSoilMixin(FieldGround)));

export default class Field extends FieldBase {
  /** The ground, the crop on it, the grass and the herds, in words. */
  static markupAugmenters: MarkupAugmenter[] = [fieldAugmenter];

  /**
   * ⚠ Every piece of state the field keeps is `runtimeState`: a fixture's
   * state rides its tract's record only for `persistent && runtimeState`
   * fields (`Adornable`'s fixtures slice), so a stamp marked `persistent`
   * alone would come back zero on a restart.
   */
  static fieldMeta: FieldMeta = {
    fieldKey: { persistent: true, authorable: true },
    lean: { persistent: true, authorable: true },
    legumeFraction: { persistent: true, runtimeState: true },
    seedbedStamp: { persistent: true, runtimeState: true },
    stubbleStamp: { persistent: true, runtimeState: true },
    grazers: { persistent: true, runtimeState: true },
    swardStamp: { persistent: true, runtimeState: true },
    swardGrazedKg: { persistent: true, runtimeState: true },
  };

  /**
   * ⭐ The key a crop binds by (`groundPart: top-end`) — stable; the name
   * may change. Set by the tract from its spec.
   */
  public fieldKey = '';

  /** The nudge this part makes to the tract's sample, or `null`. */
  public lean: GroundLean | null = null;

  /**
   * ⭐ **What fraction of this field's sward is clover** (D43) — the one
   * plant that is simultaneously the legume that fixes nitrogen, among the
   * best forage there is, and the classic bee plant. Taken from the spec,
   * else from the tract's authored clover share.
   */
  public legumeFraction = 0;

  /**
   * ⭐ **Who grazes this field** (cover build D8, tracts build D34), by
   * herd id. Ranching writes it through `setGrazer`/`clearGrazer`; the
   * field keeps each line's fed window inside its own sward integral. The
   * field never searches for a herd — the herd's move wrote itself here.
   */
  public grazers: Record<string, GrazerEntry> = {};

  /**
   * Game-seconds the sward was last turned under for a seedbed; `0` =
   * never ploughed for a crop (cover build D4).
   */
  public seedbedStamp = 0;

  /**
   * Game-seconds the last crop ended (cut down or grubbed out), `0` when
   * none has — what lets the field read *stubble* rather than bare grass.
   * Cleared by the next ploughing.
   */
  public stubbleStamp = 0;

  public getFieldKey(): string {
    return this.fieldKey;
  }

  public getLean(): GroundLean | null {
    return this.lean;
  }

  public getLegumeFraction(): number {
    return this.legumeFraction;
  }

  public setLegumeFraction(value: number): void {
    this.legumeFraction = value < 0 ? 0 : value > 1 ? 1 : value;
  }

  /** The tract this field is a part of, or `null` when unattached. */
  public getTract(): Tract | null {
    const host = this.getAdornedTo();
    return host instanceof Tract ? host : null;
  }

  // ---------- the parts protocol (kernel hooks) ----------

  /** A crop standing in the tract binds to this part by this key. */
  public override soilPartKey(): string {
    return this.fieldKey;
  }

  /** How deep the topsoil runs here — the roots read it. */
  public override soilDepthM(): number | null {
    return this.lastSample?.topsoilM ?? null;
  }

  // ---------- the soil hooks a field answers as part of its tract ----------

  /**
   * ⭐ **A field catches the tract's sky.** A fixture is in nobody's
   * contents, so the default (ask the container) would leave it under no
   * sky at all; the tract IS the place it is part of.
   */
  protected override watershedScope(): (Stuff & Container) | null {
    const tract = this.getTract();
    return tract && MixinApi.isContainer(tract as unknown as Stuff)
      ? (tract as unknown as Stuff & Container)
      : null;
  }

  /**
   * What drinks this field: the crops rooted in it, per square metre still
   * standing, and its own grass.
   */
  public override soilWaterDemandPerGameDay(): number {
    const crops = this.cropsOn().reduce(
      (n, c) => n + c.standingAreaM2() * CROP_TRANSPIRATION_L_PER_M2_DAY,
      0,
    );
    return crops + this.swardTranspirationPerGameDay();
  }

  /** The draw follows the tract's season (it reads the tract's sky). */
  public override soilDrawFactor(fromS: number, toS: number): number {
    const tract = this.getTract();
    return tract ? tract.soilDrawFactor(fromS, toS) : super.soilDrawFactor(fromS, toS);
  }

  /**
   * ⭐ **Whose the crop is, is the tract's question** (W0 hand-off): the
   * harvest asks the crop's bed, and on a marked tract that is this
   * field — so a stranger's cut on the bench is still the farm's.
   */
  public override async ensureCropTitle(): Promise<void> {
    await this.getTract()?.ensureCropTitle();
  }

  // ---------- ⭐ the seedbed and the crop (cover build D4–D6) ----------

  /** Whether this field was ploughed within the season. */
  public isSeedbedFresh(): boolean {
    if (this.seedbedStamp <= 0) return false;
    const now = nowSeconds();
    if (now === null) return true;
    return now - this.seedbedStamp < SEEDBED_DAYS * SECONDS_PER_GAME_DAY;
  }

  /**
   * ⭐ The field answers `sow`: a crop of the same kind may always be
   * widened; otherwise this field must have been ploughed this season.
   * The verb refuses a DIFFERENT crop itself.
   */
  public override sowingRefusal(): string | null {
    if (this.cropsOn().length > 0) return null;
    if (this.isSeedbedFresh()) return null;
    return this.seedbedStamp > 0
      ? 'The seedbed has gone back to grass. Plow it again before you sow.'
      : 'This ground has not been plowed for a crop. Plow it first.';
  }

  /**
   * ⭐ **Turn the sward under** (cover build D4): the standing grass goes
   * into this field's ground as organic matter and the seedbed is
   * stamped. What a plough does to a field once its tract is cleared.
   */
  public turnUnder(): void {
    const kg = this.drawSward(this.standingDryMatterKg());
    if (kg > 0 && this.areaM2 > 0) {
      this.addOrganicMatter((kg / this.areaM2) * OM_PER_KG_PER_M2_TURNED);
    }
    this.seedbedStamp = nowSeconds() ?? 1;
    this.stubbleStamp = 0;
  }

  /** A crop arrived here — the field was sown. Its tract tells it. */
  public noteCropArrived(): void {
    this.stubbleStamp = 0;
  }

  /** A crop left — cut down or grubbed out — and leaves stubble. */
  public noteCropRemoved(): void {
    this.stubbleStamp = nowSeconds() ?? 1;
  }

  // ---------- configured by its tract ----------

  /**
   * Take a spec's identity and area: the name it reads by (a leading
   * *the* is the register, not the stem), the words it answers to, the
   * lean, the clover, the description. Re-run on every wake, so an
   * edited row reaches a booted world.
   */
  public configureField(spec: FieldSpec, areaM2: number, legumeFraction = 0): void {
    this.fieldKey = spec.key;
    this.lean = spec.lean ?? null;
    this.setAreaM2(areaM2);
    this.setLegumeFraction(spec.legumeFraction ?? legumeFraction);
    const stem = spec.name.trim().replace(/^the\s+/i, '') || spec.key.replace(/-/g, ' ');
    this.setShortDescription(stem);
    this.setRegister('definite');
    // ⚠ The AUTHORED list, not `getKeywords()`: that one also folds in
    // what is DERIVED (detail ids, what the soil holds), which must not be
    // baked into the stored keywords on every wake.
    this.setKeywords([
      ...this.keywords,
      stem,
      ...stem.split(/\s+/),
      spec.key,
      ...(spec.keywords ?? []),
    ]);
    if (spec.description) this.setLongDescription(spec.description);
  }

  /**
   * Size this part's soil from its own sample (the tract's, nudged by its
   * lean) against the tract's: ⭐ a part whose topsoil runs a third as deep
   * holds a third of the water per square metre (D14). The material is
   * what the sample says the ground is. Then its grass, at `swardStart`
   * of its ceiling (a kept pasture's good cover, or the residual of
   * ground just marked).
   */
  public installFromTract(
    sample: GroundSample,
    tractSample: GroundSample,
    swardStart: number = SWARD_RESIDUAL_FRACTION,
  ): void {
    this.lastSample = sample;
    const ratio =
      tractSample.topsoilM > 0 ? sample.topsoilM / tractSample.topsoilM : 1;
    const depthFactor = Math.min(
      DEPTH_FACTOR_MAX,
      Math.max(DEPTH_FACTOR_MIN, Number.isFinite(ratio) ? ratio : 1),
    );
    this.installSoilReserves(sample, depthFactor);
    this.installSward(swardStart);
    // Loaded by the async parent that marked the field (`Tract.ensureFields`).
    this.setMaterial(MaterialApi.materials().need(TEXTURE_MATERIALS[sample.texture]));
    this.settleSoilPlacement();
  }

  /**
   * ⭐ Change size keeping every fraction (tracts build D27): a field's
   * line moved. The soil's litres and the grass's kilos scale with the
   * ground; the per-cent reserves are fractions already.
   */
  public resizeTo(areaM2: number): void {
    const before = this.areaM2;
    this.setAreaM2(areaM2);
    if (!(before > 0) || !(areaM2 > 0)) return;
    const ratio = areaM2 / before;
    this.resizeSoilReserves(ratio);
    const sward = this.getReserve(SWARD_RESERVE_KEY);
    if (sward) {
      this.setReserve(
        new Reserve(
          SWARD_RESERVE_KEY,
          Quantity.of(sward.capacity.rawValue() * ratio, 'kg'),
          Quantity.of(sward.current.rawValue() * ratio, 'kg'),
          'cultivation',
          null,
        ),
      );
    }
  }

  /**
   * ⭐ A field marked on ground that already had a history takes that
   * history with it (tracts build D29): its soil starts at the fractions
   * the tract's unmarked ground stood at, never fresh.
   */
  public adoptSoilOf(fractionOf: (key: string) => number | null): void {
    for (const key of SOIL_FRACTION_KEYS) {
      const f = fractionOf(key);
      if (f !== null) this.setSoilReserveFraction(key, f);
    }
  }

  // ---------- reads ----------

  /** The area crops standing in the tract rooted in this part. */
  public cropsOn(): (Stuff & Growing)[] {
    return this.plantsOn().filter((c) => c.isAreaCrop());
  }

  /** Square metres the crops here stand over (sown, cut or not). */
  public cropAreaM2(): number {
    const sown = this.cropsOn().reduce((n, c) => n + c.getSownAreaM2(), 0);
    return Math.min(this.areaM2, sown);
  }

  /** Every growing thing in the tract rooted in this part. */
  private plantsOn(): (Stuff & Growing)[] {
    const tract = this.getTract();
    if (!tract) return [];
    const out: (Stuff & Growing)[] = [];
    for (const c of tract.getContents()) {
      if (MixinApi.isGrowing(c) && c.getBed() === (this as unknown as Stuff)) {
        out.push(c);
      }
    }
    return out;
  }

  /**
   * ⭐⭐ **How much of this sward is in flower** — the read a hive makes
   * of the land around it (apiculture D6): the clover share, times the
   * standing sward, in the bloom season the tract's sky says it is.
   * ⚠ An unresolved season (`-1`) reads as NOT limited.
   */
  public inFlowerFraction(): number {
    if (this.legumeFraction <= 0) return 0;
    const tract = this.getTract();
    const ambientK = tract ? tract.ambientKAt() : -1;
    const daylight = tract ? tract.daylightFractionAt() : -1;
    const warmEnough = ambientK < 0 || ambientK >= BLOOM_MIN_K;
    const lightEnough = daylight < 0 || daylight >= BLOOM_MIN_DAYLIGHT;
    if (!warmEnough || !lightEnough) return 0;
    return this.legumeFraction * this.swardFraction();
  }

  // ---------- the hooks the sward asks of its host ----------

  /** Every square metre of the field is sward, until a crop is sown on it. */
  public override swardAreaM2(): number {
    return Math.max(0, this.areaM2 - this.cropAreaM2());
  }

  /**
   * ⭐⭐ **The limiting factor — a MINIMUM, never a product**: this
   * field's own water and nitrogen, and the tract's warmth and daylength
   * at the moment asked (the season is the place's, the soil is the
   * field's).
   */
  public override swardGrowthFactor(atS?: number): number {
    const factors: number[] = [];
    const moisture = this.soilMoistureFraction();
    if (moisture !== null) factors.push(clampUnit(moisture / 0.35));
    const nitrogen = this.nutrientFraction();
    if (nitrogen !== null) factors.push(clampUnit(0.25 + nitrogen * 1.5));
    const season = this.getTract()?.seasonGrowthFactor(atS);
    if (season !== undefined && season !== null) factors.push(season);
    return factors.length === 0 ? 1 : Math.min(...factors);
  }

  /**
   * ⭐ **Whether the mouth is standing here**: the herds whose moves wrote
   * themselves onto this field. ⚠ A pure read of authored demand. (Loose
   * grazing in the tract was retired at controllers-are-io D7a — it read a
   * method no animal defines.)
   */
  public override swardGrazingDemandPerGameDay(): number {
    let demand = 0;
    for (const e of Object.values(this.grazers)) demand += e.demandKgPerDay;
    return demand;
  }

  /**
   * ⭐⭐ **The ledger, closed, in four lines**: the mouths put back most of
   * what they ate as organic matter, the clover fixes nitrogen out of the
   * air, and hooves on wet ground destroy structure. Rain takes nitrate
   * away on the soil's own rain edge, and harvest at the scythe.
   */
  public override onSwardIntegrated(
    dryMatterEatenKg: number,
    days: number,
    fedKg = 0,
  ): void {
    this.apportionGrazers(dryMatterEatenKg + fedKg, days);
    if (dryMatterEatenKg > 0) {
      this.cycleGrazedNitrogen(dryMatterEatenKg);
      this.poachByOccupants(dryMatterEatenKg * 0.02);
    }
    this.fixLegumeNitrogen(days);
  }

  /**
   * ⭐ **The trough feeds what the grass did not** (D11): every feeder
   * standing on the TRACT whose kind a grazer here eats from, drawn by
   * mass — a trough by the gate feeds any field's herd, first come first
   * served (tracts build D34).
   */
  public override swardShortfallFed(kgNeeded: number): number {
    if (!(kgNeeded > 0)) return 0;
    const kinds = this.grazerFeederKinds();
    const tract = this.getTract();
    if (kinds.size === 0 || !tract) return 0;
    let left = kgNeeded;
    for (const thing of tract.getContents()) {
      if (left <= 0) break;
      if (!MixinApi.isFeeder(thing) || thing.isDestroyed()) continue;
      if (!kinds.has(thing.getFeederKind())) continue;
      left -= thing.drawFodder(left);
    }
    return kgNeeded - left;
  }

  // ---------- ⭐ the grazing ledger (cover build D8, D11) ----------

  /** Put a herd on this field, or replace its line. Opens a fresh window. */
  public setGrazer(herdId: string, entry: Omit<GrazerEntry, 'fedKg' | 'demandKg' | 'since'>): void {
    // Settle the window the herd is joining, so it is not billed for it —
    // and the tract's upkeep window, which was kept or not by who was on it.
    this.reconcileSward();
    this.getTract()?.reconcileImprovement();
    const now = nowSeconds() ?? 0;
    this.grazers = {
      ...this.grazers,
      [herdId]: {
        label: entry.label,
        demandKgPerDay: Math.max(0, entry.demandKgPerDay),
        feederKinds: [...entry.feederKinds],
        fedKg: 0,
        demandKg: 0,
        since: now,
      },
    };
  }

  /** Take a herd off this field. Returns its closed line, or `null`. */
  public clearGrazer(herdId: string): GrazerEntry | null {
    this.reconcileSward();
    this.getTract()?.reconcileImprovement();
    const entry = this.grazers[herdId];
    if (!entry) return null;
    const rest = { ...this.grazers };
    delete rest[herdId];
    this.grazers = rest;
    return { ...entry, feederKinds: [...entry.feederKinds] };
  }

  /**
   * A herd's line, reconciled — what it has been fed since it came on.
   * `null` when the herd is not on this field.
   */
  public grazerLedger(herdId: string): GrazerEntry | null {
    this.reconcileSward();
    const entry = this.grazers[herdId];
    return entry ? { ...entry, feederKinds: [...entry.feederKinds] } : null;
  }

  /**
   * Close a herd's window and open a fresh one: returns the fraction it
   * was fed over the window just closed (1 when it wanted nothing), and
   * the window's length in game-days.
   */
  public foldGrazer(herdId: string): { fraction: number; days: number } | null {
    this.reconcileSward();
    const entry = this.grazers[herdId];
    if (!entry) return null;
    const now = nowSeconds() ?? entry.since;
    const days = Math.max(0, (now - entry.since) / SECONDS_PER_GAME_DAY);
    const fraction = entry.demandKg > 0 ? Math.min(1, entry.fedKg / entry.demandKg) : 1;
    this.grazers = {
      ...this.grazers,
      [herdId]: { ...entry, fedKg: 0, demandKg: 0, since: now },
    };
    return { fraction, days };
  }

  /** The herds on this field, by id. */
  public grazerIds(): string[] {
    return Object.keys(this.grazers);
  }

  /** The feeder kinds any grazer here eats from. */
  private grazerFeederKinds(): Set<string> {
    const kinds = new Set<string>();
    for (const e of Object.values(this.grazers)) {
      for (const k of e.feederKinds) kinds.add(k);
    }
    return kinds;
  }

  /**
   * Share what the mouths got (grass + hay) across the herds by their
   * demand, and add the window to each line (D8).
   */
  private apportionGrazers(givenKg: number, days: number): void {
    const entries = Object.entries(this.grazers);
    if (entries.length === 0 || !(days > 0)) return;
    const total = entries.reduce((n, [, e]) => n + e.demandKgPerDay, 0);
    if (!(total > 0)) return;
    const next: Record<string, GrazerEntry> = {};
    for (const [id, e] of entries) {
      const share = e.demandKgPerDay / total;
      next[id] = {
        ...e,
        fedKg: e.fedKg + givenKg * share,
        demandKg: e.demandKg + e.demandKgPerDay * days,
      };
    }
    this.grazers = next;
  }

  // ---------- ⭐⭐ the nitrogen ledger, at BOTH ends ----------

  /**
   * ⭐⭐ **Fertility follows the mouths** (D7, D14): what an animal eats
   * standing on the field goes back onto it as organic matter — dung is
   * not fertilizer, it is what fertilizer slowly comes out of.
   */
  public cycleGrazedNitrogen(dryMatterEatenKg: number): number {
    if (!Number.isFinite(dryMatterEatenKg) || dryMatterEatenKg <= 0) return 0;
    return this.addOrganicMatter(dryMatterEatenKg * MANURE_OM_PER_KG_EATEN);
  }

  /**
   * ⭐ **Legumes fix nitrogen out of the ATMOSPHERE** (D15, D43).
   * ⚠⚠ `legumeFraction` is AUTHORED and nothing writes it yet — the
   * writer belongs to a farming build (grazing pressure against clover
   * recovery).
   */
  public fixLegumeNitrogen(days: number): number {
    if (this.legumeFraction <= 0 || days <= 0) return 0;
    return this.fixNitrogen(this.legumeFraction * N_FIXED_PER_GAME_DAY * days);
  }

  /**
   * ⚠⚠ **Poaching** (D17): hooves on wet clay destroy this field's
   * structure — what makes *"put the herd on the tired field"* a
   * judgement rather than a free move.
   */
  public poachByOccupants(intensity: number): number {
    const sample = this.lastSample;
    if (!sample) return 0;
    return this.poach(intensity, GroundCharacter.poachingFactor(sample.texture));
  }

  // ---------- the look ----------

  /**
   * The field's ground, crop and grass, in words, with no field's name in
   * front: the stubble, a fresh seedbed, or the grass — empty while a crop
   * stands (the crop reads itself). Its tract prefixes these when it
   * has several fields.
   */
  public groundStateLines(): string[] {
    if (this.cropsOn().length > 0) {
      return this.swardAreaM2() >= 1
        ? [`The grass on the rest of it is ${this.swardPhrase()}.`]
        : [];
    }
    if (this.stubbleStamp > 0) {
      const band = this.swardBand();
      return [
        band === 'bare'
          ? 'It is cut down to the stubble.'
          : band === 'grazed-out' || band === 'short'
            ? 'Grass is coming back over the stubble.'
            : `The stubble is lost under the grass, ${this.swardPhrase()}.`,
      ];
    }
    if (this.isSeedbedFresh()) {
      return ['It is ploughed for the season, the furrows waiting for seed.'];
    }
    return this.swardAreaM2() >= 1 ? [`The grass is ${this.swardPhrase()}.`] : [];
  }

  /**
   * Where a herd on this field is, in words: the tract when the field is
   * its whole (*the back paddock*), else *the far side of the home field*.
   */
  public grazingPlacePhrase(): string {
    const tract = this.getTract();
    if (!tract) return this.presentationPhrase().definite();
    const whole = tract.presentationPhrase().definite();
    return tract.getFields().length > 1
      ? `${this.presentationPhrase().definite()} of ${whole}`
      : whole;
  }

  /**
   * `look`'s line per herd on this field: *six head of the college herd
   * are grazing it* — `where` names the field when its tract has several.
   */
  public grazerLines(where = 'it'): string[] {
    const out: string[] = [];
    for (const e of Object.values(this.grazers)) {
      if (e.label) {
        out.push(`${capitalize(e.label)} ${e.label.startsWith('one ') ? 'is' : 'are'} grazing ${where}.`);
      }
    }
    return out;
  }

  /**
   * `look at the top end`'s lines: the ground, then each crop here at the
   * viewer's band, the grass, the herds, then each labeled plant
   * (*"Trial stands here, labeled."*). In words, never numbers.
   */
  public fieldLines(viewer: Stuff | null): string[] {
    const lines: string[] = [];
    if (this.lastSample) {
      lines.push(capitalize(GroundCharacter.lookPhrase(this.lastSample)));
    }
    for (const crop of this.cropsOn()) {
      const band =
        viewer && MixinApi.isAdvancing(viewer)
          ? viewer.competenceBandCached(crop.getDiscipline())
          : CompetenceBand.FLOOR;
      lines.push(
        `${capitalize(crop.getPresentation())} grows here.`,
        ...crop.readLines(band),
      );
    }
    lines.push(...this.groundStateLines(), ...this.grazerLines());
    for (const plant of this.plantsOn()) {
      if (plant.isAreaCrop() || !MixinApi.isLabelled(plant)) continue;
      const label = plant.getLabel();
      if (label) lines.push(`${capitalize(label)} stands here, labeled.`);
    }
    return lines;
  }

  // ---------- ⭐⭐ the cut (controller-liquidity W10) ----------

  /**
   * ⭐⭐ `mow` — **the whole of D7 in one act**, answered by the field.
   * Hay and grazing are the same draw on the same reserve; the one thing
   * a cut does that a mouth does not is EXPORT the nitrogen the crop
   * carried (crude protein = N × 6.25, so the feed value and the soil
   * fertility are one accounting, D14). It cuts to the residual and no
   * further (D9) — a scythe cannot cut below the crowns — and the cut is
   * made up into bales a person can lift, carrying the field's wetness
   * into the barn (D48: the hay fire is decided here).
   */
  public mowPlanFor(actor: Stuff, scythe: Stuff): MowAnswer {
    const ceiling = this.swardCeilingKg();
    const cuttable = this.standingDryMatterKg() - ceiling * SWARD_RESIDUAL_FRACTION;
    if (cuttable <= MIN_CUT_KG) return { ok: false, reason: 'below-residual', facts: { field: this } };
    // A scythe is slow and the swathe is the field's size, not yours.
    const durationMs = Math.round(MOW_BASE_MS + cuttable * MOW_MS_PER_KG);
    return {
      ok: true,
      durationMs,
      effortW: MixinApi.isExerting(actor) ? actor.wattsForFeltCost(MOW_FELT_COST, durationMs / 1000) : 0,
      facts: { scythe },
      onComplete: () => this.cut(actor, cuttable),
    };
  }

  /** The cut lands: the sward drawn, the nitrogen exported, the bales laid down. */
  private async cut(actor: Stuff, cuttable: number): Promise<ActDone<MowDone, MowRefusal>> {
    const taken = this.drawSward(cuttable);
    if (taken <= 0) return { ok: false, reason: 'nothing-cut', facts: { field: this } };
    const nitrogenG = ((taken * HAY_PROTEIN_MG_PER_KG) / 1000) * NITROGEN_PER_PROTEIN;
    const exported = this.drawNutrient(nitrogenG * RESERVE_POINTS_PER_G_N);
    const tract = this.getTract();
    const moisture = this.soilMoistureFraction();
    const bales = Math.max(1, Math.ceil(taken / BALE_KG));
    for (let i = 0; i < bales; i++) {
      const kg = i < bales - 1 ? BALE_KG : taken - BALE_KG * (bales - 1);
      let hay: Stuff | null = null;
      try {
        hay = await StuffApi.clone<Stuff>(HAY_ROW);
      } catch {
        hay = null;
      }
      if (!hay) break;
      // The cut IS the mass. Nobody authors how much hay a field gives.
      if (MixinApi.isTangible(hay)) hay.setMass(Quantity.of(round2(kg), 'kg'));
      if (moisture !== null && hay instanceof HayBale) {
        hay.setBaledMoistureFraction(round2(0.1 + moisture * 0.3));
      }
      if (tract) await ContainmentApi.move(hay as Stuff & Containable, tract as unknown as Stuff & Container);
    }
    // ⭐ Capture the host: the cut sward and the bales on it are the
    // tract's state now.
    if (tract) {
      try {
        await PersistableApi.captureHostOf(tract as unknown as Stuff);
      } catch (err) {
        console.warn('Field: capture after mowing failed:', err);
      }
    }
    await tract?.creditAgriculture(actor, 3);
    return { ok: true, facts: { takenKg: round2(taken), exported: exported > 0 } };
  }
}

/** What a cut of hay comes off the field as. */
const HAY_ROW = '/trade/farming/thing/hay';
/** Hay's crude protein, mg/kg — what the cut carries off the field (D14). */
const HAY_PROTEIN_MG_PER_KG = 120_000;
/** mg of nitrogen per mg of crude protein (N × 6.25). */
const NITROGEN_PER_PROTEIN = 1 / 6.25;
/** Points of the nitrogen reserve one gram of exported N represents. */
const RESERVE_POINTS_PER_G_N = 0.0004;
/** Kilograms in a bale — what one person lifts (cover build D11). */
const BALE_KG = 25;
/** Below this much standing above the residual there is nothing to cut. */
const MIN_CUT_KG = 0.5;
/** The scythe's pace: a fixed start plus the swathe per kilogram. */
const MOW_BASE_MS = 3_000;
const MOW_MS_PER_KG = 400;
/** Felt cost of mowing, percentage points. */
const MOW_FELT_COST = 8;

/** Why a cut is refused — closed; `mow` words each. */
export type MowRefusalReason = 'below-residual' | 'nothing-cut';
export type MowRefusal = ActRefusal<MowRefusalReason, { field: Field }>;
export interface MowBegin {
  scythe: Stuff;
}
export interface MowDone {
  takenKg: number;
  /** The field is the poorer for what was carried off it. */
  exported: boolean;
}
export type MowAnswer = ActAnswer<MowBegin, MowDone, MowRefusal>;

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0]!.toUpperCase() + text.slice(1) : text;
}

function clampUnit(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Game-seconds now, or `null` before the clock exists (pre-boot, tests). */
function nowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}
