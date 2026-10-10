// WeatherLogic — the hot-reloadable logic singleton behind WeatherApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import { Quantity } from '../../../lib/quantity';
import { MixinApi } from '../../../api/mixin';
import { AddressApi } from '../../../api/address';
import { ZoneApi } from '../../../api/zone';
import { WorldClockApi } from '../../../api/worldclock';
import { CelestialApi } from '../../../api/celestial';
import { ConnectionApi } from '../../../api/connection';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { EARTH_LIKE, type Season } from '../../../lib/time/CelestialProfile';
import type Locality from '../Locality';
import type Material from '../../../lib/material/Material';
import type { Bulkable } from '../../../lib/bulk/Bulkable';
import type { Adornable } from '../../../lib/boundary/Adornable';
import type { Energized } from '../../../lib/electricity/Energized';
import type { AmbientLit } from '../../../lib/perception/AmbientLit';
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
  CLOUD_FORM_BY_TYPE,
  type ClimateLean,
  type WeatherPin,
  type ResolvedWeather,
  type CloudForm,
  type SkyRead,
  PRECIPITATION_RATES_MM_PER_HOUR,
  type PrecipitationIntegral,
  type WeatherSegment,
  type StormExposed,
  type ClimateSite,
  type DailyRange,
} from '../../../lib/weather/WeatherType';
import type { Atmospheric } from '../../../lib/biome/Atmospheric';
import { Seeded } from '../../../lib/Seeded';

const WeatherApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/weather#WeatherApi'),
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

/**
 * Test-only override for the per-scope strike roll. When set, every storm
 * scope rolls this fixed value (0 = always strike, 1 = never) instead of
 * `Math.random()`, so the strike tests are deterministic. A strike need not
 * be reproducible in production — this exists only for tests.
 */
let forcedStrikeRoll: number | null = null;

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
 * Is this site in the southern hemisphere? The grammar's only question
 * about where it is: `SEASON_BIAS` biases by the LOCAL season, so a
 * southern place snows in July. `null`/absent = the realm default
 * (northern), which keeps every caller that names no site byte-identical.
 */
function isSouthern(site: ClimateSite | null | undefined): boolean {
  return site != null && site.latitudeDeg < 0;
}

/**
 * The season governing a segment, evaluated at the segment's start, in
 * one hemisphere (`south`: the site's latitude is negative). The pure
 * `CelestialApi.seasonFor(EARTH_LIKE, t, ±1)` keeps `weatherAt`
 * process-stable with no clock. Memoized per (hemisphere, year-relative
 * segment) to keep the per-read cost off the gated proxy. Season is
 * exactly periodic with `SEGMENTS_PER_YEAR`, so we both key AND compute
 * from the normalized non-negative residue — the computed value always
 * matches its key, and negative segments (the `seg - 1` interpolation
 * lookback at segment 0) never depend on `dayOfYear`'s negative-time
 * handling.
 */
function seasonAtSegment(seg: number, south = false): Season {
  const residue =
    SEGMENTS_PER_YEAR > 0
      ? ((seg % SEGMENTS_PER_YEAR) + SEGMENTS_PER_YEAR) % SEGMENTS_PER_YEAR
      : seg;
  // The hemisphere is part of the key: the same segment is spring in the
  // north and autumn in the south.
  const key = south ? -1 - residue : residue;
  const hit = seasonCache.get(key);
  if (hit !== undefined) return hit;
  const season = CelestialApi.seasonFor(
    EARTH_LIKE,
    residue * WEATHER_DEFAULTS.SEGMENT_LENGTH_S,
    south ? -1 : 1,
  );
  seasonCache.set(key, season);
  return season;
}

/**
 * Season-biased weighted pick over a candidate row. Each candidate's
 * weight is multiplied by `SEASON_BIAS[season][type]` (default 1) **and**
 * the authored per-Locality {@link ClimateLean} (default 1, Wave 2) — the
 * lean is a soft `SEASON_BIAS` sibling that shapes only this procgen
 * branch, so an authored hard pin (resolved upstream) always outranks it
 * (author always wins). The roll in [0,1) selects proportionally. A
 * fully-zeroed row
 * degenerates to the first candidate (defensive; the tables never zero a
 * whole row).
 */
function pickWeighted(
  row: WeatherTransition[],
  season: Season,
  roll: number,
  lean: ClimateLean | null,
): WeatherType {
  const bias = SEASON_BIAS[season];
  let total = 0;
  const weights = row.map((e) => {
    const w = e.weight * (bias[e.type] ?? 1) * (lean?.[e.type] ?? 1);
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
function anchorTypeFor(
  anchorSeg: number,
  seed: number,
  lean: ClimateLean | null,
  south = false,
): WeatherType {
  const season = seasonAtSegment(anchorSeg, south);
  const roll = Seeded.unit(anchorSeg, seed ^ 0x0000_a5a5);
  return pickWeighted(ANCHOR_CANDIDATES, season, roll, lean);
}

/** Pick the next type from the transition grammar, season-biased. */
function nextTypeFrom(
  prev: WeatherType,
  season: Season,
  roll: number,
  lean: ClimateLean | null,
): WeatherType {
  return pickWeighted(TRANSITIONS[prev], season, roll, lean);
}

/**
 * The weather type for a segment (D-C bounded warmup-anchor). Anchors at
 * `floor(seg / WARMUP) * WARMUP` to a calm absolute type, then iterates
 * `nextTypeFrom` forward `seg mod WARMUP` steps. O(WARMUP), pure,
 * process-stable: the same `(seg, seed)` always yields the same type, so
 * a future segment computed now equals the segment after advancing the
 * clock (the forecast property).
 */
function typeForSegment(
  seg: number,
  seed: number,
  lean: ClimateLean | null,
  south = false,
): WeatherType {
  if (forcedType !== null) return forcedType;
  const warm = WEATHER_DEFAULTS.GRAMMAR_WARMUP;
  const anchorSeg = Math.floor(seg / warm) * warm;
  let cur = anchorTypeFor(anchorSeg, seed, lean, south);
  for (let i = anchorSeg; i < seg; i++) {
    const season = seasonAtSegment(i + 1, south);
    cur = nextTypeFrom(cur, season, Seeded.unit(i + 1, seed), lean);
  }
  return cur;
}

/** The authored climate lean of a covering Locality (Wave 2), or `null`. */
function leanOf(locality: Locality | null): ClimateLean | null {
  return locality?.getClimateLean() ?? null;
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
function computeSample(
  nowS: number,
  locality: Locality | null,
  site?: ClimateSite | null,
): WeatherSample {
  const seed = localitySeed(locality);
  const lean = leanOf(locality);
  const south = isSouthern(site);
  const seg = segmentIndexAt(nowS);
  const segStart = seg * WEATHER_DEFAULTS.SEGMENT_LENGTH_S;
  const frac = (nowS - segStart) / WEATHER_DEFAULTS.SEGMENT_LENGTH_S;

  const curType = typeForSegment(seg, seed, lean, south);
  const curProfile = WEATHER_PROFILES[curType];

  let deviation = curProfile.deviation;
  const band = WEATHER_DEFAULTS.INTERP_BAND;
  if (band > 0 && frac < band) {
    const prevType = typeForSegment(seg - 1, seed, lean, south);
    const prevDev = WEATHER_PROFILES[prevType].deviation;
    deviation = lerpDeviation(prevDev, curProfile.deviation, frac / band);
  }

  return {
    type: curType,
    segmentIndex: seg,
    deviation,
    cloud: curProfile.cloud,
    precipitation: curProfile.precipitation,
    season: seasonAtSegment(seg, south),
  };
}

/* ─────────────────────────── Wave-2 coexistence resolve ─────────────────────────── */

/** Depth cap for the scope-pin containment walk (defensive, like biome's). */
const PIN_WALK_DEPTH_CAP = 32;

/** One outward step (containment) for the pin walk. */
function stepOutwardForPin(
  cursor: Stuff & Container,
): (Stuff & Container) | null {
  if (!MixinApi.isContainable(cursor)) return null;
  const next = (cursor as Stuff & Containable).getContainer();
  if (next === null || !MixinApi.isContainer(next)) return null;
  return next as Stuff & Container;
}

/**
 * Resolve the authored weather pin governing a scope (H2 — the shared sync
 * helper both `resolveWeatherFor` and the biome field-fold consult). Walks
 * innermost-container-outward reading each `AtmosphericMixin` host's
 * `_weatherPin` (first found wins — a room pin overrides an outer one),
 * then falls back to the covering Locality's tier pin. `null` = no pin
 * anywhere, the procgen branch applies.
 */
function resolveWeatherPin(
  scope: Stuff & Container,
  locality: Locality | null,
): WeatherPin | null {
  let cursor: (Stuff & Container) | null = scope;
  let depth = PIN_WALK_DEPTH_CAP;
  while (cursor !== null && depth-- > 0) {
    if (MixinApi.isAtmospheric(cursor)) {
      const pin = (cursor as unknown as Atmospheric).getWeatherPin();
      if (pin !== null) return pin;
    }
    cursor = stepOutwardForPin(cursor);
  }
  return locality?.getWeatherPin() ?? null;
}

/* ─────────────────────── the precipitation integral ─────────────────────── */

/**
 * Sum precipitation over `[t0S, t1S)` for one locality — the exact
 * segment walk behind {@link WeatherApi.precipitationBetween}.
 *
 * ⭐ **This is the build's spine, and it is designed once for two
 * consumers.** A bed multiplies the liquid figure by its land area to
 * get litres into soil; a reach multiplies it by its catchment area to
 * get inflow. Writing it around one of them and generalising later is
 * exactly the trap the requirements exist to avoid, so the walk knows
 * about neither: it answers "how much fell here, between then and now",
 * in millimetres, and hands back the frozen half separately.
 *
 * **Why it can be exact.** `weatherAt` is a pure function of
 * `(time, locality)` — no stored state, no tick — so the type of every
 * six-hour segment between two instants is computable now. The window is
 * therefore not sampled or approximated: each segment contributes its
 * own rate times its own overlap with the window, and the same window
 * integrated twice gives the same answer to the last millimetre. That
 * property is what lets a place integrate an absence of arbitrary length
 * on its first read back.
 *
 * **The author's pin wins.** A locality carrying a `WeatherPin` is
 * *always* that weather, so every segment in the walk is the pinned
 * type — a weeping valley rains through the year, and a pinned drought
 * never rains at all. Both pin modes force the type; `alive` only
 * animates a magnitude the integral does not read.
 *
 * ⚠ A **scope-tier** pin (one room in an otherwise-modelled locality) is
 * NOT visible here: this walk is keyed by locality, and a per-scope pin
 * would need a per-scope walk. That is a deliberate boundary, not an
 * oversight — see `docs/subsystems/watershed.md`.
 */
/**
 * The mm/h a segment of this type delivers — the authored table
 * ({@link PRECIPITATION_RATES_MM_PER_HOUR}) with an operator dial in
 * front of it. The table is the fallback rather than the other way
 * round, so the kernel rains correctly with the `water` pack absent.
 */
function precipitationRateOf(type: WeatherType): number {
  const authored = PRECIPITATION_RATES_MM_PER_HOUR[type];
  switch (type) {
    case 'rain':
      return dial(AppSettingKeys.waterRainRateMmPerHour, authored);
    case 'storm':
      return dial(AppSettingKeys.waterStormRateMmPerHour, authored);
    case 'snow':
      return dial(AppSettingKeys.waterSnowRateMmPerHour, authored);
    default:
      return authored;
  }
}

/**
 * Sum precipitation over `[t0S, t1S)` for one locality — the exact
 * segment walk behind {@link WeatherApi.precipitationBetween}.
 *
 * ⭐ **This is the build's spine, and it is designed once for two
 * consumers.** A bed multiplies the liquid figure by its land area to
 * get litres into soil; a reach multiplies it by its catchment area to
 * get inflow. Writing it around one of them and generalising later is
 * exactly the trap the requirements exist to avoid, so the walk knows
 * about neither: it answers "how much fell here, between then and now",
 * in millimetres, and hands back the frozen half separately.
 *
 * **Why it can be exact.** `weatherAt` is a pure function of
 * `(time, locality)` — no stored state, no tick — so the type of every
 * six-hour segment between two instants is computable now. The window is
 * therefore not sampled or approximated: each segment contributes its
 * own rate times its own overlap with the window, and the same window
 * integrated twice gives the same answer to the last millimetre. That
 * property is what lets a place integrate an absence of arbitrary length
 * on its first read back.
 *
 * **The author's pin wins.** A locality carrying a `WeatherPin` is
 * *always* that weather, so every segment in the walk is the pinned
 * type — a weeping valley rains through the year, and a pinned drought
 * never rains at all. Both pin modes force the type; `alive` only
 * animates a magnitude the integral does not read.
 *
 * ⚠ A **scope-tier** pin (one room in an otherwise-modelled locality) is
 * NOT visible here: this walk is keyed by locality, and a per-scope pin
 * would need a per-scope walk. That is a deliberate boundary, not an
 * oversight — see `docs/subsystems/watershed.md`.
 */
function integratePrecipitation(
  t0S: number,
  t1S: number,
  locality: Locality | null,
  site: ClimateSite | null = null,
): PrecipitationIntegral {
  let liquidMm = 0;
  let frozenMm = 0;
  const intensity = precipitationIntensityOf(locality, site);
  const coveredS = walkSegments(
    t0S,
    t1S,
    locality,
    (seg) => {
      const rate = precipitationRateOf(seg.type);
      if (rate <= 0) return;
      const mm = rate * intensity * (seg.overlapS / 3600);
      // ⭐ Where it goes is the PHASE's call: snow banks, rain runs off.
      // With a site the phase is the temperature's (a `snow` segment over
      // a 290 K valley rains); with none it is the type's descriptor, as
      // it always was, so a caller that names no place is byte-identical.
      if (seg.phase === 'snow') frozenMm += mm;
      else liquidMm += mm;
    },
    WEATHER_DEFAULTS.PRECIPITATION_MAX_SEGMENTS,
    site,
  );
  return {
    liquid: Quantity.of(liquidMm, 'mm'),
    frozen: Quantity.of(frozenMm, 'mm'),
    coveredS,
  };
}

/**
 * The walk itself, shared by the integral and by
 * {@link WeatherApi.segmentsBetween} so there is exactly ONE definition
 * of "which segments does this window touch, and by how much".
 *
 * Callback-shaped rather than array-returning because the integral runs
 * on every soil reconcile and allocating a hundred descriptor objects to
 * throw them away would be the wrong trade; the materialising variant
 * builds its array on top.
 *
 * Returns the game-seconds actually walked — less than the window iff
 * the cap bit.
 */
function walkSegments(
  t0S: number,
  t1S: number,
  locality: Locality | null,
  visit: (segment: WeatherSegment) => void,
  maxSegments: number = WEATHER_DEFAULTS.PRECIPITATION_MAX_SEGMENTS,
  site: ClimateSite | null = null,
): number {
  if (!Number.isFinite(t0S) || !Number.isFinite(t1S) || t1S <= t0S) return 0;

  const L = WEATHER_DEFAULTS.SEGMENT_LENGTH_S;
  // The window is half-open `[t0, t1)`, so a `t1` landing exactly on a
  // boundary belongs to the segment BEFORE it. `ceil(t1/L) - 1` says
  // that; `segmentIndexAt(t1 - ε)` does not, because at game-times of
  // any real size `t1 - Number.EPSILON === t1` in floating point and
  // the walk silently gains a zero-width segment — invisible in a sum,
  // and off-by-one in the CAP.
  const lastSeg = Math.ceil(t1S / L) - 1;
  let firstSeg = segmentIndexAt(t0S);
  let from = t0S;

  // The cap (Risk 2): keep the TAIL of the window, never the head — a
  // place coming back after a year wants the last month of weather, not
  // the first. The covered span reports what was actually walked, so a
  // caller that cares can tell a capped window from a complete one.
  if (lastSeg - firstSeg + 1 > maxSegments) {
    firstSeg = lastSeg - maxSegments + 1;
    from = firstSeg * L;
  }

  // Pinned localities force one type across the whole walk; unpinned
  // ones resolve per segment through the procgen grammar.
  const pin = locality?.getWeatherPin() ?? null;
  const seed = localitySeed(locality);
  const lean = leanOf(locality);
  const south = isSouthern(site);
  const dials = site !== null ? climateDials() : null;
  const snowK =
    site !== null ? dial(AppSettingKeys.climateSnowThresholdK, 274.5) : 0;

  for (let seg = firstSeg; seg <= lastSeg; seg++) {
    const segStart = seg * L;
    const overlapS = Math.min(t1S, segStart + L) - Math.max(from, segStart);
    if (overlapS <= 0) continue;
    const type = pin !== null ? pin.type : typeForSegment(seg, seed, lean, south);
    visit({
      segmentIndex: seg,
      type,
      season: seasonAtSegment(seg, south),
      startsAtS: segStart,
      overlapS,
      // The phase at the segment's MIDPOINT — a property of the segment,
      // so the same segment reads the same phase from any window.
      phase:
        site !== null && dials !== null
          ? phaseAt(type, site, segStart + L / 2, dials, snowK)
          : WEATHER_PROFILES[type].precipitation,
    });
  }
  return t1S - from;
}

/**
 * ⭐ **Rain or snow, by temperature.** A type that precipitates falls as
 * snow when the air at the site — the climate plus the type's own
 * deviation — is at or below `climate.snowThresholdK`, else as rain. The
 * grammar's type word (`snow` vs `rain`) still shapes the sky, the cloud
 * form and the deviation; it no longer decides what reaches the ground.
 */
function phaseAt(
  type: WeatherType,
  site: ClimateSite,
  atS: number,
  d: ClimateDials,
  snowK: number,
): 'none' | 'rain' | 'snow' {
  if (WEATHER_PROFILES[type].precipitation === 'none') return 'none';
  const k = climateK(site, atS, d) + WEATHER_PROFILES[type].deviation.temperature.rawValue();
  return k <= snowK ? 'snow' : 'rain';
}

/**
 * ⭐ **How hard it rains here** — the Locality's authored multiplier, else
 * the light latitude default: 1 up to `climate.precipDryAboveDeg` (55°),
 * falling linearly to `climate.precipPolarFactor` (0.4) at 80°, because
 * polar air holds little water. Grain, not law: an author's number wins.
 * With neither a Locality figure nor a site it is 1, which is every
 * caller before the climate build.
 */
function precipitationIntensityOf(
  locality: Locality | null,
  site: ClimateSite | null,
): number {
  const authored = locality?.getPrecipitationIntensity() ?? null;
  if (authored !== null) return authored;
  if (site === null) return 1;
  const lat = Math.abs(site.latitudeDeg);
  const dryAbove = dial(AppSettingKeys.climatePrecipDryAboveDeg, 55);
  const polar = dial(AppSettingKeys.climatePrecipPolarFactor, 0.4);
  if (lat <= dryAbove) return 1;
  const f = Math.min(1, (lat - dryAbove) / Math.max(1e-6, 80 - dryAbove));
  return 1 + (polar - 1) * f;
}

/**
 * The `alive`-pin intensity animation scale. A per-segment
 * deterministic value in `[ALIVE_ANIM_MIN, 1]`, so a `pinned-but-alive`
 * scope's deviation magnitude visibly breathes segment-to-segment while
 * the type never leaves the pin. The exact formula is a dial; the
 * type-forcing is the invariant.
 */
function aliveScale(nowS: number, locality: Locality | null): number {
  const seg = segmentIndexAt(nowS);
  const seed = localitySeed(locality);
  const base = Seeded.unit(seg, (seed ^ 0x00a1_11e5) >>> 0);
  const min = WEATHER_DEFAULTS.ALIVE_ANIM_MIN;
  return min + (1 - min) * base;
}

/** Scale every field of a deviation bundle by a scalar. */
function scaleDeviation(d: WeatherDeviation, s: number): WeatherDeviation {
  return {
    temperature: d.temperature.scale(s),
    humidity: d.humidity.scale(s),
    wind: d.wind.scale(s),
    pressure: d.pressure.scale(s),
  };
}

/**
 * The per-field deviation a resolved pin folds — the pinned type's profile
 * deviation, verbatim for `frozen`, `aliveScale`-scaled for `alive`. The
 * biome field-fold reads one field of this; `resolveWeatherFor` carries the
 * whole bundle.
 */
function pinnedDeviation(
  pin: WeatherPin,
  locality: Locality | null,
  nowS: number,
): WeatherDeviation {
  const profile = WEATHER_PROFILES[pin.type];
  if (pin.mode === 'frozen') return profile.deviation;
  return scaleDeviation(profile.deviation, aliveScale(nowS, locality));
}

/** The full resolved sample for a pin: type/cloud/precip forced, deviation per mode. */
function pinnedSample(
  pin: WeatherPin,
  locality: Locality | null,
  nowS: number,
  site: ClimateSite | null = null,
): WeatherSample {
  const profile = WEATHER_PROFILES[pin.type];
  const seg = segmentIndexAt(nowS);
  return {
    type: pin.type,
    segmentIndex: seg,
    deviation: pinnedDeviation(pin, locality, nowS),
    cloud: profile.cloud,
    precipitation: profile.precipitation,
    season: seasonAtSegment(seg, isSouthern(site)),
  };
}

/** The biome-baseline sample: `clear`, zero deviation (indoor / no-sky, no pin). */
function baselineSample(nowS: number, site: ClimateSite | null = null): WeatherSample {
  const seg = segmentIndexAt(nowS);
  const p = WEATHER_PROFILES.clear;
  return {
    type: 'clear',
    segmentIndex: seg,
    deviation: p.deviation,
    cloud: p.cloud,
    precipitation: p.precipitation,
    season: seasonAtSegment(seg, isSouthern(site)),
  };
}

/** True iff a lean carries any non-neutral entry. */
function hasLean(lean: ClimateLean | null): boolean {
  if (lean === null) return false;
  for (const k of Object.keys(lean)) {
    const v = lean[k as WeatherType];
    if (v !== undefined && v !== 1) return true;
  }
  return false;
}

/** Game-seconds now, or `null` when no world clock is running (unit tests). */
function nowSecondsOrNull(): number | null {
  try {
    return WorldClockApi.getNow().rawValue();
  } catch {
    return null;
  }
}

/**
 * The core resolve — pure over `(scope, locality, nowS)`. Folds
 * authored pin → procgen(climate-lean-shaped) → biome baseline in
 * precedence, and pre-applies the sky-gate to `precipitationHere` (a pin
 * is ungated — an indoor weeping chamber rains; the procgen branch is
 * sky-gated — Wave-1 field-deviation behavior). Sky-exposure is only
 * consulted on the no-pin branch, so an authored indoor pin never triggers
 * the walk's cost path for the common case.
 */
function computeResolved(
  scope: Stuff & Container,
  locality: Locality | null,
  nowS: number,
  skyExposed: boolean,
  site: ClimateSite | null = null,
): ResolvedWeather {
  const pin = resolveWeatherPin(scope, locality);
  if (pin !== null) {
    const sample = pinnedSample(pin, locality, nowS, site);
    return {
      sample,
      provenance: pin.mode === 'frozen' ? 'pin-frozen' : 'pin-alive',
      precipitationHere: skyExposed
        ? phaseHere(sample, site, nowS)
        : sample.precipitation,
      cloudForm: cloudFormFor(sample.type, []),
    };
  }
  // No pin: the procgen sky field only reaches SkyExposed scopes; an
  // indoor scope reads the biome baseline (weather = sky dynamics).
  if (!skyExposed) {
    const sample = baselineSample(nowS, site);
    return {
      sample,
      provenance: 'biome',
      precipitationHere: 'none',
      cloudForm: cloudFormFor(sample.type, []),
    };
  }
  const sample = computeSample(nowS, locality, site);
  const leaned = hasLean(leanOf(locality));
  return {
    sample,
    provenance: leaned ? 'climate-leaned' : 'procgen',
    precipitationHere: phaseHere(sample, site, nowS),
    cloudForm: cloudFormFor(sample.type, []),
  };
}

/**
 * What is falling here NOW, under the sky: the sample's descriptor
 * re-decided by the temperature at the site (the air the sample's own
 * deviation sits on), so `analyze weather`, the puddle and the wetness
 * push all agree with the integral. An indoor pin (the weeping chamber's
 * rain) keeps its descriptor — it does not fall from this sky.
 */
function phaseHere(
  sample: WeatherSample,
  site: ClimateSite | null,
  nowS: number,
): 'none' | 'rain' | 'snow' {
  if (sample.precipitation === 'none' || site === null) return sample.precipitation;
  const k = climateK(site, nowS, climateDials()) + sample.deviation.temperature.rawValue();
  return k <= dial(AppSettingKeys.climateSnowThresholdK, 274.5) ? 'snow' : 'rain';
}

/**
 * The pure cloud-form derivation (Phase H). The base genus is the resolved
 * type's {@link CLOUD_FORM_BY_TYPE}; a **fair sky (clear/overcast) with a
 * front (rain/storm) in the near-term forecast** upgrades to the presage
 * form — `cirrus` over a clear sky thickening to `cirrostratus` over an
 * overcast one. Deterministic, total, no state — clouds are *described from*
 * the resolved weather, never grown from a vertical-dynamics sim.
 */
function cloudFormFor(
  current: WeatherType,
  upcoming: readonly WeatherType[],
): CloudForm {
  const fair = current === 'clear' || current === 'overcast';
  const frontComing = upcoming.some((t) => t === 'rain' || t === 'storm');
  if (fair && frontComing) {
    return current === 'clear' ? 'cirrus' : 'cirrostratus';
  }
  return CLOUD_FORM_BY_TYPE[current];
}

/**
 * A derived sky reading for `look up` / `analyze weather` (Phase H). The
 * cloud form is presage-aware **only for a genuinely modelled sky** (procgen
 * / climate-leaned): an authored pin or the biome baseline reports its base
 * form with no procgen presage. Reads the near-term forecast trend over the
 * `weather.skyForecastSegments` window (forecasting is free from
 * determinism).
 */
function computeSkyRead(
  resolved: ResolvedWeather,
  locality: Locality | null,
  nowS: number,
  site: ClimateSite | null = null,
): SkyRead {
  const modelled =
    resolved.provenance === 'procgen' ||
    resolved.provenance === 'climate-leaned';
  const currentType = resolved.sample.type;
  if (!modelled) {
    return {
      currentType,
      cloudForm: resolved.cloudForm,
      presageFront: false,
    };
  }
  const seed = localitySeed(locality);
  const lean = leanOf(locality);
  const seg = segmentIndexAt(nowS);
  const n = Math.max(0, Math.floor(dial(AppSettingKeys.weatherSkyForecastSegments, 2)));
  const upcoming: WeatherType[] = [];
  for (let i = 1; i <= n; i++) {
    upcoming.push(typeForSegment(seg + i, seed, lean, isSouthern(site)));
  }
  const cloudForm = cloudFormFor(currentType, upcoming);
  return {
    currentType,
    cloudForm,
    presageFront: cloudForm === 'cirrus' || cloudForm === 'cirrostratus',
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
  const { BiomeApi } = await import('../../../api/biome');
  const nowS = nowSecondsOrNull();
  const visited = new Set<string>();
  for (const interactive of ConnectionApi.getAllInteractives()) {
    const holder = interactive.getHolder();
    if (holder === null || !MixinApi.isContainable(holder)) continue;
    const room = (holder as Stuff & Containable).getContainer();
    if (room === null || !MixinApi.isContainer(room)) continue;
    if (visited.has(room.stuffId)) continue;
    visited.add(room.stuffId);

    const sky = BiomeApi.isSkyExposed(room);
    // Thermal restamp (Wave 1): SkyExposed only — the field deviation stays
    // sky-gated. The now-weathered ambient re-resolves on each Thermal read.
    if (sky) BiomeApi.restampThermalContentsOf(room);

    // ⭐ An ENCLOSED room's outside follows the front too (the envelope
    // build). `envelopeOutsideK` is stamped at the async temperature
    // resolve, so a room somebody is standing in gets its outside
    // re-resolved when the weather turns rather than waiting for the
    // next read that happens to be async. An empty room's outside
    // re-resolves on its next async read, which a body arriving
    // performs — so nothing is stale by the time it matters to anyone.
    if (!sky && MixinApi.isAtmospheric(room) && room.envelopeApplies()) {
      await BiomeApi.resolveTemperatureFor(room);
    }

    if (nowS === null) continue;
    const locality = await AddressApi.resolveLocalityFor(room);
    const site = await siteOfRoom(room);
    const resolved = computeResolved(room, locality, nowS, sky, site);

    // Puddle accrual / evaporation (Wave 2, D): source-indifferent — an
    // authored indoor rain fills a Floor pool exactly as procgen rain does.
    maintainPuddle(room, resolved);

    // Precipitation exposure (Wave 2, B): a body/object standing in resolved
    // rain (procgen OR authored — source-indifferent) gets wet. The wetness
    // gauge's reconcile drains it back when sheltered. This is the *push*
    // accrual side (the reconcile can't do an async weather resolve).
    if (resolved.precipitationHere === 'rain') wetOccupants(room);

    // Cloud → light dimming (Wave 2, F): stamp a cached dim factor onto a
    // sky-LIT AmbientLit scope so the sync perception walk reads dimmer
    // under overcast / storm (the `lastAmbientK` cache-invalidation
    // precedent).
    //
    // ⚠ The gate is `isSkyLit()`, not `sky` (`isSkyExposed`): since the
    // envelope build a room can follow the sun through an OPENING while
    // being fully enclosed — a skylight, a shop window. Cloud dims what
    // comes through a window exactly as it dims what falls in a yard,
    // and gating on exposure would have left every such room reading a
    // cloudless sky forever. An enclosed room with its own glow is
    // untouched: its light is its own.
    if (MixinApi.isAmbientLit(room) && room.isSkyLit()) {
      // ⚠ An enclosed skylit room's own `resolved` is the BIOME baseline
      // (`computeResolved` only runs the procgen sky field for exposed
      // scopes), so dimming by it would light a shop window from a sky
      // nobody is standing under. A window looks at the real sky over the
      // town, so the dim term asks for the exposed sample explicitly.
      const skySample = sky
        ? resolved.sample
        : computeResolved(room, locality, nowS, true, site).sample;
      const dimFactor = dial(AppSettingKeys.weatherCloudDimFactor, 0.6);
      const dim = Math.max(0, 1 - dimFactor * skySample.cloud);
      (room as unknown as AmbientLit).setWeatherDimFactor(dim);
    }
  }
}

/**
 * A room's climate site through its own memo (awaited, so a fan-out never
 * folds the default), or `null` for a scope with no air of its own.
 */
async function siteOfRoom(room: Stuff & Container): Promise<ClimateSite | null> {
  if (!MixinApi.isAtmospheric(room)) return null;
  const host = room as unknown as Atmospheric;
  await host.resolveClimateSite();
  return host.climateSite();
}

/* ─────────────────────────── Wave-2 puddle sink ─────────────────────────── */

/* ─────────────── the climate: one temperature from four levers ─────────────── */

/**
 * The climate's dials, read once per evaluation rather than per day of a
 * walk. Seeded literals at every read (the water pack's rule): the
 * kernel has a climate with no settings document at all.
 */
interface ClimateDials {
  poleK: number;
  equatorK: number;
  tauContinentalD: number;
  tauMaritimeD: number;
  mixing: number;
  lapseKPerKm: number;
  diurnalK: number;
}

function climateDials(): ClimateDials {
  return {
    poleK: dial(AppSettingKeys.climatePoleMeanK, 247),
    equatorK: dial(AppSettingKeys.climateEquatorMeanK, 299),
    tauContinentalD: dial(AppSettingKeys.climateTauContinentalDays, 30),
    tauMaritimeD: dial(AppSettingKeys.climateTauMaritimeDays, 55),
    mixing: dial(AppSettingKeys.climateMaritimeMixing, 0.6),
    lapseKPerKm: dial(AppSettingKeys.waterSnowLapseRateKPerKm, 6.5),
    diurnalK: dial(AppSettingKeys.weatherSolarDiurnalSwingK, 4),
  };
}

/**
 * The seasonal memos. Pure-function memos (the `seasonCache`
 * precedent), bounded by construction: latitude is quantised to half a
 * degree (≤ 361 keys), continentality to a tenth (≤ 11), and the season
 * repeats yearly, so every key is `(latitude, [continentality,] day of
 * year)`. They depend on the dials, so a change of dial (an operator's
 * `config`) clears them — the signature below.
 */
const equilibriumMemo = new Map<number, number>();
const annualMeanMemo = new Map<number, number>();
const seasonalMemo = new Map<number, number>();
let climateMemoSignature = '';

function syncClimateMemos(d: ClimateDials): void {
  const sig = `${d.poleK}|${d.equatorK}|${d.tauContinentalD}|${d.tauMaritimeD}|${d.mixing}`;
  if (sig === climateMemoSignature) return;
  equilibriumMemo.clear();
  annualMeanMemo.clear();
  seasonalMemo.clear();
  climateMemoSignature = sig;
}

/** Latitude quantised to half a degree — the memo's key and its value. */
function latitudeKey(latitudeDeg: number): number {
  return Math.round(Math.max(-90, Math.min(90, latitudeDeg)) * 2);
}

/** Continentality quantised to a tenth. */
function continentalityKey(c: number): number {
  return Math.round(Math.max(0, Math.min(1, c)) * 10);
}

function yearDays(): number {
  return EARTH_LIKE.yearLengthDays;
}

function wrapDay(doy: number): number {
  const Y = yearDays();
  return ((doy % Y) + Y) % Y;
}

/**
 * **The equilibrium temperature on a day** — what the place would sit at
 * if it had no memory: the pole figure plus the insolation the day
 * delivers, scaled so the equator's equinox sun reaches the equator
 * figure.
 *
 * ```
 *   π·Q = H0·sinφ·sinδ + cosφ·cosδ·sin H0        (H0 in radians)
 *   T_eq = T_pole + (T_equator − T_pole) · π·Q
 * ```
 *
 * `Q` is the day's top-of-atmosphere insolation as a fraction of the
 * solar constant; `H0` is the sunrise hour angle (0 in polar night, π in
 * polar day) and `δ` the declination — both CelestialApi's geometry, so
 * the climate and the sky's path are one model.
 */
function equilibriumK(latKey: number, doy: number, d: ClimateDials): number {
  const key = latKey * 400 + doy;
  const hit = equilibriumMemo.get(key);
  if (hit !== undefined) return hit;
  const latDeg = latKey / 2;
  const t = doy * EARTH_LIKE.dayLengthSeconds;
  const decRad = (CelestialApi.declinationDeg(EARTH_LIKE, t) * Math.PI) / 180;
  const h0 = CelestialApi.sunriseHourAngleDeg(EARTH_LIKE, latDeg, t);
  const H0 =
    h0 === 'polar-day' ? Math.PI : h0 === 'polar-night' ? 0 : (h0 * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  const piQ =
    H0 * Math.sin(lat) * Math.sin(decRad) +
    Math.cos(lat) * Math.cos(decRad) * Math.sin(H0);
  const value = d.poleK + (d.equatorK - d.poleK) * piQ;
  equilibriumMemo.set(key, value);
  return value;
}

/** The year's mean equilibrium at a latitude — what damping pulls toward. */
function annualMeanK(latKey: number, d: ClimateDials): number {
  const hit = annualMeanMemo.get(latKey);
  if (hit !== undefined) return hit;
  const Y = yearDays();
  let sum = 0;
  for (let doy = 0; doy < Y; doy++) sum += equilibriumK(latKey, doy, d);
  const value = sum / Y;
  annualMeanMemo.set(latKey, value);
  return value;
}

/**
 * **The season at a site, on a day of the year** — the lag and the
 * damping, separately.
 *
 * - The LAG is the land's memory: an exponentially weighted average of
 *   the equilibrium over the preceding days, with time constant
 *   `τ(c)` running from `tauContinentalDays` (c = 1) to
 *   `tauMaritimeDays` (c = 0). A weighted sum, not a fitted sinusoid, so
 *   it is exact for the polar night's flat floor.
 * - The DAMPING pulls the lagged value toward the latitude's annual
 *   mean by `m(c) = maritimeMixing · (1 − c)`: a coast's winter is mild
 *   and its summer cool.
 *
 * Keeping them separate is what lets a coast be both milder AND later
 * than an inland town at the same latitude — Seattle and Minneapolis.
 */
function seasonalK(latKey: number, cKey: number, doy: number, d: ClimateDials): number {
  const key = (latKey + 200) * 10_000 + cKey * 400 + doy;
  const hit = seasonalMemo.get(key);
  if (hit !== undefined) return hit;
  const c = cKey / 10;
  const tau = d.tauContinentalD + (d.tauMaritimeD - d.tauContinentalD) * (1 - c);
  const span = Math.ceil(4 * Math.max(1, tau));
  let sum = 0;
  let wsum = 0;
  for (let k = 0; k <= span; k++) {
    const w = Math.exp(-k / Math.max(1e-6, tau));
    sum += w * equilibriumK(latKey, wrapDay(doy - k), d);
    wsum += w;
  }
  const lagged = sum / wsum;
  const m = Math.max(0, Math.min(1, d.mixing * (1 - c)));
  const value = (1 - m) * lagged + m * annualMeanK(latKey, d);
  seasonalMemo.set(key, value);
  return value;
}

/**
 * **The climate's own temperature at a site and an instant**, before
 * the weather: the season (interpolated across the day, so the answer
 * is continuous in time), lapsed by elevation, shifted by the offset,
 * swung by the diurnal term (coldest three hours after midnight — heat
 * keeps leaving after the sun stops arriving).
 */
function climateK(site: ClimateSite, nowS: number, d: ClimateDials): number {
  syncClimateMemos(d);
  const D = EARTH_LIKE.dayLengthSeconds;
  const dayF = nowS / D;
  const day0 = Math.floor(dayF);
  const frac = dayF - day0;
  const latKey = latitudeKey(site.latitudeDeg);
  const cKey = continentalityKey(site.continentality);
  const s0 = seasonalK(latKey, cKey, wrapDay(day0), d);
  const s1 = seasonalK(latKey, cKey, wrapDay(day0 + 1), d);
  const season = s0 + (s1 - s0) * frac;
  const secOfDay = ((nowS % D) + D) % D;
  const diurnal = -d.diurnalK * Math.cos((2 * Math.PI * (secOfDay - 3 * 3600)) / D);
  return (
    season -
    (d.lapseKPerKm * site.elevationM) / 1000 +
    site.offsetK +
    diurnal
  );
}

/**
 * The weather's temperature deviation at an instant over a Locality:
 * the pinned type's when the Locality is pinned, else the procgen
 * grammar's (both shipped; this only composes them).
 */
function weatherTemperatureDeviationK(
  locality: Locality | null,
  nowS: number,
  site: ClimateSite | null = null,
): number {
  const pin = locality?.getWeatherPin() ?? null;
  const dev =
    pin !== null
      ? pinnedDeviation(pin, locality, nowS)
      : computeSample(nowS, locality, site).deviation;
  return dev.temperature.rawValue();
}

/** The full air temperature at a site: the climate plus the weather. */
function temperatureAtSite(
  site: ClimateSite,
  locality: Locality | null,
  nowS: number,
  d: ClimateDials = climateDials(),
): number {
  return climateK(site, nowS, d) + weatherTemperatureDeviationK(locality, nowS, site);
}

/** Numeric AppSetting read with a seeded-literal fallback (pre-warm safe). */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** String AppSetting read with a seeded-literal fallback. */
function dialStr(key: string, fallback: string): string {
  try {
    const raw = AppApi.setting(key);
    return raw == null || raw === '' ? fallback : raw;
  } catch {
    return fallback;
  }
}

/**
 * Wet every wetness-bearing occupant of a rain scope by one segment's worth
 * of exposure (the precipitation-exposure accrual push). Source-indifferent:
 * the caller has already resolved that it is raining *here*. The gauge clamps
 * at soaked; the reconcile drains it once the body leaves the rain.
 */
function wetOccupants(room: Stuff & Container): void {
  const perHour = dial(AppSettingKeys.wetnessRainAccrualPerHour, 1.5);
  const hours = WEATHER_DEFAULTS.SEGMENT_LENGTH_S / 3600;
  const delta = perHour * hours;
  for (const occ of room.getContents()) {
    if (MixinApi.isWet(occ as unknown as Stuff)) {
      (occ as unknown as { wet(n: number): void }).wet(delta);
    }
  }
}

/**
 * The room's puddle-bearing `Floor`. Mirrors `ElectricityLogic.findFloor`
 * so rain fills the same pool the conduction walk reads (the
 * weather→bulk→electricity loop) — and since the ground build both of them
 * ask the room ONE question, `Adornable.getFloor()`, instead of scanning
 * fixtures-then-contents for any Bulkable with a surface slot.
 */
function findRoomFloor(room: Stuff & Container): (Stuff & Bulkable) | null {
  if (!MixinApi.isAdornable(room)) return null;
  const floor = (room as Stuff & Adornable).getFloor();
  if (!floor) return null;
  if (!floor.hasSurfaceBulk()) return null;
  return floor;
}

/** The authored fresh-water material a new rain puddle fills with (weakly conductive). */
function freshWaterMaterial(): Material | null {
  const path = dialStr(
    AppSettingKeys.stormPuddleFreshWaterMaterialPath,
    '/stuff/idea/material/bulk/water',
  );
  return StuffApi.findByTemplatePath<Material>(path) ?? null;
}

/**
 * Accrue (under resolved rain) or evaporate (otherwise) the room's Floor
 * surface pool. Source-indifferent: reads `resolved.precipitationHere`, so
 * authored indoor rain and procgen rain fill the same sink. Evaporation
 * scales with the resolved sky (a clearer sky dries the ground faster).
 * Floor / bulk state — allowed (never weather state).
 */
function maintainPuddle(room: Stuff & Container, resolved: ResolvedWeather): void {
  const floor = findRoomFloor(room);
  if (floor === null) return;
  const capQ = floor.getBulkCapacity('surface');
  const cap = capQ ? capQ.rawValue() : Number.POSITIVE_INFINITY;
  const cur = floor.getBulkAmount('surface').rawValue();

  if (resolved.precipitationHere === 'rain') {
    // Fill toward capacity; seed a fresh-water pool if the floor is dry.
    if (cur <= 0 || floor.getBulkMaterial('surface') === null) {
      const mat = freshWaterMaterial();
      if (mat) floor.setBulkMaterial('surface', mat);
    }
    const accrual = dial(
      AppSettingKeys.stormPuddleAccrualLitersPerSegment,
      12,
    );
    const next = Math.min(cap, cur + accrual);
    if (next !== cur) floor.setBulkAmount('surface', Quantity.of(next, 'L'));
  } else if (cur > 0) {
    // Evaporate a fraction per non-rain segment; a clearer sky dries faster.
    const base = dial(AppSettingKeys.stormPuddleEvaporationFactor, 0.2);
    const evap = base * (1 - 0.5 * resolved.sample.cloud);
    const next = Math.max(0, cur - cur * evap);
    if (next !== cur) floor.setBulkAmount('surface', Quantity.of(next, 'L'));
  }
}

/* ─────────────────────────── Wave-2 storm strikes ─────────────────────────── */

/** The per-scope strike roll in [0, 1) — the test override or `Math.random`. */
function stormRoll(): number {
  return forcedStrikeRoll !== null ? forcedStrikeRoll : Math.random();
}

/**
 * The presence-gated storm-strike fan-out (the strike-tick sibling of the
 * boundary fan-out). Over each occupied SkyExposed scope whose **resolved**
 * type is `storm`, rolls `storm.strikeRate`; on a hit fires an ambient
 * strike through the shipped `ElectricityApi.conduct` (never a bespoke shock
 * path). No weather state stored — the schedule handle lives on the
 * scheduler; this recomputes everything from `getNow()`. `ElectricityApi` is
 * reached via a **dynamic import** to keep WeatherLogic's static graph clean.
 */
async function runStormFanout(): Promise<void> {
  const nowS = nowSecondsOrNull();
  if (nowS === null) return;
  const { BiomeApi } = await import('../../../api/biome');
  const rate = dial(AppSettingKeys.stormStrikeRate, 0.15);
  const visited = new Set<string>();
  for (const interactive of ConnectionApi.getAllInteractives()) {
    const holder = interactive.getHolder();
    if (holder === null || !MixinApi.isContainable(holder)) continue;
    const room = (holder as Stuff & Containable).getContainer();
    if (room === null || !MixinApi.isContainer(room)) continue;
    if (visited.has(room.stuffId)) continue;
    visited.add(room.stuffId);
    if (!BiomeApi.isSkyExposed(room)) continue;
    const locality = await AddressApi.resolveLocalityFor(room);
    const resolved = computeResolved(room, locality, nowS, true, await siteOfRoom(room));
    if (resolved.sample.type !== 'storm') continue;
    // ⭐ D13: every occupant that answers to a storm is called — an overhead
    // LineAccess pole faults here (presence-gated, like every weather
    // consequence). Separate from the lightning strike below, and per-occupant
    // guarded so one bad row does not take the fan-out down.
    for (const occ of room.getContents()) {
      const exposed = occ as unknown as StormExposed;
      if (typeof exposed.onStormExposure !== 'function') continue;
      try {
        await exposed.onStormExposure(nowS);
      } catch {
        // A pole that throws on a fault does not stop the storm.
      }
    }
    if (stormRoll() >= rate) continue;
    await fireStrike(room);
  }
}

/**
 * The strike attractor — the occupant most likely to draw the bolt: the
 * most electrically-conductive thing in the scope (a raised metal rod /
 * drawn sword). `null` when nothing conductive stands out (the bolt hits the
 * ground). A cheap emergent "lightning rod" bonus, conductivity-driven.
 */
function pickAttractor(room: Stuff & Container): Stuff | null {
  let best: Stuff | null = null;
  let bestSigma = 0;
  for (const occ of room.getContents()) {
    const sigma = conductivityOf(occ as unknown as Stuff);
    if (sigma > bestSigma) {
      bestSigma = sigma;
      best = occ as unknown as Stuff;
    }
  }
  // Only a genuinely conductive object (metal) biases the strike.
  return bestSigma >= dial(AppSettingKeys.electricityPoolMinConductivity, 0.005)
    ? best
    : null;
}

/** A Stuff's material electrical conductivity (S/m), or 0 when materialless. */
function conductivityOf(s: Stuff): number {
  const mat = MixinApi.isTangible(s) ? s.getMaterial() : null;
  return mat === null ? 0 : mat.getElectricalConductivity().rawValue();
}

/**
 * Fire one ambient strike at a stormed scope: mint a transient high-potential
 * `LightningStrike` in the room, route it through `conduct` (fans to bridged
 * / immersed bodies via the shipped graph — wet ground + a strike = the
 * conductive-puddle shock falls out for free), bias a direct hit onto the
 * attractor, crack a thunderclap the whole locale hears, then reap the
 * source. A strike into an empty scope harms no one but is still heard.
 */
async function fireStrike(room: Stuff & Container): Promise<void> {
  const volts = dial(AppSettingKeys.stormStrikeVoltage, 30_000_000);
  // ⭐ Clone the row, then patch: the strike's prose and keywords are
  // authored, and only the voltage — which is settings-derived, so
  // nobody could author it — arrives from here. (It used to be a bare
  // `create`, argued as "a seed row nothing ever edits"; a row nobody
  // edits is still a row somebody CAN.)
  const strike = await StuffApi.clone<
    Stuff & { setVoltage(v: Quantity<'V'>): void }
  >('/platform/thing/LightningStrike');
  strike.setVoltage(Quantity.of(volts, 'V'));
  await ContainmentApi.move(
    strike as unknown as Stuff & Containable,
    room as unknown as Stuff & Container,
  );
  try {
    // Ambient fan through the conduction graph (ground / pool / immersion).
    (strike as unknown as Stuff & Energized).conduct();
    // Attractor bias: a raised conductive rod draws a direct hit.
    const attractor = pickAttractor(room);
    if (attractor !== null && attractor !== (strike as unknown as Stuff)) {
      (strike as unknown as Stuff & Energized).shockContact(attractor);
    }
    // The world weathers whether you watch — the crack is heard regardless.
    (strike as unknown as { emit(o: unknown): void }).emit({
      db: 130,
      character: 'thunderclap',
      description: 'a blinding flash and a deafening crack of thunder',
    });
  } finally {
    StuffApi.destruct(strike as unknown as Stuff);
  }
}

/**
 * WeatherLogic — the hot-reloadable logic singleton behind
 * {@link WeatherApi}.
 *
 * Lives at `/platform/idea/api/weather`. **Stateless** — mirrors `BiomeLogic`
 * exactly (`extends Idea`, **no** `onCreate` override, no backing
 * `Template`); `dest /platform/idea/api/weather` reloads it. Holds the weather
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
 * Gated `AnyOf(FromModule('/api/weather#WeatherApi'), SelfOnly)`: the
 * `forecastFor`/`sampleFor` reads fan out to `weatherAt`/the grammar via
 * module-private functions (no intra-singleton self-calls), and the
 * facade forwarders supply the `FromModule` half.
 *
 * @internal
 */
@Unshadowable
export class WeatherLogic extends ApiLogic {
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

  /** See {@link WeatherApi.deviatedFieldFor}. Pin-aware, SYNC — no I/O. */
  @CallSecurity(WeatherApiCallers)
  public deviatedFieldFor(
    scope: Stuff & Container,
    locality: Locality | null,
    field: WeatherField,
    timeS: Quantity<'s'>,
    site?: ClimateSite | null,
  ): Quantity<WeatherFieldUnit> {
    const nowS = timeS.rawValue();
    const pin = resolveWeatherPin(scope, locality);
    const dev =
      pin !== null
        ? pinnedDeviation(pin, locality, nowS)
        : computeSample(nowS, locality, site).deviation;
    // ⚠ The weather TYPE's deviation only. The season and the day's swing
    // are the CLIMATE's (`climateAt`), which the biome chain substitutes
    // for the universe baseline under the sky — before the climate build
    // a solar cosine rode here, on top of whatever the chain answered,
    // authored or not.
    return dev[field] as Quantity<WeatherFieldUnit>;
  }

  /** See {@link WeatherApi.resolveWeatherFor}. Async — resolves locality + sky. */
  @CallSecurity(WeatherApiCallers)
  public async resolveWeatherFor(
    scope: Stuff & Container,
  ): Promise<ResolvedWeather> {
    const nowS = nowSecondsOrNull();
    if (nowS === null) {
      const sample = baselineSample(0);
      return {
        sample,
        provenance: 'biome',
        precipitationHere: 'none',
        cloudForm: cloudFormFor(sample.type, []),
      };
    }
    const locality = await AddressApi.resolveLocalityFor(scope);
    // BiomeApi via dynamic import — keep WeatherLogic's static graph
    // biome-free (the runBoundaryFanout precedent). Module cache makes
    // this ~free after the first call.
    const { BiomeApi } = await import('../../../api/biome');
    const sky = BiomeApi.isSkyExposed(scope);
    const site = await ZoneApi.climateSiteFor(scope);
    return computeResolved(scope, locality, nowS, sky, site);
  }

  /** See {@link WeatherApi.skyReadFor}. Async — resolves locality + forecast. */
  @CallSecurity(WeatherApiCallers)
  public async skyReadFor(scope: Stuff & Container): Promise<SkyRead> {
    const nowS = nowSecondsOrNull();
    const resolved = await this.resolveWeatherFor(scope);
    if (nowS === null) {
      return {
        currentType: resolved.sample.type,
        cloudForm: resolved.cloudForm,
        presageFront: false,
      };
    }
    const locality = await AddressApi.resolveLocalityFor(scope);
    const site = await ZoneApi.climateSiteFor(scope);
    return computeSkyRead(resolved, locality, nowS, site);
  }

  /** See {@link WeatherApi.cloudFormFor}. Pure. */
  @CallSecurity(WeatherApiCallers)
  public cloudFormFor(
    current: WeatherType,
    upcoming: readonly WeatherType[],
  ): CloudForm {
    return cloudFormFor(current, upcoming);
  }

  /** See {@link WeatherApi.forecastFor}. Async — resolves the locality. */
  @CallSecurity(WeatherApiCallers)
  public async forecastFor(
    scope: Stuff & Container,
    segments?: number,
  ): Promise<WeatherForecast> {
    const locality = await AddressApi.resolveLocalityFor(scope);
    const site = await ZoneApi.climateSiteFor(scope);
    const south = isSouthern(site);
    const nowS = WorldClockApi.getNow().rawValue();
    const seed = localitySeed(locality);
    const lean = leanOf(locality);
    const current = computeSample(nowS, locality, site);
    const n = Math.max(0, segments ?? WEATHER_DEFAULTS.FORECAST_SEGMENTS);
    const seg = current.segmentIndex;
    const upcoming: WeatherForecastEntry[] = [];
    for (let i = 1; i <= n; i++) {
      const s = seg + i;
      upcoming.push({
        segmentIndex: s,
        type: typeForSegment(s, seed, lean, south),
        startsAt: Quantity.of(s * WEATHER_DEFAULTS.SEGMENT_LENGTH_S, 's'),
      });
    }
    return { current, upcoming };
  }

  /** See {@link WeatherApi.sampleFor}. Async — resolves the locality. */
  @CallSecurity(WeatherApiCallers)
  public async sampleFor(scope: Stuff & Container): Promise<WeatherSample> {
    const locality = await AddressApi.resolveLocalityFor(scope);
    const site = await ZoneApi.climateSiteFor(scope);
    return computeSample(WorldClockApi.getNow().rawValue(), locality, site);
  }

  /** See {@link WeatherApi.precipitationBetween}. */
  @CallSecurity(WeatherApiCallers)
  public precipitationBetween(
    t0: Quantity<'s'>,
    t1: Quantity<'s'>,
    locality: Locality | null,
    site?: ClimateSite | null,
  ): PrecipitationIntegral {
    return integratePrecipitation(t0.rawValue(), t1.rawValue(), locality, site ?? null);
  }

  /** See {@link WeatherApi.segmentsBetween}. */
  @CallSecurity(WeatherApiCallers)
  public segmentsBetween(
    t0: Quantity<'s'>,
    t1: Quantity<'s'>,
    locality: Locality | null,
    maxSegments?: number,
    site?: ClimateSite | null,
  ): WeatherSegment[] {
    const out: WeatherSegment[] = [];
    walkSegments(
      t0.rawValue(),
      t1.rawValue(),
      locality,
      (seg) => out.push(seg),
      maxSegments,
      site ?? null,
    );
    return out;
  }

  /** See {@link WeatherApi.climateAt}. Pure, SYNC. */
  @CallSecurity(WeatherApiCallers)
  public climateAt(site: ClimateSite, timeS: Quantity<'s'>): Quantity<'K'> {
    return Quantity.of(climateK(site, timeS.rawValue(), climateDials()), 'K');
  }

  /** See {@link WeatherApi.temperatureAt}. Pure, SYNC. */
  @CallSecurity(WeatherApiCallers)
  public temperatureAt(
    site: ClimateSite,
    locality: Locality | null,
    timeS: Quantity<'s'>,
  ): Quantity<'K'> {
    return Quantity.of(temperatureAtSite(site, locality, timeS.rawValue()), 'K');
  }

  /** See {@link WeatherApi.seasonAt}. Pure, SYNC. */
  @CallSecurity(WeatherApiCallers)
  public seasonAt(site: ClimateSite, timeS: Quantity<'s'>): Season {
    return CelestialApi.seasonFor(EARTH_LIKE, timeS.rawValue(), site.latitudeDeg);
  }

  /** See {@link WeatherApi.dailyRangeAt}. Pure, SYNC. */
  @CallSecurity(WeatherApiCallers)
  public dailyRangeAt(
    site: ClimateSite,
    locality: Locality | null,
    dayStartS: Quantity<'s'>,
  ): DailyRange {
    const d = climateDials();
    const t0 = dayStartS.rawValue();
    let minK = Number.POSITIVE_INFINITY;
    let maxK = Number.NEGATIVE_INFINITY;
    // Hourly: the diurnal term and a segment change both resolve at an
    // hour, and 24 samples of a memoised expression cost nothing.
    for (let h = 0; h < 24; h++) {
      const k = temperatureAtSite(site, locality, t0 + h * 3600, d);
      if (k < minK) minK = k;
      if (k > maxK) maxK = k;
    }
    return { minK, maxK };
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
  public onBoundary(): Promise<void> {
    return runBoundaryFanout();
  }

  /** See {@link WeatherApi.onStormTick}. */
  @CallSecurity(WeatherApiCallers)
  public onStormTick(): Promise<void> {
    return runStormFanout();
  }

  /** See {@link WeatherApi.strikeIntervalSeconds}. */
  @CallSecurity(WeatherApiCallers)
  public strikeIntervalSeconds(): number {
    return dial(AppSettingKeys.stormStrikeIntervalS, 1800);
  }

  /** See {@link WeatherApi._forceStrikeRollForTesting}. */
  @CallSecurity(WeatherApiCallers)
  public _forceStrikeRollForTesting(roll: number | null): void {
    forcedStrikeRoll = roll;
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
    forcedStrikeRoll = null;
  }
}
