/**
 * SpatialZone — abstract intermediate layering location-aware behavior on Zone.
 *
 * The bare `Zone` is a scope/folder unit (templates use Zone-class folders to
 * carry policy that descendants inherit). `SpatialZone` adds the topographical
 * surface: a Set of member Locations and the location/zone back-reference
 * dance. Exits are authored explicitly on every room — the zone does not
 * synthesize them (CartesianZone *validates* cardinal-exit geometry instead).
 *
 * `CartesianZone` and `SphericalZone` extend this — not `Zone` directly.
 *
 * Non-spatial Zone subclasses (`Clade`, future permission-grouping zones,
 * future runtime-rule scopes) extend bare `Zone`. They reuse the
 * folder-of-templates contract without inheriting location-aware behavior.
 */
import { Zone } from './Zone';
import type Location from '../stuff/Location';
import type { VetoResult } from '../errors';
import type { FieldMeta } from '../mixin';
import type { BlessingOdds } from '../magic/Blessing';

/**
 * Abstract base for all topographical Zone subtypes (`CartesianZone`,
 * `SphericalZone`): a Set of member Locations + the zone back-reference.
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
   * Hydrator silently dropped any authored zone-level value and the
   * documented override could never fire — the same silent-drop bug
   * `stocks`/`favours` had. Declared here with them. Nothing ships an
   * authored zone value yet; the item-level field is a different one, on
   * the item.
   */
  protected blessingOdds: BlessingOdds | null = null;

  public getBlessingOdds(): BlessingOdds | null { return this.blessingOdds; }
  public setBlessingOdds(value: BlessingOdds | null): void { this.blessingOdds = value; }

  /**
   * Locations that live in this zone. Populated by the subclass's
   * `addLocation()`. Host-internal storage; external callers go
   * through `getLocations()` / `contains()`.
   *
   * Membership is maintained by the SpatialZone; `Location.zone` (on the
   * Stuff base) is the back-reference stamped when the location is added.
   */
  protected locations: Set<Location> = new Set();

  public getLocations(): ReadonlySet<Location> { return this.locations; }

  /**
   * Mark a location as belonging to this zone.
   * Subclasses may extend to capture coordinates (CartesianZone stamps grid
   * position, SphericalZone stamps focus tuple).
   */
  public addLocation(location: Location): void {
    this.locations.add(location);
    location.setZone(this);
  }

  /**
   * Remove a location from this zone. Clears the back-reference.
   */
  public removeLocation(location: Location): boolean {
    const removed = this.locations.delete(location);
    if (removed && location.getZone() === this) {
      location.setZone(null);
    }
    return removed;
  }

  /**
   * Does this zone contain the given location?
   */
  public contains(location: Location): boolean {
    return this.locations.has(location);
  }

  /**
   * Refuse to destruct a non-empty SpatialZone. Caller must drain the
   * member locations (destruct or relocate) before destructing the
   * zone itself. Refusal is bypassable via `StuffApi.forceDestruct`
   * (admin-gated).
   *
   * Witness shape: `canDestruct` returns `VetoResult` per the
   * destruct hook contract in `StuffApi.destruct`.
   *
   * @hook Invoked by `StuffApi.destruct` first, before `onDestruct`.
   *   **Veto** — return `{ ok: false, reason }` to refuse destruction
   *   (raises `DestructError`) or `{ ok: true }` to allow.
   *   `forceDestruct` still fires it (so observers run) but ignores the
   *   veto. There is no base declaration on `Stuff`; implement on any
   *   subclass that guards its own destruction — this declaration is
   *   the canonical contract for the optional hook.
   */
  public canDestruct(): VetoResult {
    if (this.locations.size > 0) {
      return {
        ok: false,
        reason:
          `cannot destruct zone '${this.getName()}' with ` +
          `${this.locations.size} live location(s); ` +
          `destruct locations first`,
      };
    }
    return { ok: true };
  }
}
