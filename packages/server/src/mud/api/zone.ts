/**
 * ZoneApi — template-path → Zone resolution + runtime Zone cache.
 *
 * A Stuff's zone is derived from the nearest ancestor path in the `domain`
 * collection whose template resolves to a Zone class. ZoneApi is the
 * single entry point for that derivation, and for fetching zones by
 * stuffId when persistence hydrates a `zoneId` back into a live reference.
 *
 * Zone classes used in Phase 7 are whitelisted below. Adding a new Zone
 * subclass means adding its class path to `ZONE_CLASS_PATHS` — a
 * one-line change and far cheaper than runtime instanceof checks on
 * every template lookup.
 */

import { PersistenceManager, Collections } from '../../backend/PersistenceManager';
import { StuffApi } from './stuff';
import type { Zone } from '../lib/spatial/Zone';
import type { DomainTemplate } from './stuff';

/**
 * Class paths (as stored in `domain.class`) whose templates should be
 * treated as Zone folders. Add new Zone subclasses here.
 *
 * Shared with `TemplateApi` (folder/leaf invariant enforcement): both use
 * this set to classify "is this template a zone folder?".
 */
export const ZONE_CLASS_PATHS: ReadonlySet<string> = new Set<string>([
  '/lib/spatial/CartesianZone',
  '/lib/spatial/SphericalZone',
]);

/**
 * Cached clone of a Zone keyed by template path. Zones are expensive to
 * rebuild (they own a grid or room index) but rarely mutate — cache the
 * first clone and reuse.
 */
const zoneByPath: Map<string, Zone> = new Map();

/** Cached zone keyed by its stuffId — for persistence rehydration. */
const zoneByStuffId: Map<string, Zone> = new Map();

export class ZoneApi {
  /**
   * Resolve the zone a template at `templatePath` belongs to.
   *
   * Walks ancestor paths from nearest to root; returns the Zone at the
   * first ancestor that resolves to a Zone template. Returns `null` when:
   *   - The template at `templatePath` is itself a Zone (a zone isn't
   *     inside itself).
   *   - No ancestor resolves to a Zone template.
   *
   * @param templatePath - e.g. `/narnia/castle/foyer`
   */
  public static async resolveZoneForPath(templatePath: string): Promise<Zone | null> {
    const selfTemplate = await this.#loadTemplate(templatePath);
    if (selfTemplate && ZONE_CLASS_PATHS.has(selfTemplate.class)) {
      return null;
    }

    const ancestors = this.#ancestorPaths(templatePath);
    for (const ancestor of ancestors) {
      const ancestorTpl = await this.#loadTemplate(ancestor);
      if (!ancestorTpl) continue;
      if (!ZONE_CLASS_PATHS.has(ancestorTpl.class)) continue;

      const cached = zoneByPath.get(ancestor);
      if (cached) return cached;

      const zone = await StuffApi.clone<Zone>(ancestor);
      zoneByPath.set(ancestor, zone);
      zoneByStuffId.set(zone.stuffId, zone);
      return zone;
    }
    return null;
  }

  /**
   * Find a previously cloned zone by its runtime stuffId. Used by
   * persistence rehydration when a `zoneId` is deserialized back into a
   * live reference.
   */
  public static resolveById(zoneId: string): Zone | undefined {
    return zoneByStuffId.get(zoneId);
  }

  /**
   * Drop the caches — test-only.
   */
  public static clearCache(): void {
    zoneByPath.clear();
    zoneByStuffId.clear();
  }

  static async #loadTemplate(path: string): Promise<DomainTemplate | null> {
    const templates = await PersistenceManager.get().find(Collections.Domain, { path });
    if (templates.length === 0) return null;
    return templates[0] as unknown as DomainTemplate;
  }

  /**
   * Generate ancestor paths, nearest first: `/a/b/c` → `['/a/b', '/a']`.
   * The root `/` is excluded. Empty string handled defensively.
   */
  static #ancestorPaths(path: string): string[] {
    const segments = path.split('/').filter((s) => s.length > 0);
    const ancestors: string[] = [];
    for (let i = segments.length - 1; i > 0; i--) {
      ancestors.push('/' + segments.slice(0, i).join('/'));
    }
    return ancestors;
  }
}
