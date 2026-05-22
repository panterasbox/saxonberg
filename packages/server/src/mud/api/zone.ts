/**
 * ZoneApi — zone-shaped orchestration over the Template tree.
 *
 * Three concerns this module owns:
 *
 * 1. **`resolveZoneForPath`** — resolve a template path to its
 *    nearest *spatial* zone. Stuff stamping (the `Stuff.zone` field)
 *    walks ancestor paths nearest-first, picking the first ancestor
 *    whose `class:` resolves to a `SpatialZone` subclass. Non-spatial
 *    Zone subclasses (Clade, future taxonomic / permission scopes)
 *    are skipped — they're folders for the template-tree invariant,
 *    but never become a `Stuff.zone`.
 *
 * 2. **`getEnclosingZone`** — nearest Zone-class template ancestor
 *    for any zone instance. The orchestration step that
 *    `Zone.lookupAncestorField` (the polymorphic field-inheritance
 *    walk in `lib/zone/Zone.ts`) delegates to. Lives here, not on
 *    Zone, because the walk is pure plumbing through `Template` +
 *    `StuffApi.singleton` — no override seam needed.
 *
 * 3. **`isFolderClass` / `isSpatialZoneClass`** — structural
 *    predicates that load a class by path and check
 *    `prototype instanceof Zone` (or `instanceof SpatialZone`).
 *    Content devs add folder/spatial-zone classes by extending
 *    those bases — no central allow-list to edit.
 *
 * Caching is delegated to `StuffApi.singleton()` (for runtime
 * instances) and to a per-classPath result map below (for the
 * structural checks). The dynamic import itself is also cached by
 * the JS module cache; the local maps just save the prototype walk.
 *
 * Cycle note: `SpatialZone` is *not* statically imported here. It's
 * lazy-loaded inside `isSpatialZoneClass`. The reason — `SpatialZone
 * extends Zone` is eagerly evaluated at SpatialZone's module-load,
 * and `Zone.ts` static-imports `ZoneApi` for its
 * `lookupAncestorField` orchestration. Eager `SpatialZone` here
 * would form a Zone → ZoneApi → SpatialZone → Zone cycle whose
 * middle step blows up because Zone's class binding isn't ready
 * yet. Dynamic-loading SpatialZone inside the predicate body keeps
 * the static graph clean.
 */

import { StuffApi } from './stuff';
import { Template } from '../lib/stuff/Template';
import { Zone } from '../lib/zone/Zone';
import type { SpatialZone } from '../lib/zone/SpatialZone';
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
   *
   * `SpatialZone` is lazy-loaded inside the body — see the module
   * header for the cycle reasoning. The JS module cache makes
   * second-and-later resolution effectively free.
   */
  public static async isSpatialZoneClass(classPath: string): Promise<boolean> {
    const cached = spatialZoneClassCache.get(classPath);
    if (cached !== undefined) return cached;
    const { SpatialZone } = await import('../lib/zone/SpatialZone');
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
   * Nearest Zone-class template ancestor of `zone`, or `null` at
   * universe-root (or when `zone` has no `templatePath`, e.g., a
   * fixture built via `makeStuff` without a path stamp). Skips
   * non-Zone path segments. Lazy-clones the ancestor via
   * `StuffApi.singleton` (cache-or-clone; subsequent calls are O(1)).
   *
   * The orchestration step `Zone.lookupAncestorField` (the
   * polymorphic field-inheritance hook in `lib/zone/Zone.ts`)
   * delegates to this helper. Lives here, not on Zone, because the
   * walk is pure plumbing — no override seam needed, no Stuff
   * subclass should reshape it.
   */
  public static async getEnclosingZone(zone: Zone): Promise<Zone | null> {
    const ownPath = zone.getTemplatePath();
    if (!ownPath) return null;
    for (const ancestor of Template.ancestorPaths(ownPath)) {
      const tpl = await Template.findByPath(ancestor);
      if (!tpl) continue;
      if (!(await ZoneApi.isFolderClass(tpl.class))) continue;
      return await StuffApi.singleton<Zone>(ancestor);
    }
    return null;
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
