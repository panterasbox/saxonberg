/**
 * SpatialZone — abstract intermediate layering location-aware behavior on Zone.
 *
 * The bare `Zone` is a scope/folder unit (templates use Zone-class folders to
 * carry policy that descendants inherit). `SpatialZone` adds the REGION: the
 * fields only a place in space can carry (what it stocks, its address, the
 * ground under it, what can be seen from it).
 *
 * ⭐ It does NOT hold rooms. That half is `LocationZoneMixin`
 * (`lib/zone/LocationZone.ts`), composed by `CartesianZone` and
 * `SphericalZone`; an `Expanse` (`lib/expanse/Expanse.ts`) is a region in
 * space whose points of interest are Ideas, and it composes no Location
 * half. Until the maritime build the two were one class, which made every
 * future frame inherit a room set it had to guard against.
 *
 * Non-spatial Zone subclasses (`Clade`, future permission-grouping zones,
 * future runtime-rule scopes) extend bare `Zone`. They reuse the
 * folder-of-templates contract without inheriting location-aware behavior.
 */
import { Zone } from './Zone';
import type { FieldMeta } from '../mixin';
import type { BlessingOdds } from '../magic/Blessing';
import type { CelestialProfile } from '../time/CelestialProfile';
import { Suppressions } from '../magic/Suppression';
import type { MagicSuppression } from '../magic/Suppression';

/**
 * Abstract base for every region in space: the room-holding zones
 * (`CartesianZone`, `SphericalZone`, via `LocationZoneMixin`) and the
 * frames that hold no rooms (`Expanse`).
 */
export abstract class SpatialZone extends Zone {
  /**
   * The region fields the spawn sweep reads, all three off the ordinary
   * `lookupField` walk so a parent region's declaration covers its
   * descendants and a child can narrow it.
   *
   * ⭐ They are declared HERE, not on `Zone`, and that is the point: only
   * a region **in space** can stock goods. A `FolderZone` is a namespace
   * root (`/wiki`, `/home`, `/studio`) and "how many bottles of vodka
   * stand in the wiki namespace" is not a question — but an `authorable`
   * field on the base offers exactly that, for every zone in the game, in
   * the studio's composition panel. Behaviour is unchanged either way:
   * `lookupField` consults ancestors, so a zone that does not declare
   * them walks on and the reader takes its empty default.
   */
  static fieldMeta: FieldMeta = {
    stocks: { persistent: true, authorable: true },
    favours: { persistent: true, authorable: true },
    blessingOdds: { persistent: true, authorable: true },
    address: { persistent: true, authorable: true },
    // ⭐ Two CITATIONS the kernel stores and does not interpret: each
    // names a `/system/ground` model (`Deposit`, `GroundCharacter`) that
    // the kernel cannot import. They are declared here — on a kernel class
    // — because a pack cannot add a field to one: the hydrator silently
    // discards what no `fieldMeta` declares, and that is exactly how the
    // authored soil layer shipped unreachable the first time. Since the
    // ground build a `Floor` on grade follows them through
    // `GroundSourceMixin`, which is the seam that lets the kernel ask a
    // question it cannot import the answer to.
    deposit: { persistent: true, authorable: true },
    groundCharacter: { persistent: true, authorable: true },
    celestialProfile: { persistent: true, authorable: true },
    suppressesMagic: { persistent: true, authorable: true },
    visibleLandmarks: { persistent: true, authorable: true },
  };

  /**
   * What this region STOCKS: census key → target count, the zone-side
   * override of a floor row's own `regionTarget` (`ResidencyLogic` reads
   * it through `lookupField('stocks')`). `null` = not declared here. A
   * distillery's yard authors `{ 'spirit:vodka': 24 }` and the spawn
   * sweep stands the floor at that count; a `0` means "none of that here".
   */
  protected stocks: Record<string, number> | null = null;

  public getStocks(): Record<string, number> | null { return this.stocks; }
  public setStocks(value: Record<string, number> | null): void { this.stocks = value; }

  /**
   * Material tags this region FAVOURS (place affinity — a mine stocks
   * metal, a grove wood): the spawn table's second multiplier
   * (`SpawnTable.weightFor` multiplies rarity by it), read by the same
   * walk. `null` = not declared here.
   */
  protected favours: string[] | null = null;

  public getFavours(): string[] | null { return this.favours; }
  public setFavours(value: string[] | null): void { this.favours = value; }

  /**
   * BUC weights this region imposes, overriding an item's own generation
   * odds zone-wide — *this PLACE is like that*
   * ([magic-items.md](../../../../docs/subsystems/magic-items.md)).
   *
   * ⚠ `ResidencyLogic` has read this through `lookupField('blessingOdds')`
   * since the magic-items build, but **no Zone class declared it**, so the
   * applier silently dropped any authored zone-level value and the
   * documented override could never fire — the same silent-drop bug
   * `stocks`/`favours` had. Declared here with them. Nothing ships an
   * authored zone value yet; the item-level field is a different one, on
   * the item.
   */
  protected blessingOdds: BlessingOdds | null = null;

  public getBlessingOdds(): BlessingOdds | null { return this.blessingOdds; }
  public setBlessingOdds(value: BlessingOdds | null): void { this.blessingOdds = value; }

  /**
   * ⭐ **The address this region sits at** — `terminus/rejection`, or
   * `null` to walk on.
   *
   * `AddressLogic.resolveAddressString` has always had this as its step
   * 2: walk containment-outward for a place declaring its own address,
   * and failing that ask the zone. ⚠⚠ **Step 2 could never fire.** No
   * zone class declared `address` in `fieldMeta`, so an authored value
   * was silently discarded by the hydrator and `lookupField('address')`
   * always answered `null` — the documented `source: 'zone'` was an
   * unreachable branch of a shipped enum. Declaring it here is the whole
   * fix; the resolver is unchanged.
   *
   * ⭐ It is the reason the field belongs on a ZONE rather than on each
   * room. A locality is a region, and its rooms are in it — so one
   * declaration on the region covers every room the zone walk reaches,
   * including **minted** ones, which can never declare anything for
   * themselves. Hinkley authors `_address` on two rooms and the rest of
   * the suburb resolves nothing; a mine that grows new workings at
   * runtime cannot use that pattern at all.
   *
   * ⚠ On `SpatialZone` and not on `Zone`, for the same reason
   * `stocks`/`favours` are: a `FolderZone` is a namespace root, and
   * *"what is the street address of `/wiki`"* is not a question.
   */
  protected address: string | null = null;

  public getAddress(): string | null { return this.address; }
  public setAddress(value: string | null): void { this.address = value ?? null; }

  /**
   * ⭐ **The `Deposit` row governing the ground under this region**, or
   * `null` to walk on.
   *
   * The ground model — stratigraphy, water table, the lode and its
   * gangue — is a property of the LAND, in exactly the sense elevation
   * is. So it is inherited by the ordinary `lookupField` walk, and a
   * declaration on a region covers the surface outcrop and the workings
   * beneath it alike: the outcrop, the float and the three-point problem
   * are all played above ground, so a deposit declared only on a mine's
   * own zone would leave a prospector standing on the stain with nothing
   * to measure.
   *
   * ⚠⚠ **This replaces `trade-mining`'s `MineZone`, and the deletion is
   * the point.** A pack cannot add a field to a kernel class — the
   * failure is silent, and it cost a live drive to find — so mining
   * shipped a `CartesianZone` subclass carrying this one field. But then
   * the zone covering a whole town had to be classed `MineZone`, which
   * said *this town is a mine*. It is not: Rejection is the town, the
   * Ferrow is the orebody, and the diggings are the workings on it. A
   * region that declares what is under it is not thereby a mine.
   *
   * ⭐ The string is **opaque to the kernel** — it is interpreted by
   * whichever pack owns the `Deposit` class, exactly as `Locality._reach`
   * carries a watercourse citation the kernel never resolves. Carrying a
   * citation is not importing a concept.
   */
  protected deposit: string | null = null;

  public getDeposit(): string | null { return this.deposit; }
  public setDeposit(value: string | null): void { this.deposit = value ?? null; }

  /**
   * ⭐ **The `GroundCharacter` row governing the SOIL over this region**,
   * or `null` to walk on. `deposit`'s sibling, one layer up: the same
   * land, read by the farmer instead of the miner.
   *
   * ⚠⚠ **It is declared here for the reason `deposit` is, and the reason
   * is a defect this build repeated.** A pack cannot add a field to a
   * kernel class and the failure is SILENT — the hydrator discards what
   * no `fieldMeta` declares, `lookupField` then answers `null` forever,
   * and the authored half of a three-layer model becomes an unreachable
   * branch that every test still passes because tests hand the model in
   * directly. Mining paid for that lesson with a live drive; farming
   * shipped `zone.lookupField('groundCharacter')` against nothing and
   * cost a second one.
   *
   * ⭐ Soil is a property of the LAND, so the ordinary ancestor walk is
   * the right carrier: a farm's own zone declares its ground, or a
   * region declares the ground under a whole valley and every field cut
   * in it inherits the same clay.
   *
   * The string is **opaque to the kernel** — `trade-farming` owns the
   * `GroundCharacter` class and the fold that reads it. Carrying a
   * citation is not importing a concept.
   */
  protected groundCharacter: string | null = null;

  public getGroundCharacter(): string | null { return this.groundCharacter; }
  public setGroundCharacter(value: string | null): void {
    this.groundCharacter = value ?? null;
  }

  /**
   * ⚠⚠ **Two more that were never declared, and the gate that found
   * them.** Both are documented, shipped read paths — `CelestialLogic`
   * asks `lookupField('celestialProfile')` and `MagicLogic` asks
   * `lookupField('suppressesMagic')`, the second being the region-scale
   * ward magic.md describes — and until now **no zone class declared
   * either**, so both walks answered `null` for every zone in the game
   * and no author could have made them do otherwise.
   *
   * `suppressesMagic` is declared on `Location`, which is why it looked
   * fine: a ROOM can carry a ward, and the region-scale one the doc
   * promises was the unreachable half.
   *
   * ⭐ They were found by asking the question from the reader's end —
   * *every name any code looks up must be declared somewhere* — after
   * `groundCharacter` made it three. That check is
   * `SpatialZone.authoredFields.test.ts`.
   */
  protected celestialProfile: CelestialProfile | null = null;

  public getCelestialProfile(): CelestialProfile | null {
    return this.celestialProfile;
  }
  public setCelestialProfile(value: CelestialProfile | null): void {
    this.celestialProfile = value ?? null;
  }

  /** The region-scale anti-magic field, or `null`. See above. */
  protected suppressesMagic: MagicSuppression | null = null;

  public getSuppressesMagic(): MagicSuppression | null {
    return this.suppressesMagic;
  }
  public setSuppressesMagic(value: MagicSuppression | null): void {
    // Per-field invariant on the setter, exactly as `Location` has it:
    // `Suppressions.validate` throws on a bad verbs/nouns filter.
    this.suppressesMagic = Suppressions.validate(value);
  }

  /**
   * ⭐ **The Structures visible from anywhere in this region** — template
   * paths of `Structure` rows whose outside description `look` appends to
   * every room the zone walk reaches, or `null` to walk on.
   *
   * Landmark visibility is REGIONAL, not per-room: the clock tower is seen
   * from the whole avenue, so one declaration on the avenue's zone covers
   * every room in it, and the tower's sentence is authored once on the
   * tower. An authored `[]` is an answer — *nothing is visible from here*
   * — and stops the walk, which is how an interior under a region that
   * sees the tower says it does not.
   *
   * Every land range is authored here; only at sea does the engine compute
   * one (`ExpanseApi.sightRangeNm`), because ashore obstruction binds and
   * at sea curvature does.
   */
  protected visibleLandmarks: string[] | null = null;

  public getVisibleLandmarks(): string[] | null { return this.visibleLandmarks; }
  public setVisibleLandmarks(value: string[] | null): void {
    this.visibleLandmarks = value ?? null;
  }
}
