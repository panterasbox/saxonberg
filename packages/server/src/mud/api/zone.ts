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
 *    walk in `lib/zone/Zone.ts`) delegates to.
 *
 * 3. **`isFolderClass` / `isSpatialZoneClass`** — structural
 *    predicates that load a class by path and check
 *    `prototype instanceof Zone` (or `instanceof SpatialZone`).
 *    Content devs add folder/spatial-zone classes by extending
 *    those bases — no central allow-list to edit.
 *
 * Thin, security-gated forwarding shell: the logic (and the
 * structural-check caches) live in the hot-reloadable {@link ZoneLogic}
 * singleton at `/platform/idea/api/zone`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /platform/idea/api/zone` reloads it.
 */

import { StuffApi } from './stuff';
import type { Zone } from '../lib/zone/Zone';
import type { SpatialZone } from '../lib/zone/SpatialZone';
import { HotReloadApi } from './hot-reload';
import { ZoneLogic } from '../platform/idea/api/ZoneLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/platform/idea/api/zone';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/ZoneLogic', import.meta.url)
);

/** Resolve the HMR-able ZoneLogic singleton (sync). */
function logic(): ZoneLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ZoneLogic'
      ) as typeof ZoneLogic | null) ?? ZoneLogic)()
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
    return logic().isFolderClass(classPath);
  }

  /**
   * Does the class at `classPath` extend `SpatialZone`? The strict
   * subset of folder classes that stamp `Stuff.zone`. Non-spatial
   * Zones (Clade) return `false` here even though `isFolderClass`
   * returns `true` for them.
   */
  public static async isSpatialZoneClass(classPath: string): Promise<boolean> {
    return logic().isSpatialZoneClass(classPath);
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
    return logic().getEnclosingZone(zone);
  }

  /**
   * Test seam: clear the structural-check caches. Production code
   * never invalidates — the prototype chain of a class is stable —
   * but tests that mock dynamic imports want fresh lookups per case.
   * @internal
   */
  public static _clearClassCaches(): void {
    logic()._clearClassCaches();
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
    return logic().resolveZoneForPath(templatePath);
  }

  /**
   * Resolve the nearest *enclosing* zone for a template path —
   * **any** Zone subclass, spatial or not.
   *
   * The sister of {@link resolveZoneForPath}: same nearest-first
   * ancestor walk, but keyed on `isFolderClass` rather than
   * `isSpatialZoneClass`, and it returns the path's OWN zone when the
   * path is itself a zone (a namespace root does classify itself).
   *
   * Reach for this when the question is about an inherited
   * *classification* field rather than about spatial geometry — the
   * motivating reader is wire-ness (`zone.lookupField('wire')`), which
   * is rooted at `/home` and `/studio`. Both are non-spatial
   * `HomeZone`/`StudioZone`, so `resolveZoneForPath` skips them and
   * answers `null` — which silently reads as "not wire" and sends
   * quarantined code down the governed path.
   */
  public static async resolveEnclosingZoneForPath(
    templatePath: string
  ): Promise<Zone | null> {
    return logic().resolveEnclosingZoneForPath(templatePath);
  }
}

SecurityApi.decorateApiClass(ZoneApi);
