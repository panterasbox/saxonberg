// WeatherLogic — the hot-reloadable logic singleton behind WeatherApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
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
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { MaterialApi } from '../../api/material';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { EARTH_LIKE, type Season } from '../../lib/time/CelestialProfile';
import type Locality from '../../lib/address/Locality';
import type Material from '../../lib/material/Material';
import type { Bulkable } from '../../lib/bulk/Bulkable';
import type { Adornable } from '../../lib/boundary/Adornable';
import type { Energized } from '../../lib/electricity/Energized';
import type { AmbientLit } from '../../lib/perception/AmbientLit';
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
} from '../../lib/weather/WeatherType';
import type { Atmospheric } from '../../lib/biome/Atmospheric';

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
): WeatherType {
  const season = seasonAtSegment(anchorSeg);
  const roll = roll01(anchorSeg, seed ^ 0x0000_a5a5);
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
): WeatherType {
  if (forcedType !== null) return forcedType;
  const warm = WEATHER_DEFAULTS.GRAMMAR_WARMUP;
  const anchorSeg = Math.floor(seg / warm) * warm;
  let cur = anchorTypeFor(anchorSeg, seed, lean);
  for (let i = anchorSeg; i < seg; i++) {
    const season = seasonAtSegment(i + 1);
    cur = nextTypeFrom(cur, season, roll01(i + 1, seed), lean);
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
function computeSample(nowS: number, locality: Locality | null): WeatherSample {
  const seed = localitySeed(locality);
  const lean = leanOf(locality);
  const seg = segmentIndexAt(nowS);
  const segStart = seg * WEATHER_DEFAULTS.SEGMENT_LENGTH_S;
  const frac = (nowS - segStart) / WEATHER_DEFAULTS.SEGMENT_LENGTH_S;

  const curType = typeForSegment(seg, seed, lean);
  const curProfile = WEATHER_PROFILES[curType];

  let deviation = curProfile.deviation;
  const band = WEATHER_DEFAULTS.INTERP_BAND;
  if (band > 0 && frac < band) {
    const prevType = typeForSegment(seg - 1, seed, lean);
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
  const base = roll01(seg, (seed ^ 0x00a1_11e5) >>> 0);
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
): WeatherSample {
  const profile = WEATHER_PROFILES[pin.type];
  const seg = segmentIndexAt(nowS);
  return {
    type: pin.type,
    segmentIndex: seg,
    deviation: pinnedDeviation(pin, locality, nowS),
    cloud: profile.cloud,
    precipitation: profile.precipitation,
    season: seasonAtSegment(seg),
  };
}

/** The biome-baseline sample: `clear`, zero deviation (indoor / no-sky, no pin). */
function baselineSample(nowS: number): WeatherSample {
  const seg = segmentIndexAt(nowS);
  const p = WEATHER_PROFILES.clear;
  return {
    type: 'clear',
    segmentIndex: seg,
    deviation: p.deviation,
    cloud: p.cloud,
    precipitation: p.precipitation,
    season: seasonAtSegment(seg),
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
): ResolvedWeather {
  const pin = resolveWeatherPin(scope, locality);
  if (pin !== null) {
    const sample = pinnedSample(pin, locality, nowS);
    return {
      sample,
      provenance: pin.mode === 'frozen' ? 'pin-frozen' : 'pin-alive',
      precipitationHere: sample.precipitation,
      cloudForm: cloudFormFor(sample.type, []),
    };
  }
  // No pin: the procgen sky field only reaches SkyExposed scopes; an
  // indoor scope reads the biome baseline (weather = sky dynamics).
  if (!skyExposed) {
    const sample = baselineSample(nowS);
    return {
      sample,
      provenance: 'biome',
      precipitationHere: 'none',
      cloudForm: cloudFormFor(sample.type, []),
    };
  }
  const sample = computeSample(nowS, locality);
  const leaned = hasLean(leanOf(locality));
  return {
    sample,
    provenance: leaned ? 'climate-leaned' : 'procgen',
    precipitationHere: sample.precipitation,
    cloudForm: cloudFormFor(sample.type, []),
  };
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
    upcoming.push(typeForSegment(seg + i, seed, lean));
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
  const { BiomeApi } = await import('../../api/biome');
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

    if (nowS === null) continue;
    const locality = await AddressApi.resolveLocalityFor(room);
    const resolved = computeResolved(room, locality, nowS, sky);

    // Puddle accrual / evaporation (Wave 2, D): source-indifferent — an
    // authored indoor rain fills a Floor pool exactly as procgen rain does.
    maintainPuddle(room, resolved);

    // Precipitation exposure (Wave 2, B): a body/object standing in resolved
    // rain (procgen OR authored — source-indifferent) gets wet. The wetness
    // gauge's reconcile drains it back when sheltered. This is the *push*
    // accrual side (the reconcile can't do an async weather resolve).
    if (resolved.precipitationHere === 'rain') wetOccupants(room);

    // Cloud → light dimming (Wave 2, F): stamp a cached dim factor onto a
    // SkyExposed AmbientLit scope so the sync perception walk reads dimmer
    // under overcast / storm (the `lastAmbientK` cache-invalidation
    // precedent). SkyExposed only — an indoor scope's light is its own.
    if (sky && MixinApi.isAmbientLit(room)) {
      const dimFactor = dial(AppSettingKeys.weatherCloudDimFactor, 0.6);
      const dim = Math.max(0, 1 - dimFactor * resolved.sample.cloud);
      (room as unknown as AmbientLit).setWeatherDimFactor(dim);
    }
  }
}

/* ─────────────────────────── Wave-2 puddle sink ─────────────────────────── */

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
 * The room's puddle-bearing `Floor` — a fixture (or content) carrying a
 * surface bulk slot. Mirrors `ElectricityLogic.findFloor` so rain fills the
 * same pool the conduction walk reads (the weather→bulk→electricity loop).
 */
function findRoomFloor(room: Stuff & Container): (Stuff & Bulkable) | null {
  if (MixinApi.isAdornable(room)) {
    for (const fx of (room as Stuff & Adornable).getFixtures()) {
      if (MixinApi.isBulkable(fx) && fx.hasSurfaceBulk()) {
        return fx as unknown as Stuff & Bulkable;
      }
    }
  }
  if (MixinApi.isContainer(room)) {
    for (const c of room.getContents()) {
      if (MixinApi.isBulkable(c) && c.hasSurfaceBulk()) {
        return c as unknown as Stuff & Bulkable;
      }
    }
  }
  return null;
}

/** The authored fresh-water material a new rain puddle fills with (weakly conductive). */
function freshWaterMaterial(): Material | null {
  const path = dialStr(
    AppSettingKeys.stormPuddleFreshWaterMaterialPath,
    '/lib/material/bulk/water',
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
  const { BiomeApi } = await import('../../api/biome');
  const { ElectricityApi } = await import('../../api/electricity');
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
    const resolved = computeResolved(room, locality, nowS, true);
    if (resolved.sample.type !== 'storm') continue;
    if (stormRoll() >= rate) continue;
    await fireStrike(room, ElectricityApi);
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
  const mat = MaterialApi.materialOf(s);
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
async function fireStrike(
  room: Stuff & Container,
  ElectricityApi: typeof import('../../api/electricity').ElectricityApi,
): Promise<void> {
  const { default: LightningStrike } = await import(
    '../../lib/weather/LightningStrike'
  );
  const volts = dial(AppSettingKeys.stormStrikeVoltage, 30_000_000);
  const strike = await StuffApi.create(() => {
    const s = new LightningStrike();
    s.setVoltage(Quantity.of(volts, 'V'));
    return s;
  });
  await ContainmentApi.move(
    strike as unknown as Stuff & Containable,
    room as unknown as Stuff & Container,
  );
  try {
    // Ambient fan through the conduction graph (ground / pool / immersion).
    ElectricityApi.conduct(strike as unknown as Stuff & Energized);
    // Attractor bias: a raised conductive rod draws a direct hit.
    const attractor = pickAttractor(room);
    if (attractor !== null && attractor !== (strike as unknown as Stuff)) {
      ElectricityApi.shockContact(
        strike as unknown as Stuff & Energized,
        attractor,
      );
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
  ): Quantity<WeatherFieldUnit> {
    const nowS = timeS.rawValue();
    const pin = resolveWeatherPin(scope, locality);
    const dev =
      pin !== null
        ? pinnedDeviation(pin, locality, nowS)
        : computeSample(nowS, locality).deviation;
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
    const { BiomeApi } = await import('../../api/biome');
    const sky = BiomeApi.isSkyExposed(scope);
    return computeResolved(scope, locality, nowS, sky);
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
    return computeSkyRead(resolved, locality, nowS);
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
    const nowS = WorldClockApi.getNow().rawValue();
    const seed = localitySeed(locality);
    const lean = leanOf(locality);
    const current = computeSample(nowS, locality);
    const n = Math.max(0, segments ?? WEATHER_DEFAULTS.FORECAST_SEGMENTS);
    const seg = current.segmentIndex;
    const upcoming: WeatherForecastEntry[] = [];
    for (let i = 1; i <= n; i++) {
      const s = seg + i;
      upcoming.push({
        segmentIndex: s,
        type: typeForSegment(s, seed, lean),
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

  /** See {@link WeatherApi.onStormTick}. */
  @CallSecurity(WeatherApiCallers)
  public onStormTick(): void {
    void runStormFanout();
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
