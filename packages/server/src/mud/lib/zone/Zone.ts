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
import { MixinApi } from '../../api/mixin';
import { ZoneApi } from '../../api/zone';
import type { GroupRef } from '../social/GroupProvider';

/**
 * Validate a `GroupRef` shape. Inlined here (instead of importing
 * `parseGroupRef` from `../social/GroupProvider`) to avoid pulling
 * the `Group` Document into Zone's module graph — that would
 * lengthen the load cycle through Document at a point where Zone
 * is reached early by `api/zone.ts`. The shape check is trivial: a
 * `source:id` string with at least one colon.
 */
function validateGroupRef(ref: string): void {
  if (ref.indexOf(':') < 0) {
    throw new Error(
      `Zone.setOwnerGroup: malformed GroupRef '${ref}' — expected 'source:id'`,
    );
  }
}
// `ZoneApi` is statically imported because it owns the field-walk
// orchestration (`ZoneApi.getEnclosingZone`) that `lookupAncestorField`
// delegates to. The api side breaks its end of the would-be cycle by
// lazy-loading `SpatialZone` inside `ZoneApi.isSpatialZoneClass`,
// keeping Zone safe to static-import from the api layer. See
// `api/zone.ts`'s header comment for the load-order trace.

/**
 * Abstract base for all Zone flavors. Holds the name, the
 * folder-of-templates contract (structural — `ZoneApi.isFolderClass`
 * checks `prototype instanceof Zone`), and the field-inheritance walk
 * (`lookupField` and its overridable sub-method
 * `lookupAncestorField`).
 */
export abstract class Zone extends Idea {
  static persistentFields = ['ownerGroup', 'accessGroups'];

  /**
   * Human-readable zone name ("Narnia Castle", "The Caves", "Animalia", …).
   */
  protected name: string = '';

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }

  /**
   * The slice's primary owner — singular, conceptually primary. The
   * `'owner'` role in this group can transfer ownership, grant or
   * revoke secondary access, and destruct the slice. Other roles in
   * this group still get content access via the `can()` flat-union
   * walk. The field is inheritable through `Zone.lookupField`; the
   * `AccessApi.can` walk collects the closest stamped `ownerGroup`
   * plus every `accessGroups` entry up to root.
   */
  protected _ownerGroup?: GroupRef;
  protected _accessGroups?: GroupRef[];

  public getOwnerGroup(): GroupRef | undefined {
    return this._ownerGroup;
  }

  public setOwnerGroup(ref: GroupRef | undefined): void {
    if (ref === undefined) {
      this._ownerGroup = undefined;
      return;
    }
    validateGroupRef(ref);
    this._ownerGroup = ref;
  }

  public getAccessGroups(): readonly GroupRef[] | undefined {
    return this._accessGroups;
  }

  public setAccessGroups(refs: readonly GroupRef[] | undefined): void {
    if (refs === undefined) {
      this._accessGroups = undefined;
      return;
    }
    for (const ref of refs) {
      validateGroupRef(ref);
    }
    this._accessGroups = [...refs];
  }

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
   * to the nearest enclosing Zone's `lookupField`, letting the
   * recursion carry the walk upward.
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
   *
   * The default impl delegates to `ZoneApi.getEnclosingZone(this)` —
   * that's the orchestration step (template-path walk, folder-class
   * predicate, singleton resolution) and it lives in api. The
   * polymorphic decision (what counts as "ancestor" for *this* zone)
   * lives here.
   */
  public async lookupAncestorField<T>(fieldName: string): Promise<T | null> {
    const parent = await ZoneApi.getEnclosingZone(this);
    return parent ? parent.lookupField<T>(fieldName) : null;
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
  const getterName = 'get' + MixinApi.pascalCase(fieldName);
  const indexable = zone as unknown as Record<string, unknown>;
  const getter = indexable[getterName];
  if (typeof getter === 'function') {
    const value = (getter as () => unknown).call(zone);
    return value == null ? null : (value as T);
  }
  const value = indexable[fieldName];
  return value == null ? null : (value as T);
}
