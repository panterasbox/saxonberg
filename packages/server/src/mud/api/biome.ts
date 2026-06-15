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
 *
 * This Api is a thin, security-gated forwarding shell: the logic lives
 * in the hot-reloadable {@link BiomeLogic} singleton at
 * `/obj/api/biome`, reached synchronously via `StuffApi.singletonSync`.
 * `dest /obj/api/biome` reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type Biome from '../lib/biome/Biome';
import type { Quantity } from '../lib/quantity';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { BiomeLogic } from '../obj/api/BiomeLogic';
import { fileURLToPath } from 'url';

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

const LOGIC_PATH = '/obj/api/biome';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/BiomeLogic', import.meta.url)
);

/** Resolve the HMR-able BiomeLogic singleton (sync). */
function logic(): BiomeLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'BiomeLogic'
      ) as typeof BiomeLogic | null) ?? BiomeLogic)()
  );
}

export class BiomeApi {
  /**
   * Singleton path lookup. Returns `null` when no template is
   * registered at the path. Cross-references on Atmospheric scopes
   * store the path string and re-resolve on each call (HMR-safe).
   */
  public static findByPath(path: string): Biome | null {
    return logic().findByPath(path);
  }

  /**
   * Density of an atmosphere tag at standard conditions. Throws on
   * unknown tag — this is the validation seam for the otherwise-
   * silent `setAtmosphere(string)` setter. (The setter accepts any
   * string; the density lookup is where unknown tags surface.)
   */
  public static densityOf(tag: string): Quantity<'kg/m³'> {
    return logic().densityOf(tag);
  }

  /**
   * Whether a default air-breather exchanges gas in an atmosphere
   * tag. Throws on unknown tag — the same validation seam as
   * {@link BiomeApi.densityOf}. The respiration driver's medium
   * trigger reads this: air-breathers drown in `water`/`vacuum`.
   */
  public static breathableOf(tag: string): boolean {
    return logic().breathableOf(tag);
  }

  /**
   * Cached accessor for the root universe biome at `/lib/biome/`.
   * Used by chain step 6 (universe terminal) and by `Altimeter`'s
   * sea-level reference. Throws when the root biome isn't loaded —
   * a boot-time invariant; the seeded universe biome at
   * `seeds/lib/biome/universe.yaml` is mandatory.
   */
  public static getRootBiome(): Biome {
    return logic().getRootBiome();
  }

  /** Drop the cached root biome instance. Wired by template HMR. */
  public static invalidateRootBiomeCache(): void {
    logic().invalidateRootBiomeCache();
  }

  // ---------- Wave 3 — chain resolution ----------

  public static async resolveTemperatureFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<Quantity<'K'>> {
    return logic().resolveTemperatureFor(scope, detailKey);
  }

  public static async resolvePressureFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<Quantity<'Pa'>> {
    return logic().resolvePressureFor(scope, detailKey);
  }

  public static async resolveHumidityFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<Quantity<'%'>> {
    return logic().resolveHumidityFor(scope, detailKey);
  }

  public static async resolveGravityFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<Quantity<'m/s²'>> {
    return logic().resolveGravityFor(scope, detailKey);
  }

  public static async resolveAtmosphereFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<string> {
    return logic().resolveAtmosphereFor(scope, detailKey);
  }

  // ---------- trace variants ----------

  public static async traceResolveTemperatureFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<AtmosphericTrace<Quantity<'K'>>> {
    return logic().traceResolveTemperatureFor(scope, detailKey);
  }

  public static async traceResolvePressureFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<AtmosphericTrace<Quantity<'Pa'>>> {
    return logic().traceResolvePressureFor(scope, detailKey);
  }

  public static async traceResolveHumidityFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<AtmosphericTrace<Quantity<'%'>>> {
    return logic().traceResolveHumidityFor(scope, detailKey);
  }

  public static async traceResolveGravityFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<AtmosphericTrace<Quantity<'m/s²'>>> {
    return logic().traceResolveGravityFor(scope, detailKey);
  }

  public static async traceResolveAtmosphereFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<AtmosphericTrace<string>> {
    return logic().traceResolveAtmosphereFor(scope, detailKey);
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
    return logic().traceResolveAll(scope, detailKey);
  }

  // ---------- Wave 5 — sky exposure ----------

  /**
   * Walk outward through containment ancestors and return whether
   * the nearest atmospheric-ancestor's biome composes
   * `SkyExposedMixin`. Returns `false` when no biome resolves (the
   * scope has no atmospheric ancestor with a biome ref).
   */
  public static isSkyExposed(scope: Stuff & Container): boolean {
    return logic().isSkyExposed(scope);
  }
}

SecurityApi.decorateApiClass(BiomeApi);
