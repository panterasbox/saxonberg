/**
 * Field — **a piece of ground you can stand in**, and the thing this
 * game did not have.
 *
 * Cultivation before this build was `PlantPot` and `GardenBed`: a Thing
 * with a bulk interior of soil measured in **litres**. A 1,000 m² lot
 * held a four-plant bed. A field is not a bigger bed — it is a *place*,
 * with the soil under your boots rather than in a box you could pick up
 * if you were strong enough.
 *
 * ## The composition, and why each layer
 *
 * `PersistableMixin(WarrenMemberMixin(SoilMixin(ReservedMixin(
 * Location))))` — `MineRoom`'s stack with soil where the
 * working is, which is not a coincidence: a mine and a farm are the same
 * shape of problem (*ground somebody holds, worked over time, remembered
 * between visits*) and the residences build already made that one
 * substrate.
 *
 *  - **`PersistableMixin`** outermost — the host rule (`cleanupOnDestruct`
 *    must fire before the inner `Container` evacuates). ⚠ Over the
 *    PERMISSIVE `Location`, never the singleton one, because a
 *    field is a KIND of place minted many times. Safe only because every
 *    instance is **keyed** `<holding extent>/<leaf>` — a keyless
 *    persistable over a permissive base would silently share ONE
 *    `holder_snapshots` scope across every field in the world.
 *  - **`WarrenMemberMixin`** — the back-ref to the holding it belongs to.
 *  - **`SoilMixin`** — the kernel's, the same one `GardenBed` composes.
 *    ⭐ *There is exactly one soil checkpoint implementation*, which is
 *    AC 3 and the reason W1 happened first. `pasture is a field` dies the
 *    moment pasture's soil is not farming's soil.
 *  - **`ReservedMixin`** — soil's host constraint, and where the
 *    moisture, nitrogen and (later) sward reserves live.
 *
 * ## ⭐ Why the ground key is not the coordinates
 *
 * A field is a warren member, and a warren member is not on anybody's
 * grid — *a lot's room is NOT on the street's grid*, which is the shipped
 * rule the residences build settled. So every field would sit at
 * `[0, 0, 0]` and every field in the world would sample the same dirt.
 *
 * Instead the field carries {@link Field.groundSpot}, **stamped at plot
 * time from where the plotter was standing**, offset by which field on
 * the holding this is. Two consequences, and the first is the point:
 *
 *  - ⭐⭐ **surveying before you commit actually predicts something.** You
 *    walk the lot, take your spadefuls, and the field you then plot on it
 *    carries the ground you surveyed. D3's *"you can survey before you
 *    commit"* is only true if that holds.
 *  - a hand-authored field authors its own spot, so a venue can put its
 *    top meadow on the heavy end of the valley deliberately.
 *
 * ## What it is NOT
 *
 * ⚠ Not a `PersistentLocation` — that class is the four furnishing
 * archetypes' base, and a field is not a room a player puts their goods
 * in. ⚠ And it holds **no plant slot**: a field's crop is not four
 * `Slottable`s in a bed, which is exactly why `CultivableMixin` could not
 * be the vehicle and why W1 split soil out of it.
 *
 * ## ⭐ The crop (cover build)
 *
 * A field holds ONE area crop: a single `Plant` standing loose in its
 * contents with a sown area, rooted in the field's soil by containment
 * (the kernel's `getBed()`). The rest of the field is sward. `plough`
 * turns the sward under and stamps a SEEDBED good for one season; `sow`
 * asks the field (`sowingRefusal`) and the field answers from that
 * stamp. The crop is titled to the business that works the field
 * (`ensureCropTitle`), so whoever cuts it, the sheaf is the holder's.
 *
 * See [docs/subsystems/soil.md] and [docs/subsystems/smallholding.md].
 */

import Location from '@saxonberg/server/mud/platform/location/Location';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { WarrenMemberMixin } from '@saxonberg/server/mud/lib/location/WarrenMember';
import { SoilMixin } from '@saxonberg/server/mud/lib/husbandry/Soil';
import type { Soil } from '@saxonberg/server/mud/lib/husbandry/Soil';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import {
  ImprovableMixin,
  type ImprovementCost,
  type ImprovementJob,
} from '@saxonberg/server/mud/lib/ground/Improvable';
import { SwardMixin, SWARD_RESIDUAL_FRACTION } from '../lib/Sward';
import {
  CharacteredSoilMixin,
  CROP_TRANSPIRATION_L_PER_M2_DAY,
} from '../lib/CharacteredSoil';
import type Patch from '../thing/Patch';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { CelestialApi } from '@saxonberg/server/mud/api/celestial';
import { ZoneApi } from '@saxonberg/server/mud/api/zone';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import type { ClimateSite } from '@saxonberg/server/mud/lib/weather/WeatherType';
import type { CelestialProfile } from '@saxonberg/server/mud/lib/time/CelestialProfile';
import type { Stuff, PresentationView } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { NounPhrase } from '@saxonberg/server/mud/lib/description/NounPhrase';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import GroundCharacter, {
  type GroundLean,
  type GroundSample,
  type Spot,
} from '@saxonberg/content-ground/src/idea/GroundCharacter';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Growing } from '@saxonberg/server/mud/lib/husbandry/Growing';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';

/** What a spadeful of a stony headland leaves standing at the edge. */
const STONE_ROW = '/trade/farming/thing/field-stone';
/** Calcareous clay, dug out of the corner of a sweet field. */
const MARL_ROW = '/trade/farming/thing/marl';
/** Above this stoniness, an act of grubbing turns up stone worth stacking. */
const STONE_THRESHOLD = 0.35;
/** At or above this pH the subsoil is calcareous enough to be marl. */
const MARL_PH = 7.2;

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
 * The base temperature a temperate sward stops growing at, in kelvin
 * (~5 °C).
 *
 * ⭐ Not a dial: it is the base every growing-degree-day sum in agronomy
 * is measured against, which is why grass growth is genuinely over in
 * December and genuinely away in April, and why nobody has to author
 * that it is December.
 */
const GRASS_BASE_K = 278;

/** Kelvin at/above which temperature stops limiting a sward (~18 °C). */
const GRASS_HAPPY_K = 291;

/** Daylength fraction at/below which a temperate sward stops (≈8 h). */
const DAYLIGHT_STOP = 0.33;

/** Daylength fraction at/above which daylength stops limiting (≈13 h). */
const DAYLIGHT_HAPPY = 0.54;

/**
 * Kelvin below which clover simply is not in flower — well above the
 * grass base, because grass grows in cold a bloom will not open in.
 */
const BLOOM_MIN_K = 285;
/** Day length below which the bloom is over (or has not started). */
const BLOOM_MIN_DAYLIGHT = 0.45;

/**
 * ⭐ One herd's line in the field's grazing ledger (cover build D8): what
 * it wants, what vessels it will eat from, and what it has been given
 * since it came onto the field. A PLAIN object, never a `Map` (a Map
 * field has no BSON shape).
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
 * Game-days a ploughed seedbed stays fit to sow (cover build D4) — about
 * a season. Past it the sward has crept back and the ground wants
 * ploughing again.
 */
const SEEDBED_DAYS = 90;

/** The share of its ceiling an authored field's grass starts at. */
const AUTHORED_SWARD_START = 0.8;

const SECONDS_PER_GAME_DAY = 86_400;

/**
 * Percentage points of organic matter one kilogram per square metre of
 * sward adds when it is ploughed under (cover build D4): a full sward
 * (0.3 kg/m²) turned in is about one point — the green manure that
 * feeds the next crop, and why breaking a ley grows a good first crop.
 */
const OM_PER_KG_PER_M2_TURNED = 3;

/**
 * ⭐ The field's own lines in `look` — in words, never numbers: the crop
 * and its stage, the stubble, a fresh seedbed, the grass. Sync and pure:
 * an augmenter only READS (⛔ it never settles a title — that is the
 * acts' job).
 */
function fieldAugmenter(text: string, host: Stuff, viewer: Stuff): string {
  if (!(host instanceof Field)) return text;
  const lines = host.fieldLines(viewer);
  if (lines.length === 0) return text;
  const block = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${block}` : block;
}

// The ground half — composed FIRST and separately, because soil's host
// constraint is `Stuff & Reserved` alone. Naming the intermediate stack
// is not cosmetic: inference through this many nested generic mixin
// factories in one expression collapses to `never`.
// ⭐ `CharacteredSoilMixin` (field population D2): the area and the seeded
// character that size the reserves — shared with the field's patches.
const FieldGround = CharacteredSoilMixin(SoilMixin(ReservedMixin(Location)));

// `ImprovableMixin` is the THIRD axis (D57) — what has been DONE to the
// ground, independent of what the polity permits (`LandUse`) and of what
// the ground is made of (`GroundCharacter`). All three must be satisfied
// and none substitutes for another.
// `SwardMixin` is the STANDING CROP, and it goes over soil because it
// drinks it: the grass transpires the moisture the sky put in, which is
// what closes the loop and what makes a dry month read as a sward that
// stopped growing rather than as a message about rain.
const FieldBase = PersistableMixin(
  WarrenMemberMixin(ImprovableMixin(SwardMixin(FieldGround))),
);

export default class Field extends FieldBase {
  /**
   * ⚠⚠ **`plough` is afforded HERE and nowhere else, and it would have
   * gone silent without this block.**
   *
   * The improvement acts moved to the platform with `ImprovableMixin`, and
   * `plough` went with them in the same list — but ploughing is not
   * improvement, it is farming's own act on a field, so it did not belong
   * in a kernel mixin's contributions. A verb nothing affords parses as
   * *"I don't understand 'plough'"*, and **every controller test would
   * still have passed**: the affordance is a static on a class and nothing
   * type-checks its absence. Two builds in this repo shipped exactly that
   * failure and only found it by driving the world.
   *
   * ⭐ Safe to declare alongside the mixins': `bucketFilenames` collects the
   * class's own static **plus** every mixin in the chain, so this unions
   * with `ImprovableMixin`'s three platform views and `SwardMixin`'s `mow`
   * rather than shadowing them.
   */
  static commandContributions = {
    // `inventory`: a location's occupants hear it (`self` is a giver's).
    inventory: [
      'trade/farming/cmd/farming/plough.yaml',
      // ⭐ A field affords SOWING to whoever stands in it (cover build):
      // the platform view, named here the way `plough` is. A bed affords
      // it through `CultivableMixin`; ground with no slot had nothing.
      'platform/cmd/inventory/plant.yaml',
      // ⭐ And FEEDING (field population): a field's ground — or one of
      // its patches — takes muck from whoever stands in it. `feed` rode
      // only `CultivableMixin` before, so a field afforded nothing.
      'platform/cmd/bulk/feed.yaml',
    ],
  };

  /** The crop, the stubble, the seedbed and the grass, in words. */
  static markupAugmenters: MarkupAugmenter[] = [fieldAugmenter];

  static fieldMeta: FieldMeta = {
    fieldName: { persistent: true, authorable: true },
    groundSpotX: { persistent: true, authorable: true },
    groundSpotY: { persistent: true, authorable: true },
    legumeFraction: { persistent: true, authorable: true },
    _ambientK: { persistent: true, runtimeState: true },
    _daylightFraction: { persistent: true, runtimeState: true },
    seedbedStamp: { persistent: true },
    stubbleStamp: { persistent: true },
    grazers: { persistent: true },
    patches: { persistent: true, authorable: true },
  };

  /**
   * ⭐ **The parts this field is divided into** (field population D2) —
   * the top end, the middle, the lane end. Authored; `[]` = one piece,
   * and a field with none takes today's path on every line. Each spec
   * mints one {@link Patch} fixture at `onCreate` (get-or-create at slot
   * `patch:<key>`); the parts tile the field, the LAST absorbing any
   * difference in area. ⚠ Keys are stable — a crop row binds by key
   * (`groundPart: top-end`); a name may change.
   */
  public patches: PatchSpec[] = [];

  /**
   * ⭐ **Who grazes this field** (cover build D8), by herd id. Ranching
   * writes it through `setGrazer`/`clearGrazer`; the field keeps each
   * line's fed window inside its own sward integral. The field never
   * searches for a herd — the herd's move wrote itself here.
   */
  public grazers: Record<string, GrazerEntry> = {};

  /**
   * Game-seconds the sward was last turned under for a seedbed; `0` =
   * never ploughed for a crop (cover build D4).
   */
  public seedbedStamp = 0;

  /**
   * Game-seconds the last crop ended (cut down or grubbed out), `0` when
   * none has — what lets the field read *stubble* rather than bare
   * grass. Cleared by the next ploughing.
   */
  public stubbleStamp = 0;

  /**
   * ⭐ **D88 — holders name their fields.** Real farms always have: the
   * top meadow, the wet corner, Long Acre. The names carry the ground's
   * history, and they solve reference: *"move them to the top meadow"*
   * rather than *"paddock 7"*.
   */
  public fieldName = '';

  /**
   * The spot on the soil field this ground samples. Stamped at plot
   * time; see the class docstring for why it is not the coordinates.
   *
   * ⚠ Two scalars rather than a tuple, because the applier reflects
   * into fields by name and a two-element array is a shape it would have
   * to be told about. Scalars decompose for free — the `Reserve`
   * precedent.
   */
  public groundSpotX = 0;
  public groundSpotY = 0;

  /**
   * ⭐ **What fraction of the sward is clover** (D43) — the one plant
   * that is simultaneously the legume that fixes nitrogen, among the
   * best forage there is, and the classic bee plant. One row satisfying
   * three decisions without a special case anywhere.
   */
  public legumeFraction = 0;

  /**
   * ⭐⭐ **How much of this sward is in flower** — the read a hive makes
   * of the land around it (apiculture D6).
   *
   * Three terms, and the provenance of each is different, so each is
   * named:
   *
   *   - **`legumeFraction`** — **authored**. Hydrated from the row; see
   *     {@link fixLegumeNitrogen} on why nothing writes it yet.
   *   - **the standing sward** — **derived**, reconciled over game-time
   *     from water, nutrient and the season.
   *   - **the bloom season** — **derived**, from this field's own cached
   *     sky.
   *
   * ⚠ The tri-state rule, twice: an unresolved cache (`-1`) reads as
   * **not limited**, because `restampSeason()` resolves it within the
   * first read cycle and a cache nothing has warmed must never read as a
   * hard zero forever. This codebase has been bitten three times by the
   * other choice.
   *
   * ⭐ The sward knows when it blooms; the hive asks. A pack-local helper
   * reaching into `_ambientK` from outside would break the methods-only
   * inter-Stuff contract, which is why this lives here and not there.
   */
  public inFlowerFraction(): number {
    if (this.legumeFraction <= 0) return 0;
    const ambientK = this.ambientAt();
    const daylight = this.daylightAt();
    const warmEnough = ambientK < 0 || ambientK >= BLOOM_MIN_K;
    const lightEnough = daylight < 0 || daylight >= BLOOM_MIN_DAYLIGHT;
    if (!warmEnough || !lightEnough) return 0;
    return this.legumeFraction * this.swardFraction();
  }

  public getLegumeFraction(): number {
    return this.legumeFraction;
  }

  public setLegumeFraction(value: number): void {
    this.legumeFraction = value < 0 ? 0 : value > 1 ? 1 : value;
  }


  public getFieldName(): string { return this.fieldName; }
  public setFieldName(value: string): void { this.fieldName = value; }

  /** The spot this ground samples on the soil field. */
  public getGroundSpot(): Spot {
    return [this.groundSpotX, this.groundSpotY];
  }

  public setGroundSpot(spot: Spot): void {
    this.groundSpotX = Math.round(spot[0]);
    this.groundSpotY = Math.round(spot[1]);
  }


  // ---------- ⭐ the crop (cover build) ----------

  /** The (first) area crop standing in this field, or `null`. */
  public getCrop(): (Stuff & Growing) | null {
    return this.getCrops()[0] ?? null;
  }

  /**
   * ⭐ Every area crop standing in this field (field population D1): one
   * on a one-piece field, one per sown patch on a divided one.
   */
  public getCrops(): (Stuff & Growing)[] {
    const out: (Stuff & Growing)[] = [];
    for (const c of this.getContents()) {
      if (MixinApi.isGrowing(c) && c.isAreaCrop()) out.push(c);
    }
    return out;
  }

  /** The area crop rooted in `part`, or `null`. */
  public cropOn(part: Stuff & Soil): (Stuff & Growing) | null {
    return this.getCrops().find((c) => c.getBed() === part) ?? null;
  }

  /** Square metres the crops stand over (sown, cut or not). */
  public cropAreaM2(): number {
    const sown = this.getCrops().reduce((n, c) => n + c.getSownAreaM2(), 0);
    return Math.min(this.areaM2, sown);
  }

  // ---------- ⭐ the patches (field population D2) ----------

  /**
   * The patches minted from {@link patches}, in authored order. ⭐ Read
   * off the fixture SLOTS this field minted them into (`patch:<key>`) —
   * the field put them there, so the slot is the record of what they are.
   */
  public getPatches(): (Stuff & Patch)[] {
    const out: (Stuff & Patch)[] = [];
    for (const spec of this.patches) {
      for (const f of this.getFixtures()) {
        if (this.slotOfFixture(f) === patchSlot(spec.key)) {
          out.push(f as unknown as Stuff & Patch);
          break;
        }
      }
    }
    return out;
  }

  /**
   * ⭐ The kernel's parts hook: a divided field's soil IS its patches, so
   * every read and write the kernel's verbs make of the field aggregates
   * over them, and a plant bound by `groundPart` roots in its own.
   */
  public override soilParts(): readonly (Stuff & Soil)[] {
    return this.getPatches();
  }

  /**
   * Mint (or find) one patch per authored spec, sized and characterized
   * from this field's sample and the spec's lean.
   *
   * ⭐ Get-or-create at slot `patch:<key>` — the `ensureFloor` shape — so
   * a re-run (a CMS go-live re-hydrating the field) re-sizes what is there
   * rather than minting a second set, and a restored field's fixtures
   * slice overlays its record onto the patches minted here.
   *
   * ⚠ A failure to mint is warned, never thrown: `onCreate` throwing
   * unregisters the field, and a field that reads as one piece is a
   * degradation where a field that will not boot is not.
   */
  public async ensurePatches(
    model: GroundCharacter | null,
    seed: number,
    fieldSample: GroundSample,
  ): Promise<void> {
    const specs = this.patches.filter((p) => p && typeof p.key === 'string' && p.key);
    if (specs.length === 0) return;
    const areas = patchAreas(specs, this.areaM2);
    for (const [i, spec] of specs.entries()) {
      try {
        let patch = this.patchInSlot(spec.key);
        if (!patch) {
          const minted = await StuffApi.clone<Stuff>(PATCH_ROW);
          if (!MixinApi.isAdornment(minted) || !MixinApi.isSoil(minted)) {
            await StuffApi.destruct(minted);
            throw new Error(`'${PATCH_ROW}' is not a soil fixture`);
          }
          this.addFixture(minted, patchSlot(spec.key));
          patch = minted as unknown as Stuff & Patch;
        }
        patch.configurePatch(spec, areas[i] ?? 0);
        patch.installFromField(
          GroundCharacter.resolve(model, this.getGroundSpot(), seed, spec.lean),
          fieldSample,
        );
      } catch (err) {
        console.warn(
          `Field.ensurePatches: no patch '${spec.key}' for ` +
            `${this.getTemplatePath() ?? this.stuffId} — ` +
            `${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /** The patch in `patch:<key>`, or `null`. */
  private patchInSlot(key: string): (Stuff & Patch) | null {
    for (const f of this.getFixtures()) {
      if (this.slotOfFixture(f) === patchSlot(key)) {
        return f as unknown as Stuff & Patch;
      }
    }
    return null;
  }

  /** Whether the ground was ploughed within the season. */
  public isSeedbedFresh(): boolean {
    if (this.seedbedStamp <= 0) return false;
    const now = fieldNowSeconds();
    if (now === null) return true;
    return now - this.seedbedStamp < SEEDBED_DAYS * SECONDS_PER_GAME_DAY;
  }

  /**
   * ⭐ The ground answers `sow` (the kernel's hook). A crop of the same
   * kind may always be widened; otherwise the ground must have been
   * ploughed this season. The verb refuses a DIFFERENT crop itself.
   */
  public override sowingRefusal(): string | null {
    if (this.getCrops().length > 0) return null;
    if (this.isSeedbedFresh()) return null;
    return this.seedbedStamp > 0
      ? 'The seedbed has gone back to grass. Plough it again before you sow.'
      : 'This ground has not been ploughed for a crop. Plough it first.';
  }

  /**
   * ⭐ **Turn the sward under** (cover build D4): the standing grass goes
   * into the ground as organic matter and the seedbed is stamped. What a
   * plough does to a field after its clearing is done.
   */
  public turnUnder(): void {
    const kg = this.drawSward(this.standingDryMatterKg());
    if (kg > 0 && this.areaM2 > 0) {
      this.addOrganicMatter((kg / this.areaM2) * OM_PER_KG_PER_M2_TURNED);
    }
    const now = fieldNowSeconds();
    this.seedbedStamp = now ?? 1;
    this.stubbleStamp = 0;
  }

  /**
   * ⭐ **Whose the crop is** (cover build D6): the business that works
   * this field, stood up if it has to be. A group cannot hold goods, so
   * *the holder* is realized as the operator; with none, the crop keeps
   * whatever title its arrival gave it (the sower's, or nobody's).
   * ⛔ Called by the acts — sow and harvest — never by a read.
   */
  public override async ensureCropTitle(): Promise<void> {
    await this.settleCropTitle(true);
  }

  private async settleCropTitle(standUp: boolean): Promise<void> {
    // ⭐ Every crop standing here (field population): a divided field's
    // stands are each the holder's.
    const crops = this.getCrops().filter((c) => MixinApi.isChattel(c));
    if (crops.length === 0) return;
    const path = this.getTemplatePath() ?? '';
    const live = EmploymentApi.operatorsAt(this as unknown as Stuff)[0] ?? null;
    const operator =
      live ?? (standUp && path ? await EmploymentApi.ensureOperatorAt(path) : null);
    if (!operator) return;
    const owner = operator.getIdentityPath() ?? '';
    for (const crop of crops) {
      if (crop.isDestroyed() || !MixinApi.isChattel(crop)) continue;
      const stamped = crop.stampedOwner();
      if (stamped && stamped.kind === 'organization' && stamped.templatePath === owner) {
        continue;
      }
      await (stamped
        ? crop.transferChattel(operator)
        : crop.stampChattel(operator));
    }
  }

  /**
   * ⭐ A crop ARRIVING is the field's moment to learn it was sown, and an
   * authored crop's to be titled to the live operator (no house is stood
   * up by an arrival — that is the harvest's act).
   */
  public onContainableAdded(thing: Stuff & Containable): void {
    if (MixinApi.isGrowing(thing) && thing.isAreaCrop()) {
      this.stubbleStamp = 0;
      void this.settleCropTitle(false).catch(() => undefined);
    }
  }

  /** A crop LEAVING — cut down or grubbed out — leaves stubble. */
  public onContainableRemoved(thing: Stuff & Containable): void {
    if (MixinApi.isGrowing(thing) && thing.isAreaCrop()) {
      this.stubbleStamp = fieldNowSeconds() ?? 1;
    }
  }

  /**
   * ⭐ A standing crop is something on the ground to grub out (cover
   * build D5), so clearing reads as not quite done while one stands —
   * the kernel's `grub` refuses only ground with nothing left on it.
   * The crop gone, the ground reads as cleared as it was.
   */
  public override progressOn(job: ImprovementJob, cost: ImprovementCost): number {
    const done = super.progressOn(job, cost);
    // Below the done mark, so `grub` (which refuses complete ground) takes it.
    return job === 'clearing' && this.getCrops().length > 0 ? Math.min(done, 0.9) : done;
  }

  /**
   * ⭐ **A field in use is a field kept** (cover build B35): stock and a
   * standing crop keep the scrub down, so clearing does not revert while a
   * herd grazes it or a crop stands on it. Without this a kept clover ley
   * grazed all winter "had scrub on it yet" by spring and took two
   * clearing ploughs before a seedbed (found walking it in the browser).
   */
  public override improvementReversion(job: ImprovementJob): number {
    if (
      job === 'clearing' &&
      (Object.keys(this.grazers).length > 0 || this.getCrops().length > 0)
    ) {
      return 0;
    }
    return super.improvementReversion(job);
  }

  /**
   * ⭐ **Grubbing ends a crop** (cover build D5): clearing work banked on
   * a field with a crop standing in it takes the crop out first — tired
   * cane is grubbed before it is replanted.
   */
  public override bankWork(
    job: ImprovementJob,
    amount: number,
    cost: ImprovementCost,
  ): number {
    if (job === 'clearing') {
      // Every patch's crop goes (field population): grubbing is the field's.
      for (const crop of this.getCrops()) void StuffApi.destruct(crop);
    }
    return super.bankWork(job, amount, cost);
  }

  /**
   * The field's own lines, in words: the crop and its stage, the
   * stubble, a fresh seedbed, the grass — and, on a divided field, one
   * line per sown patch read at the VIEWER's band (field population D9,
   * D13). ⭐ A pure read.
   */
  public fieldLines(viewer?: Stuff | null): string[] {
    const lines: string[] = [];
    const crops = this.getCrops();
    // The stand reads as ONE thing: the kind, how much of the field it
    // covers in all, and the stage of the crop covering the most ground.
    const crop = crops.reduce<(Stuff & Growing) | null>(
      (big, c) => (big === null || c.standingAreaM2() > big.standingAreaM2() ? c : big),
      null,
    );
    if (crop) {
      const standing = crops.reduce((n, c) => n + c.standingAreaM2(), 0);
      // ⚠ `cropAreaPhrase` reads ITS crop's standing share of the area it
      // is given; scaling the area by that crop's share of all the
      // standing ground makes it read the whole stand's share instead.
      // One crop: the field's own area, unchanged.
      const over =
        crops.length === 1 || !(standing > 0)
          ? this.areaM2
          : (this.areaM2 * crop.standingAreaM2()) / standing;
      const area = crop.cropAreaPhrase(over);
      const name = crop.getPresentation();
      lines.push(
        `${capitalize(name)} grows ${area || 'here'}, ${crop.cropStagePhrase()}.`,
      );
      if (crops.some((c) => c.getSownAreaM2() > c.standingAreaM2() + 1)) {
        lines.push('Part of it is cut, the stubble showing between the rows.');
      }
      if (crops.some((c) => c.isTiredRatoon())) {
        lines.push('The stools are tired, and the stand comes up thin.');
      }
      lines.push(...this.patchLines(viewer ?? null));
    } else if (this.stubbleStamp > 0) {
      const band = this.swardBand();
      lines.push(
        band === 'bare'
          ? 'It is cut down to the stubble.'
          : band === 'grazed-out' || band === 'short'
            ? 'Grass is coming back over the stubble.'
            : `The stubble is lost under the grass, ${this.swardPhrase()}.`,
      );
      lines.push(...this.grazerLines());
      return lines;
    } else if (this.isSeedbedFresh()) {
      lines.push('It is ploughed for the season, the furrows waiting for seed.');
      return lines;
    }
    if (this.swardAreaM2() >= 1) {
      lines.push(
        crop
          ? `The grass on the rest of it is ${this.swardPhrase()}.`
          : `The grass is ${this.swardPhrase()}.`,
      );
    }
    lines.push(...this.grazerLines());
    return lines;
  }

  /**
   * ⭐ One line per sown patch (field population D13): *"At the top end it
   * is in ear and looks poor. It is short of something."* — the crop
   * rooted there, read at the viewer's band (a viewer with no transcript
   * reads the floor). Never a digit; a patch with no crop says nothing.
   */
  private patchLines(viewer: Stuff | null): string[] {
    const out: string[] = [];
    for (const patch of this.getPatches()) {
      for (const crop of this.getCrops()) {
        if (crop.getBed() !== patch) continue;
        const read = crop.readLines(bandOf(viewer, crop.getDiscipline()));
        const [first, ...rest] = read;
        if (!first) continue;
        const at = `At ${patch.presentationPhrase().definite()}`;
        out.push([`${at} ${lowerFirst(first)}`, ...rest].join(' '));
      }
    }
    return out;
  }

  // ---------- ⭐ the grazing ledger (cover build D8, D11) ----------

  /** Put a herd on this field, or replace its line. Opens a fresh window. */
  public setGrazer(herdId: string, entry: Omit<GrazerEntry, 'fedKg' | 'demandKg' | 'since'>): void {
    // Settle the window the herd is joining, so it is not billed for it —
    // and the upkeep window, which was kept or not by who was on it.
    this.reconcileSward();
    this.reconcileImprovement();
    const now = fieldNowSeconds() ?? 0;
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
    this.reconcileImprovement();
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
   * the window's length in game-days. What the record folds into its
   * history.
   */
  public foldGrazer(herdId: string): { fraction: number; days: number } | null {
    this.reconcileSward();
    const entry = this.grazers[herdId];
    if (!entry) return null;
    const now = fieldNowSeconds() ?? entry.since;
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
   * ⭐ **The trough feeds what the grass did not** (D11): every feeder
   * standing on this field whose kind a grazer eats from, drawn by mass —
   * and a feeder kept from a store draws on the store when it is empty.
   */
  public override swardShortfallFed(kgNeeded: number): number {
    if (!(kgNeeded > 0)) return 0;
    const kinds = this.grazerFeederKinds();
    if (kinds.size === 0) return 0;
    let left = kgNeeded;
    for (const thing of this.getContents()) {
      if (left <= 0) break;
      if (!MixinApi.isFeeder(thing) || thing.isDestroyed()) continue;
      if (!kinds.has(thing.getFeederKind())) continue;
      left -= thing.drawFodder(left);
    }
    return kgNeeded - left;
  }

  /** `look`'s line per herd: *six head of the college herd are grazing it*. */
  private grazerLines(): string[] {
    const out: string[] = [];
    for (const e of Object.values(this.grazers)) {
      if (e.label) out.push(`${capitalize(e.label)} ${e.label.startsWith('one ') ? 'is' : 'are'} grazing it.`);
    }
    return out;
  }

  // ---------- the hooks SoilMixin asks of its host ----------
  // (`soilLeachRate`, `soilCatchmentAreaM2` and the reserves' sizing are
  // `CharacteredSoilMixin`'s — shared with the patches.)

  /**
   * ⭐ **A field IS a place, so it is its own watershed scope.** The
   * default asks a container — right for a pot in a room, wrong here:
   * a field's container is the warren, which is not where it is. Asking
   * upward would resolve the holding's locality, which happens to be the
   * same answer today and would stop being the same answer the moment a
   * holding spans two.
   */
  protected override watershedScope(): (Stuff & Container) | null {
    const self = this as unknown as Stuff;
    return MixinApi.isContainer(self) ? (self as unknown as Stuff & Container) : null;
  }

  /**
   * ⭐ **What drinks this soil is the grass standing in it.** The pot and
   * the bed answer with their occupants' summed demand; a field answers
   * with its sward's transpiration, which is the same question asked of a
   * different kind of ground.
   */
  public override soilWaterDemandPerGameDay(): number {
    // ⭐ And a crop standing in it drinks too (cover build) — per square
    // metre still standing. ⚠ Never read on a divided field (it holds no
    // reserve of its own; each patch answers for what stands in it).
    const cropDemand = this.getCrops().reduce(
      (n, c) => n + c.standingAreaM2() * CROP_TRANSPIRATION_L_PER_M2_DAY,
      0,
    );
    return this.swardTranspirationPerGameDay() + cropDemand;
  }

  /**
   * ⭐ **Grass and crop drink by the season** (cover build): the draw is
   * the window's mean evaporative demand — a tenth in the dead of winter,
   * full in summer warmth — read at points across the window, so a
   * winter nobody watched leaves the ground wet for the spring, and a
   * summer drinks like one. With no season known, the shipped one.
   */
  public override soilDrawFactor(fromS: number, toS: number): number {
    if (!this._swardSite || !(toS > fromS)) return super.soilDrawFactor(fromS, toS);
    const samples = 12;
    let sum = 0;
    for (let i = 0; i < samples; i++) {
      const t = fromS + ((i + 0.5) * (toS - fromS)) / samples;
      const k = this.ambientAt(t);
      const warm = k > 0 ? clampUnit((k - GRASS_BASE_K) / (GRASS_HAPPY_K - GRASS_BASE_K)) : 1;
      sum += 0.1 + 0.9 * warm;
    }
    return sum / samples;
  }

  // ---------- the three hooks the sward asks of its host ----------

  /**
   * Every square metre of a field is sward, until something else is
   * sown — ⭐ and then the crop's ground is not (cover build).
   */
  public override swardAreaM2(): number {
    return Math.max(0, this.areaM2 - this.cropAreaM2());
  }

  /**
   * ⭐⭐ **The limiting factor — a MINIMUM, never a product** (the shipped
   * growth model's rule, applied to grass).
   *
   * A sward is limited by whichever of water and nutrient is scarcest,
   * and multiplying them would let two half-limitations read as a quarter
   * — which is not how a field behaves and not what a player should
   * learn. Warmth and daylength join the same minimum in W6; the shape is
   * here so they slot in rather than being retrofitted.
   *
   * ⚠ Unauthored reserves read `null`, which means *this ground does not
   * model that factor* and NOT *this factor is zero*. Ground with no
   * nitrogen reserve is not nitrogen-starved; it is unmodelled.
   */
  public override swardGrowthFactor(atS?: number): number {
    const factors: number[] = [];
    const moisture = this.soilMoistureFraction();
    if (moisture !== null) {
      // Grass is drought-sensitive well before it is dead: growth falls
      // away below about a third of field capacity.
      factors.push(clampUnit(moisture / 0.35));
    }
    const nitrogen = this.nutrientFraction();
    if (nitrogen !== null) {
      factors.push(clampUnit(0.25 + nitrogen * 1.5));
    }
    // ⭐⭐ WINTER, and it is two facts about a place rather than a mode
    // (D10): it is cold, and the days are short. Both are resolved
    // asynchronously and cached, so both carry the same tri-state —
    // ⚠ unresolved reads as UNLIMITED, never as frozen.
    const ambientK = this.ambientAt(atS);
    if (ambientK > 0) {
      // GRASS_BASE_K is the base temperature every growing-degree-day sum
      // in agronomy is measured against, and it is why a sward stops in
      // December without anybody writing down that it is December.
      factors.push(
        clampUnit((ambientK - GRASS_BASE_K) / (GRASS_HAPPY_K - GRASS_BASE_K)),
      );
    }
    const daylight = this.daylightAt(atS);
    if (daylight >= 0) {
      // ⭐ Photoperiod, not irradiance. Short days limit a temperate
      // sward well before the light gets dim, which is why growth is
      // over in October and not in the first hard frost.
      factors.push(
        clampUnit((daylight - DAYLIGHT_STOP) / (DAYLIGHT_HAPPY - DAYLIGHT_STOP)),
      );
    }
    return factors.length === 0 ? 1 : Math.min(...factors);
  }

  /**
   * The cached ambient, kelvin. ⚠ `-1` = never resolved, which reads as
   * *not temperature-limited* and NOT as absolute zero.
   */
  public _ambientK = -1;

  /** The cached daylength as a fraction of the rotation; `-1` = never. */
  public _daylightFraction = -1;

  /** The in-flight season resolve, or `null` — coalesces callers. */
  private _seasonPromise: Promise<void> | null = null;

  /**
   * ⭐ The field's climate site, its offset from that climate, and its
   * sky (cover build): what lets the sward read warmth and daylength at
   * ANY moment of a window rather than at the moment it was read.
   * Runtime caches, resolved with the season; `null` = fall back to the
   * cached now.
   */
  private _swardSite: ClimateSite | null = null;
  private _swardOffsetK: number | null = null;
  private _swardSky: CelestialProfile | null = null;

  /** Kelvin at game-second `atS` (the cached now when unknown). */
  private ambientAt(at?: number): number {
    // ⚠ "Now" is NOW: the cached ambient was resolved once, at placement.
    const atS = at ?? fieldNowSeconds() ?? undefined;
    if (atS === undefined || !this._swardSite || this._swardOffsetK === null || this._ambientK <= 0) {
      return this._ambientK;
    }
    try {
      const k = dailyMeanClimate(this._swardSite, atS);
      return Number.isFinite(k) ? k + this._swardOffsetK : this._ambientK;
    } catch {
      return this._ambientK;
    }
  }

  /** Daylength as a fraction of the day at `atS` (the cached now when unknown). */
  private daylightAt(at?: number): number {
    const atS = at ?? fieldNowSeconds() ?? undefined;
    const sky = this._swardSky;
    const site = this._swardSite;
    if (atS === undefined || !sky || !site || !(sky.dayLengthSeconds > 0)) {
      return this._daylightFraction;
    }
    try {
      return CelestialApi.daylightSecondsFor(sky, site.latitudeDeg, atS) / sky.dayLengthSeconds;
    } catch {
      return this._daylightFraction;
    }
  }

  /**
   * Resolve how cold it is and how long the day is, here, now.
   *
   * ⭐ Both are properties of the PLACE and of the moment, and neither is
   * a season flag: the same call in the same field answers differently in
   * June and December because the declination moved, and answers
   * differently under glass because the temperature did. That is D10's
   * *"winter is not a mode"* made mechanical — and it is why a heated
   * greenhouse needs no architectural unlock, only a fuel bill.
   *
   * The one `await` on this edge, kept off the read path (the
   * `ThermalMixin.restamp` shape). Cheap enough to run on every soil
   * reconcile kick and idempotent within a flight.
   */
  public restampSeason(): Promise<void> {
    const inFlight = this._seasonPromise;
    if (inFlight !== null) return inFlight;
    const started = this.resolveSeason();
    this._seasonPromise = started;
    return started;
  }

  private async resolveSeason(): Promise<void> {
    try {
      const self = this as unknown as Stuff & Container;
      const k = await BiomeApi.resolveTemperatureFor(self);
      const value = k?.rawValue();
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        this._ambientK = value;
      }
      this._daylightFraction = await CelestialApi.daylightFractionAt(
        self as unknown as Stuff,
      );
      // The site and the sky, for reading any moment of a window.
      // ⚠ Only under open sky: a field under glass keeps its one sample.
      const exposure = BiomeApi.exposureOf(self as unknown as Stuff);
      const open = exposure ? exposure.rainReaches() : BiomeApi.isSkyExposed(self as unknown as Stuff);
      if (this._ambientK > 0 && open) {
        const site = await ZoneApi.climateSiteFor(self as unknown as Stuff);
        const now = fieldNowSeconds();
        if (now !== null) {
          const climate = dailyMeanClimate(site, now);
          if (Number.isFinite(climate)) {
            this._swardSite = site;
            // ⚠⚠ ZERO under open sky (cover build B32): the field IS its
            // climate. The difference from the mean at this moment is
            // the moment's weather and hour; carried across a window it
            // grew a whole unwatched summer 7.7 K cold (a staged year).
            this._swardOffsetK = 0;
          }
        }
        this._swardSky = await CelestialApi.profileFor(self as unknown as Stuff);
      }
    } catch {
      // ⚠ A failed walk leaves BOTH unresolved rather than resolving
      // either to something. Unknown must never read as winter.
    } finally {
      this._seasonPromise = null;
    }
  }

  /**
   * ⭐ **D7's whole graze row: is the mouth standing here?**
   *
   * Summed intake of the animals actually in this field. Nothing else
   * decides whether the field is "grazed" — there is no `use` enum, and
   * the difference between grazing and haymaking is only ever whether the
   * animal was here when the grass came off.
   *
   * ⚠ A PURE read of authored demand, never a reconcile: reading an
   * animal's own hunger here would re-enter that animal's metabolism,
   * which reads this field. Same hazard, same discipline, as the soil's.
   */
  public override swardGrazingDemandPerGameDay(): number {
    // ⭐ The herds whose moves wrote themselves here (cover build D8) —
    // a drafted head is counted through its herd's line, never twice.
    let demand = 0;
    for (const e of Object.values(this.grazers)) demand += e.demandKgPerDay;
    for (const occupant of this.getContents()) {
      const grazer = occupant as unknown as {
        grazingDemandPerGameDay?(): number;
      };
      if (typeof grazer.grazingDemandPerGameDay === 'function') {
        demand += Math.max(0, grazer.grazingDemandPerGameDay());
      }
    }
    return demand;
  }

  /**
   * ⭐⭐ **The ledger, closed, in four lines.**
   *
   * Every game day this field integrates: the mouths standing on it put
   * back most of what they ate (as organic matter, which mineralises);
   * the clover in the sward fixes nitrogen out of the air; and hooves on
   * wet ground destroy structure. Rain takes nitrate away on the soil's
   * own rain edge, and harvest takes it away at the scythe.
   *
   * **No path credits nitrogen from nowhere.** The two openings are the
   * real ones — fixation in, leaching out — and both are named.
   */
  public override onSwardIntegrated(
    dryMatterEatenKg: number,
    days: number,
    fedKg = 0,
  ): void {
    this.apportionGrazers(dryMatterEatenKg + fedKg, days);
    if (dryMatterEatenKg > 0) {
      this.cycleGrazedNitrogen(dryMatterEatenKg);
      // Hooves. Intensity is what they ate, because that is how long
      // they stood here — and the damage is the WEATHER's multiplier.
      this.poachByOccupants(dryMatterEatenKg * 0.02);
    }
    this.fixLegumeNitrogen(days);
  }

  /**
   * Share what the mouths got (grass + hay) across the herds by their
   * demand, and add the window to each line (D8). Each herd's fed
   * fraction is then `fedKg / demandKg` — the one number the herd's
   * condition reads.
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
   * ⭐⭐ **Fertility follows the mouths, and this is the line that makes
   * it true** (D7, D14).
   *
   * An animal standing on the field eats its nitrogen and gives most of
   * it straight back where it stands — a ruminant retains only a small
   * fraction of what it eats. So **grazing cycles nitrogen in place** and
   * mowing exports it, and the difference between the two land uses is
   * this one call and no enum anywhere.
   *
   * ⭐ It goes back as **organic matter**, not as nitrogen: dung is not
   * fertiliser, it is what fertiliser slowly comes out of. That single
   * choice is what makes a grazed ley build the ground over years rather
   * than merely not depleting it.
   */
  public cycleGrazedNitrogen(dryMatterEatenKg: number): number {
    if (!Number.isFinite(dryMatterEatenKg) || dryMatterEatenKg <= 0) return 0;
    return this.addOrganicMatter(dryMatterEatenKg * MANURE_OM_PER_KG_EATEN);
  }

  /**
   * ⭐ **Legumes fix nitrogen out of the ATMOSPHERE** (D15, D43) — a
   * genuine faucet in reality, and the one that makes the legume
   * rotation derivable rather than a "+N bonus".
   *
   * ⚠⚠ **`legumeFraction` is AUTHORED, and nothing writes it.** This
   * docstring used to claim it *"falls when the clover is grazed out and
   * rises when it is not"*, which was simply false — `setLegumeFraction`
   * has no production caller. The claim is deleted rather than inherited,
   * because a substrate rots when whichever framing is most useful at
   * the moment is how its attributes are described. The writer belongs
   * to a farming build (grazing pressure against clover recovery); until
   * it arrives, the clover share is what the row says it is.
   */
  public fixLegumeNitrogen(days: number): number {
    if (this.legumeFraction <= 0 || days <= 0) return 0;
    return this.fixNitrogen(this.legumeFraction * N_FIXED_PER_GAME_DAY * days);
  }

  /**
   * ⚠⚠ **Poaching — the one interlock that runs ranching→farming as
   * HARM** (D17). Everything else in this build has the animals
   * improving the ground; hooves on wet clay destroy its structure, and
   * that is what makes *"put the herd on the tired field"* a judgement
   * rather than a free move.
   */
  public poachByOccupants(intensity: number): number {
    const sample = this.lastSample;
    if (!sample) return 0;
    return this.poach(intensity, GroundCharacter.poachingFactor(sample.texture));
  }

  // ---------- minting ----------

  /**
   * What this ground IS — the resolved seeded sample, computed live and
   * stored nowhere.
   *
   * @param model the covering authored character, or `null` (the
   *   ordinary case — see {@link GroundCharacter.resolve})
   */
  public groundSample(model: GroundCharacter | null, seed: number): GroundSample {
    const sample = GroundCharacter.resolve(model, this.getGroundSpot(), seed);
    this.lastSample = sample;
    return sample;
  }

  /**
   * The improvement bill this ground's character calls for — the
   * requirement every `Improvable` read measures against.
   *
   * ⚠ Convenience only: it re-resolves the sample each call and stores
   * nothing, which is the seeded field's whole contract.
   */
  public improvementBillFor(
    model: GroundCharacter | null,
    seed: number,
  ): ImprovementCost {
    return GroundCharacter.improvementCost(this.groundSample(model, seed));
  }

  /**
   * ⭐⭐ **The kernel's improvement hook** — *what does this ground owe?*
   *
   * This is the whole seam that let `ImprovableMixin` leave the trade that
   * invented it: the kernel's `grub`/`ditch`/`lime` never learn what a
   * `GroundCharacter` is, they ask the ground, and a field answers out of
   * farming's own seeded model. A turbary answers out of its peat.
   */
  public override async improvementBill(): Promise<ImprovementCost | null> {
    const locality = await AddressApi.resolveLocalityFor(
      this as unknown as Stuff & Container,
    );
    const seed = GroundCharacter.seedFor(locality?.getAddress() ?? '');
    const model = await GroundCharacter.forZone(this.getZone());
    return this.improvementBillFor(model, seed);
  }

  /**
   * ⭐ **How heavy the work is HERE.** Steep ground is slower, and stone is
   * slower still — a read of the seeded sample that the kernel could not
   * make, which is why it is a hook rather than a number.
   *
   * ⚠ Synchronous, so it reads the sample off the last resolved character
   * rather than re-walking the address: the pace is a presentation-grade
   * figure and a wrong-by-a-second duration is not worth an await on the
   * act's hot path.
   */
  public override improvementPace(job: ImprovementJob): number {
    if (job !== 'clearing') return 1;
    const sample = this.groundSample(null, 0);
    return 1 + sample.slopeDeg / 20 + sample.stoniness;
  }

  /**
   * ⭐⭐ **What comes up out of clearing a field**, and the kernel must not
   * know either of their names.
   *
   * **The cleared stone IS the wall.** Stony ground is expensive to clear
   * and cheap to fence, which inverts an expectation in a way a player
   * remembers, is historically exact — the stone walls of Ireland and New
   * England are the fields' own stones stacked at the edge — and makes the
   * waste zero.
   *
   * ⭐ **And limy ground gives up marl.** Digging calcareous clay out of a
   * sweet field and spreading it on a sour one was *the* land improvement
   * of its era, and marl pits are still visible in field corners. It is
   * the pH lever that needs no kiln and no fuel.
   */
  public override async improvementSpoils(
    job: ImprovementJob,
  ): Promise<readonly Stuff[]> {
    if (job !== 'clearing') return [];
    const sample = this.groundSample(null, 0);
    const out: Stuff[] = [];
    if (sample.stoniness >= STONE_THRESHOLD) {
      const stone = await this.mintSpoil(STONE_ROW);
      if (stone) out.push(stone);
    }
    if (sample.nativePh >= MARL_PH) {
      const marl = await this.mintSpoil(MARL_ROW);
      if (marl) out.push(marl);
    }
    return out;
  }

  /** Clone a spoil row into the field it came out of. */
  private async mintSpoil(row: string): Promise<Stuff | null> {
    try {
      const thing = await StuffApi.clone<Stuff>(row);
      // ⭐ The hook names no actor, so the spoil carries no title — but
      // the move captures the field with it in it.
      ContainmentApi.move(thing as Stuff & Containable, this as unknown as Stuff & Container);
      return thing;
    } catch {
      // ⚠ A missing spoil row is a content gap, not a reason to lose the
      // work: the clearing is banked either way.
      return null;
    }
  }

  /**
   * How this field presents itself — its name, when its holder gave it
   * one. ⭐ A name a holder typed is a proper name: "Long Acre", never
   * "a Long Acre". Overriding the PHRASE rather than the rendered string
   * is what makes the possessive and the definite form come out right.
   */
  public override presentationPhrase(view: PresentationView = 'own'): NounPhrase {
    return this.fieldName
      ? GrammarApi.properPhrase(this.fieldName)
      : super.presentationPhrase(view);
  }

  /**
   * Install the sward alongside the soil reserves — one call, because a
   * field with soil and no grass on it is not a state the world has.
   */
  public installFieldReserves(
    sample: GroundSample,
    swardStart: number = SWARD_RESIDUAL_FRACTION,
  ): void {
    // ⚠⚠ **A field with no area is not yet a field.** Registration runs
    // BEFORE `plot` has sized a minted one, so installing here would
    // seed a zero-capacity moisture reserve — and because both installs
    // are idempotent, the real sizing call would then find the reserve
    // present and do nothing. A field that could never hold water, from
    // one ordering. Found by the plot suite, which is exactly the kind
    // of thing an authored-content path breaks silently.
    if (this.areaM2 <= 0) return;
    // ⭐ A divided field holds no soil of its own (field population D3):
    // its patches do, and every soil read of the field aggregates over
    // them. The sward stays field-wide.
    if (this.getPatches().length === 0) this.installSoilReserves(sample);
    this.installSward(swardStart);
    // Learn where — and when — it is, the moment it exists.
    void this.restampSeason();
  }

  /**
   * ⭐⭐ **A hand-authored field stands itself up, and that is what makes
   * AC 62 reachable.**
   *
   * A plotted field gets its reserves from `plot`. An AUTHORED one — the
   * campus farm, a venue's home field — has no act to hang them on, and
   * `reserves` is `runtimeState` so a row cannot declare them. Without
   * this, authoring a field would need pack code, which is precisely the
   * thing the archetype exists to make unnecessary.
   *
   * So registration resolves the ground and installs what its character
   * calls for. ⚠ Idempotent by construction — `installSoilReserves` and
   * `installSward` both skip a reserve that already exists, so a restored
   * field keeps its history and only a fresh one is seeded.
   */
  public override async onCreate(): Promise<void> {
    await super.onCreate();
    const locality = await AddressApi.resolveLocalityFor(
      this as unknown as Stuff & Container,
    );
    const seed = GroundCharacter.seedFor(locality?.getAddress() ?? '');
    // ⚠ The zone's authored model, NOT `null`. A field whose reserves were
    // sized off procedural sand while `look` and `analyze soil` reported
    // authored loam would be visibly two different fields to one player.
    const model = await GroundCharacter.forZone(this.getZone());
    const sample = this.groundSample(model, seed);
    // ⭐ The parts first (field population D2): with patches minted, the
    // field installs no soil of its own — each patch is sized from this
    // sample nudged by its lean.
    await this.ensurePatches(model, seed, sample);
    // ⭐ An AUTHORED field is a kept pasture, not rough ground just broken
    // (cover build): its grass starts as a good even cover. A plotted
    // field starts at the residual — the sod it was cut out of.
    this.installFieldReserves(sample, AUTHORED_SWARD_START);
    // ⭐ And it is KEPT ground (cover build B37): a ley, a pasture, a cane
    // piece — cleared long ago, so its clearing starts done. Draining and
    // liming stay what the ground's character makes them. A plotted field
    // has no area yet at registration and is untouched here: new ground
    // is rough until somebody clears it (D54). Without this, a Waponi
    // piece grubbed of tired cane took ploughing after ploughing for
    // "scrub" that was never there (browser walk).
    if (this.areaM2 > 0 && this.improvementWork['clearing'] === undefined) {
      const bill = await this.improvementBill();
      if (bill) {
        this.improvementWork = {
          ...this.improvementWork,
          clearing: bill.clearing + bill.stonePicking,
        };
      }
    }
    void this.restampSeason();
  }

  /**
   * Settle both of soil's checkpoints AND the season edge. A field is a
   * place, so it is never "moved"; registration and the first read are
   * the only moments it can learn about itself.
   */
  public override settleSoilPlacement(): void {
    super.settleSoilPlacement();
    if (this._ambientK < 0 || this._daylightFraction < 0) {
      void this.restampSeason();
    }
  }
}

/**
 * ⭐ One authored part of a field (field population D2). `name` is how it
 * reads (*the top end*, a definite phrase — a leading *the* is the
 * register, not the stem); `keywords` are extra words it answers to;
 * `lean` nudges the field's sample for this part (a thin top end is
 * `depthScale: 0.35`); `description` is its long description.
 */
export interface PatchSpec {
  key: string;
  name: string;
  keywords?: string[];
  areaM2: number;
  lean?: GroundLean;
  description?: string;
}

/** The row every patch is minted from. */
const PATCH_ROW = '/trade/farming/thing/patch';

/** The fixture slot a patch keyed `key` sits in. */
function patchSlot(key: string): string {
  return `patch:${key}`;
}

/**
 * Each patch's area: as authored, with the LAST absorbing whatever makes
 * the parts tile the field exactly (never below nothing).
 */
function patchAreas(specs: readonly PatchSpec[], fieldAreaM2: number): number[] {
  const areas = specs.map((p) => Math.max(0, Number(p.areaM2) || 0));
  if (areas.length > 0 && fieldAreaM2 > 0) {
    const others = areas.slice(0, -1).reduce((a, b) => a + b, 0);
    areas[areas.length - 1] = Math.max(0, fieldAreaM2 - others);
  }
  return areas;
}

/** The viewer's band in a discipline — the floor for a non-Advancing one. */
function bandOf(viewer: Stuff | null, discipline: string): CompetenceBandName {
  return viewer && MixinApi.isAdvancing(viewer)
    ? viewer.competenceBandCached(discipline)
    : CompetenceBand.FLOOR;
}

function lowerFirst(text: string): string {
  return text.length > 0 ? text[0]!.toLowerCase() + text.slice(1) : text;
}

function clampUnit(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0]!.toUpperCase() + text.slice(1) : text;
}

/** Game-seconds now, or `null` before the clock exists (pre-boot, tests). */
function fieldNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}

/** The climate's mean over the day around `atS` — the season, never the hour. */
function dailyMeanClimate(site: ClimateSite, atS: number): number {
  let sum = 0;
  for (const h of [-9, -3, 3, 9]) {
    sum += WeatherApi.climateAt(site, Quantity.of(atS + h * 3_600, 's')).rawValue();
  }
  return sum / 4;
}
