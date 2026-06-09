/**
 * BiomeApi — biome substrate's static surface.
 *
 * Three concern clusters, each landing across waves:
 *
 *   - **Lookup + density** (Wave 2) — `findByPath` singleton lookup,
 *     `densityOf(tag)` per-atmosphere density read, `getRootBiome`
 *     cached accessor for the universe biome at `/lib/biome/`.
 *   - **Resolution chain** (Wave 3) — `resolveTemperatureFor` and
 *     the four siblings (pressure / humidity / gravity / atmosphere)
 *     plus their `trace*` variants that return provenance for the
 *     `analyze atmosphere` verb. The chain walks innermost-
 *     container-outward through containment ancestors, then the
 *     spatial zone, then the root biome.
 *   - **Sky exposure** (Wave 5) — `isSkyExposed(scope)` predicate
 *     resolving the nearest biome ancestor and testing the trait.
 *
 * The density table is a private const map with the three v1
 * entries (air / water / vacuum). No registry, no `AtmosphereDef`
 * bundle — the three v1 consumers don't earn the indirection. If
 * content authoring grows past three tags, the map grows by one
 * line; if it grows past where a const map is comfortable, promote
 * to an `Atmosphere extends Idea` templated singleton at that
 * point.
 *
 * The root biome is cached at the first `getRootBiome` call. HMR
 * (template hot-reload) calls `invalidateRootBiomeCache()` to drop
 * the cached instance so the next read resolves the freshly cloned
 * template.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { Containable } from '../lib/spatial/Containable';
import type { Atmospheric } from '../lib/biome/Atmospheric';
import { Biome } from '../lib/biome/Biome';
import { Quantity } from '../lib/quantity';
import type { Unit } from '../lib/quantity';
import { StuffApi } from './stuff';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';

/**
 * Per-atmosphere density at standard conditions (1 atm, 295 K).
 * Three v1 entries; grows by one line when content needs it.
 */
const ATMOSPHERE_DENSITIES: Record<string, Quantity<'kg/m³'>> = {
  air: Quantity.of(1.225, 'kg/m³'),
  water: Quantity.of(1000, 'kg/m³'),
  vacuum: Quantity.of(0, 'kg/m³'),
};

/**
 * Provenance for a single resolved atmospheric field. Returned by
 * `BiomeApi.traceResolve*For` alongside the value. The `analyze
 * atmosphere` controller renders one Mml line per field consuming
 * this typed object.
 */
export interface AtmosphericTrace<V> {
  /** The resolved value. */
  value: V;
  /** Which layer of the chain provided the value. */
  source:
    | 'detail'
    | 'detail-prefix'
    | 'room'
    | 'biome'
    | 'biome-ancestor'
    | 'zone'
    | 'universe';
  /**
   * Path of the source — ancestor template path for detail / room,
   * biome template path for biome / biome-ancestor, zone path for
   * zone, `'/lib/biome/universe'` for universe.
   */
  sourcePath: string | null;
  /** Containment ancestor template paths traversed during the walk. */
  ancestorChain: string[];
}

/**
 * Depth guard for the chain walk. Real content shouldn't approach
 * this; the cap is defensive against pathological nesting.
 */
const CONTAINMENT_DEPTH_CAP = 32;

/**
 * Path of the root universe biome — the inheritance-hierarchy root
 * with `_extendsBiomePath: null`. The biome admin folder lives at
 * `/lib/biome/` (a `FolderZone`); the root biome itself lives at
 * `/lib/biome/universe`.
 */
const ROOT_BIOME_PATH = '/lib/biome/universe';

/**
 * Depth guard for the `_extendsBiomePath` chain walk. Real content
 * shouldn't approach this; the cap is defensive against authoring
 * cycles in the inheritance graph.
 */
const BIOME_ANCESTRY_DEPTH_CAP = 32;

/** Cached root biome instance. Cleared on HMR. */
let rootBiomeCache: Biome | null = null;

export class BiomeApi {
  /**
   * Singleton path lookup. Returns `null` when no template is
   * registered at the path. Cross-references on Atmospheric scopes
   * store the path string and re-resolve on each call (HMR-safe).
   */
  public static findByPath(path: string): Biome | null {
    return StuffApi.findByTemplatePath<Biome>(path) ?? null;
  }

  /**
   * Density of an atmosphere tag at standard conditions. Throws on
   * unknown tag — this is the validation seam for the otherwise-
   * silent `setAtmosphere(string)` setter. (The setter accepts any
   * string; the density lookup is where unknown tags surface.)
   */
  public static densityOf(tag: string): Quantity<'kg/m³'> {
    const d = ATMOSPHERE_DENSITIES[tag];
    if (!d) {
      throw new Error(
        `BiomeApi.densityOf: unknown atmosphere tag '${tag}' ` +
          `(known: air, water, vacuum)`
      );
    }
    return d;
  }

  /**
   * Cached accessor for the root universe biome at `/lib/biome/`.
   * Used by chain step 6 (universe terminal) and by `Altimeter`'s
   * sea-level reference. Throws when the root biome isn't loaded —
   * a boot-time invariant; the seeded universe biome at
   * `seeds/lib/biome/universe.yaml` is mandatory.
   */
  public static getRootBiome(): Biome {
    if (rootBiomeCache === null) {
      const b = BiomeApi.findByPath(ROOT_BIOME_PATH);
      if (b === null) {
        throw new Error(
          `BiomeApi.getRootBiome: root universe biome at ` +
            `'${ROOT_BIOME_PATH}' is not loaded — check ` +
            `seeds/lib/biome/universe.yaml`
        );
      }
      rootBiomeCache = b;
    }
    return rootBiomeCache;
  }

  /** Drop the cached root biome instance. Wired by template HMR. */
  public static invalidateRootBiomeCache(): void {
    rootBiomeCache = null;
  }

  // ---------- Wave 3 — chain resolution ----------
  // The `resolveXFor` family + their trace variants land here when
  // AtmosphericMixin and the chain walker are wired. The shared
  // walker reads each Quantity-typed field through a per-field
  // getter on Atmospheric and a per-field getter on Biome.

  public static async resolveTemperatureFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<Quantity<'K'>> {
    return resolveQuantityFor<'K'>(
      scope,
      detailKey,
      'temperature',
      (b) => b.getDefaultTemperature(),
      (a, k) => readDetailMap<Quantity<'K'>>(a._detailTemperatures, k),
      (a) => a._temperature,
    );
  }

  public static async resolvePressureFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<Quantity<'Pa'>> {
    return resolveQuantityFor<'Pa'>(
      scope,
      detailKey,
      'pressure',
      (b) => b.getDefaultPressure(),
      (a, k) => readDetailMap<Quantity<'Pa'>>(a._detailPressures, k),
      (a) => a._pressure,
    );
  }

  public static async resolveHumidityFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<Quantity<'%'>> {
    return resolveQuantityFor<'%'>(
      scope,
      detailKey,
      'humidity',
      (b) => b.getDefaultHumidity(),
      (a, k) => readDetailMap<Quantity<'%'>>(a._detailHumidities, k),
      (a) => a._humidity,
    );
  }

  public static async resolveGravityFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<Quantity<'m/s²'>> {
    return resolveQuantityFor<'m/s²'>(
      scope,
      detailKey,
      'gravity',
      (b) => b.getDefaultGravity(),
      (a, k) => readDetailMap<Quantity<'m/s²'>>(a._detailGravities, k),
      (a) => a._gravity,
    );
  }

  public static async resolveAtmosphereFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<string> {
    return resolveStringFor(
      scope,
      detailKey,
      'atmosphere',
      (b) => b.getDefaultAtmosphere(),
      (a, k) => readDetailMap<string>(a._detailAtmospheres, k),
      (a) => a._atmosphere,
    );
  }

  // ---------- trace variants ----------

  public static async traceResolveTemperatureFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<AtmosphericTrace<Quantity<'K'>>> {
    return traceResolveQuantityFor<'K'>(
      scope,
      detailKey,
      'temperature',
      (b) => b.getDefaultTemperature(),
      (a, k) => readDetailMap<Quantity<'K'>>(a._detailTemperatures, k),
      (a) => a._temperature,
    );
  }

  public static async traceResolvePressureFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<AtmosphericTrace<Quantity<'Pa'>>> {
    return traceResolveQuantityFor<'Pa'>(
      scope,
      detailKey,
      'pressure',
      (b) => b.getDefaultPressure(),
      (a, k) => readDetailMap<Quantity<'Pa'>>(a._detailPressures, k),
      (a) => a._pressure,
    );
  }

  public static async traceResolveHumidityFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<AtmosphericTrace<Quantity<'%'>>> {
    return traceResolveQuantityFor<'%'>(
      scope,
      detailKey,
      'humidity',
      (b) => b.getDefaultHumidity(),
      (a, k) => readDetailMap<Quantity<'%'>>(a._detailHumidities, k),
      (a) => a._humidity,
    );
  }

  public static async traceResolveGravityFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<AtmosphericTrace<Quantity<'m/s²'>>> {
    return traceResolveQuantityFor<'m/s²'>(
      scope,
      detailKey,
      'gravity',
      (b) => b.getDefaultGravity(),
      (a, k) => readDetailMap<Quantity<'m/s²'>>(a._detailGravities, k),
      (a) => a._gravity,
    );
  }

  public static async traceResolveAtmosphereFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<AtmosphericTrace<string>> {
    return traceResolveStringFor(
      scope,
      detailKey,
      'atmosphere',
      (b) => b.getDefaultAtmosphere(),
      (a, k) => readDetailMap<string>(a._detailAtmospheres, k),
      (a) => a._atmosphere,
    );
  }

  /**
   * Aggregate provenance for every atmospheric field at `scope`.
   * Convenience helper for the `analyze atmosphere` controller.
   */
  public static async traceResolveAll(
    scope: Stuff & Container,
    detailKey?: string,
  ): Promise<{
    temperature: AtmosphericTrace<Quantity<'K'>>;
    pressure: AtmosphericTrace<Quantity<'Pa'>>;
    humidity: AtmosphericTrace<Quantity<'%'>>;
    gravity: AtmosphericTrace<Quantity<'m/s²'>>;
    atmosphere: AtmosphericTrace<string>;
  }> {
    const [temperature, pressure, humidity, gravity, atmosphere] =
      await Promise.all([
        BiomeApi.traceResolveTemperatureFor(scope, detailKey),
        BiomeApi.traceResolvePressureFor(scope, detailKey),
        BiomeApi.traceResolveHumidityFor(scope, detailKey),
        BiomeApi.traceResolveGravityFor(scope, detailKey),
        BiomeApi.traceResolveAtmosphereFor(scope, detailKey),
      ]);
    return { temperature, pressure, humidity, gravity, atmosphere };
  }

  // ---------- Wave 5 — sky exposure ----------

  /**
   * Walk outward through containment ancestors and return whether
   * the nearest atmospheric-ancestor's biome composes
   * `SkyExposedMixin`. Returns `false` when no biome resolves (the
   * scope has no atmospheric ancestor with a biome ref).
   */
  public static isSkyExposed(scope: Stuff & Container): boolean {
    let cursor: (Stuff & Container) | null = scope;
    let depth = CONTAINMENT_DEPTH_CAP;
    while (cursor !== null && depth-- > 0) {
      if (MixinApi.isAtmospheric(cursor)) {
        const biome = (cursor as Stuff & Container & Atmospheric).getBiome();
        if (biome !== null) {
          return MixinApi.isSkyExposed(biome);
        }
      }
      cursor = stepOutward(cursor);
    }
    return false;
  }
}

// ---------- shared chain walker ----------

/**
 * Pure plumbing: step from a containing ancestor to its enclosing
 * container, or return null when the ancestor is not containable or
 * has no enclosing container.
 */
function stepOutward(
  cursor: Stuff & Container,
): (Stuff & Container) | null {
  if (!MixinApi.isContainable(cursor)) return null;
  const next = (cursor as Stuff & Containable).getContainer();
  if (next === null) return null;
  if (!MixinApi.isContainer(next)) return null;
  return next as Stuff & Container;
}

/**
 * Per-detail map read with longest-prefix walk. Mirrors Tangible's
 * `_detailMaterialPaths` walk: `hearth.embers` checks
 * `hearth.embers`, then `hearth`, then nothing. Returns `null` when
 * no entry matches.
 */
function readDetailMap<V>(
  map: Record<string, V>,
  detailKey: string,
): { value: V; matchedKey: string } | null {
  let key: string | undefined = detailKey;
  while (key !== undefined && key.length > 0) {
    const hit = map[key];
    if (hit !== undefined && hit !== null) {
      return { value: hit, matchedKey: key };
    }
    const dot = key.lastIndexOf('.');
    key = dot < 0 ? undefined : key.substring(0, dot);
  }
  return null;
}

/**
 * Biome-ancestry walk for a single getter. Follows `_extendsBiomePath`
 * refs from `start` upward, consulting `getter` on each Biome
 * encountered. Returns `{ value, biomePath }` for the first non-null
 * hit; `null` when the chain exhausts without finding a value.
 *
 * Cycle-guarded by a visited Set + depth cap — pathological authoring
 * (A extends B, B extends A) stops at the first revisit; depth runs
 * out independently for safety.
 */
function walkBiomeAncestry<V>(
  start: Biome,
  getter: (b: Biome) => V | null,
): { value: V; biomePath: string } | null {
  let current: Biome | null = start;
  const visited = new Set<string>();
  let depth = BIOME_ANCESTRY_DEPTH_CAP;
  while (current !== null && depth-- > 0) {
    const path = current.getTemplatePath();
    if (path !== null) {
      if (visited.has(path)) break;
      visited.add(path);
    }
    const v = getter(current);
    if (v !== null && v !== undefined) {
      return { value: v, biomePath: path ?? '' };
    }
    current = current.getExtendsBiome();
  }
  return null;
}

/**
 * Shared chain walker for Quantity-typed atmospheric fields. The
 * walk shape is identical to `resolveStringFor`; the type parameter
 * just narrows what the per-field getter returns. Throws if the
 * chain exhausts to the root biome without finding a value (boot-
 * time invariant).
 */
async function resolveQuantityFor<U extends Unit>(
  scope: Stuff & Container,
  detailKey: string | undefined,
  fieldBare: string,
  biomeGetter: (b: Biome) => Quantity<U> | null,
  detailGetter: (
    a: Stuff & Container & Atmospheric,
    detailKey: string,
  ) => { value: Quantity<U>; matchedKey: string } | null,
  ownGetter: (a: Stuff & Container & Atmospheric) => Quantity<U> | null,
): Promise<Quantity<U>> {
  const trace = await runChainWalk<Quantity<U>>(
    scope,
    detailKey,
    fieldBare,
    biomeGetter,
    detailGetter,
    ownGetter,
  );
  return trace.value;
}

async function resolveStringFor(
  scope: Stuff & Container,
  detailKey: string | undefined,
  fieldBare: string,
  biomeGetter: (b: Biome) => string | null,
  detailGetter: (
    a: Stuff & Container & Atmospheric,
    detailKey: string,
  ) => { value: string; matchedKey: string } | null,
  ownGetter: (a: Stuff & Container & Atmospheric) => string | null,
): Promise<string> {
  const trace = await runChainWalk<string>(
    scope,
    detailKey,
    fieldBare,
    biomeGetter,
    detailGetter,
    ownGetter,
  );
  return trace.value;
}

async function traceResolveQuantityFor<U extends Unit>(
  scope: Stuff & Container,
  detailKey: string | undefined,
  fieldBare: string,
  biomeGetter: (b: Biome) => Quantity<U> | null,
  detailGetter: (
    a: Stuff & Container & Atmospheric,
    detailKey: string,
  ) => { value: Quantity<U>; matchedKey: string } | null,
  ownGetter: (a: Stuff & Container & Atmospheric) => Quantity<U> | null,
): Promise<AtmosphericTrace<Quantity<U>>> {
  return runChainWalk<Quantity<U>>(
    scope,
    detailKey,
    fieldBare,
    biomeGetter,
    detailGetter,
    ownGetter,
  );
}

async function traceResolveStringFor(
  scope: Stuff & Container,
  detailKey: string | undefined,
  fieldBare: string,
  biomeGetter: (b: Biome) => string | null,
  detailGetter: (
    a: Stuff & Container & Atmospheric,
    detailKey: string,
  ) => { value: string; matchedKey: string } | null,
  ownGetter: (a: Stuff & Container & Atmospheric) => string | null,
): Promise<AtmosphericTrace<string>> {
  return runChainWalk<string>(
    scope,
    detailKey,
    fieldBare,
    biomeGetter,
    detailGetter,
    ownGetter,
  );
}

/**
 * The full six-step chain. Iterative (depth-capped per containment
 * safety); awaits the Zone field-inheritance walk at step 5.
 */
async function runChainWalk<V>(
  scope: Stuff & Container,
  detailKey: string | undefined,
  fieldBare: string,
  biomeGetter: (b: Biome) => V | null,
  detailGetter: (
    a: Stuff & Container & Atmospheric,
    detailKey: string,
  ) => { value: V; matchedKey: string } | null,
  ownGetter: (a: Stuff & Container & Atmospheric) => V | null,
): Promise<AtmosphericTrace<V>> {
  const ancestorChain: string[] = [];
  let cursor: (Stuff & Container) | null = scope;
  let outermost: Stuff & Container = scope;
  let isInnermost = true;
  let depth = CONTAINMENT_DEPTH_CAP;

  while (cursor !== null && depth-- > 0) {
    outermost = cursor;
    const cursorPath = (cursor as Stuff).getTemplatePath?.() ?? null;
    if (cursorPath !== null) ancestorChain.push(cursorPath);

    if (MixinApi.isAtmospheric(cursor)) {
      const a = cursor as Stuff & Container & Atmospheric;

      // Steps a + b — detail-key + prefix walk, innermost only.
      if (isInnermost && detailKey !== undefined && detailKey.length > 0) {
        const hit = detailGetter(a, detailKey);
        if (hit !== null) {
          return {
            value: hit.value,
            source: hit.matchedKey === detailKey ? 'detail' : 'detail-prefix',
            sourcePath: cursorPath,
            ancestorChain,
          };
        }
      }

      // Step c — bulk room/vessel-scope override.
      const own = ownGetter(a);
      if (own !== null && own !== undefined) {
        return {
          value: own,
          source: 'room',
          sourcePath: cursorPath,
          ancestorChain,
        };
      }

      // Step d — biome default with template-ancestry walk.
      const biome = a.getBiome();
      if (biome !== null) {
        const fromBiome = walkBiomeAncestry<V>(biome, biomeGetter);
        if (fromBiome !== null) {
          const biomeOwnPath = biome.getTemplatePath();
          return {
            value: fromBiome.value,
            source:
              biomeOwnPath === fromBiome.biomePath
                ? 'biome'
                : 'biome-ancestor',
            sourcePath: fromBiome.biomePath,
            ancestorChain,
          };
        }
      }
    }

    const next = stepOutward(cursor);
    if (next === null) break;
    cursor = next;
    isInnermost = false;
  }

  // Step 5 — spatial zone default. Outer Location's zone via
  // Zone.lookupField with the `atmosphere.<field>` suffix.
  const zone = outermost.getZone();
  if (zone !== null) {
    const zoned = await zone.lookupField<V>(`atmosphere.${fieldBare}`);
    if (zoned !== null && zoned !== undefined) {
      const zonePath = zone.getTemplatePath();
      return {
        value: zoned,
        source: 'zone',
        sourcePath: zonePath,
        ancestorChain,
      };
    }
  }

  // Step 6 — terminal: consult the root universe biome.
  const root = BiomeApi.getRootBiome();
  const universal = biomeGetter(root);
  if (universal === null || universal === undefined) {
    throw new Error(
      `BiomeApi.resolve${capitalize(fieldBare)}For: root universe biome ` +
        `at '${ROOT_BIOME_PATH}' is missing the '${fieldBare}' default. ` +
        `This is a boot-time invariant violation; check seeds/lib/biome/universe.yaml.`,
    );
  }
  return {
    value: universal,
    source: 'universe',
    sourcePath: ROOT_BIOME_PATH,
    ancestorChain,
  };
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.substring(1);
}

SecurityApi.decorateApiClass(BiomeApi);
