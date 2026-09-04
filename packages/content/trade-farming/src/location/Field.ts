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
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import GroundCharacter, { type GroundSample, type Spot } from '../idea/GroundCharacter';

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

// The ground half — composed FIRST and separately, because soil's host
// constraint is `Stuff & Reserved` alone. Naming the intermediate stack
// is not cosmetic: inference through this many nested generic mixin
// factories in one expression collapses to `never`.
const FieldGround = SoilMixin(ReservedMixin(CartesianLocation));

const FieldBase = PersistableMixin(WarrenMemberMixin(FieldGround));

export default class Field extends FieldBase {
  static fieldMeta: FieldMeta = {
    fieldName: { persistent: true, authorable: true },
    groundSpotX: { persistent: true, authorable: true },
    groundSpotY: { persistent: true, authorable: true },
    areaM2: { persistent: true, authorable: true },
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

  /** How this field presents itself — its name, when its holder gave it one. */
  public override getPresentation(): string {
    return this.fieldName || super.getPresentation();
  }
}
