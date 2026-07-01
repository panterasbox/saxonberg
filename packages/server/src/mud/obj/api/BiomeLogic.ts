// BiomeLogic — the hot-reloadable logic singleton behind BiomeApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import type { Atmospheric } from '../../lib/biome/Atmospheric';
import Biome from '../../lib/biome/Biome';
import { Quantity } from '../../lib/quantity';
import type { Unit } from '../../lib/quantity';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { TemplatePaths } from '../../lib/paths';
import type { AtmosphericTrace } from '../../api/biome';
import { WeatherApi } from '../../api/weather';
import { AddressApi } from '../../api/address';
import { WorldClockApi } from '../../api/worldclock';
import {
  WEATHER_FIELDS,
  type WeatherField,
} from '../../lib/weather/WeatherType';

/**
 * The four atmospheric fields weather deviates (D5). Gravity / atmosphere
 * are excluded — they carry no weather meaning. The seam in
 * `resolveQuantityFor` gates on this set so the deviation never touches
 * gravity reads.
 */
const WEATHER_DEVIATED_FIELDS = new Set<string>(WEATHER_FIELDS);

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
 * Per-atmosphere thermal conductivity (`W/(m·K)`) — the surrounding
 * medium's term in a Thermal object's heat-exchange resistance `R`.
 * Water conducts ~25× faster than air (the cold-water-immersion
 * danger); `vacuum` is a deliberately tiny non-zero so an insulated
 * vessel cools *slowly*, not *never* (radiation + neck-leak lumped in).
 * Parallel to {@link ATMOSPHERE_DENSITIES}; same three v1 tags, grows
 * by one line when content needs it.
 */
const ATMOSPHERE_CONDUCTIVITIES: Record<string, Quantity<'W/(m·K)'>> = {
  air: Quantity.of(0.026, 'W/(m·K)'),
  water: Quantity.of(0.6, 'W/(m·K)'),
  vacuum: Quantity.of(1e-4, 'W/(m·K)'),
};

/**
 * Per-atmosphere breathability — whether a default air-breather
 * exchanges gas in this medium. The respiration driver's medium
 * trigger reads this column; air-breathers drown in `water`/`vacuum`.
 * Sibling of {@link ATMOSPHERE_DENSITIES}; grows by one line with it.
 */
const ATMOSPHERE_BREATHABLE: Record<string, boolean> = {
  air: true,
  water: false,
  vacuum: false,
};

/**
 * Per-atmosphere contaminant tag — the breathable≠safe axis (an
 * atmosphere a body *can* exchange gas in but which carries an
 * inhaled toxin). Laid unread in v1: no reader ships, no engine
 * consults it. The inhaled-toxin lung channel (gated on metabolism's
 * toxin-burden) is the future consumer. All v1 tags are clean.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- laid-unread seam; see respiration.md
const ATMOSPHERE_CONTAMINANT: Record<string, string | null> = {
  air: null,
  water: null,
  vacuum: null,
};

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
const ROOT_BIOME_PATH = TemplatePaths.rootBiome;

/**
 * Depth guard for the `_extendsBiomePath` chain walk. Real content
 * shouldn't approach this; the cap is defensive against authoring
 * cycles in the inheritance graph.
 */
const BIOME_ANCESTRY_DEPTH_CAP = 32;

/** Cached root biome instance. Cleared on HMR. */
let rootBiomeCache: Biome | null = null;

const BiomeApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('api/biome#BiomeApi'),
  SecurityPolicies.SelfOnly
);

/**
 * BiomeLogic — the hot-reloadable logic singleton behind
 * {@link BiomeApi}.
 *
 * Lives at `/obj/api/biome` (a stateless `Stuff` singleton, no backing
 * `Template`); `BiomeApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Guts-variant gate (`AnyOf(FromModule, SelfOnly)`): `findByPath` /
 * `getRootBiome` / the `traceResolve*` family fan out to each other via
 * intra-singleton `this.x()` self-calls (`SelfOnly`), while the facade
 * forwarders supply the `FromModule` half. The shared chain walker and
 * cache helpers are module-private free functions (off-class, ungated,
 * un-callable from outside) so the free-function plumbing doesn't trip
 * the gate.
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why. Module-level mutable state
 * (`rootBiomeCache`) is the universe-biome cache, dropped by
 * `invalidateRootBiomeCache` on template HMR.
 *
 * @internal
 */
@Unshadowable
export class BiomeLogic extends Idea {
  /** See {@link BiomeApi.findByPath}. */
  @CallSecurity(BiomeApiCallers)
  public findByPath(path: string): Biome | null {
    return findBiomeByPath(path);
  }

  /** See {@link BiomeApi.densityOf}. */
  @CallSecurity(BiomeApiCallers)
  public densityOf(tag: string): Quantity<'kg/m³'> {
    const d = ATMOSPHERE_DENSITIES[tag];
    if (!d) {
      throw new Error(
        `BiomeApi.densityOf: unknown atmosphere tag '${tag}' ` +
          `(known: air, water, vacuum)`
      );
    }
    return d;
  }

  /** See {@link BiomeApi.conductivityOf}. */
  @CallSecurity(BiomeApiCallers)
  public conductivityOf(tag: string): Quantity<'W/(m·K)'> {
    const k = ATMOSPHERE_CONDUCTIVITIES[tag];
    if (!k) {
      throw new Error(
        `BiomeApi.conductivityOf: unknown atmosphere tag '${tag}' ` +
          `(known: air, water, vacuum)`
      );
    }
    return k;
  }

  /** See {@link BiomeApi.breathableOf}. */
  @CallSecurity(BiomeApiCallers)
  public breathableOf(tag: string): boolean {
    const b = ATMOSPHERE_BREATHABLE[tag];
    if (b === undefined) {
      throw new Error(
        `BiomeApi.breathableOf: unknown atmosphere tag '${tag}' ` +
          `(known: air, water, vacuum)`
      );
    }
    return b;
  }

  /** See {@link BiomeApi.getRootBiome}. */
  @CallSecurity(BiomeApiCallers)
  public getRootBiome(): Biome {
    return rootBiome();
  }

  /** See {@link BiomeApi.invalidateRootBiomeCache}. */
  @CallSecurity(BiomeApiCallers)
  public invalidateRootBiomeCache(): void {
    rootBiomeCache = null;
  }

  // ---------- Wave 3 — chain resolution ----------

  /** See {@link BiomeApi.resolveTemperatureFor}. */
  @CallSecurity(BiomeApiCallers)
  public async resolveTemperatureFor(
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

  /** See {@link BiomeApi.resolvePressureFor}. */
  @CallSecurity(BiomeApiCallers)
  public async resolvePressureFor(
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

  /** See {@link BiomeApi.resolveHumidityFor}. */
  @CallSecurity(BiomeApiCallers)
  public async resolveHumidityFor(
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

  /** See {@link BiomeApi.resolveWindFor}. */
  @CallSecurity(BiomeApiCallers)
  public async resolveWindFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<Quantity<'m/s'>> {
    return resolveQuantityFor<'m/s'>(
      scope,
      detailKey,
      'wind',
      (b) => b.getDefaultWind(),
      (a, k) => readDetailMap<Quantity<'m/s'>>(a._detailWinds, k),
      (a) => a._wind,
    );
  }

  /** See {@link BiomeApi.resolveGravityFor}. */
  @CallSecurity(BiomeApiCallers)
  public async resolveGravityFor(
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

  /** See {@link BiomeApi.resolveAtmosphereFor}. */
  @CallSecurity(BiomeApiCallers)
  public async resolveAtmosphereFor(
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

  /** See {@link BiomeApi.traceResolveTemperatureFor}. */
  @CallSecurity(BiomeApiCallers)
  public async traceResolveTemperatureFor(
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

  /** See {@link BiomeApi.traceResolvePressureFor}. */
  @CallSecurity(BiomeApiCallers)
  public async traceResolvePressureFor(
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

  /** See {@link BiomeApi.traceResolveHumidityFor}. */
  @CallSecurity(BiomeApiCallers)
  public async traceResolveHumidityFor(
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

  /** See {@link BiomeApi.traceResolveWindFor}. */
  @CallSecurity(BiomeApiCallers)
  public async traceResolveWindFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<AtmosphericTrace<Quantity<'m/s'>>> {
    return traceResolveQuantityFor<'m/s'>(
      scope,
      detailKey,
      'wind',
      (b) => b.getDefaultWind(),
      (a, k) => readDetailMap<Quantity<'m/s'>>(a._detailWinds, k),
      (a) => a._wind,
    );
  }

  /** See {@link BiomeApi.traceResolveGravityFor}. */
  @CallSecurity(BiomeApiCallers)
  public async traceResolveGravityFor(
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

  /** See {@link BiomeApi.traceResolveAtmosphereFor}. */
  @CallSecurity(BiomeApiCallers)
  public async traceResolveAtmosphereFor(
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

  /** See {@link BiomeApi.traceResolveAll}. */
  @CallSecurity(BiomeApiCallers)
  public async traceResolveAll(
    scope: Stuff & Container,
    detailKey?: string,
  ): Promise<{
    temperature: AtmosphericTrace<Quantity<'K'>>;
    pressure: AtmosphericTrace<Quantity<'Pa'>>;
    humidity: AtmosphericTrace<Quantity<'%'>>;
    wind: AtmosphericTrace<Quantity<'m/s'>>;
    gravity: AtmosphericTrace<Quantity<'m/s²'>>;
    atmosphere: AtmosphericTrace<string>;
  }> {
    const [temperature, pressure, humidity, wind, gravity, atmosphere] =
      await Promise.all([
        this.traceResolveTemperatureFor(scope, detailKey),
        this.traceResolvePressureFor(scope, detailKey),
        this.traceResolveHumidityFor(scope, detailKey),
        this.traceResolveWindFor(scope, detailKey),
        this.traceResolveGravityFor(scope, detailKey),
        this.traceResolveAtmosphereFor(scope, detailKey),
      ]);
    return { temperature, pressure, humidity, wind, gravity, atmosphere };
  }

  // ---------- Wave 5 — sky exposure ----------

  /** See {@link BiomeApi.restampThermalContentsOf}. */
  @CallSecurity(BiomeApiCallers)
  public restampThermalContentsOf(room: Stuff & Container): void {
    for (const content of room.getContents()) {
      if (MixinApi.isThermal(content)) {
        void content.restamp();
      }
    }
  }

  /** See {@link BiomeApi.isSkyExposed}. */
  @CallSecurity(BiomeApiCallers)
  public isSkyExposed(scope: Stuff & Container): boolean {
    return skyExposedWalk(scope);
  }
}

/**
 * Sky-exposure containment walk (module-private so both the public
 * `isSkyExposed` method and the weather-deviation seam in
 * `resolveQuantityFor` can call it without an intra-singleton self-call).
 * Walks outward to the nearest atmospheric ancestor with a biome ref and
 * returns whether that biome composes `SkyExposedMixin`; `false` when no
 * biome resolves.
 */
function skyExposedWalk(scope: Stuff & Container): boolean {
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

// ---------- cache helpers (module-private) ----------

/**
 * Singleton path lookup. Returns `null` when no template is registered
 * at the path.
 */
function findBiomeByPath(path: string): Biome | null {
  return StuffApi.findByTemplatePath<Biome>(path) ?? null;
}

/**
 * Cached accessor for the root universe biome at `/lib/biome/`. Throws
 * when the root biome isn't loaded — a boot-time invariant.
 */
function rootBiome(): Biome {
  if (rootBiomeCache === null) {
    const b = findBiomeByPath(ROOT_BIOME_PATH);
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
  const base = trace.value;

  // Weather deviation (D2). Enrichment, not a gate: the cheap sync checks
  // come FIRST (D-E), so weather-absent or indoor scopes do zero extra
  // work and read byte-identical to pre-weather. Only when all three
  // pass do we resolve the covering Locality (one address walk) and fold
  // the additive per-field deviation. Gravity / atmosphere never route
  // here (WEATHER_DEVIATED_FIELDS excludes them). Trace variants are left
  // un-weathered: they report biome-chain provenance; weather is a
  // separate additive surfaced by `analyze weather`.
  if (
    WEATHER_DEVIATED_FIELDS.has(fieldBare) &&
    WeatherApi.isActive() &&
    skyExposedWalk(scope)
  ) {
    const locality = await AddressApi.resolveLocalityFor(scope);
    const dev = WeatherApi.deviationFor(
      locality,
      fieldBare as WeatherField,
      WorldClockApi.getNow(),
    );
    return base.add(dev as unknown as Quantity<U>);
  }
  return base;
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
  const root = rootBiome();
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
