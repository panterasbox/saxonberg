/**
 * Zone — abstract scope / folder unit of the template tree.
 *
 * After the Phase Z1 refactor, `Zone` is the *bare* scope abstraction: it
 * carries a name and the folder-of-templates contract, nothing else. Concrete
 * Zone flavors layer behavior on top:
 *
 * - `SpatialZone` (in `lib/spatial/`) — abstract intermediate carrying the
 *   location-aware surface (`addLocation`, `getLocations`, `deriveExit`, …).
 *   `CartesianZone` and `SphericalZone` extend `SpatialZone`, not `Zone`.
 * - `Clade` (in `lib/species/`) — taxonomic scope (kingdoms, sub-clades).
 *   Members are Species, not Locations; extends `Zone` directly.
 *
 * Future Zone flavors (permission-grouping zones, runtime-rule scopes) layer
 * in the same way: extend `Zone`, declare their own member type. The
 * folder/leaf invariant picks them up automatically — `ZoneApi.isFolderClass`
 * checks `prototype instanceof Zone`, so any new subclass participates
 * without editing a central allow-list.
 *
 * Zones are stored as CMS templates in the `domain` collection. `Stuff.zone`
 * (on the Stuff base) holds the nearest *spatial* zone reference; non-spatial
 * Zone ancestors (Clades) do NOT stamp onto `Stuff.zone` — see
 * `ZoneApi.resolveZoneForPath` and `ZoneApi.isSpatialZoneClass`.
 */

import { Idea } from '../stuff/Idea';

/**
 * Abstract base for all Zone flavors. Holds nothing zone-flavor-specific —
 * just a name and the folder-of-templates contract that subclasses inherit
 * by virtue of extending `Zone` (`ZoneApi.isFolderClass` checks
 * `prototype instanceof Zone`, so the contract is structural).
 */
export abstract class Zone extends Idea {
  /**
   * Human-readable zone name ("Narnia Castle", "The Caves", "Animalia", …).
   */
  protected name: string = '';

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }
}
