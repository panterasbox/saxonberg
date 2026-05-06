/**
 * ZoneApi — template-path → Zone resolution.
 *
 * A Stuff's zone is derived from the nearest ancestor path in the `domain`
 * collection whose template resolves to a Zone class. ZoneApi is the single
 * entry point for that derivation.
 *
 * Caching is delegated to `StuffApi.singleton()` — Zone subclasses compose
 * `SingletonMixin`, so any clone-by-path resolves to a unique instance and
 * subsequent `singleton()` calls hit the cache automatically. ZoneApi no
 * longer maintains its own `zoneByPath` / `zoneByStuffId` indexes.
 *
 * Zone classes used today are whitelisted in `ZONE_CLASS_PATHS` below.
 * Adding a new Zone subclass means adding its class path here. The same
 * set is used by `TemplateApi` for the folder/leaf invariant — it
 * identifies which template *kinds* may have descendant templates, which
 * is a separate concern from singleton-ness even though the two sets
 * happen to overlap today.
 */

import { StuffApi } from './stuff';
import { Template } from '../lib/stuff/Template';
import type { Zone } from '../lib/spatial/Zone';
import { SecurityApi } from './security';

/**
 * Class paths (as stored in `domain.class`) whose templates should be
 * treated as Zone folders. Add new Zone subclasses here.
 *
 * Shared with `TemplateApi` for folder/leaf invariant enforcement: both
 * use this set to classify "is this template a zone folder?". This is a
 * structural-aggregation concept distinct from `SingletonMixin`
 * composition; do not collapse the two.
 */
export const ZONE_CLASS_PATHS: ReadonlySet<string> = new Set<string>([
  '/lib/spatial/CartesianZone',
  '/lib/spatial/SphericalZone',
]);

export class ZoneApi {
  /**
   * Resolve the zone a template at `templatePath` belongs to.
   *
   * Walks ancestor paths from nearest to root; returns the singleton Zone
   * at the first ancestor that resolves to a Zone template. Returns
   * `null` when:
   *   - The template at `templatePath` is itself a Zone (a zone isn't
   *     inside itself).
   *   - No ancestor resolves to a Zone template.
   *
   * Calls `StuffApi.singleton(ancestor)` so the second resolution for
   * the same zone path is an O(1) cache hit; first resolution clones.
   *
   * @param templatePath - e.g. `/narnia/castle/foyer`
   */
  public static async resolveZoneForPath(templatePath: string): Promise<Zone | null> {
    const selfTemplate = await Template.findByPath(templatePath);
    if (selfTemplate && ZONE_CLASS_PATHS.has(selfTemplate.class)) {
      return null;
    }

    for (const ancestor of Template.ancestorPaths(templatePath)) {
      const ancestorTpl = await Template.findByPath(ancestor);
      if (!ancestorTpl) continue;
      if (!ZONE_CLASS_PATHS.has(ancestorTpl.class)) continue;
      return await StuffApi.singleton<Zone>(ancestor);
    }
    return null;
  }
}

SecurityApi.decorateApiClass(ZoneApi);
