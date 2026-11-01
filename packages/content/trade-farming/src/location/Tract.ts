/**
 * Tract — **a piece of ground you can stand in**, and the thing this
 * game did not have.
 *
 * Cultivation before this build was `PlantPot` and `GardenBed`: a Thing
 * with a bulk interior of soil measured in **litres**. A 1,000 m² lot
 * held a four-plant bed. A tract is not a bigger bed — it is a *place*,
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
 *    tract is a KIND of place minted many times. Safe only because every
 *    instance is **keyed** `<holding extent>/<leaf>` — a keyless
 *    persistable over a permissive base would silently share ONE
 *    `holder_snapshots` scope across every tract in the world.
 *  - **`WarrenMemberMixin`** — the back-ref to the holding it belongs to.
 *  - **`SoilMixin`** — the kernel's, the same one `GardenBed` composes.
 *    ⭐ *There is exactly one soil checkpoint implementation*, which is
 *    AC 3 and the reason W1 happened first. `pasture is a tract` dies the
 *    moment pasture's soil is not farming's soil.
 *  - **`ReservedMixin`** — soil's host constraint, and where the
 *    moisture, nitrogen and (later) sward reserves live.
 *
 * ## ⭐ Why the ground key is not the coordinates
 *
 * A tract is a warren member, and a warren member is not on anybody's
 * grid — *a lot's room is NOT on the street's grid*, which is the shipped
 * rule the residences build settled. So every tract would sit at
 * `[0, 0, 0]` and every tract in the world would sample the same dirt.
 *
 * Instead the tract carries {@link Tract.groundSpot}, **stamped at plot
 * time from where the plotter was standing**, offset by which tract on
 * the holding this is. Two consequences, and the first is the point:
 *
 *  - ⭐⭐ **surveying before you commit actually predicts something.** You
 *    walk the lot, take your spadefuls, and the tract you then plot on it
 *    carries the ground you surveyed. D3's *"you can survey before you
 *    commit"* is only true if that holds.
 *  - a hand-authored tract authors its own spot, so a venue can put its
 *    top meadow on the heavy end of the valley deliberately.
 *
 * ## What it is NOT
 *
 * ⚠ Not a `PersistentLocation` — that class is the four furnishing
 * archetypes' base, and a tract is not a room a player puts their goods
 * in. ⚠ And it holds **no plant slot**: a tract's crop is not four
 * `Slottable`s in a bed, which is exactly why `CultivableMixin` could not
 * be the vehicle and why W1 split soil out of it.
 *
 * ## ⭐ The crop (cover build)
 *
 * A tract holds ONE area crop: a single `Plant` standing loose in its
 * contents with a sown area, rooted in the tract's soil by containment
 * (the kernel's `getBed()`). The rest of the tract is sward. `plough`
 * turns the sward under and stamps a SEEDBED good for one season; `sow`
 * asks the tract (`sowingRefusal`) and the tract answers from that
 * stamp. The crop is titled to the business that works the tract
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
  IMPROVEMENT_DONE_AT,
  type ImprovementCost,
  type ImprovementJob,
} from '@saxonberg/server/mud/lib/ground/Improvable';
import { SWARD_RESIDUAL_FRACTION } from '../lib/Sward';
import {
  CharacteredSoilMixin,
  CROP_TRANSPIRATION_L_PER_M2_DAY,
} from '../lib/CharacteredSoil';
import type Field from '../thing/Field';
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
/** Calcareous clay, dug out of the corner of a sweet tract. */
const MARL_ROW = '/trade/farming/thing/marl';
/** Above this stoniness, an act of grubbing turns up stone worth stacking. */
const STONE_THRESHOLD = 0.35;
/** At or above this pH the subsoil is calcareous enough to be marl. */
const MARL_PH = 7.2;

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

/** The share of its ceiling an authored tract's grass starts at. */
const AUTHORED_SWARD_START = 0.8;

const SECONDS_PER_GAME_DAY = 86_400;

/**
 * ⭐ The tract's own lines in `look` — in words, never numbers: the crop
 * and its stage, the stubble, a fresh seedbed, the grass. Sync and pure:
 * an augmenter only READS (⛔ it never settles a title — that is the
 * acts' job).
 */
function fieldAugmenter(text: string, host: Stuff, viewer: Stuff): string {
  if (!(host instanceof Tract)) return text;
  const lines = host.tractLines(viewer);
  if (lines.length === 0) return text;
  const block = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${block}` : block;
}

// The ground half — composed FIRST and separately, because soil's host
// constraint is `Stuff & Reserved` alone. Naming the intermediate stack
// is not cosmetic: inference through this many nested generic mixin
// factories in one expression collapses to `never`.
// ⭐ `CharacteredSoilMixin` (field population D2): the area and the seeded
// character that size the reserves — shared with the tract's fields.
const TractGround = CharacteredSoilMixin(SoilMixin(ReservedMixin(Location)));

// `ImprovableMixin` is the THIRD axis (D57) — what has been DONE to the
// ground, independent of what the polity permits (`LandUse`) and of what
// the ground is made of (`GroundCharacter`). All three must be satisfied
// and none substitutes for another.
// ⭐ No `SwardMixin` (tracts build D24): the grass belongs to the FIELDS a
// holder marks on the tract. Unmarked ground is rough, and keeps only its
// own soil.
const TractBase = PersistableMixin(
  WarrenMemberMixin(ImprovableMixin(TractGround)),
);

export default class Tract extends TractBase {
  /**
   * ⚠⚠ **`plough` is afforded HERE and nowhere else, and it would have
   * gone silent without this block.**
   *
   * The improvement acts moved to the platform with `ImprovableMixin`, and
   * `plough` went with them in the same list — but ploughing is not
   * improvement, it is farming's own act on a tract, so it did not belong
   * in a kernel mixin's contributions. A verb nothing affords parses as
   * *"I don't understand 'plough'"*, and **every controller test would
   * still have passed**: the affordance is a static on a class and nothing
   * type-checks its absence. Two builds in this repo shipped exactly that
   * failure and only found it by driving the world.
   *
   * ⭐ Safe to declare alongside the mixins': `bucketFilenames` collects the
   * class's own static **plus** every mixin in the chain, so this unions
   * with `ImprovableMixin`'s three platform views rather than shadowing
   * them.
   *
   * ⚠ `mow` is named here too since the grass moved onto the fields
   * (tracts build): `SwardMixin`'s own contribution now sits on a FIXTURE,
   * and a fixture's contributions reach nobody.
   */
  static commandContributions = {
    // `inventory`: a location's occupants hear it (`self` is a giver's).
    inventory: [
      'trade/farming/cmd/farming/plough.yaml',
      // ⭐ A tract affords SOWING to whoever stands in it (cover build):
      // the platform view, named here the way `plough` is. A bed affords
      // it through `CultivableMixin`; ground with no slot had nothing.
      'platform/cmd/inventory/plant.yaml',
      // ⭐ And FEEDING (field population): a tract's ground — or one of
      // its fields — takes muck from whoever stands in it. `feed` rode
      // only `CultivableMixin` before, so a tract afforded nothing.
      'platform/cmd/bulk/feed.yaml',
      'trade/farming/cmd/farming/mow.yaml',
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
    fields: { persistent: true, authorable: true },
  };

  /**
   * ⭐ **The parts this tract is divided into** (field population D2) —
   * the top end, the middle, the lane end. Authored; `[]` = one piece,
   * and a tract with none takes today's path on every line. Each spec
   * mints one {@link Field} fixture at `onCreate` (get-or-create at slot
   * `field:<key>`); the parts tile the tract, the LAST absorbing any
   * difference in area. ⚠ Keys are stable — a crop row binds by key
   * (`groundPart: top-end`); a name may change.
   */
  public fields: FieldSpec[] = [];

  /**
   * ⭐ **D88 — holders name their tracts.** Real farms always have: the
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
   * ⭐ **What fraction of the grass is clover** (D43), as authored on the
   * tract — the share every field marked here starts with unless its own
   * spec says otherwise. The sward, and so the clover, is the fields'.
   */
  public legumeFraction = 0;

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

  /** The (first) area crop standing in this tract, or `null`. */
  public getCrop(): (Stuff & Growing) | null {
    return this.getCrops()[0] ?? null;
  }

  /**
   * ⭐ Every area crop standing in this tract (field population D1): one
   * on a one-piece tract, one per sown field on a divided one.
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

  // ---------- ⭐ the fields (field population D2) ----------

  /**
   * The fields minted from {@link fields}, in authored order. ⭐ Read
   * off the fixture SLOTS this tract minted them into (`field:<key>`) —
   * the tract put them there, so the slot is the record of what they are.
   */
  public getFields(): (Stuff & Field)[] {
    const out: (Stuff & Field)[] = [];
    for (const spec of this.fields) {
      for (const f of this.getFixtures()) {
        if (this.slotOfFixture(f) === fieldSlot(spec.key)) {
          out.push(f as unknown as Stuff & Field);
          break;
        }
      }
    }
    return out;
  }

  /**
   * ⭐ The kernel's parts hook: a divided tract's soil IS its fields, so
   * every read and write the kernel's verbs make of the tract aggregates
   * over them, and a plant bound by `groundPart` roots in its own.
   */
  public override soilParts(): readonly (Stuff & Soil)[] {
    return this.getFields();
  }

  /** A refusal names one of these by the word a farmer uses. */
  public override soilPartNoun(): string {
    return 'field';
  }

  /**
   * ⭐ Open ground reads from its gate (tracts build D30): `look upper
   * bench` from the farmyard prints its fields without walking in.
   */
  public override isSeenAcrossExit(): boolean {
    return true;
  }

  /**
   * Mint (or find) one field per authored spec, sized and characterized
   * from this tract's sample and the spec's lean.
   *
   * ⭐ Get-or-create at slot `field:<key>` — the `ensureFloor` shape — so
   * a re-run (a CMS go-live re-hydrating the tract) re-sizes what is there
   * rather than minting a second set, and a restored tract's fixtures
   * slice overlays its record onto the fields minted here.
   *
   * ⚠ A failure to mint is warned, never thrown: `onCreate` throwing
   * unregisters the tract, and a tract that reads as one piece is a
   * degradation where a tract that will not boot is not.
   */
  public async ensureFields(
    model: GroundCharacter | null,
    seed: number,
    fieldSample: GroundSample,
    swardStart: number = SWARD_RESIDUAL_FRACTION,
  ): Promise<void> {
    const specs = this.fields.filter((p) => p && typeof p.key === 'string' && p.key);
    if (specs.length === 0) return;
    const areas = fieldAreas(specs, this.areaM2);
    for (const [i, spec] of specs.entries()) {
      try {
        let field = this.fieldInSlot(spec.key);
        if (!field) {
          const minted = await StuffApi.clone<Stuff>(FIELD_ROW);
          if (!MixinApi.isAdornment(minted) || !MixinApi.isSoil(minted)) {
            await StuffApi.destruct(minted);
            throw new Error(`'${FIELD_ROW}' is not a soil fixture`);
          }
          this.addFixture(minted, fieldSlot(spec.key));
          field = minted as unknown as Stuff & Field;
        }
        field.configureField(spec, areas[i] ?? 0, this.legumeFraction);
        field.installFromTract(
          GroundCharacter.resolve(model, this.getGroundSpot(), seed, spec.lean),
          fieldSample,
          swardStart,
        );
      } catch (err) {
        console.warn(
          `Tract.ensureFields: no field '${spec.key}' for ` +
            `${this.getTemplatePath() ?? this.stuffId} — ` +
            `${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /** The field in `field:<key>`, or `null`. */
  private fieldInSlot(key: string): (Stuff & Field) | null {
    for (const f of this.getFixtures()) {
      if (this.slotOfFixture(f) === fieldSlot(key)) {
        return f as unknown as Stuff & Field;
      }
    }
    return null;
  }

  /** The field marked here under `key`, or `null`. */
  public fieldByKey(key: string): (Stuff & Field) | null {
    return key ? this.fieldInSlot(key) : null;
  }

  /**
   * ⭐ The tract answers `sow` only for its unmarked ground (tracts build
   * D25): nothing is planted until a field is marked. Once one is, the
   * FIELD the act lands on answers (ploughed this season, or not).
   */
  public override sowingRefusal(): string | null {
    if (this.getFields().length > 0) return null;
    return 'Mark a field first — nothing is planted on unmarked ground.';
  }

  /**
   * ⭐ **Whose the crop is** (cover build D6): the business that works
   * this tract, stood up if it has to be. A group cannot hold goods, so
   * *the holder* is realized as the operator; with none, the crop keeps
   * whatever title its arrival gave it (the sower's, or nobody's).
   * ⛔ Called by the acts — sow and harvest — never by a read.
   */
  public override async ensureCropTitle(): Promise<void> {
    await this.settleCropTitle(true);
  }

  private async settleCropTitle(standUp: boolean): Promise<void> {
    // ⭐ Every crop standing here (field population): a divided tract's
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
   * ⭐ A crop ARRIVING is the tract's moment to learn it was sown, and an
   * authored crop's to be titled to the live operator (no house is stood
   * up by an arrival — that is the harvest's act).
   */
  public onContainableAdded(thing: Stuff & Containable): void {
    if (MixinApi.isGrowing(thing) && thing.isAreaCrop()) {
      this.fieldOfCrop(thing)?.noteCropArrived();
      void this.settleCropTitle(false).catch(() => undefined);
    }
  }

  /** A crop LEAVING — cut down or grubbed out — leaves its field stubble. */
  public onContainableRemoved(thing: Stuff & Containable): void {
    if (MixinApi.isGrowing(thing) && thing.isAreaCrop()) {
      this.fieldOfCrop(thing)?.noteCropRemoved();
    }
  }

  /**
   * The field a crop roots in, read by its KEY rather than `getBed()` — a
   * crop that has just left has no container to resolve its bed through.
   * On a tract of one field, that field.
   */
  private fieldOfCrop(crop: Stuff & Growing): (Stuff & Field) | null {
    const keyed = this.fieldByKey(crop.getGroundPart());
    if (keyed) return keyed;
    const fields = this.getFields();
    return fields.length === 1 ? fields[0]! : null;
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
   * ⭐ Whether the tract's clearing is done, standing crops aside — what a
   * PLOUGH asks (tracts build): {@link progressOn} reads a crop as scrub so
   * the kernel's `grub` can take it, and on a tract of several fields a
   * plough on the empty one must not be sent to grub its neighbor's wheat.
   */
  public isClearedForPlough(cost: ImprovementCost): boolean {
    return super.progressOn('clearing', cost) >= IMPROVEMENT_DONE_AT;
  }

  /**
   * ⭐ **A tract in use is a tract kept** (cover build B35): stock and a
   * standing crop keep the scrub down, so clearing does not revert while a
   * herd grazes it or a crop stands on it. Without this a kept clover ley
   * grazed all winter "had scrub on it yet" by spring and took two
   * clearing ploughs before a seedbed (found walking it in the browser).
   */
  public override improvementReversion(job: ImprovementJob): number {
    if (
      job === 'clearing' &&
      (this.getFields().some((f) => f.grazerIds().length > 0) ||
        this.getCrops().length > 0)
    ) {
      return 0;
    }
    return super.improvementReversion(job);
  }

  /**
   * ⭐ **Grubbing ends a crop** (cover build D5): clearing work banked on
   * a tract with a crop standing in it takes the crop out first — tired
   * cane is grubbed before it is replanted.
   */
  public override bankWork(
    job: ImprovementJob,
    amount: number,
    cost: ImprovementCost,
  ): number {
    if (job === 'clearing') {
      // Every field's crop goes (field population): grubbing is the tract's.
      for (const crop of this.getCrops()) void StuffApi.destruct(crop);
    }
    return super.bankWork(job, amount, cost);
  }

  /**
   * The tract's own lines, in words: the stand (one thing, over how much
   * of the tract), then each field's ground, grass and herds — named by
   * field when there are several (field population D9, D13; tracts build
   * D24). ⭐ A pure read.
   */
  public tractLines(viewer?: Stuff | null): string[] {
    const lines: string[] = [];
    const crops = this.getCrops();
    const fields = this.getFields();
    const several = fields.length > 1;
    // The stand reads as ONE thing: the kind, how much of the tract it
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
      // One crop: the tract's own area, unchanged.
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
      if (several) lines.push(...this.fieldCropLines(viewer ?? null));
    }
    if (fields.length === 0) {
      if (!crop) lines.push('Nobody has marked a field on it. It is rough ground.');
      return lines;
    }
    for (const field of fields) {
      const name = field.presentationPhrase().definite();
      if (several) {
        // A sown field's crop line has said it already.
        if (field.cropsOn().length === 0) {
          for (const line of field.groundStateLines()) {
            lines.push(`At ${name} ${lowerFirst(line)}`);
          }
        }
        lines.push(...field.grazerLines(name));
      } else {
        lines.push(...field.groundStateLines(), ...field.grazerLines());
      }
    }
    return lines;
  }

  /**
   * ⭐ One line per sown field (field population D13): *"At the top end it
   * is in ear and looks poor. It is short of something."* — the crop
   * rooted there, read at the viewer's band (a viewer with no transcript
   * reads the floor). Never a digit; a field with no crop says nothing.
   */
  private fieldCropLines(viewer: Stuff | null): string[] {
    const out: string[] = [];
    for (const field of this.getFields()) {
      for (const crop of this.getCrops()) {
        if (crop.getBed() !== field) continue;
        const read = crop.readLines(bandOf(viewer, crop.getDiscipline()));
        const [first, ...rest] = read;
        if (!first) continue;
        const at = `At ${field.presentationPhrase().definite()}`;
        out.push([`${at} ${lowerFirst(first)}`, ...rest].join(' '));
      }
    }
    return out;
  }

  // ---------- ⭐ what grazes loose (tracts build D34) ----------

  /**
   * Kilograms a game day the animals standing loose in this tract want —
   * those with no herd line on a field. ⚠ A pure read of authored demand.
   * (The occupant-shape probe moved here from the old tract sward; it is
   * a finding for the ranching slate, not this build's to fix.)
   */
  public looseGrazingDemandPerGameDay(): number {
    let demand = 0;
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
   * `field`'s share of the loose grazing: apportioned over the fields
   * carrying no crop, by area — a field with a crop is never grazed.
   */
  public looseGrazingShareOf(field: Stuff & Field): number {
    const demand = this.looseGrazingDemandPerGameDay();
    if (!(demand > 0) || field.cropsOn().length > 0) return 0;
    const grass = this.getFields().filter((f) => f.cropsOn().length === 0);
    const total = grass.reduce((n, f) => n + f.getAreaM2(), 0);
    return total > 0 ? (demand * field.getAreaM2()) / total : 0;
  }

  // ---------- the hooks SoilMixin asks of its host ----------
  // (`soilLeachRate`, `soilCatchmentAreaM2` and the reserves' sizing are
  // `CharacteredSoilMixin`'s — shared with the fields.)

  /**
   * ⭐ **A tract IS a place, so it is its own watershed scope.** The
   * default asks a container — right for a pot in a room, wrong here:
   * a tract's container is the warren, which is not where it is. Asking
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
   * the bed answer with their occupants' summed demand; a tract answers
   * with its sward's transpiration, which is the same question asked of a
   * different kind of ground.
   */
  public override soilWaterDemandPerGameDay(): number {
    // ⭐ The tract's OWN soil is its unmarked ground (tracts build D25):
    // rough, no sward of its own, drunk only by a crop rooted in it — none,
    // once the tract is marked (a crop roots in a field).
    const self = this as unknown as Stuff;
    return this.getCrops()
      .filter((c) => c.getBed() === self)
      .reduce((n, c) => n + c.standingAreaM2() * CROP_TRANSPIRATION_L_PER_M2_DAY, 0);
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
      const k = this.ambientKAt(t);
      const warm = k > 0 ? clampUnit((k - GRASS_BASE_K) / (GRASS_HAPPY_K - GRASS_BASE_K)) : 1;
      sum += 0.1 + 0.9 * warm;
    }
    return sum / samples;
  }

  // ---------- ⭐ the season, read by the fields' grass ----------

  /**
   * ⭐⭐ WINTER, and it is two facts about a place rather than a mode
   * (D10): it is cold, and the days are short. The tract's warmth and
   * daylength limit at game-second `atS`, as one factor in a field's
   * sward minimum — or `null` when neither is resolved (⚠ unresolved
   * reads as UNLIMITED, never as frozen).
   */
  public seasonGrowthFactor(atS?: number): number | null {
    const factors: number[] = [];
    const ambientK = this.ambientKAt(atS);
    if (ambientK > 0) {
      // GRASS_BASE_K is the base temperature every growing-degree-day sum
      // in agronomy is measured against, and it is why a sward stops in
      // December without anybody writing down that it is December.
      factors.push(
        clampUnit((ambientK - GRASS_BASE_K) / (GRASS_HAPPY_K - GRASS_BASE_K)),
      );
    }
    const daylight = this.daylightFractionAt(atS);
    if (daylight >= 0) {
      // ⭐ Photoperiod, not irradiance. Short days limit a temperate
      // sward well before the light gets dim.
      factors.push(
        clampUnit((daylight - DAYLIGHT_STOP) / (DAYLIGHT_HAPPY - DAYLIGHT_STOP)),
      );
    }
    return factors.length === 0 ? null : Math.min(...factors);
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
   * ⭐ The tract's climate site, its offset from that climate, and its
   * sky (cover build): what lets the sward read warmth and daylength at
   * ANY moment of a window rather than at the moment it was read.
   * Runtime caches, resolved with the season; `null` = fall back to the
   * cached now.
   */
  private _swardSite: ClimateSite | null = null;
  private _swardOffsetK: number | null = null;
  private _swardSky: CelestialProfile | null = null;

  /** Kelvin at game-second `atS` (the cached now when unknown). */
  public ambientKAt(at?: number): number {
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
  public daylightFractionAt(at?: number): number {
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
   * a season flag: the same call in the same tract answers differently in
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
      // ⚠ Only under open sky: a tract under glass keeps its one sample.
      const exposure = BiomeApi.exposureOf(self as unknown as Stuff);
      const open = exposure ? exposure.rainReaches() : BiomeApi.isSkyExposed(self as unknown as Stuff);
      if (this._ambientK > 0 && open) {
        const site = await ZoneApi.climateSiteFor(self as unknown as Stuff);
        const now = fieldNowSeconds();
        if (now !== null) {
          const climate = dailyMeanClimate(site, now);
          if (Number.isFinite(climate)) {
            this._swardSite = site;
            // ⚠⚠ ZERO under open sky (cover build B32): the tract IS its
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
   * nothing, which is the seeded tract's whole contract.
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
   * `GroundCharacter` is, they ask the ground, and a tract answers out of
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
   * ⭐⭐ **What comes up out of clearing a tract**, and the kernel must not
   * know either of their names.
   *
   * **The cleared stone IS the wall.** Stony ground is expensive to clear
   * and cheap to fence, which inverts an expectation in a way a player
   * remembers, is historically exact — the stone walls of Ireland and New
   * England are the tracts' own stones stacked at the edge — and makes the
   * waste zero.
   *
   * ⭐ **And limy ground gives up marl.** Digging calcareous clay out of a
   * sweet tract and spreading it on a sour one was *the* land improvement
   * of its era, and marl pits are still visible in tract corners. It is
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

  /** Clone a spoil row into the tract it came out of. */
  private async mintSpoil(row: string): Promise<Stuff | null> {
    try {
      const thing = await StuffApi.clone<Stuff>(row);
      // ⭐ The hook names no actor, so the spoil carries no title — but
      // the move captures the tract with it in it.
      ContainmentApi.move(thing as Stuff & Containable, this as unknown as Stuff & Container);
      return thing;
    } catch {
      // ⚠ A missing spoil row is a content gap, not a reason to lose the
      // work: the clearing is banked either way.
      return null;
    }
  }

  /**
   * How this tract presents itself — its name, when its holder gave it
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
   * Install the tract's own soil — sized to its UNMARKED ground (tracts
   * build D25): the whole tract while nothing is marked, the remainder
   * between its fields once something is, nothing when the fields tile
   * it. No grass: the grass is the fields'.
   */
  public installTractReserves(sample: GroundSample): void {
    // ⚠⚠ **A tract with no area is not yet a tract.** Installing here
    // would seed a zero-capacity moisture reserve, and because the install
    // is idempotent the real sizing call would then find the reserve
    // present and do nothing.
    if (this.areaM2 <= 0) return;
    const remainder = this.getFields().length === 0
      ? this.areaM2
      : this.soilRemainderAreaM2();
    if (remainder > 0) this.installSoilReserves(sample, remainder / this.areaM2);
    // Learn where — and when — it is, the moment it exists.
    void this.restampSeason();
  }

  /**
   * ⭐⭐ **A hand-authored tract stands itself up, and that is what makes
   * AC 62 reachable.**
   *
   * A plotted tract gets its reserves from `plot`. An AUTHORED one — the
   * campus farm, a venue's home tract — has no act to hang them on, and
   * `reserves` is `runtimeState` so a row cannot declare them. Without
   * this, authoring a tract would need pack code, which is precisely the
   * thing the archetype exists to make unnecessary.
   *
   * So registration resolves the ground and installs what its character
   * calls for. ⚠ Idempotent by construction — `installSoilReserves` and
   * `installSward` both skip a reserve that already exists, so a restored
   * tract keeps its history and only a fresh one is seeded.
   */
  public override async onCreate(): Promise<void> {
    await super.onCreate();
    const locality = await AddressApi.resolveLocalityFor(
      this as unknown as Stuff & Container,
    );
    const seed = GroundCharacter.seedFor(locality?.getAddress() ?? '');
    // ⚠ The zone's authored model, NOT `null`. A tract whose reserves were
    // sized off procedural sand while `look` and `analyze soil` reported
    // authored loam would be visibly two different tracts to one player.
    const model = await GroundCharacter.forZone(this.getZone());
    const sample = this.groundSample(model, seed);
    // ⭐ The parts first (field population D2): with fields minted, the
    // tract installs no soil of its own — each field is sized from this
    // sample nudged by its lean.
    // ⭐ An AUTHORED tract's fields are kept pasture, not rough ground just
    // broken (cover build): their grass starts as a good even cover.
    await this.ensureFields(model, seed, sample, AUTHORED_SWARD_START);
    this.installTractReserves(sample);
    // ⭐ And it is KEPT ground (cover build B37): a ley, a pasture, a cane
    // piece — cleared long ago, so its clearing starts done. Draining and
    // liming stay what the ground's character makes them. A plotted tract
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
   * Settle both of soil's checkpoints AND the season edge. A tract is a
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
 * ⭐ One field marked on a tract (field population D2; tracts build D27).
 * `name` is how it reads (*the top end*, a definite phrase — a leading
 * *the* is the register, not the stem); `keywords` are extra words it
 * answers to; `share` is its fraction of the tract (`0 < share ≤ 1`);
 * `lean` nudges the tract's sample for this field (a thin top end is
 * `depthScale: 0.35`); `description` is its long description.
 */
export interface FieldSpec {
  key: string;
  name: string;
  keywords?: string[];
  share: number;
  /** This field's clover share; the tract's authored one when absent. */
  legumeFraction?: number;
  lean?: GroundLean;
  description?: string;
}

/** The row every field is minted from. */
const FIELD_ROW = '/trade/farming/thing/field';

/** The fixture slot a field keyed `key` sits in. */
function fieldSlot(key: string): string {
  return `field:${key}`;
}

/** Shares within this of the whole are the whole — the tract is tiled. */
const WHOLE_SHARE_SLACK = 1e-6;

/**
 * Each field's area: its share of the tract. When the shares tile the
 * tract the LAST absorbs the rounding, so the fields sum to the tract
 * exactly; otherwise the rest is unmarked ground (tracts build D25).
 */
function fieldAreas(specs: readonly FieldSpec[], tractAreaM2: number): number[] {
  const shares = specs.map((p) => Math.max(0, Math.min(1, Number(p.share) || 0)));
  const areas = shares.map((share) => share * Math.max(0, tractAreaM2));
  const total = shares.reduce((a, b) => a + b, 0);
  if (areas.length > 0 && total >= 1 - WHOLE_SHARE_SLACK) {
    const others = areas.slice(0, -1).reduce((a, b) => a + b, 0);
    areas[areas.length - 1] = Math.max(0, tractAreaM2 - others);
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
