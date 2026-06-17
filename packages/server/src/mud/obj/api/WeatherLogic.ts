// WeatherLogic — the hot-reloadable logic singleton behind WeatherApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import { Quantity } from '../../lib/quantity';
import { MixinApi } from '../../api/mixin';
import { AddressApi } from '../../api/address';
import { WorldClockApi } from '../../api/worldclock';
import { CelestialApi } from '../../api/celestial';
import { ConnectionApi } from '../../api/connection';
import { EARTH_LIKE, type Season } from '../../lib/time/CelestialProfile';
import type Locality from '../../lib/address/Locality';
import {
  WEATHER_PROFILES,
  TRANSITIONS,
  SEASON_BIAS,
  ANCHOR_CANDIDATES,
  WEATHER_DEFAULTS,
  type WeatherType,
  type WeatherTransition,
  type WeatherDeviation,
  type WeatherField,
  type WeatherFieldUnit,
  type WeatherSample,
  type WeatherForecast,
  type WeatherForecastEntry,
} from '../../lib/weather/WeatherType';

const WeatherApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('mud/api/weather#WeatherApi'),
  SecurityPolicies.SelfOnly,
);

/**
 * Test-only override: when set, every segment resolves to this type,
 * making the biome-deviation + thermal-coupling tests deterministic
 * without pinning a seed. Reset by `_resetForTesting`. This is the only
 * mutable module state, and it exists solely for tests — production
 * weather is fully procedural and stateless.
 */
let forcedType: WeatherType | null = null;

/* ─────────────────────────── grammar (module-private) ─────────────────────────── */

/** FNV-1a 32-bit string hash — deterministic, process-independent. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Integer avalanche mix of two 32-bit words → a 32-bit hash. */
function mix2(a: number, b: number): number {
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (b >>> 0), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Deterministic roll in [0, 1) from two seed words. */
function roll01(a: number, b: number): number {
  return mix2(a >>> 0, b >>> 0) / 0x1_0000_0000;
}

/**
 * The per-locality procedural seed (D1). Derived from the covering
 * Locality's claimed address prefix XOR'd with the global base seed;
 * `null` (no covering Locality) uses the global seed alone. No field is
 * added to `Locality`; `lib/address` is untouched. Different Localities /
 * Region roots get different deterministic weather automatically.
 */
function localitySeed(locality: Locality | null): number {
  if (locality === null) return WEATHER_DEFAULTS.GLOBAL_BASE_SEED >>> 0;
  return (
    (hashString(locality.getAddress()) ^ WEATHER_DEFAULTS.GLOBAL_BASE_SEED) >>> 0
  );
}

/** Integer segment index for a game-time (seconds). */
function segmentIndexAt(nowS: number): number {
  return Math.floor(nowS / WEATHER_DEFAULTS.SEGMENT_LENGTH_S);
}

/**
 * Segments per orbital year for the global `EARTH_LIKE` profile. Season
 * is a pure function of day-of-year, which repeats each year, so a
 * segment's season depends only on `seg mod SEGMENTS_PER_YEAR` — the key
 * for the bounded memo below.
 */
const SEGMENTS_PER_YEAR = Math.round(
  (EARTH_LIKE.yearLengthDays * EARTH_LIKE.dayLengthSeconds) /
    WEATHER_DEFAULTS.SEGMENT_LENGTH_S,
);

/**
 * Bounded season memo. `typeForSegment` calls `seasonAtSegment` up to
 * `GRAMMAR_WARMUP + 1` times per read; without a cache each call crosses
 * the gated `CelestialApi` proxy. Season repeats yearly, so the cache is
 * capped at `SEGMENTS_PER_YEAR` entries (a pure-function memo, the
 * `BiomeLogic.rootBiomeCache` precedent — not weather *state*).
 */
const seasonCache = new Map<number, Season>();

/**
 * The season governing a segment, evaluated at the segment's start.
 * Wave 1 season is global (single `CAMPUS_LATITUDE`), so the pure
 * `CelestialApi.seasonFor(EARTH_LIKE, t)` is sufficient and keeps
 * `weatherAt` process-stable with no clock. Memoized per year-relative
 * segment to keep the per-read cost off the gated proxy. Season is
 * exactly periodic with `SEGMENTS_PER_YEAR`, so we both key AND compute
 * from the normalized non-negative residue — the computed value always
 * matches its key, and negative segments (the `seg - 1` interpolation
 * lookback at segment 0) never depend on `dayOfYear`'s negative-time
 * handling.
 */
function seasonAtSegment(seg: number): Season {
  const key =
    SEGMENTS_PER_YEAR > 0
      ? ((seg % SEGMENTS_PER_YEAR) + SEGMENTS_PER_YEAR) % SEGMENTS_PER_YEAR
      : seg;
  const hit = seasonCache.get(key);
  if (hit !== undefined) return hit;
  const season = CelestialApi.seasonFor(
    EARTH_LIKE,
    key * WEATHER_DEFAULTS.SEGMENT_LENGTH_S,
  );
  seasonCache.set(key, season);
  return season;
}

/**
 * Season-biased weighted pick over a candidate row. Each candidate's
 * weight is multiplied by `SEASON_BIAS[season][type]` (default 1); the
 * roll in [0,1) selects proportionally. A fully-zeroed row degenerates
 * to the first candidate (defensive; the tables never zero a whole row).
 */
function pickWeighted(
  row: WeatherTransition[],
  season: Season,
  roll: number,
): WeatherType {
  const bias = SEASON_BIAS[season];
  let total = 0;
  const weights = row.map((e) => {
    const w = e.weight * (bias[e.type] ?? 1);
    total += w;
    return w;
  });
  if (total <= 0) return row[0]!.type;
  let x = roll * total;
  for (let i = 0; i < row.length; i++) {
    x -= weights[i]!;
    if (x < 0) return row[i]!.type;
  }
  return row[row.length - 1]!.type;
}

/** The absolute, season-evaluated starting type at a warmup anchor (D-C). */
function anchorTypeFor(anchorSeg: number, seed: number): WeatherType {
  const season = seasonAtSegment(anchorSeg);
  const roll = roll01(anchorSeg, seed ^ 0x0000_a5a5);
  return pickWeighted(ANCHOR_CANDIDATES, season, roll);
}

/** Pick the next type from the transition grammar, season-biased. */
function nextTypeFrom(
  prev: WeatherType,
  season: Season,
  roll: number,
): WeatherType {
  return pickWeighted(TRANSITIONS[prev], season, roll);
}

/**
 * The weather type for a segment (D-C bounded warmup-anchor). Anchors at
 * `floor(seg / WARMUP) * WARMUP` to a calm absolute type, then iterates
 * `nextTypeFrom` forward `seg mod WARMUP` steps. O(WARMUP), pure,
 * process-stable: the same `(seg, seed)` always yields the same type, so
 * a future segment computed now equals the segment after advancing the
 * clock (the forecast property).
 */
function typeForSegment(seg: number, seed: number): WeatherType {
  if (forcedType !== null) return forcedType;
  const warm = WEATHER_DEFAULTS.GRAMMAR_WARMUP;
  const anchorSeg = Math.floor(seg / warm) * warm;
  let cur = anchorTypeFor(anchorSeg, seed);
  for (let i = anchorSeg; i < seg; i++) {
    const season = seasonAtSegment(i + 1);
    cur = nextTypeFrom(cur, season, roll01(i + 1, seed));
  }
  return cur;
}

/** Component-wise linear interpolation between two deviation bundles. */
function lerpDeviation(
  a: WeatherDeviation,
  b: WeatherDeviation,
  t: number,
): WeatherDeviation {
  const mix = <U extends WeatherFieldUnit>(
    qa: Quantity<U>,
    qb: Quantity<U>,
  ): Quantity<U> => qa.add(qb.subtract(qa).scale(t));
  return {
    temperature: mix(a.temperature, b.temperature),
    humidity: mix(a.humidity, b.humidity),
    wind: mix(a.wind, b.wind),
    pressure: mix(a.pressure, b.pressure),
  };
}

/**
 * The core pure compute. Resolves the current segment's type, then the
 * interpolated deviation across the lead-in band (D-D): inside the band
 * the deviation ramps from the previous segment's targets to the
 * current's (continuous across boundaries); outside it the deviation is
 * the current segment's. The reported type is always the current
 * segment's (piecewise-constant).
 */
function computeSample(nowS: number, locality: Locality | null): WeatherSample {
  const seed = localitySeed(locality);
  const seg = segmentIndexAt(nowS);
  const segStart = seg * WEATHER_DEFAULTS.SEGMENT_LENGTH_S;
  const frac = (nowS - segStart) / WEATHER_DEFAULTS.SEGMENT_LENGTH_S;

  const curType = typeForSegment(seg, seed);
  const curProfile = WEATHER_PROFILES[curType];

  let deviation = curProfile.deviation;
  const band = WEATHER_DEFAULTS.INTERP_BAND;
  if (band > 0 && frac < band) {
    const prevType = typeForSegment(seg - 1, seed);
    const prevDev = WEATHER_PROFILES[prevType].deviation;
    deviation = lerpDeviation(prevDev, curProfile.deviation, frac / band);
  }

  return {
    type: curType,
    segmentIndex: seg,
    deviation,
    cloud: curProfile.cloud,
    precipitation: curProfile.precipitation,
    season: seasonAtSegment(seg),
  };
}

/**
 * The presence-gated segment-boundary restamp fan-out (D4 / D-G). Walks
 * each live Interactive to its avatar's room, dedupes, sky-gates, and
 * fires the Thermal restamp wrapper so `lastAmbientK` re-resolves the
 * now-weathered ambient. With no one connected the loop never runs —
 * zero connection work (the thermal/metabolism presence-freeze
 * discipline).
 *
 * `BiomeApi` is reached via a **dynamic import** so `WeatherLogic`'s
 * static import graph never reaches `api/biome.ts` (D-A): the deviation
 * edge is `BiomeLogic → WeatherApi`, and a static `WeatherLogic →
 * BiomeApi` would close a cycle. This is the cold path (fires once per
 * segment), so the lazy import costs nothing on any read.
 */
async function runBoundaryFanout(): Promise<void> {
  const { BiomeApi } = await import('../../api/biome');
  const visited = new Set<string>();
  for (const interactive of ConnectionApi.getAllInteractives()) {
    const holder = interactive.getHolder();
    if (holder === null || !MixinApi.isContainable(holder)) continue;
    const room = (holder as Stuff & Containable).getContainer();
    if (room === null || !MixinApi.isContainer(room)) continue;
    if (visited.has(room.stuffId)) continue;
    visited.add(room.stuffId);
    if (!BiomeApi.isSkyExposed(room)) continue;
    BiomeApi.restampThermalContentsOf(room);
  }
}

/**
 * WeatherLogic — the hot-reloadable logic singleton behind
 * {@link WeatherApi}.
 *
 * Lives at `/obj/api/weather`. **Stateless** — mirrors `BiomeLogic`
 * exactly (`extends Idea`, **no** `PostRegistrationMixin`, no backing
 * `Template`); `dest /obj/api/weather` reloads it. Holds the weather
 * compute as gated methods plus the grammar as module-private functions
 * (the `BiomeLogic` free-function shape). It holds **no** runtime state —
 * no handle, no index. The segment boundary is a WorldClock **system
 * schedule** (registered in `WorldClockRegistry.registerSystemSchedules`),
 * so the scheduler owns the `ClockHandle`; the callback targets the
 * stable `WeatherApi.onBoundary` facade for HMR safety.
 *
 * The singleton's mere **presence** is the "weather configured" signal:
 * `WeatherApi.isActive()` is a non-creating `findByTemplatePath` check,
 * so a process that never touched weather (most unit tests) sees zero
 * deviation and biome-identical reads. Boot forces the singleton into
 * existence via `nextBoundaryAfter` when it registers the schedule.
 *
 * Gated `AnyOf(FromModule('mud/api/weather#WeatherApi'), SelfOnly)`: the
 * `forecastFor`/`sampleFor` reads fan out to `weatherAt`/the grammar via
 * module-private functions (no intra-singleton self-calls), and the
 * facade forwarders supply the `FromModule` half.
 *
 * @internal
 */
@Unshadowable
export class WeatherLogic extends Idea {
  /** See {@link WeatherApi.weatherAt}. Pure. */
  @CallSecurity(WeatherApiCallers)
  public weatherAt(
    timeS: Quantity<'s'>,
    locality: Locality | null,
  ): WeatherSample {
    return computeSample(timeS.rawValue(), locality);
  }

  /** See {@link WeatherApi.deviationFor}. Pure, SYNC — no I/O. */
  @CallSecurity(WeatherApiCallers)
  public deviationFor(
    locality: Locality | null,
    field: WeatherField,
    timeS: Quantity<'s'>,
  ): Quantity<WeatherFieldUnit> {
    const sample = computeSample(timeS.rawValue(), locality);
    return sample.deviation[field] as Quantity<WeatherFieldUnit>;
  }

  /** See {@link WeatherApi.forecastFor}. Async — resolves the locality. */
  @CallSecurity(WeatherApiCallers)
  public async forecastFor(
    scope: Stuff & Container,
    segments?: number,
  ): Promise<WeatherForecast> {
    const locality = await AddressApi.resolveLocalityFor(scope);
    const nowS = WorldClockApi.getNow().rawValue();
    const seed = localitySeed(locality);
    const current = computeSample(nowS, locality);
    const n = Math.max(0, segments ?? WEATHER_DEFAULTS.FORECAST_SEGMENTS);
    const seg = current.segmentIndex;
    const upcoming: WeatherForecastEntry[] = [];
    for (let i = 1; i <= n; i++) {
      const s = seg + i;
      upcoming.push({
        segmentIndex: s,
        type: typeForSegment(s, seed),
        startsAt: Quantity.of(s * WEATHER_DEFAULTS.SEGMENT_LENGTH_S, 's'),
      });
    }
    return { current, upcoming };
  }

  /** See {@link WeatherApi.sampleFor}. Async — resolves the locality. */
  @CallSecurity(WeatherApiCallers)
  public async sampleFor(scope: Stuff & Container): Promise<WeatherSample> {
    const locality = await AddressApi.resolveLocalityFor(scope);
    return computeSample(WorldClockApi.getNow().rawValue(), locality);
  }

  /** See {@link WeatherApi.nextBoundaryAfter}. */
  @CallSecurity(WeatherApiCallers)
  public nextBoundaryAfter(timeS: Quantity<'s'>): Quantity<'s'> {
    const seg = segmentIndexAt(timeS.rawValue());
    return Quantity.of(
      (seg + 1) * WEATHER_DEFAULTS.SEGMENT_LENGTH_S,
      's',
    );
  }

  /** See {@link WeatherApi.onBoundary}. */
  @CallSecurity(WeatherApiCallers)
  public onBoundary(): void {
    void runBoundaryFanout();
  }

  /** See {@link WeatherApi._forceTypeForTesting}. */
  @CallSecurity(WeatherApiCallers)
  public _forceTypeForTesting(type: WeatherType | null): void {
    forcedType = type;
  }

  /** See {@link WeatherApi._resetForTesting}. */
  @CallSecurity(WeatherApiCallers)
  public _resetForTesting(): void {
    forcedType = null;
  }
}
