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
 * CartesianLocation))))` — `MineRoom`'s stack with soil where the
 * working is, which is not a coincidence: a mine and a farm are the same
 * shape of problem (*ground somebody holds, worked over time, remembered
 * between visits*) and the residences build already made that one
 * substrate.
 *
 *  - **`PersistableMixin`** outermost — the host rule (`cleanupOnDestruct`
 *    must fire before the inner `Container` evacuates). ⚠ Over the
 *    PERMISSIVE `CartesianLocation`, never the singleton one, because a
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
 * ⚠ Not a `FurnishableRoom` — that class is the four furnishing
 * archetypes' base, and a field is not a room a player puts their goods
 * in. ⚠ And it holds **no plant slot**: a field's crop is not four
 * `Slottable`s in a bed, which is exactly why `CultivableMixin` could not
 * be the vehicle and why W1 split soil out of it.
 *
 * See [docs/subsystems/soil.md] and [docs/subsystems/smallholding.md].
 */

import CartesianLocation from '@saxonberg/server/mud/platform/location/CartesianLocation';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { WarrenMemberMixin } from '@saxonberg/server/mud/lib/location/WarrenMember';
import { SoilMixin, SOIL_MOISTURE_RESERVE_KEY, SOIL_NITROGEN_RESERVE_KEY, SOIL_RESERVE_THEME } from '@saxonberg/server/mud/lib/husbandry/Soil';
import { ReservedMixin, Reserve } from '@saxonberg/server/mud/lib/reserve';
import { ImprovableMixin } from '../lib/Improvable';
import { SwardMixin } from '../lib/Sward';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { CelestialApi } from '@saxonberg/server/mud/api/celestial';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import GroundCharacter, {
  type GroundSample,
  type ImprovementCost,
  type Spot,
} from '../idea/GroundCharacter';

/**
 * Litres of plant-available water one square metre of LOAM holds in its
 * root zone. Texture scales it (`GroundCharacter.waterHoldingFactor`).
 *
 * ⭐ Roughly right rather than invented: a loam holds about 150 mm of
 * available water per metre of depth, and a root zone is a few hundred
 * millimetres, so a square metre carries tens of litres. The number is
 * a real soil-physics figure and the derivation is one line, which is
 * what stops it being a balance dial pretending to be physics.
 */
const LITRES_PER_M2_LOAM = 45;

/**
 * Square metres of rough ground behind one handful of forage.
 *
 * ⭐ Deliberately poor: wild forage is **immediate, zero-capital and
 * low-yield per acre**, and farming is the opposite on all three. A
 * 400 m² field fully wild carries eight handfuls; the same ground under a
 * crop is worth many times that, and it takes a season and a spade.
 */
const M2_PER_HANDFUL = 50;

/** Handfuls that grow back per GAME day (D89 — never an unqualified day). */
const HANDFULS_REGROWN_PER_GAME_DAY = 1.5;

/** The row rough ground yields when its own table is unauthored. */
const DEFAULT_FORAGE_ROW = '/trade/farming/thing/wild-greens';

const SECONDS_PER_GAME_DAY = 86_400;

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

// The ground half — composed FIRST and separately, because soil's host
// constraint is `Stuff & Reserved` alone. Naming the intermediate stack
// is not cosmetic: inference through this many nested generic mixin
// factories in one expression collapses to `never`.
const FieldGround = SoilMixin(ReservedMixin(CartesianLocation));

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
  static fieldMeta: FieldMeta = {
    fieldName: { persistent: true, authorable: true },
    groundSpotX: { persistent: true, authorable: true },
    groundSpotY: { persistent: true, authorable: true },
    areaM2: { persistent: true, authorable: true },
    forageRows: { persistent: true, authorable: true },
    forageTaken: { persistent: true },
    forageStamp: { persistent: true },
    _ambientK: { persistent: true, runtimeState: true },
    _daylightFraction: { persistent: true, runtimeState: true },
  };

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
   * ⚠ Two scalars rather than a tuple, because the Hydrator reflects
   * into fields by name and a two-element array is a shape it would have
   * to be told about. Scalars decompose for free — the `Reserve`
   * precedent.
   */
  public groundSpotX = 0;
  public groundSpotY = 0;

  /** Square metres of ground. The land draw, and the rain catchment. */
  public areaM2 = 0;

  /**
   * ⭐ **The forage TABLE, authored** (D61) — *authors write the table,
   * the world computes the stock*, which is `discovery-slate`'s model
   * consumed rather than redesigned. Empty falls back to the shipped
   * generic, so unauthored rough ground still pays something.
   */
  public forageRows: string[] = [];

  /** Handfuls taken since the stock last stood full. */
  public forageTaken = 0;

  /** Game-seconds stamp of the last forage regrowth; `0` = never. */
  public forageStamp = 0;

  public getForageRows(): string[] {
    return this.forageRows.length > 0 ? this.forageRows : [DEFAULT_FORAGE_ROW];
  }

  public setForageRows(value: string[]): void {
    this.forageRows = Array.isArray(value) ? value : [];
  }

  /**
   * How many handfuls this ground has standing, right now.
   *
   * ⚠ **Derive-on-read, so unvisited ground costs nothing** — the
   * slate's rule, and the reason a world of rough ground is free. The
   * ceiling is `wildness × area`, so **the forage declines as you
   * clear**: the neolithic transition, in one expression.
   */
  public forageAvailable(wildness: number): number {
    this.regrowForage();
    const ceiling = (wildness * this.areaM2) / M2_PER_HANDFUL;
    return Math.max(0, ceiling - this.forageTaken);
  }

  /** Take `n` handfuls; returns how many were actually there. */
  public takeForage(n: number): number {
    if (!Number.isFinite(n) || n <= 0) return 0;
    this.regrowForage();
    this.forageTaken += n;
    return n;
  }

  /**
   * Let what was taken grow back, over elapsed game-time.
   *
   * ⭐ **Depletion is a choice, not a tragedy** (the slate's rule): a
   * picked-over hedge comes back, so over-gathering costs you today and
   * nothing next month. The regrowth is absolute rather than
   * proportional, so ground picked to nothing recovers at the same rate
   * as ground barely touched — which is what a hedgerow does.
   */
  private regrowForage(): void {
    const nowS = this.forageNow();
    if (nowS === null) return;
    if (this.forageStamp === 0) {
      this.forageStamp = nowS;
      return;
    }
    const elapsed = nowS - this.forageStamp;
    if (elapsed <= 0) {
      this.forageStamp = nowS;
      return;
    }
    const days = elapsed / SECONDS_PER_GAME_DAY;
    this.forageTaken = Math.max(0, this.forageTaken - days * HANDFULS_REGROWN_PER_GAME_DAY);
    this.forageStamp = nowS;
  }

  /** Game-seconds now, or null when no world clock (pre-boot / tests). */
  private forageNow(): number | null {
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
    return WorldClockApi.getNow().rawValue();
  }

  public getFieldName(): string { return this.fieldName; }
  public setFieldName(value: string): void { this.fieldName = value; }

  public getAreaM2(): number { return this.areaM2; }
  public setAreaM2(value: number): void {
    this.areaM2 = Math.max(0, value);
  }

  /** The spot this ground samples on the soil field. */
  public getGroundSpot(): Spot {
    return [this.groundSpotX, this.groundSpotY];
  }

  public setGroundSpot(spot: Spot): void {
    this.groundSpotX = Math.round(spot[0]);
    this.groundSpotY = Math.round(spot[1]);
  }

  // ---------- the two hooks SoilMixin asks of its host ----------

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

  /** Every square metre of it catches rain. That is what a field is. */
  public override soilCatchmentAreaM2(): number {
    return this.areaM2;
  }

  /**
   * ⭐ **What drinks this soil is the grass standing in it.** The pot and
   * the bed answer with their occupants' summed demand; a field answers
   * with its sward's transpiration, which is the same question asked of a
   * different kind of ground.
   */
  public override soilWaterDemandPerGameDay(): number {
    return this.swardTranspirationPerGameDay();
  }

  // ---------- the three hooks the sward asks of its host ----------

  /** Every square metre of a field is sward, until something else is sown. */
  public override swardAreaM2(): number {
    return this.areaM2;
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
  public override swardGrowthFactor(): number {
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
    if (this._ambientK > 0) {
      // GRASS_BASE_K is the base temperature every growing-degree-day sum
      // in agronomy is measured against, and it is why a sward stops in
      // December without anybody writing down that it is December.
      factors.push(
        clampUnit((this._ambientK - GRASS_BASE_K) / (GRASS_HAPPY_K - GRASS_BASE_K)),
      );
    }
    if (this._daylightFraction >= 0) {
      // ⭐ Photoperiod, not irradiance. Short days limit a temperate
      // sward well before the light gets dim, which is why growth is
      // over in October and not in the first hard frost.
      factors.push(
        clampUnit(
          (this._daylightFraction - DAYLIGHT_STOP) / (DAYLIGHT_HAPPY - DAYLIGHT_STOP),
        ),
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

  // ---------- minting ----------

  /**
   * Install the soil reserves this ground's **character and area** call
   * for — the multiplication D2 is about, made concrete.
   *
   * ⭐ **Capacity is derived, never authored.** A hectare of clay holds
   * more water than a hectare of sand, and both hold more than a garden
   * bed, and none of those three numbers is a balance dial: they are
   * `area × texture × the water a soil holds`. An author who wants a
   * thirstier field authors a drier place, not a smaller number.
   *
   * Idempotent — a restored field keeps the reserves its record carried,
   * because a reserve is *state* and re-installing would erase the
   * history the whole ledger exists to keep.
   */
  public installSoilReserves(sample: GroundSample): void {
    const host = this as unknown as {
      hasReserve(k: string): boolean;
      setReserve(r: Reserve): void;
    };
    if (!host.hasReserve(SOIL_MOISTURE_RESERVE_KEY)) {
      const litres =
        this.areaM2 *
        LITRES_PER_M2_LOAM *
        GroundCharacter.waterHoldingFactor(sample.texture);
      host.setReserve(
        new Reserve(
          SOIL_MOISTURE_RESERVE_KEY,
          Quantity.of(litres, 'L'),
          // ⭐ Half full at the moment it is plotted, and that is not a
          // kindness: ground you have just cut the sod off is neither
          // saturated nor a dust bowl, and the sky takes it from there.
          Quantity.of(litres / 2, 'L'),
          SOIL_RESERVE_THEME,
          null,
        ),
      );
    }
    if (!host.hasReserve(SOIL_NITROGEN_RESERVE_KEY)) {
      host.setReserve(
        new Reserve(
          SOIL_NITROGEN_RESERVE_KEY,
          Quantity.of(100, '%'),
          // ⚠ Rough ground is not fertile ground. What is here is what
          // scrub and grass put back over the years nobody worked it,
          // and the whole nitrogen ledger is about what happens next.
          Quantity.of(25, '%'),
          SOIL_RESERVE_THEME,
          null,
        ),
      );
    }
  }

  /**
   * What this ground IS — the resolved seeded sample, computed live and
   * stored nowhere.
   *
   * @param model the covering authored character, or `null` (the
   *   ordinary case — see {@link GroundCharacter.resolve})
   */
  public groundSample(model: GroundCharacter | null, seed: number): GroundSample {
    return GroundCharacter.resolve(model, this.getGroundSpot(), seed);
  }

  /**
   * The improvement bill this ground's character calls for — the
   * requirement every `Improvable` read measures against.
   *
   * ⚠ Convenience only: it re-resolves the sample each call and stores
   * nothing, which is the seeded field's whole contract.
   */
  public improvementBill(
    model: GroundCharacter | null,
    seed: number,
  ): ImprovementCost {
    return GroundCharacter.improvementCost(this.groundSample(model, seed));
  }

  /** How this field presents itself — its name, when its holder gave it one. */
  public override getPresentation(): string {
    return this.fieldName || super.getPresentation();
  }

  /**
   * Install the sward alongside the soil reserves — one call, because a
   * field with soil and no grass on it is not a state the world has.
   */
  public installFieldReserves(sample: GroundSample): void {
    this.installSoilReserves(sample);
    this.installSward();
    // Learn where — and when — it is, the moment it exists.
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

function clampUnit(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
