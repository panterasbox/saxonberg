/**
 * ZoneApi — template-path → spatial-Zone resolution.
 *
 * A Stuff's `zone` is derived from the nearest ancestor path in the
 * `domain` collection whose template resolves to a *spatial* Zone class
 * (`SPATIAL_ZONE_CLASS_PATHS`). ZoneApi is the single entry point for
 * that derivation.
 *
 * Caching is delegated to `StuffApi.singleton()` — Zone subclasses compose
 * `SingletonMixin`, so any clone-by-path resolves to a unique instance and
 * subsequent `singleton()` calls hit the cache automatically. ZoneApi no
 * longer maintains its own `zoneByPath` / `zoneByStuffId` indexes.
 *
 * **Two class-path sets** drive different concerns:
 *
 * - `FOLDER_CLASS_PATHS` — every Zone subclass that participates in the
 *   folder/leaf invariant. Drives `TemplateApi.validateFolderLeafSave` /
 *   `validateFolderLeafDelete` (i.e. "this template kind may have
 *   descendants"). Includes spatial Zones (`CartesianZone`,
 *   `SphericalZone`) and non-spatial Zones (`Clade`, future
 *   permission-grouping zones, future runtime-rule scopes).
 *
 * - `SPATIAL_ZONE_CLASS_PATHS` — the strict subset whose templates
 *   stamp `Stuff.zone` via `resolveZoneForPath`. Non-spatial Zones do
 *   NOT participate in `Stuff.zone` because the field is the
 *   nearest-spatial-zone reference, not a generic folder reference.
 *
 * `SPATIAL_ZONE_CLASS_PATHS ⊂ FOLDER_CLASS_PATHS`. Adding a new spatial
 * Zone subclass means adding its class path to BOTH; adding a new
 * non-spatial Zone (a future taxonomic, permission, or rule scope)
 * means adding it to `FOLDER_CLASS_PATHS` only.
 */

import { StuffApi } from './stuff';
import { Template } from '../lib/stuff/Template';
import type { SpatialZone } from '../lib/spatial/SpatialZone';
import { SecurityApi } from './security';

/**
 * Class paths (as stored in `domain.class`) whose templates participate
 * in the folder/leaf invariant — i.e. "this template kind may have
 * descendant templates beneath it." Used by `TemplateApi`.
 *
 * Includes every Zone subclass: spatial (CartesianZone, SphericalZone)
 * and non-spatial (Clade — taxonomic scope unit). The non-spatial
 * entries are the live demonstration of the Phase Z3 split:
 * `FOLDER_CLASS_PATHS` ⊋ `SPATIAL_ZONE_CLASS_PATHS`.
 */
export const FOLDER_CLASS_PATHS: ReadonlySet<string> = new Set<string>([
  '/lib/spatial/CartesianZone',
  '/lib/spatial/SphericalZone',
  '/lib/species/Clade',
]);

/**
 * Class paths whose templates stamp `Stuff.zone` via the
 * `resolveZoneForPath` walk. Strict subset of `FOLDER_CLASS_PATHS`:
 * non-spatial Zones (Clade) are folders but never become a `Stuff.zone`.
 *
 * Add a new spatial Zone subclass here AND in `FOLDER_CLASS_PATHS`.
 */
export const SPATIAL_ZONE_CLASS_PATHS: ReadonlySet<string> = new Set<string>([
  '/lib/spatial/CartesianZone',
  '/lib/spatial/SphericalZone',
]);

export class ZoneApi {
  /**
   * Resolve the nearest *spatial* zone for a template path.
   *
   * Walks ancestor paths from nearest to root; returns the singleton
   * SpatialZone at the first ancestor whose template's `class` is in
   * `SPATIAL_ZONE_CLASS_PATHS`. Non-spatial zone ancestors (Clades,
   * future permission/rule scopes) are skipped — they're folders for
   * the template-tree invariant, but not the spatial zone for the
   * descendant.
   *
   * Returns `null` when:
   *   - The template at `templatePath` is itself a spatial Zone (a zone
   *     isn't inside itself).
   *   - No ancestor resolves to a spatial Zone template.
   *
   * Calls `StuffApi.singleton(ancestor)` so the second resolution for
   * the same zone path is an O(1) cache hit; first resolution clones.
   *
   * @param templatePath - e.g. `/narnia/castle/foyer`
   */
  public static async resolveZoneForPath(
    templatePath: string
  ): Promise<SpatialZone | null> {
    const selfTemplate = await Template.findByPath(templatePath);
    if (selfTemplate && SPATIAL_ZONE_CLASS_PATHS.has(selfTemplate.class)) {
      return null;
    }

    for (const ancestor of Template.ancestorPaths(templatePath)) {
      const ancestorTpl = await Template.findByPath(ancestor);
      if (!ancestorTpl) continue;
      if (!SPATIAL_ZONE_CLASS_PATHS.has(ancestorTpl.class)) continue;
      return await StuffApi.singleton<SpatialZone>(ancestor);
    }
    return null;
  }
}

SecurityApi.decorateApiClass(ZoneApi);
