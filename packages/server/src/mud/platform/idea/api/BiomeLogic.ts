// BiomeLogic — the hot-reloadable logic singleton behind BiomeApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Exposure } from '../../../lib/spatial/Exposure';
import type { Atmospheric } from '../../../lib/biome/Atmospheric';
import Biome from '../../../lib/biome/Biome';
import { Quantity } from '../../../lib/quantity';
import type { Unit } from '../../../lib/quantity';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { TemplatePaths } from '../../../lib/paths';
import type { AtmosphericTrace, EnvelopeTrace } from '../../../api/biome';
import { ZoneApi } from '../../../api/zone';
import { WeatherApi } from '../../../api/weather';
import { AddressApi } from '../../../api/address';
import { WorldClockApi } from '../../../api/worldclock';
import {
  WEATHER_FIELDS,
  WEATHER_PROFILES,
  type WeatherField,
} from '../../../lib/weather/WeatherType';
import { Evaporation } from '../../../lib/material/Evaporation';
import { MEDIA, MEDIUM_TAGS, type MediumProps } from '../../../lib/biome/Medium';
import type { MediumRead } from '../../../api/biome';
import type { AirSegment } from '../../../api/biome';
import type Locality from '../Locality';
import type { Concentrate } from '../../../lib/bulk/Concentration';
import {
  DEFAULT_CLIMATE_SITE,
  type ClimateSite,
} from '../../../lib/weather/WeatherType';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';

/**
 * The four atmospheric fields weather deviates (D5). Gravity / atmosphere
 * are excluded — they carry no weather meaning. The seam in
 * `resolveQuantityFor` gates on this set so the deviation never touches
 * gravity reads.
 */
const WEATHER_DEVIATED_FIELDS = new Set<string>(WEATHER_FIELDS);

/**
 * ⭐ The medium's physics by tag — the one source (underwater D2).
 * The four per-tag tables that lived here are columns of
 * {@link MEDIA} now; the reads below keep their signatures.
 */
function mediumOf(tag: string, caller: string): MediumProps {
  const m = MEDIA[tag];
  if (!m) {
    throw new Error(
      `BiomeApi.${caller}: unknown atmosphere tag '${tag}' ` +
        `(known: ${knownAtmospheres().join(', ')})`
    );
  }
  return m;
}

/**
 * Depth guard for the chain walk. Real content shouldn't approach
 * this; the cap is defensive against pathological nesting.
 */
const CONTAINMENT_DEPTH_CAP = 32;

/**
 * Path of the root universe biome — the inheritance-hierarchy root
 * with `_extendsBiomePath: null`. The biome admin folder lives at
 * `/stuff/idea/biome/` (a `FolderZone`); the root biome itself lives at
 * `/stuff/idea/biome/universe`.
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
  SecurityPolicies.FromModule('/api/biome#BiomeApi'),
  SecurityPolicies.SelfOnly
);

/**
 * BiomeLogic — the hot-reloadable logic singleton behind
 * {@link BiomeApi}.
 *
 * Lives at `/platform/idea/api/biome` (a stateless `Stuff` singleton, no backing
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
export class BiomeLogic extends ApiLogic {
  /** See {@link BiomeApi.findByPath}. */
  @CallSecurity(BiomeApiCallers)
  public findByPath(path: string): Biome | null {
    return findBiomeByPath(path);
  }

  /** See {@link BiomeApi.densityOf}. */
  @CallSecurity(BiomeApiCallers)
  public densityOf(tag: string): Quantity<'kg/m³'> {
    return Quantity.of(mediumOf(tag, 'densityOf').densityKgM3, 'kg/m³');
  }

  /** See {@link BiomeApi.conductivityOf}. */
  @CallSecurity(BiomeApiCallers)
  public conductivityOf(tag: string): Quantity<'W/(m·K)'> {
    return Quantity.of(
      mediumOf(tag, 'conductivityOf').thermalConductivity,
      'W/(m·K)'
    );
  }

  /** See {@link BiomeApi.breathableOf}. */
  @CallSecurity(BiomeApiCallers)
  public breathableOf(tag: string): boolean {
    return mediumOf(tag, 'breathableOf').breathable;
  }

  /** See {@link BiomeApi.contaminantOf}. */
  @CallSecurity(BiomeApiCallers)
  public contaminantOf(tag: string): string | null {
    // Unknown tags read as clean (no throw) — the contaminant axis is
    // best-effort; a caller that already resolved a medium shouldn't
    // crash on a tag the vocabulary does not carry.
    return MEDIA[tag]?.contaminant ?? null;
  }

  /** See {@link BiomeApi.mediumProps}. */
  @CallSecurity(BiomeApiCallers)
  public mediumProps(tag: string): MediumProps {
    return mediumOf(tag, 'mediumProps');
  }

  /** See {@link BiomeApi.mediumFor}. */
  @CallSecurity(BiomeApiCallers)
  public mediumFor(stuff: Stuff): MediumRead {
    return mediumForImpl(stuff);
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
    scope: Stuff,
    detailKey?: string
  ): Promise<Quantity<'K'>> {
    // ⭐⭐ **One source of truth.** Everything that asks a scope how warm
    // it is comes through here — the body's effective ambient, a loaf's
    // thermal restamp, `feel`, `measure temperature` — so the envelope
    // is applied HERE rather than at each of them. A room holding a
    // state different from its outside is not a second mechanism beside
    // the chain; it is what the chain answers for that room.
    //
    // A per-detail read is never the room's own air (it is the oven, the
    // shaded corner, the ice bath), so it keeps the plain chain.
    if (detailKey === undefined) {
      const envelope = await resolveEnvelopeTemperature(scope);
      if (envelope !== null) return Quantity.of(envelope.value, 'K');
    }
    return (await liveTemperatureTraceFor(scope, detailKey)).value;
  }

  /**
   * See {@link BiomeApi.outsideTemperatureFor}. What this scope is
   * drifting TOWARD, in K — the chain's answer plus the weather, with
   * no envelope applied. For a sky-exposed scope that is simply its own
   * temperature.
   */
  @CallSecurity(BiomeApiCallers)
  public async outsideTemperatureFor(
    scope: Stuff
  ): Promise<Quantity<'K'>> {
    return Quantity.of(await outsideKFor(scope), 'K');
  }

  /** See {@link BiomeApi.resolvePressureFor}. */
  @CallSecurity(BiomeApiCallers)
  public async resolvePressureFor(
    scope: Stuff,
    detailKey?: string
  ): Promise<Quantity<'Pa'>> {
    const base = (await pressureTraceFor(scope, detailKey)).value;
    // The weather deviation rides on top exactly as it does for every
    // other deviated field — a storm still reads low on the barometer,
    // over whatever base the elevation step settled. (Which is also why
    // a barometric altimeter is fooled by weather in real life.)
    if (WeatherApi.isActive() && airIsOutside(scope)) {
      const locality = await AddressApi.resolveLocalityFor(scope);
      const dev = WeatherApi.deviatedFieldFor(
        scope,
        locality,
        'pressure',
        WorldClockApi.getNow(),
        await climateSiteOf(scope),
      );
      return base.add(dev as unknown as Quantity<'Pa'>);
    }
    return base;
  }

  /** See {@link BiomeApi.resolveHumidityFor}. */
  @CallSecurity(BiomeApiCallers)
  public async resolveHumidityFor(
    scope: Stuff,
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

  /** See {@link BiomeApi.localHumidityFor}. */
  @CallSecurity(BiomeApiCallers)
  public localHumidityFor(scope: Stuff): number | null {
    const { hit } = syncChainWalk<Quantity<'%'>>(
      scope,
      undefined,
      (b) => b.getDefaultHumidity(),
      (a, k) => readDetailMap<Quantity<'%'>>(a._detailHumidities, k),
      (a) => a._humidity,
    );
    if (hit !== null) return hit.value.rawValue();
    const universal = rootBiome().getDefaultHumidity();
    return universal === null ? null : universal.rawValue();
  }

  /** See {@link BiomeApi.resolveWindFor}. */
  @CallSecurity(BiomeApiCallers)
  public async resolveWindFor(
    scope: Stuff,
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

  /** See {@link BiomeApi.columnHeightOf}. */
  @CallSecurity(BiomeApiCallers)
  public columnHeightOf(
    pressure: Quantity<'Pa'>,
    density: Quantity<'kg/m³'>,
    gravity: Quantity<'m/s²'>
  ): Quantity<'m'> {
    const rho = density.rawValue();
    const g = gravity.rawValue();
    if (!(rho > 0) || !(g > 0)) return Quantity.of(0, 'm');
    return Quantity.of(pressure.rawValue() / (rho * g), 'm');
  }

  /** See {@link BiomeApi.suctionHeadFor}. */
  @CallSecurity(BiomeApiCallers)
  public async suctionHeadFor(
    scope: Stuff & Container,
    fluidDensity?: Quantity<'kg/m³'>
  ): Promise<Quantity<'m'>> {
    const pressure = await this.resolvePressureFor(scope);
    if (!(pressure.rawValue() > 0)) return Quantity.of(0, 'm');
    const gravity = await this.resolveGravityFor(scope);
    return this.columnHeightOf(
      pressure,
      fluidDensity ?? this.densityOf('water'),
      gravity
    );
  }

  /** See {@link BiomeApi.resolveGravityFor}. */
  @CallSecurity(BiomeApiCallers)
  public async resolveGravityFor(
    scope: Stuff,
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
    scope: Stuff,
    detailKey?: string
  ): Promise<string> {
    // ⭐ One answer, not two: whatever `scope` is immersed in is its
    // atmosphere (the bowl's water, the band's water); the walk below is
    // for the air over a place.
    // A holder with an atmosphere of its own (a sealed sub, a bell jar)
    // answers for itself whatever it sits in.
    const ownAir = MixinApi.isAtmospheric(scope) ? scope.getInlineAtmosphere() : null;
    if (detailKey === undefined && ownAir === null) {
      const medium = mediumForImpl(scope);
      if (medium.immersed && !medium.atSurface) return medium.tag;
    }
    return resolveStringFor(
      scope,
      detailKey,
      'atmosphere',
      (b) => b.getDefaultAtmosphere(),
      (a, k) => readDetailMap<string>(a._detailAtmospheres, k),
      (a) => a._atmosphere,
    );
  }

  /** See {@link BiomeApi.isKnownAtmosphere}. */
  @CallSecurity(BiomeApiCallers)
  public isKnownAtmosphere(tag: string): boolean {
    return MEDIA[tag] !== undefined;
  }

  /** See {@link BiomeApi.resolveAtmosphereContentsFor}. */
  @CallSecurity(BiomeApiCallers)
  public resolveAtmosphereContentsFor(scope: Stuff): Concentrate[] {
    return resolveContentsFor(scope);
  }

  /** See {@link BiomeApi.airShareOf}. */
  @CallSecurity(BiomeApiCallers)
  public airShareOf(contents: readonly Concentrate[]): number {
    let sum = 0;
    for (const c of contents) sum += Math.max(0, c.amount);
    return Math.max(0, Math.min(1, 1 - sum));
  }

  /** See {@link BiomeApi.hasBreathableShare}. */
  @CallSecurity(BiomeApiCallers)
  public hasBreathableShare(contents: readonly Concentrate[]): boolean {
    let sum = 0;
    for (const c of contents) sum += Math.max(0, c.amount);
    const share = Math.max(0, Math.min(1, 1 - sum));
    return share >= biomeDial(AppSettingKeys.atmosphereBreathableAirShare, 0.76);
  }

  /** See {@link BiomeApi.isBreathableMixture}. */
  @CallSecurity(BiomeApiCallers)
  public isBreathableMixture(
    tag: string,
    contents: readonly Concentrate[],
  ): boolean {
    if (MEDIA[tag]?.breathable !== true) return false;
    return this.hasBreathableShare(contents);
  }

  // ---------- trace variants ----------

  /** See {@link BiomeApi.traceResolveTemperatureFor}. */
  @CallSecurity(BiomeApiCallers)
  public async traceResolveTemperatureFor(
    scope: Stuff,
    detailKey?: string
  ): Promise<AtmosphericTrace<Quantity<'K'>>> {
    if (detailKey === undefined) {
      const envelope = await resolveEnvelopeTemperature(scope);
      if (envelope !== null) {
        return {
          value: Quantity.of(envelope.value, 'K'),
          source: 'envelope',
          sourcePath: scope.getTemplatePath() ?? null,
          ancestorChain: [],
          envelope: envelope.trace,
        };
      }
    }
    // ⭐ The trace reports the chain's provenance un-weathered, as every
    // trace does — EXCEPT the climate, whose answer is the air under the
    // sky, weather and all, so `trace atmosphere` and `measure` agree.
    return temperatureTraceFor(scope, detailKey);
  }

  /** See {@link BiomeApi.traceResolvePressureFor}. */
  @CallSecurity(BiomeApiCallers)
  public async traceResolvePressureFor(
    scope: Stuff,
    detailKey?: string
  ): Promise<AtmosphericTrace<Quantity<'Pa'>>> {
    return pressureTraceFor(scope, detailKey);
  }

  /** See {@link BiomeApi.traceResolveHumidityFor}. */
  @CallSecurity(BiomeApiCallers)
  public async traceResolveHumidityFor(
    scope: Stuff,
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
    scope: Stuff,
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
    scope: Stuff,
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
    scope: Stuff,
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
    scope: Stuff,
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
  public isSkyExposed(scope: Stuff): boolean {
    return skyExposedWalk(scope);
  }

  /** See {@link BiomeApi.exposureOf}. */
  @CallSecurity(BiomeApiCallers)
  public exposureOf(scope: Stuff): Exposure | null {
    return exposureWalk(scope);
  }

  // ---------- the evaporation reads (SYNC) ----------

  /** See {@link BiomeApi.airFor}. */
  @CallSecurity(BiomeApiCallers)
  public airFor(scope: Stuff): Evaporation {
    const base = localAir(scope);
    if (!WeatherApi.isActive() || !airIsOutside(scope)) return base;
    // The climate substitutes for the universe constant whether or not a
    // Locality is known — a sky with no weather is still a sky with a
    // season. The weather's deviation needs the Locality (null until the
    // memo lands, the `weatherLocalityOf` caveat).
    const tempK = skyBaseTempK(scope, base.tempK, WorldClockApi.getNow().rawValue());
    const dev = liveDeviation(scope);
    return new Evaporation(
      base.humidityPct + (dev?.humidity ?? 0),
      base.windMs + (dev?.wind ?? 0),
      tempK + (dev?.temperature ?? 0),
    );
  }

  /** See {@link BiomeApi.airSegmentsFor}. */
  @CallSecurity(BiomeApiCallers)
  public airSegmentsFor(
    scope: Stuff,
    t0S: number,
    t1S: number,
  ): AirSegment[] {
    const windowS = t1S - t0S;
    const base = localAir(scope);

    const locality = weatherLocalityOf(scope);
    if (
      !(windowS > 0) ||
      !WeatherApi.isActive() ||
      !airIsOutside(scope) ||
      locality === null
    ) {
      // Indoors, weather-absent, unresolved, or an empty window: one
      // segment of the air as it reads now. ⭐ NEVER zero segments — a
      // caller integrating over the list must not silently credit nothing.
      return [
        {
          air: this.airFor(scope),
          durationS: windowS > 0 ? windowS : 0,
          rainMmPerH: 0,
        },
      ];
    }

    const site = climateSiteSyncOf(scope);
    const rainReaches = exposureWalk(scope)?.rainReaches() ?? false;
    const segments = WeatherApi.segmentsBetween(
      Quantity.of(t0S, 's'),
      Quantity.of(t1S, 's'),
      locality,
      undefined,
      site,
    );
    if (segments.length === 0) {
      return [{ air: this.airFor(scope), durationS: windowS, rainMmPerH: 0 }];
    }

    return segments.map((seg) => {
      const dev = WEATHER_PROFILES[seg.type].deviation;
      // ⭐ The climate at the middle of the overlap — the same expression
      // the live read takes, so drying and maturation integrate the
      // winter a `feel` reports (before the climate build this path had
      // no seasonal term at all).
      const midS = seg.startsAtS + seg.overlapS / 2;
      const air = new Evaporation(
        base.humidityPct + dev.humidity.rawValue(),
        base.windMs + dev.wind.rawValue(),
        skyBaseTempK(scope, base.tempK, midS) + dev.temperature.rawValue(),
      );
      // The segment's own rate, integrated through the shipped spine
      // rather than read off a private table — so the operator dials
      // (`water.rainRateMmPerHour` and its siblings) stay in one place.
      // A segment's type is constant, so any sub-window gives the rate.
      const hours = seg.overlapS / 3600;
      let rainMmPerH = 0;
      // ⭐ Under an awning the air is the street's and the rain is not.
      if (hours > 0 && rainReaches) {
        const fell = WeatherApi.precipitationBetween(
          Quantity.of(seg.startsAtS, 's'),
          Quantity.of(seg.startsAtS + seg.overlapS, 's'),
          locality,
          site,
        );
        rainMmPerH = fell.liquid.rawValue() / hours;
      }
      return { air, durationS: seg.overlapS, rainMmPerH };
    });
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
function skyExposedWalk(scope: Stuff): boolean {
  let cursor: Stuff | null = scope;
  let depth = CONTAINMENT_DEPTH_CAP;
  while (cursor !== null && depth-- > 0) {
    if (MixinApi.isAtmospheric(cursor)) {
      const biome = (cursor as Stuff & Atmospheric).getBiome();
      if (biome !== null) {
        return MixinApi.isSkyExposed(biome);
      }
    }
    cursor = stepOutward(cursor);
  }
  return false;
}

/**
 * ⭐⭐ The construction answer for the place `scope` is in: the innermost
 * atmospheric scope (itself, or the first outward) and its exposure.
 */
function exposureWalk(scope: Stuff): Exposure | null {
  let cursor: Stuff | null = scope;
  let depth = CONTAINMENT_DEPTH_CAP;
  while (cursor !== null && depth-- > 0) {
    if (MixinApi.isAtmospheric(cursor)) {
      return (cursor as Stuff & Atmospheric).exposure();
    }
    cursor = stepOutward(cursor);
  }
  return null;
}

/**
 * ⭐ Is the AIR of the place `scope` is in the outside air — does the
 * weather's deviation reach it? True when that place holds no air of its
 * own (an open top, or no walls: a street, a pen, an awning). This is the
 * question every weather-deviation gate below asks; for an undeclared
 * place it is exactly the legacy biome answer.
 */
function airIsOutside(scope: Stuff): boolean {
  const e = exposureWalk(scope);
  return e !== null && !e.holdsAir();
}

/**
 * ⭐ F1 — the nearest Atmospheric scope OUTSIDE `scope` (skipping `scope`
 * itself), or `null`. A room-shaped scope is not Containable, so it has no
 * enclosing scope and this returns `null`; a Thing-shaped scope (a fridge,
 * the coach) finds the room it stands in, and a compartment finds the
 * appliance it sits in (the seam applied twice). The walk is `getContainer`
 * outward, the same one `skyExposedWalk` uses.
 */
function enclosingAtmosphericOf(
  scope: Stuff,
): (Stuff & Atmospheric) | null {
  let cursor = stepOutward(scope);
  let depth = CONTAINMENT_DEPTH_CAP;
  while (cursor !== null && depth-- > 0) {
    if (MixinApi.isAtmospheric(cursor)) {
      return cursor as Stuff & Atmospheric;
    }
    cursor = stepOutward(cursor);
  }
  return null;
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
 * Cached accessor for the root universe biome at `/stuff/idea/biome/`. Throws
 * when the root biome isn't loaded — a boot-time invariant.
 */
function rootBiome(): Biome {
  if (rootBiomeCache === null) {
    const b = findBiomeByPath(ROOT_BIOME_PATH);
    if (b === null) {
      throw new Error(
        `BiomeApi.getRootBiome: root universe biome at ` +
          `'${ROOT_BIOME_PATH}' is not loaded — check ` +
          `packages/content/base-library/content/stuff/idea/biome/universe.yaml`
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
  cursor: Stuff,
): Stuff | null {
  if (!MixinApi.isContainable(cursor)) return null;
  const next = cursor.getContainer();
  if (next === null) return null;
  if (!MixinApi.isContainer(next)) return null;
  return next;
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
/**
 * ⭐ **Pressure derived from elevation** — the watershed build's D4.
 *
 * `measure altitude` computes `(P_sea − P_local) / (ρ·g)`. Before
 * elevation existed as a zone field, that made altitude a back-computation
 * from a number an author typed into a biome, which is a circularity
 * dressed as an instrument. This function is the inverse — the *linear*
 * hydrostatic form `P = P_sea − ρ·g·h`, chosen precisely because it is
 * the altimeter's own expression solved the other way, so the instrument
 * reads back the zone's elevation exactly. Pressure becomes the
 * consequence, the altimeter becomes honest, and one physical fact has
 * one source of truth.
 *
 * **An authored value still wins.** This runs only when the chain walk
 * fell all the way through to the ROOT universe biome — i.e. when
 * nothing between the scope and the top of the world declared a pressure
 * of its own, and the 101325 Pa the walk came back with is the sea-level
 * REFERENCE rather than a local reading. Any detail, room, biome, biome
 * ancestor or zone that names a pressure short-circuits before this.
 *
 * Returns `null` when there is no elevation to derive from, when it is
 * zero (sea level IS the reference — deriving would be a no-op that only
 * costs a walk), or when the medium has no density (a vacuum has no
 * barometric anything).
 */
async function pressureFromElevation(
  scope: Stuff,
  seaLevel: Quantity<'Pa'>,
): Promise<{ value: Quantity<'Pa'>; zonePath: string | null } | null> {
  const elevation = await ZoneApi.elevationFor(scope);
  if (elevation === null || !Number.isFinite(elevation) || elevation === 0) {
    return null;
  }
  const atmosphere = await resolveStringFor(
    scope,
    undefined,
    'atmosphere',
    (b) => b.getDefaultAtmosphere(),
    (a, k) => readDetailMap<string>(a._detailAtmospheres, k),
    (a) => a._atmosphere,
  );
  const medium = MEDIA[atmosphere];
  // An atmosphere with no known density derives nothing; a vacuum has
  // no barometric anything (the altimeter says so in prose, and this is
  // the same statement on the causal side).
  if (medium === undefined || medium.densityKgM3 === 0) return null;
  const density = Quantity.of(medium.densityKgM3, 'kg/m³');
  const gravity = await resolveQuantityFor<'m/s²'>(
    scope,
    undefined,
    'gravity',
    (b) => b.getDefaultGravity(),
    (a, k) => readDetailMap<Quantity<'m/s²'>>(a._detailGravities, k),
    (a) => a._gravity,
  );
  const local =
    seaLevel.rawValue() - density.rawValue() * gravity.rawValue() * elevation;
  const zone = outermostZonePathOf(scope);
  return { value: Quantity.of(local, 'Pa'), zonePath: zone };
}

/** The default: a body standing in the open, in air. */
const AIR_READ: MediumRead = {
  tag: 'air',
  substance: 'air',
  immersed: false,
  atSurface: false,
  temperatureK: null,
  depthM: 0,
  waterRef: null,
};

/**
 * ⭐⭐ **What `stuff` is IN** — the one medium read (underwater D3).
 *
 * Walks the containment chain outward from `stuff`; the first ancestor
 * that has an answer gives it:
 *
 *   (a) a vessel holding a LIQUID (a bulk interior with anything in it) —
 *       the carp in its bowl, the man in the vat. Immersed.
 *   (b) a holder with an inline atmosphere of its own — a bell's air, a
 *       vacuum room.
 *   (c) a swimmable place — whoever its floor does not hold up is in its
 *       water, at its temperature; whoever it does is in the air above.
 *   (d) otherwise air. Exotic biome atmospheres are the async
 *       `resolveAtmosphereFor`'s, which consults this first.
 *
 * Per-occupant, which is why it is not a room tag: a body on the ice and
 * a body in the hole share a room and not a medium.
 */
function mediumForImpl(stuff: Stuff): MediumRead {
  let child: Stuff = stuff;
  let at: Stuff | null = MixinApi.isContainable(stuff) ? stuff.getContainer() : null;
  const seen = new Set<Stuff>();
  let depth = CONTAINMENT_DEPTH_CAP;
  while (at !== null && !seen.has(at) && depth-- > 0) {
    seen.add(at);
    if (MixinApi.isBulkable(at) && at.getBulkAmount('interior').rawValue() > 0) {
      const name = at.getBulkMaterial('interior')?.getName() ?? null;
      if (name !== null) {
        const known = MEDIA[name];
        return {
          // Any liquid nobody named as a medium behaves as water does.
          tag: known ? name : 'water',
          substance: name,
          immersed: known ? known.densityKgM3 >= LIQUID_DENSITY_KG_M3 : true,
          atSurface: false,
          temperatureK: null,
          depthM: 0,
          waterRef: null,
        };
      }
    }
    if (MixinApi.isAtmospheric(at)) {
      const inline = at.getInlineAtmosphere();
      if (inline !== null && MEDIA[inline] !== undefined) {
        return {
          ...AIR_READ,
          tag: inline,
          substance: inline,
          immersed: MEDIA[inline]!.densityKgM3 >= LIQUID_DENSITY_KG_M3,
        };
      }
    }
    if (MixinApi.isWaterPlace(at)) return at.mediumFor(child);
    child = at;
    at = MixinApi.isContainable(at) ? at.getContainer() : null;
  }
  return AIR_READ;
}

/** A medium at least this dense is a liquid a body is IN, not air it is under. */
const LIQUID_DENSITY_KG_M3 = 100;

/** The outermost container's zone path, for provenance reporting. */
function outermostZonePathOf(scope: Stuff): string | null {
  let cursor: Stuff | null = scope;
  let outermost: Stuff = scope;
  let depth = CONTAINMENT_DEPTH_CAP;
  while (cursor !== null && depth-- > 0) {
    outermost = cursor;
    cursor = stepOutward(cursor);
  }
  return outermost.getZone()?.getTemplatePath() ?? null;
}

/**
 * The pressure chain walk, with the derive-from-elevation step folded in
 * (D4). Shared by `resolvePressureFor` and `traceResolvePressureFor`, so
 * the reported provenance and the returned number can never disagree.
 *
 * The elevation step fires **only** when the walk fell all the way
 * through to the ROOT universe biome — reached as `biome`,
 * `biome-ancestor` or the terminal `universe` step, all of which report
 * `sourcePath === ROOT_BIOME_PATH`. That is precisely the case where the
 * 101325 Pa in hand is the sea-level *reference* rather than anything an
 * author said about this place, so substituting a derived local pressure
 * takes nothing away from anybody. Any authored value anywhere in the
 * chain short-circuits earlier and wins.
 */
async function pressureTraceFor(
  scope: Stuff,
  detailKey: string | undefined,
): Promise<AtmosphericTrace<Quantity<'Pa'>>> {
  const trace = await runChainWalk<Quantity<'Pa'>>(
    scope,
    detailKey,
    'pressure',
    (b) => b.getDefaultPressure(),
    (a, k) => readDetailMap<Quantity<'Pa'>>(a._detailPressures, k),
    (a) => a._pressure,
  );
  if (trace.sourcePath !== ROOT_BIOME_PATH) return trace;
  const derived = await pressureFromElevation(scope, trace.value);
  if (derived === null) return trace;
  return {
    value: derived.value,
    source: 'elevation',
    sourcePath: derived.zonePath,
    ancestorChain: trace.ancestorChain,
  };
}

/**
 * ⭐⭐ **What this scope is drifting TOWARD**, in K.
 *
 * The chain, run in full, plus the weather deviation — but the weather
 * only where the answer came from the sky.
 *
 * ⚠ That last condition is the one worth reading twice. A biome may say
 * what the outside AIR is doing: Rejection's `underground/upper-workings`
 * authors 285 K and that is honest, because a working IS that
 * temperature the year round. But it is ROCK, not sky, so a storm must
 * not cool it — and a zone-authored temperature is the same case. Only
 * the universe baseline and a `SkyExposedBiome` describe something the
 * weather is happening to.
 */
async function outsideKFor(scope: Stuff): Promise<number> {
  // ⭐ F1 — the nested-envelope seam. A scope that stands INSIDE another
  // scope's air (a fridge in a shop, the coach in a coach-house) drifts
  // toward the ROOM it stands in, not toward the biome default. Before the
  // chain walk — which reads only biome/ancestor rows and would hand a
  // nested envelope the indoor default the room-envelope build removed one
  // level up — ask whether an enclosing Atmospheric applies, and take its
  // last-integrated air as the outside. A room's own enclosing scope is
  // nothing (it is not Containable), so a room's outside stays the
  // weather; only a Thing-shaped scope finds a room here.
  const enclosing = enclosingAtmosphericOf(scope);
  if (enclosing !== null && enclosing.envelopeApplies()) {
    const encK = enclosing.envelopeTemperatureLast();
    if (encK !== null) return encK;
  }

  const trace = await runChainWalk<Quantity<'K'>>(
    scope,
    undefined,
    'temperature',
    (b) => b.getDefaultTemperature(),
    (a, k) => readDetailMap<Quantity<'K'>>(a._detailTemperatures, k),
    (a) => a._temperature,
  );
  let outside = trace.value.rawValue();
  if (!WeatherApi.isActive()) return outside;

  // ⭐⭐ The climate build: where the chain fell through to the universe
  // constant — reached directly, or through an indoor or sky biome that
  // says nothing about temperature — the outside IS the climate at this
  // place, plus the weather. An enclosed room drifts toward the real
  // winter now; before, an indoor-biomed room's outside was 295 K the
  // year round. An authored temperature anywhere in the chain (the
  // upper workings' 285 K of rock) still wins and the weather does not
  // touch it, unless it is a sky biome's.
  if (trace.sourcePath === ROOT_BIOME_PATH) {
    const site = await climateSiteOf(scope);
    const locality = await AddressApi.resolveLocalityFor(scope);
    const now = WorldClockApi.getNow();
    return (
      WeatherApi.climateAt(site, now).rawValue() +
      WeatherApi.deviatedFieldFor(scope, locality, 'temperature', now, site).rawValue()
    );
  }

  const fromSky =
    (trace.source === 'biome' || trace.source === 'biome-ancestor') &&
    trace.sourcePath !== null &&
    isSkyBiomePath(trace.sourcePath);
  if (!fromSky) return outside;

  const locality = await AddressApi.resolveLocalityFor(scope);
  outside += WeatherApi.deviatedFieldFor(
    scope,
    locality,
    'temperature',
    WorldClockApi.getNow(),
    await climateSiteOf(scope),
  ).rawValue();
  return outside;
}

/**
 * ⭐⭐ **The temperature chain under the sky — the climate build's D4.**
 *
 * Mirrors {@link pressureTraceFor}: run the chain, and when it fell all
 * the way through to the universe constant (`sourcePath ===
 * ROOT_BIOME_PATH`) on a sky-exposed scope with weather active, the
 * answer is the CLIMATE at this place — `WeatherApi.climateAt` at its
 * site — plus the weather's deviation (pin-aware, per scope). The 295 K
 * in hand was never anything an author said about this place, so
 * replacing it takes nothing from anybody.
 *
 * An authored temperature anywhere in the chain (a detail, the room, a
 * biome row, a zone's `atmosphere.temperature`) short-circuits earlier
 * and is returned as the chain answered it, un-weathered — the caller
 * folds the weather TYPE deviation on top for a sky scope
 * ({@link liveTemperatureTraceFor}). The honest tool for *this place is
 * warmer than its latitude* is the zone's `climateOffsetK`, not a flat
 * number on an outdoor biome (`lint:biome` refuses one).
 */
async function temperatureTraceFor(
  scope: Stuff,
  detailKey: string | undefined,
): Promise<AtmosphericTrace<Quantity<'K'>>> {
  const trace = await runChainWalk<Quantity<'K'>>(
    scope,
    detailKey,
    'temperature',
    (b) => b.getDefaultTemperature(),
    (a, k) => readDetailMap<Quantity<'K'>>(a._detailTemperatures, k),
    (a) => a._temperature,
  );
  if (trace.sourcePath !== ROOT_BIOME_PATH) return trace;
  if (!WeatherApi.isActive() || !airIsOutside(scope)) return trace;
  const site = await climateSiteOf(scope);
  const locality = await AddressApi.resolveLocalityFor(scope);
  const now = WorldClockApi.getNow();
  const value = WeatherApi.climateAt(site, now).add(
    WeatherApi.deviatedFieldFor(
      scope,
      locality,
      'temperature',
      now,
      site,
    ) as unknown as Quantity<'K'>,
  );
  return {
    value,
    source: 'climate',
    sourcePath: outermostZonePathOf(scope),
    ancestorChain: trace.ancestorChain,
    site,
  };
}

/**
 * The live (weathered) temperature read: the climate where the chain
 * derives it, else the authored answer plus — under the sky — the
 * weather TYPE's deviation. The one rule `resolveTemperatureFor` and the
 * per-detail reads share.
 */
async function liveTemperatureTraceFor(
  scope: Stuff,
  detailKey: string | undefined,
): Promise<AtmosphericTrace<Quantity<'K'>>> {
  const trace = await temperatureTraceFor(scope, detailKey);
  if (trace.source === 'climate') return trace;
  if (!WeatherApi.isActive() || !airIsOutside(scope)) return trace;
  const locality = await AddressApi.resolveLocalityFor(scope);
  const site = await climateSiteOf(scope);
  const dev = WeatherApi.deviatedFieldFor(
    scope,
    locality,
    'temperature',
    WorldClockApi.getNow(),
    site,
  );
  return { ...trace, value: trace.value.add(dev as unknown as Quantity<'K'>) };
}

/**
 * The scope's climate site through the nearest air-bearing host's memo,
 * AWAITED — so an async read never folds the realm default at a polar
 * place. A scope with no air of its own anywhere outward reads its zone
 * directly.
 */
async function climateSiteOf(scope: Stuff): Promise<ClimateSite> {
  const host = nearestAtmosphericOf(scope);
  if (host !== null) {
    await host.resolveClimateSite();
    return host.climateSite();
  }
  return ZoneApi.climateSiteFor(scope);
}

/**
 * The scope's climate site, SYNC, through the same memo — the default
 * until the first walk lands (the {@link weatherLocalityOf} caveat).
 */
function climateSiteSyncOf(scope: Stuff): ClimateSite {
  return nearestAtmosphericOf(scope)?.climateSite() ?? DEFAULT_CLIMATE_SITE;
}

/** The innermost air-bearing scope at or around `scope`. */
function nearestAtmosphericOf(
  scope: Stuff,
): (Stuff & Atmospheric) | null {
  let cursor: Stuff | null = scope;
  let depth = CONTAINMENT_DEPTH_CAP;
  while (cursor !== null && depth-- > 0) {
    if (MixinApi.isAtmospheric(cursor)) {
      return cursor as Stuff & Atmospheric;
    }
    cursor = stepOutward(cursor);
  }
  return null;
}

/** Does the biome row at `path` compose `SkyExposedMixin`? */
function isSkyBiomePath(path: string): boolean {
  const biome = findBiomeByPath(path);
  return biome !== null && MixinApi.isSkyExposed(biome);
}

/**
 * ⭐⭐ Run the scope's envelope, or answer `null` when it has none.
 *
 * Four steps, and the order is the whole contract: decide whether an
 * envelope applies at all (the geometry and the author answer that —
 * see `AtmosphericMixin.envelopeApplies`), resolve what it is drifting
 * toward, stamp that, and integrate forward. The stamp is what lets the
 * reconcile stay SYNC: the outside needs an address walk and a chain
 * walk, and the body's vitals poll cannot afford either.
 */
async function resolveEnvelopeTemperature(
  scope: Stuff,
): Promise<{ value: number; trace: EnvelopeTrace } | null> {
  if (!MixinApi.isAtmospheric(scope)) return null;
  const host = scope as Stuff & Atmospheric;
  if (!host.envelopeApplies()) return null;

  // ⚠⚠ **Reentry guard, per scope.** Resolving a room's temperature can
  // reach back into the same room: `outsideKFor` is async, and while it
  // is in flight a restamp fanned out by something else in the room
  // (lighting a hearth restamps every Thermal body standing in it) asks
  // the room how warm it is. The result is a ring of four subsystems,
  // each individually correct, and a socket that never answers — a
  // `feel` in a cookhouse with a lit hearth, found by the drive.
  //
  // A re-entrant caller gets the room's LAST answer rather than a
  // fresh integration, which is correct: the outer call is already
  // computing one.
  if (envelopeResolving.has(scope.stuffId)) {
    const held = host.envelopeTemperatureK;
    return held === null ? null : { value: held, trace: traceOf(host, scope) };
  }
  envelopeResolving.add(scope.stuffId);
  try {
    host.envelopeOutsideK = await outsideKFor(scope);
    // ⭐ (D7) One hop to the rooms of the same building this one shares a
    // face with: resolve each one's outside if it has none, and bring it
    // current once, so the neighbour temperature this room reads is
    // current to this read. Never recursive — a neighbour's own reconcile
    // reads THIS room's last value, and the reentry set holds.
    for (const face of host.exposure().interiorFaces()) {
      const n = face.neighbour;
      if (!n || !MixinApi.isAtmospheric(n)) continue;
      if (envelopeResolving.has(n.stuffId) || !n.envelopeApplies()) continue;
      envelopeResolving.add(n.stuffId);
      try {
        if (n.envelopeOutsideK === null) n.envelopeOutsideK = await outsideKFor(n);
        n.reconcileEnvelope();
      } catch {
        // a neighbour that fails to resolve is skipped
      } finally {
        envelopeResolving.delete(n.stuffId);
      }
    }
  } finally {
    envelopeResolving.delete(scope.stuffId);
  }
  host.reconcileEnvelope();
  const value = host.envelopeTemperatureK;
  if (value === null) return null;

  return { value, trace: traceOf(host, scope) };
}

/**
 * The provenance, derived the same way the integration was — so what
 * `feel` says and what the room DID cannot come apart.
 */
function traceOf(
  host: Stuff & Atmospheric,
  scope: Stuff,
): EnvelopeTrace {
  let heatInputW = 0;
  let hottestSource: string | null = null;
  let hottestW = 0;
  // The envelope integrates only for a scope with a volume (a Location,
  // a Vessel) — both Containers — so a placement-shaped scope (a
  // `Chamber`) never reaches here; the guard is the widening's type
  // honesty, not a branch any live scope takes.
  const occupants = MixinApi.isContainer(scope) ? scope.getContents() : [];
  for (const occupant of occupants) {
    if (!MixinApi.isSpaceHeating(occupant)) continue;
    const w = occupant.spaceHeatOutputW();
    heatInputW += w;
    if (w > hottestW) {
      hottestW = w;
      hottestSource = (occupant as unknown as Stuff).getPresentation();
    }
  }
  return {
    outsideK: host.envelopeOutsideK ?? 0,
    heatInputW,
    uWperK: host.envelopeUWperK(),
    openings: host.openExteriorOpenings(),
    enclosureMaterialPath: host.envelopeEnclosureMaterialPath(),
    hottestSource,
  };
}

/**
 * Scopes whose outside is being resolved right now. Module scope, and
 * legitimately: a pure re-entrancy marker holding no world state, the
 * `seasonCache` shape.
 */
const envelopeResolving = new Set<string>();

async function resolveQuantityFor<U extends Unit>(
  scope: Stuff,
  detailKey: string | undefined,
  fieldBare: string,
  biomeGetter: (b: Biome) => Quantity<U> | null,
  detailGetter: (
    a: Stuff & Atmospheric,
    detailKey: string,
  ) => { value: Quantity<U>; matchedKey: string } | null,
  ownGetter: (a: Stuff & Atmospheric) => Quantity<U> | null,
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
    airIsOutside(scope)
  ) {
    const locality = await AddressApi.resolveLocalityFor(scope);
    // Pin-aware (Wave 2): when an authored pin governs this scope, fold the
    // pinned type's deviation instead of the procgen field; byte-identical
    // to the old `deviationFor` when no pin applies. The pin walk runs only
    // here, after the three cheap gates above passed.
    // The site decides the hemisphere the grammar's season reads, so
    // every field of one scope reads one weather type.
    const dev = WeatherApi.deviatedFieldFor(
      scope,
      locality,
      fieldBare as WeatherField,
      WorldClockApi.getNow(),
      await climateSiteOf(scope),
    );
    return base.add(dev as unknown as Quantity<U>);
  }
  return base;
}

async function resolveStringFor(
  scope: Stuff,
  detailKey: string | undefined,
  fieldBare: string,
  biomeGetter: (b: Biome) => string | null,
  detailGetter: (
    a: Stuff & Atmospheric,
    detailKey: string,
  ) => { value: string; matchedKey: string } | null,
  ownGetter: (a: Stuff & Atmospheric) => string | null,
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
  scope: Stuff,
  detailKey: string | undefined,
  fieldBare: string,
  biomeGetter: (b: Biome) => Quantity<U> | null,
  detailGetter: (
    a: Stuff & Atmospheric,
    detailKey: string,
  ) => { value: Quantity<U>; matchedKey: string } | null,
  ownGetter: (a: Stuff & Atmospheric) => Quantity<U> | null,
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
  scope: Stuff,
  detailKey: string | undefined,
  fieldBare: string,
  biomeGetter: (b: Biome) => string | null,
  detailGetter: (
    a: Stuff & Atmospheric,
    detailKey: string,
  ) => { value: string; matchedKey: string } | null,
  ownGetter: (a: Stuff & Atmospheric) => string | null,
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
 * Steps 1–4 of the chain: the containment walk over per-detail overrides,
 * room/vessel-scope overrides and biome defaults. **Synchronous** — every
 * one of those reads is — which is what lets a reconcile-on-read gauge
 * (the cure's rehydration, which runs off a getter and cannot await) ask
 * the same question the full resolve asks, without duplicating the walk.
 *
 * Returns the hit when one of those tiers answered, plus the walk state
 * ({@link runChainWalk}'s steps 5–6 need the outermost scope and the
 * ancestor chain).
 */
function syncChainWalk<V>(
  scope: Stuff,
  detailKey: string | undefined,
  biomeGetter: (b: Biome) => V | null,
  detailGetter: (
    a: Stuff & Atmospheric,
    detailKey: string,
  ) => { value: V; matchedKey: string } | null,
  ownGetter: (a: Stuff & Atmospheric) => V | null,
): {
  hit: AtmosphericTrace<V> | null;
  outermost: Stuff;
  ancestorChain: string[];
} {
  const ancestorChain: string[] = [];
  let cursor: Stuff | null = scope;
  let outermost: Stuff = scope;
  let isInnermost = true;
  let depth = CONTAINMENT_DEPTH_CAP;

  while (cursor !== null && depth-- > 0) {
    outermost = cursor;
    const cursorPath = cursor.getTemplatePath?.() ?? null;
    if (cursorPath !== null) ancestorChain.push(cursorPath);

    if (MixinApi.isAtmospheric(cursor)) {
      const a = cursor as Stuff & Atmospheric;

      // Steps a + b — detail-key + prefix walk, innermost only.
      if (isInnermost && detailKey !== undefined && detailKey.length > 0) {
        const hit = detailGetter(a, detailKey);
        if (hit !== null) {
          return {
            hit: {
              value: hit.value,
              source: hit.matchedKey === detailKey ? 'detail' : 'detail-prefix',
              sourcePath: cursorPath,
              ancestorChain,
            },
            outermost,
            ancestorChain,
          };
        }
      }

      // Step c — bulk room/vessel-scope override.
      const own = ownGetter(a);
      if (own !== null && own !== undefined) {
        return {
          hit: {
            value: own,
            source: 'room',
            sourcePath: cursorPath,
            ancestorChain,
          },
          outermost,
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
            hit: {
              value: fromBiome.value,
              source:
                biomeOwnPath === fromBiome.biomePath
                  ? 'biome'
                  : 'biome-ancestor',
              sourcePath: fromBiome.biomePath,
              ancestorChain,
            },
            outermost,
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

  return { hit: null, outermost, ancestorChain };
}

/**
 * The full six-step chain. Iterative (depth-capped per containment
 * safety); awaits the Zone field-inheritance walk at step 5.
 */
async function runChainWalk<V>(
  scope: Stuff,
  detailKey: string | undefined,
  fieldBare: string,
  biomeGetter: (b: Biome) => V | null,
  detailGetter: (
    a: Stuff & Atmospheric,
    detailKey: string,
  ) => { value: V; matchedKey: string } | null,
  ownGetter: (a: Stuff & Atmospheric) => V | null,
): Promise<AtmosphericTrace<V>> {
  const { hit, outermost, ancestorChain } = syncChainWalk<V>(
    scope,
    detailKey,
    biomeGetter,
    detailGetter,
    ownGetter,
  );
  if (hit !== null) return hit;

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
        `This is a boot-time invariant violation; check the base-library pack's content/stuff/idea/biome/universe.yaml.`,
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

/** Every atmosphere tag the per-tag physics tables know. */
function knownAtmospheres(): string[] {
  return [...MEDIUM_TAGS];
}

/** One numeric dial read, falling back to the literal when unseeded. */
function biomeDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * ⭐⭐ **The contents walk — the innermost scope that IS a place answers.**
 *
 * Deliberately not the six-step chain, and deliberately not a sum across
 * ancestors. The identity tag walks outward because *the air over a place*
 * is inherited from the place around it; what the air CARRIES is a
 * quantity in a volume, and a quantity cannot be inherited — summing a
 * coach's smoke with the smoke of the street it stands in would count the
 * same litres twice and let a sealed vessel breathe the room.
 *
 * So: walk outward, and the first `Atmospheric` ancestor with a derivable
 * VOLUME is the medium you are in. That is the same discriminator
 * `addAtmosphereContent` uses to decide where litres may go, so contents
 * can only ever be read from a scope they could have been put into.
 * A scope with no volume (a plain `Location`, `Offstage`) is not a place
 * and passes through; nothing in the chain means `[]`, the plain air of a
 * world with nothing in it.
 */
function resolveContentsFor(scope: Stuff): Concentrate[] {
  let cursor: Stuff | null = scope;
  let depth = CONTAINMENT_DEPTH_CAP;
  while (cursor !== null && depth-- > 0) {
    if (MixinApi.isAtmospheric(cursor)) {
      const a = cursor as Stuff & Atmospheric;
      if (a.getVolume() !== null) {
        a.reconcileAtmosphereContents();
        return sumByType(a._atmosphereContents, a._atmosphereStanding);
      }
    }
    const next = stepOutward(cursor);
    if (next === null) break;
    cursor = next;
  }
  return [];
}

/** The two lists folded into one, summed by material path. */
function sumByType(
  accumulated: readonly Concentrate[],
  standing: readonly Concentrate[],
): Concentrate[] {
  const byType = new Map<string, number>();
  for (const list of [accumulated, standing]) {
    for (const c of list) {
      if (!(c.amount > 0)) continue;
      byType.set(c.type, (byType.get(c.type) ?? 0) + c.amount);
    }
  }
  const out: Concentrate[] = [];
  for (const [type, amount] of byType) out.push({ type, amount });
  return out;
}

// ---------- the evaporation walk (module-private) ----------

/**
 * The three fields {@link Evaporation} is built from, resolved by the
 * **sync** chain walk and terminating at the root universe biome. No
 * weather, no zone tier — the same two tiers {@link
 * BiomeLogic.localHumidityFor} skips, for the same reason: a
 * reconcile-on-read gauge cannot await.
 */
function localAir(scope: Stuff): Evaporation {
  const humidity = syncScalar<'%'>(
    scope,
    (b) => b.getDefaultHumidity(),
    (a) => a._humidity,
    AIR_FALLBACK_HUMIDITY_PCT,
  );
  const wind = syncScalar<'m/s'>(
    scope,
    (b) => b.getDefaultWind(),
    (a) => a._wind,
    0,
  );
  const temp = syncScalar<'K'>(
    scope,
    (b) => b.getDefaultTemperature(),
    (a) => a._temperature,
    AIR_FALLBACK_TEMP_K,
  );
  return new Evaporation(humidity, wind, temp);
}

/** One sync-walked scalar, falling back to the universe then a literal. */
function syncScalar<U extends Unit>(
  scope: Stuff,
  biomeGetter: (b: Biome) => Quantity<U> | null,
  ownGetter: (a: Stuff & Atmospheric) => Quantity<U> | null,
  fallback: number,
): number {
  const { hit } = syncChainWalk<Quantity<U>>(
    scope,
    undefined,
    biomeGetter,
    () => null,
    ownGetter,
  );
  if (hit !== null) return hit.value.rawValue();
  try {
    const universal = biomeGetter(rootBiome());
    if (universal !== null) return universal.rawValue();
  } catch {
    // No root biome (pre-boot / a bare test world): the literal stands.
  }
  return fallback;
}

/**
 * Relative humidity (%) assumed when neither the chain nor the universe
 * biome authors one. Deliberately the same 60 % the cure clock falls back
 * to, so a bare test world dries at one rate rather than two.
 */
const AIR_FALLBACK_HUMIDITY_PCT = 60;

/** Air temperature (K) assumed when nothing authors one — 15 °C. */
const AIR_FALLBACK_TEMP_K = 288;

/**
 * The `Locality` governing this scope's weather, **synchronously**, or
 * `null` when none is known.
 *
 * ⚠ `null` covers two cases on purpose: *nothing has resolved yet* and
 * *this place is under no locality*. Both are answered the same way — **no
 * weather deviation** — because the alternative (feeding
 * `deviatedFieldFor` a null locality, which it happily reads as the
 * unpinned procgen field) would make an unresolved scope report a
 * *different climate* than the resolved one, so a drying rate would jump
 * the first time anybody looked twice. The memo kicks its own walk, so the
 * next read has the real answer.
 */
function weatherLocalityOf(scope: Stuff): Locality | null {
  let cursor: Stuff | null = scope;
  let depth = CONTAINMENT_DEPTH_CAP;
  while (cursor !== null && depth-- > 0) {
    if (MixinApi.isAtmospheric(cursor)) {
      return (cursor as Stuff & Atmospheric).weatherLocality();
    }
    cursor = stepOutward(cursor);
  }
  return null;
}

/**
 * The sync sky's base temperature at an instant: the climate at the
 * scope's (memoized) site when the sync chain fell through to the
 * universe constant, else the authored figure in hand. The sync mirror
 * of {@link temperatureTraceFor}'s substitution; the caller has already
 * established that weather is active and the scope is under the sky.
 */
function skyBaseTempK(
  scope: Stuff,
  chainK: number,
  nowS: number,
): number {
  const { hit } = syncChainWalk<Quantity<'K'>>(
    scope,
    undefined,
    (b) => b.getDefaultTemperature(),
    () => null,
    (a) => a._temperature,
  );
  const fromRoot = hit === null || hit.sourcePath === ROOT_BIOME_PATH;
  if (!fromRoot) return chainK;
  return WeatherApi.climateAt(climateSiteSyncOf(scope), Quantity.of(nowS, 's')).rawValue();
}

/**
 * The live per-field weather deviation for a scope, or `null` when weather
 * does not reach it (indoors, weather-absent, or locality unresolved).
 */
function liveDeviation(
  scope: Stuff,
): { humidity: number; wind: number; temperature: number } | null {
  if (!WeatherApi.isActive()) return null;
  if (!airIsOutside(scope)) return null;
  const locality = weatherLocalityOf(scope);
  if (locality === null) return null;
  const nowS = WorldClockApi.getNow();
  const site = climateSiteSyncOf(scope);
  return {
    humidity: WeatherApi.deviatedFieldFor(
      scope,
      locality,
      'humidity',
      nowS,
      site,
    ).rawValue(),
    wind: WeatherApi.deviatedFieldFor(scope, locality, 'wind', nowS, site).rawValue(),
    temperature: WeatherApi.deviatedFieldFor(
      scope,
      locality,
      'temperature',
      nowS,
      site,
    ).rawValue(),
  };
}
