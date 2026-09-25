/**
 * BiomeApi — biome substrate's static surface.
 *
 * Three concern clusters, each landing across waves:
 *
 *   - **Lookup + density** (Wave 2) — `findByPath` singleton lookup,
 *     `densityOf(tag)` per-atmosphere density read, `getRootBiome`
 *     cached accessor for the universe biome at `/stuff/idea/biome/`.
 *   - **Resolution chain** (Wave 3) — `resolveTemperatureFor` and
 *     the four siblings (pressure / humidity / gravity / atmosphere)
 *     plus their `trace*` variants that return provenance for the
 *     `trace atmosphere` verb. The chain walks innermost-
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
 * `/platform/idea/api/biome`, reached synchronously via `StuffApi.singletonSync`.
 * `dest /platform/idea/api/biome` reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type Biome from '../lib/biome/Biome';
import type { Evaporation } from '../lib/material/Evaporation';
import type { Quantity } from '../lib/quantity';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { BiomeLogic } from '../platform/idea/api/BiomeLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

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
    | 'elevation'
    | 'universe'
    // ⭐⭐ The room's own envelope answered: it is holding a state
    // different from its outside, and {@link EnvelopeTrace} says what
    // is keeping it there. The one provenance that is not a layer of
    // the chain but a THING THE ROOM IS DOING, which is why `feel` can
    // name a cause a player can walk over and look at.
    | 'envelope';
  /**
   * Path of the source — ancestor template path for detail / room,
   * biome template path for biome / biome-ancestor, zone path for
   * zone AND for `elevation` (the zone that declared the height),
   * `'/stuff/idea/biome/universe'` for universe.
   */
  sourcePath: string | null;
  /** Containment ancestor template paths traversed during the walk. */
  ancestorChain: string[];
  /** Present iff `source === 'envelope'`. What is keeping it there. */
  envelope?: EnvelopeTrace;
}

/**
 * ⭐ Why this room is the temperature it is — the read `feel` turns into
 * a sentence. Every field is derived; none of it is authored, which is
 * exactly what makes it safe to say out loud. A room that is warm for
 * no reason a player can be told would have to report `heatInputW: 0`
 * and an outside colder than itself, and that is the dishonesty showing
 * up in the fiction before anybody runs a gate.
 */
export interface EnvelopeTrace {
  /** What it is drifting toward, K. */
  outsideK: number;
  /** What is burning in it, W. */
  heatInputW: number;
  /** Its total heat-loss coefficient, W/K. */
  uWperK: number;
  /** How many exterior openings stand open. */
  openings: number;
  /** The Material its walls are made of — what `feel` names. */
  fabricMaterialPath: string;
  /** The hottest space-heating source present, for the prose. */
  hottestSource: string | null;
}

/**
 * One stretch of unchanging air inside a window — what
 * {@link BiomeApi.airSegmentsFor} hands a durative consumer.
 *
 * ⭐ A salt pan does not want *the air now*: it wants the whole window it
 * slept through, segment by segment, because a dry day and a wet one do
 * opposite things and their average does neither. So the window is
 * **walked**, not sampled, and the rain rides beside the air — a pan goes
 * backwards in a storm, which is the read the requirements ask for.
 */
export interface AirSegment {
  /** The air over this stretch. */
  air: Evaporation;
  /** Game-seconds of the window this stretch covers. */
  durationS: number;
  /** Liquid precipitation rate over it, mm/h. `0` indoors or dry. */
  rainMmPerH: number;
}

const LOGIC_PATH = '/platform/idea/api/biome';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/BiomeLogic', import.meta.url)
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
   * Thermal conductivity of an atmosphere tag — the surrounding
   * medium's term in a Thermal object's heat-exchange resistance.
   * Throws on unknown tag (mirrors {@link densityOf}). Water conducts
   * far faster than air; `vacuum` is tiny but non-zero so insulated
   * vessels cool slowly rather than never.
   */
  public static conductivityOf(tag: string): Quantity<'W/(m·K)'> {
    return logic().conductivityOf(tag);
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
   * The inhaled contaminant an atmosphere tag carries (`'carbonMonoxide'` for
   * `smoke`), or `null` for a clean medium. The breathable≠safe axis — the
   * fire driver's first consumer (`RespirationMixin` folds it into the
   * breather's metabolism toxin burden). Unknown tags read clean (no throw).
   */
  public static contaminantOf(tag: string): string | null {
    return logic().contaminantOf(tag);
  }

  /**
   * Cached accessor for the root universe biome at `/stuff/idea/biome/`.
   * Used by chain step 6 (universe terminal) and by `Altimeter`'s
   * sea-level reference. Throws when the root biome isn't loaded —
   * a boot-time invariant; the seeded universe biome at
   * the base-library pack's `content/stuff/idea/biome/universe.yaml` is mandatory.
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

  /**
   * ⭐ **The cheap, SYNCHRONOUS humidity read** — the containment walk's
   * authored overrides and biome defaults, terminating at the root
   * universe biome. `null` only when even that authors none.
   *
   * ⚠ It deliberately skips two tiers the full {@link resolveHumidityFor}
   * covers: the **Zone** field-inheritance step (which is async) and the
   * **weather deviation** (which needs an address walk). Use it only where
   * awaiting is genuinely impossible — a reconcile-on-read gauge running
   * off a getter, which is what it exists for (`WaterActivity.ambientHumidityOf`).
   * Everything that can await should call `resolveHumidityFor` instead.
   */
  public static localHumidityFor(scope: Stuff & Container): number | null {
    return logic().localHumidityFor(scope);
  }

  public static async resolveWindFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<Quantity<'m/s'>> {
    return logic().resolveWindFor(scope, detailKey);
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

  public static async traceResolveWindFor(
    scope: Stuff & Container,
    detailKey?: string
  ): Promise<AtmosphericTrace<Quantity<'m/s'>>> {
    return logic().traceResolveWindFor(scope, detailKey);
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
   * Convenience helper for the `trace atmosphere` controller.
   */
  public static async traceResolveAll(
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

  /**
   * ⭐ What a scope is drifting TOWARD, in K — the chain's answer plus
   * the weather, with no envelope applied. For a sky-exposed scope that
   * is simply its own temperature; for an enclosed one it is the air on
   * the other side of the wall.
   *
   * ⚠ The weather is folded only where the answer came from the SKY
   * (the universe baseline or a `SkyExposedBiome`). A biome may say
   * what the outside air is doing — a working IS 285 K the year round —
   * but that is rock, and a storm must not cool it.
   */
  public static async outsideTemperatureFor(
    scope: Stuff & Container
  ): Promise<Quantity<'K'>> {
    return logic().outsideTemperatureFor(scope);
  }

  /**
   * Re-stamp every Thermal object directly contained in `room` so each
   * re-resolves its cached ambient (`lastAmbientK`) against the room's
   * current — now possibly weather-deviated — temperature. The gated
   * wrapper (D-F) over the same fan-out `AtmosphericMixin` runs on an
   * ambient-shift; the weather segment-boundary coupling
   * (`WeatherApi.onBoundary`) calls this for occupied SkyExposed rooms so
   * a weather change reaches thermal without touching its sync read path.
   * Fire-and-forget — `restamp` is async; the room scope stays sync.
   */
  public static restampThermalContentsOf(room: Stuff & Container): void {
    logic().restampThermalContentsOf(room);
  }

  // ---------- the evaporation reads (SYNC) ----------

  /**
   * ⭐⭐ **What the air at a scope is doing to water in it** — humidity,
   * wind and temperature folded into one {@link Evaporation}, with the
   * live weather deviation on top when the scope is under the sky and its
   * `Locality` is known.
   *
   * **Sync, and that is the point.** Two reconcile-on-read consumers ask
   * this from a getter and cannot await: the per-instance water state
   * (`WaterActivityMixin` — a ham on a rack) and the durative transform
   * (`MaturingMixin`'s `evaporative` mechanism — a pan in the sun).
   * Neither computes a rate of its own; there is one arithmetic, here.
   *
   * ⚠ It skips the same two tiers {@link localHumidityFor} skips — the
   * **Zone** field-inheritance step (async) — and reaches weather only
   * through `AtmosphericMixin`'s locality memo, so the very first read of
   * a scope nobody has looked at reports the biome base and the next
   * reports the weather.
   */
  public static airFor(scope: Stuff & Container): Evaporation {
    return logic().airFor(scope);
  }

  /**
   * The air over a **window**, segment by segment, with each segment's
   * rain rate — for a consumer integrating a long absence
   * ({@link AirSegment}).
   *
   * Sync and exact: weather is a pure function of time, so the segments
   * between two instants are computable now and each contributes its own
   * air and its own rain. ⭐ **Never returns an empty list** — a window
   * with no weather is one segment of the air as it reads, so a caller
   * summing the list cannot silently credit nothing.
   */
  public static airSegmentsFor(
    scope: Stuff & Container,
    t0S: number,
    t1S: number,
  ): AirSegment[] {
    return logic().airSegmentsFor(scope, t0S, t1S);
  }
}

SecurityApi.decorateApiClass(BiomeApi);
