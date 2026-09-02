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
 * Zones are stored as CMS templates in the `content` collection. `Stuff.zone`
 * (on the Stuff base) holds the nearest *spatial* zone reference; non-spatial
 * Zone ancestors (Clades) do NOT stamp onto `Stuff.zone` — see
 * `ZoneApi.resolveZoneForPath` and `ZoneApi.isSpatialZoneClass`.
 */

import { Idea } from '../stuff/Idea';
import { MixinApi } from '../../api/mixin';
import { ZoneApi } from '../../api/zone';
import type { FieldMeta } from '../mixin';

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
  /** The two fields Zone itself owns (subclasses declare their own on
   *  top). `wire` HAS to be here: it's a declared field with an
   *  accessor pair, so the Hydrator only reaches it by name — and a
   *  `wire: true` seed row that silently doesn't apply reads as "not
   *  wire", which routes quarantined code down the governed path
   *  (found live: `eval` inside a circle ran GOVERNED). See the
   *  ownership-removal note below. */
  static fieldMeta: FieldMeta = {
    name: { persistent: true },
    wire: { persistent: true },
    elevation: { persistent: true, authorable: true },
  };

  // ⚠ Region/spawn fields (`stocks` / `favours` / `blessingOdds`) are NOT
  // here — they live on `SpatialZone`. They arrived on this base in the
  // libations build and were moved down on review: a `FolderZone` is a
  // namespace root (`/wiki`, `/home`, `/studio`) and "how many bottles of
  // vodka stand in the wiki namespace" is not a question, but an
  // `authorable` field on this class offers it in the studio for every
  // zone in the game. Only a region IN SPACE can stock goods. The
  // inheritance walk is unaffected: `lookupField` consults ancestors, so a
  // FolderZone that does not declare them simply walks on.
  //
  // Ownership/access fields (`ownerGroup` / `accessGroups` /
  // `ownerGroupName`) were REMOVED in property phase 0a. Title now lives in
  // the gated `parcels` collection (`ParcelRegistry` / `ParcelApi`), never
  // on this editable `domain` zone template — the governing security
  // invariant. `AccessApi.can`/`canMutateZone` resolve ownership via
  // `ParcelApi.ownerOf`; the zone carries no access controls of its own.
  // `persistentFields` is intentionally empty (the inheritance walk below
  // reads dynamic fields via `lookupField`, not `persistentFields`).

  /**
   * Human-readable zone name ("Narnia Castle", "The Caves", "Animalia", …).
   */
  protected name: string = '';

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }

  /**
   * Wire-classification field (sandbox build, Decision O): `true` on a
   * *wire namespace root* (`/home`, `/studio`) and inherited by every
   * descendant through the ordinary `lookupField` walk — so "is this
   * path wire?" is `await zone.lookupField<boolean>('wire')`, data
   * resolved by a mechanism that already exists, never a hardcoded
   * prefix list and never an `instanceof`. A third wire root is a seed
   * row with this field, not an edit to the containment layers.
   * `null` = not declared here (walk further); field zones never set it.
   */
  protected wire: boolean | null = null;

  /**
   * **Height above sea level, in metres** — the watershed's organising
   * input, and the one field water's whole behaviour is derived from.
   *
   * Inherited through the ordinary `lookupField` walk, so a district
   * declares its own and a room inside it needs say nothing; an authored
   * value anywhere in the chain wins over anything above it. `null` =
   * not declared here (walk further).
   *
   * ## Why the ZONE, and not the biome
   *
   * The zone already owns spatial geometry (`cellSize` drives volume,
   * light-scale and extent) and already does field inheritance. Biome
   * owns properties of the **air**; elevation is a property of the
   * **ground**.
   *
   * ⭐ But the decisive reason is a **circularity**. `measure altitude`
   * computes `(P_sea − P_local) / (ρ·g)` from the biome chain's authored
   * `_pressure` — so before this field, altitude was back-computed from
   * a number an author typed, and putting elevation on the biome too
   * would have given one physical fact two sources of truth. Elevation
   * on the zone makes pressure the *consequence* (see
   * `BiomeLogic`'s derive-from-elevation fallback) and the altimeter an
   * honest instrument: it reads a cause rather than its own input.
   *
   * ## ⚠ `coords.z` is NOT elevation
   *
   * `z` is local, and measured in zone **cells** — which floor of a
   * building you are on. A place's height above the ground is
   * `zone elevation + z × cellSize`; **hydrology reads the zone**, so a
   * third-floor flat and the lobby are the same point on the watershed.
   * A stairwell is not a waterfall. Terrain variation *within* a
   * district is obtained by zoning finer, which is what zones are for.
   *
   * See [docs/subsystems/watershed.md].
   */
  protected elevation: number | null = null;

  /** Metres above sea level declared HERE (no ancestor walk). */
  public getElevation(): number | null { return this.elevation; }

  public setElevation(value: number | null): void {
    this.elevation = value === null || Number.isFinite(value) ? value : null;
  }

  public getWire(): boolean | null { return this.wire; }
  public setWire(value: boolean): void { this.wire = value; }

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
   *   ?? ShellApi.resolveSetting(host, 'world.zone.celestialProfile.default');
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
