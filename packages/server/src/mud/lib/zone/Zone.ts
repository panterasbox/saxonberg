/**
 * Zone — abstract scope / folder unit of the template tree.
 *
 * `Zone` is the *bare* scope abstraction: it carries a name, the
 * folder-of-templates contract, and the **field-inheritance walk**
 * that lets descendants pick up defaults from ancestor zones. Concrete
 * Zone flavors layer behavior on top:
 *
 * - `SpatialZone` (in `lib/zone/`) — abstract intermediate carrying the
 *   location-aware surface (`addLocation`, `getLocations`, `deriveExit`, …).
 *   `CartesianZone` and `SphericalZone` (in `lib/spatial/`) extend
 *   `SpatialZone`, not `Zone`.
 * - `FolderZone` (in `lib/zone/`) — generic organizational scope with no
 *   spatial topology; sits as an inheritance node only.
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
// `Template`, `StuffApi`, and `ZoneApi` are intentionally lazy-imported
// inside `getEnclosingZone`. Static imports would form a cycle:
//   Zone.ts → Template.ts → api/zone.ts → SpatialZone.ts → Zone.ts (still in flight)
// breaking SpatialZone's `extends Zone` at module-eval time. Dynamic
// imports inside the method body run well after every class declaration
// is resolved.

/**
 * Abstract base for all Zone flavors. Holds the name, the
 * folder-of-templates contract (structural — `ZoneApi.isFolderClass`
 * checks `prototype instanceof Zone`), and the field-inheritance walk
 * (`lookupField` and its overridable sub-method
 * `lookupAncestorField`).
 */
export abstract class Zone extends Idea {
  /**
   * Human-readable zone name ("Narnia Castle", "The Caves", "Animalia", …).
   */
  protected name: string = '';

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }

  /**
   * Effective value of `fieldName` for this zone. Reads own value
   * first; if absent, delegates to `lookupAncestorField` (which by
   * default consults the nearest enclosing Zone, which then performs
   * its own `lookupField` — the recursion handles the deep walk).
   *
   * Returns the nearest non-null/non-undefined value, or `null` when
   * nothing in the chain defines the field. Callers compose a
   * settings-style fallback on top:
   *
   * ```ts
   * const profile =
   *   (await zone.lookupField<CelestialProfile>('celestialProfile'))
   *   ?? resolveSetting(host, 'world.zone.celestialProfile.default');
   * ```
   *
   * Field-read mechanism: prefer `get<PascalCase>()` (the inter-Stuff
   * contract surface), fall back to direct property access. A
   * non-existent property reads as `undefined` and is treated as
   * "not defined here, walk further."
   *
   * Per zone-architecture-slate § Inheritance walk for zone-carried
   * fields.
   */
  public async lookupField<T>(fieldName: string): Promise<T | null> {
    const own = readField<T>(this, fieldName);
    if (own != null) return own;
    return this.lookupAncestorField<T>(fieldName);
  }

  /**
   * Override point for ancestor-walking behavior. Default: delegate
   * to the enclosing zone's `lookupField`, letting the recursion
   * carry the walk upward.
   *
   * **Subclasses can intercept here** to alter or root the walk:
   *
   * ```ts
   * class RootedZone extends Zone {
   *   // Inheritance barrier: this zone's own defaults are
   *   // authoritative; ancestor values do not flow through.
   *   override async lookupAncestorField<T>(_field: string): Promise<T | null> {
   *     return null;
   *   }
   * }
   * ```
   *
   * Or to consult a custom ancestor (e.g., a zone that inherits from
   * a sibling template rather than its template parent).
   */
  public async lookupAncestorField<T>(fieldName: string): Promise<T | null> {
    const parent = await this.getEnclosingZone();
    return parent ? parent.lookupField<T>(fieldName) : null;
  }

  /**
   * Nearest Zone-class template ancestor, or `null` at universe-root
   * (or when this zone has no templatePath, e.g., test fixtures
   * built via `makeStuff` without a path stamp). Skips non-Zone path
   * segments. Lazy-clones the ancestor via `StuffApi.singleton`
   * (cache-or-clone; subsequent calls are O(1)).
   *
   * Used by the default `lookupAncestorField`; exposed so callers
   * that want to traverse the zone tree directly can do so without
   * re-implementing the walk.
   */
  public async getEnclosingZone(): Promise<Zone | null> {
    const ownPath = this.getTemplatePath();
    if (!ownPath) return null;
    const { Template } = await import('../stuff/Template');
    const { StuffApi } = await import('../../api/stuff');
    const { ZoneApi } = await import('../../api/zone');
    for (const ancestor of Template.ancestorPaths(ownPath)) {
      const tpl = await Template.findByPath(ancestor);
      if (!tpl) continue;
      if (!(await ZoneApi.isFolderClass(tpl.class))) continue;
      return await StuffApi.singleton<Zone>(ancestor);
    }
    return null;
  }
}

/**
 * Read `fieldName` on a zone instance. Prefers the inter-Stuff
 * contract surface (`get<PascalCase>()`); falls back to direct
 * property access. Returns `null` for missing / null / undefined
 * values; non-null returns are passed through unchanged.
 */
function readField<T>(zone: Zone, fieldName: string): T | null {
  if (fieldName.length === 0) return null;
  const getterName =
    'get' + fieldName[0]!.toUpperCase() + fieldName.slice(1);
  const indexable = zone as unknown as Record<string, unknown>;
  const getter = indexable[getterName];
  if (typeof getter === 'function') {
    const value = (getter as () => unknown).call(zone);
    return value == null ? null : (value as T);
  }
  const value = indexable[fieldName];
  return value == null ? null : (value as T);
}
