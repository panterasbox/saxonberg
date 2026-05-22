/**
 * ZoneApi — template-path → spatial-Zone resolution + folder/spatial
 * class predicates.
 *
 * Two concerns this module owns:
 *
 * 1. Resolve a template path to its nearest *spatial* zone via
 *    `resolveZoneForPath`. Stuff stamping (the `Stuff.zone` field)
 *    walks ancestor paths nearest-first, picking the first ancestor
 *    whose `class:` resolves to a `SpatialZone` subclass. Non-spatial
 *    Zone subclasses (Clade, future taxonomic / permission scopes)
 *    are skipped — they're folders for the template-tree invariant,
 *    but never become a `Stuff.zone`.
 *
 * 2. Answer "is this class a folder?" / "is this class a spatial
 *    zone?" via `isFolderClass` / `isSpatialZoneClass`. The check is
 *    structural: dynamic-import the class from its path-string,
 *    consult `prototype instanceof Zone` (or `instanceof SpatialZone`
 *    for the subset). Content devs add folder/spatial-zone classes by
 *    `extends Zone` / `extends SpatialZone` — no central allow-list
 *    to edit.
 *
 * Caching is delegated to `StuffApi.singleton()` (for runtime
 * instances) and to a per-classPath result map below (for the
 * structural checks). The dynamic import itself is also cached by the
 * JS module cache; the local maps just save the prototype walk.
 */

import { StuffApi } from './stuff';
import { Template } from '../lib/stuff/Template';
import { Zone } from '../lib/zone/Zone';
import { SpatialZone } from '../lib/zone/SpatialZone';
import { SecurityApi } from './security';

/**
 * Cache of `classPath → prototype instanceof Zone` results. The check
 * is structural and stable across the process lifetime — a class
 * that extends Zone today still extends it tomorrow. Cleared by
 * `_clearClassCaches` for tests.
 */
const folderClassCache = new Map<string, boolean>();
const spatialZoneClassCache = new Map<string, boolean>();

interface ClassWithPrototype {
  prototype: object;
}

function hasPrototype(value: unknown): value is ClassWithPrototype {
  return (
    typeof value === 'function' &&
    typeof (value as { prototype?: unknown }).prototype === 'object' &&
    (value as { prototype?: unknown }).prototype !== null
  );
}

export class ZoneApi {
  /**
   * Does the class at `classPath` extend `Zone`? Folder classes (the
   * folder/leaf invariant's "may have descendants" set) are exactly
   * the Zone subclasses; this predicate is what `Template.findByPath`
   * and `TemplateApi.validateFolderLeaf*` consult.
   *
   * Result is cached per classPath. Returns `false` when the class
   * fails to import or has no prototype chain (e.g. a typoed path) —
   * the caller's path validation surfaces those errors separately.
   */
  public static async isFolderClass(classPath: string): Promise<boolean> {
    const cached = folderClassCache.get(classPath);
    if (cached !== undefined) return cached;
    let result = false;
    try {
      const cls = await StuffApi.loadClassByPath(classPath);
      result = hasPrototype(cls) && cls.prototype instanceof Zone;
    } catch {
      result = false;
    }
    folderClassCache.set(classPath, result);
    return result;
  }

  /**
   * Does the class at `classPath` extend `SpatialZone`? The strict
   * subset of folder classes that stamp `Stuff.zone`. Non-spatial
   * Zones (Clade) return `false` here even though `isFolderClass`
   * returns `true` for them.
   */
  public static async isSpatialZoneClass(classPath: string): Promise<boolean> {
    const cached = spatialZoneClassCache.get(classPath);
    if (cached !== undefined) return cached;
    let result = false;
    try {
      const cls = await StuffApi.loadClassByPath(classPath);
      result = hasPrototype(cls) && cls.prototype instanceof SpatialZone;
    } catch {
      result = false;
    }
    spatialZoneClassCache.set(classPath, result);
    return result;
  }

  /**
   * Test seam: clear the structural-check caches. Production code
   * never invalidates — the prototype chain of a class is stable —
   * but tests that mock dynamic imports want fresh lookups per case.
   * @internal
   */
  public static _clearClassCaches(): void {
    SecurityApi.assertTestOnly('_clearClassCaches');
    folderClassCache.clear();
    spatialZoneClassCache.clear();
  }

  /**
   * Resolve the nearest *spatial* zone for a template path.
   *
   * Walks ancestor paths from nearest to root; returns the singleton
   * SpatialZone at the first ancestor whose template's class extends
   * `SpatialZone`. Non-spatial zone ancestors (Clades, future
   * permission/rule scopes) are skipped — they're folders for the
   * template-tree invariant, but not the spatial zone for the
   * descendant.
   *
   * Returns `null` when:
   *   - The template at `templatePath` is itself a spatial Zone (a
   *     zone isn't inside itself).
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
    if (selfTemplate && (await ZoneApi.isSpatialZoneClass(selfTemplate.class))) {
      return null;
    }

    for (const ancestor of Template.ancestorPaths(templatePath)) {
      const ancestorTpl = await Template.findByPath(ancestor);
      if (!ancestorTpl) continue;
      if (!(await ZoneApi.isSpatialZoneClass(ancestorTpl.class))) continue;
      return await StuffApi.singleton<SpatialZone>(ancestor);
    }
    return null;
  }
}

SecurityApi.decorateApiClass(ZoneApi);
