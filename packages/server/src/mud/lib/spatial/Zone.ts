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
 * in the same way: extend `Zone`, declare their own member type, and join
 * `FOLDER_CLASS_PATHS` (in `api/zone.ts`) to participate in the folder/leaf
 * invariant.
 *
 * Zones are stored as CMS templates in the `domain` collection. `Stuff.zone`
 * (on the Stuff base) holds the nearest *spatial* zone reference; non-spatial
 * Zone ancestors (Clades) do NOT stamp onto `Stuff.zone` — see
 * `ZoneApi.resolveZoneForPath` and `SPATIAL_ZONE_CLASS_PATHS`.
 */

import { Idea } from '../stuff/Idea';

/**
 * Abstract base for all Zone flavors. Holds nothing zone-flavor-specific —
 * just a name and the folder-of-templates contract that subclasses inherit
 * by virtue of being in `FOLDER_CLASS_PATHS`.
 */
export abstract class Zone extends Idea {
  /**
   * Human-readable zone name ("Narnia Castle", "The Caves", "Animalia", …).
   */
  protected name: string = '';

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }
}
