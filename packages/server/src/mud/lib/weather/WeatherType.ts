/**
 * WeatherType — the weather subsystem's one concept: the weather-grammar
 * vocabulary, its data tables, the dial constants, and the I/O shapes.
 * **Consts and types only — no functions.**
 *
 * Weather is a thin, stateless driver over biome's static atmospheric
 * state: a deterministic, lazy-compute-on-read field that deviates
 * SkyExposed scopes' temperature / humidity / wind / pressure over time,
 * coherently, per locality. There is no simulation, no tick, and no
 * stored weather state — `WeatherApi.weatherAt(time, locality)` is a pure
 * function of its inputs (see {@link ../../platform/idea/api/WeatherLogic}).
 *
 * This module is the home for the **data** (the {@link WeatherType}
 * vocabulary, {@link WEATHER_PROFILES}, {@link TRANSITIONS},
 * {@link SEASON_BIAS}, {@link WEATHER_DEFAULTS}) and the **output shapes**
 * ({@link WeatherSample}, {@link WeatherForecast}). The grammar
 * **behavior** (`segmentIndexAt`, `typeForSegment`, `nextTypeFrom`, the
 * hash, the seed, the interpolation) lives as module-private functions on
 * the `WeatherLogic` singleton — the `BiomeLogic` free-function shape. A
 * `lib/` module of *exported* pure functions is forbidden by the
 * export-discipline rule, so the dials/data live in this value-object and
 * the behavior lives on the logic singleton (the same call the celestial
 * review made folding `solar.ts` onto `CelestialApi`).
 *
 * Parallel to `lib/quantity.ts` (Unit union + tag tables) and
 * `THERMAL_DEFAULTS` inside `lib/thermal/Thermal.ts`: the subsystem's
 * dials/data live in its value-object file, **never a standalone
 * `defaults.ts`**.
 */

import { Quantity } from '../quantity';
import type { Season } from '../time/CelestialProfile';

/* ─────────────────────────── vocabulary ─────────────────────────── */

/** The weather-grammar vocabulary — six coherent atmospheric states. */
export type WeatherType =
  | 'clear'
  | 'overcast'
  | 'rain'
  | 'storm'
  | 'fog'
  | 'snow';

/** Validation array for {@link WeatherType} (the `WEATHER_TYPES` guard). */
export const WEATHER_TYPES: readonly WeatherType[] = [
  'clear',
  'overcast',
  'rain',
  'storm',
  'fog',
  'snow',
] as const;

/**
 * The four biome fields weather deviates (D5). Gravity / atmosphere are
 * **not** weather-deviated. The biome seam keys its gate on this set.
 */
export type WeatherField = 'temperature' | 'humidity' | 'wind' | 'pressure';

/** Validation array / iteration order for {@link WeatherField}. */
export const WEATHER_FIELDS: readonly WeatherField[] = [
  'temperature',
  'humidity',
  'wind',
  'pressure',
] as const;

/** The Quantity unit each weather field carries. */
export type WeatherFieldUnit = 'K' | '%' | 'm/s' | 'Pa';

/** Per-field unit map — drives the zero-Quantity construction. */
export const WEATHER_FIELD_UNITS: Record<WeatherField, WeatherFieldUnit> = {
  temperature: 'K',
  humidity: '%',
  wind: 'm/s',
  pressure: 'Pa',
};

/* ─────────────────────────── deviation bundle ─────────────────────────── */

/**
 * A signed per-field additive deviation from biome's base reads. The
 * biome resolve folds the matching field into its SkyExposed result; a
 * `clear` profile is zero everywhere, so weather-flat is biome-identical.
 */
export interface WeatherDeviation {
  /** Signed Δ temperature (K). */
  temperature: Quantity<'K'>;
  /** Signed Δ relative humidity (%). */
  humidity: Quantity<'%'>;
  /** Signed Δ wind speed — scalar (m/s) per D5. */
  wind: Quantity<'m/s'>;
  /** Signed Δ pressure (Pa). Storm/rain are **negative** (the Barometer). */
  pressure: Quantity<'Pa'>;
}

/**
 * The data bundle each {@link WeatherType} carries: its per-field
 * deviation targets plus the Wave-2 cloud / precipitation descriptors
 * (reported by `analyze weather`; they drive nothing in Wave 1).
 */
export interface WeatherTypeProfile {
  type: WeatherType;
  /** Per-field signed deviation from the biome base. */
  deviation: WeatherDeviation;
  /** Cloud cover 0..1 — Wave-2 light-dimming seam. */
  cloud: number;
  /** Precipitation descriptor — Wave-2 wetness seam. */
  precipitation: 'none' | 'rain' | 'snow';
}

/* ─────────────────────────── profiles (playtest-tuned) ─────────────────────────── */

/** Build a deviation bundle from plain numbers (terser table below). */
function dev(
  temperature: number,
  humidity: number,
  wind: number,
  pressure: number,
): WeatherDeviation {
  return {
    temperature: Quantity.of(temperature, 'K'),
    humidity: Quantity.of(humidity, '%'),
    wind: Quantity.of(wind, 'm/s'),
    pressure: Quantity.of(pressure, 'Pa'),
  };
}

/**
 * Per-type deviation targets + descriptors. Directions are playtest
 * dials, **not** plan decisions — only the **pressure sign** is
 * load-bearing (storm/rain must read low on the Barometer). `clear` is
 * zero everywhere, so a clear segment is biome-identical.
 */
export const WEATHER_PROFILES: Record<WeatherType, WeatherTypeProfile> = {
  clear: {
    type: 'clear',
    deviation: dev(0, 0, 0, 0),
    cloud: 0.0,
    precipitation: 'none',
  },
  overcast: {
    type: 'overcast',
    deviation: dev(-1, 15, 0.5, -100),
    cloud: 0.7,
    precipitation: 'none',
  },
  rain: {
    type: 'rain',
    deviation: dev(-3, 35, 3, -800),
    cloud: 0.9,
    precipitation: 'rain',
  },
  storm: {
    type: 'storm',
    deviation: dev(-5, 45, 12, -2500),
    cloud: 1.0,
    precipitation: 'rain',
  },
  fog: {
    type: 'fog',
    deviation: dev(-1, 40, -1, -50),
    cloud: 0.6,
    precipitation: 'none',
  },
  snow: {
    type: 'snow',
    deviation: dev(-6, 20, 2, -300),
    cloud: 0.85,
    precipitation: 'snow',
  },
};

/* ─────────────────────────── grammar tables ─────────────────────────── */

/** One weighted transition candidate. */
export interface WeatherTransition {
  type: WeatherType;
  weight: number;
}

/**
 * The transition grammar: per current type, the weighted set of plausible
 * next types. Implausible jumps are absent (weight 0) — `clear` never
 * jumps straight to `storm`; it must pass through `overcast`/`rain`
 * (the coherence acceptance criterion). `snow` is reachable only from
 * `overcast`/`snow`, so a snow spell only forms after clouding over.
 */
export const TRANSITIONS: Record<WeatherType, WeatherTransition[]> = {
  clear: [
    { type: 'clear', weight: 5 },
    { type: 'overcast', weight: 3 },
    { type: 'fog', weight: 2 },
  ],
  overcast: [
    { type: 'overcast', weight: 3 },
    { type: 'clear', weight: 3 },
    { type: 'rain', weight: 3 },
    { type: 'fog', weight: 1 },
    { type: 'snow', weight: 1 },
  ],
  rain: [
    { type: 'rain', weight: 3 },
    { type: 'overcast', weight: 3 },
    { type: 'storm', weight: 2 },
    { type: 'clear', weight: 1 },
  ],
  storm: [
    { type: 'storm', weight: 2 },
    { type: 'rain', weight: 4 },
    { type: 'overcast', weight: 2 },
  ],
  fog: [
    { type: 'fog', weight: 3 },
    { type: 'clear', weight: 3 },
    { type: 'overcast', weight: 2 },
  ],
  snow: [
    { type: 'snow', weight: 3 },
    { type: 'overcast', weight: 3 },
    { type: 'clear', weight: 2 },
  ],
};

/**
 * The calm types the warmup-anchor (D-C) may start from — never `rain` /
 * `storm` / `snow`. A fresh anchor is always calm, so the bounded
 * back-walk can never *begin* in severe weather; severe states only
 * emerge through transitions inside a warmup window.
 */
export const ANCHOR_CANDIDATES: WeatherTransition[] = [
  { type: 'clear', weight: 5 },
  { type: 'overcast', weight: 3 },
  { type: 'fog', weight: 2 },
];

/**
 * Per-season multiplicative weight bias over the transition / anchor
 * candidates. Snow leans heavy in winter and is **zeroed in summer**
 * (the season-bias acceptance criterion); storms lean summer; fog leans
 * the shoulder seasons. A `1` (or absent) entry is neutral.
 */
export const SEASON_BIAS: Record<Season, Partial<Record<WeatherType, number>>> =
  {
    spring: { rain: 1.5, clear: 1.1, snow: 0.3 },
    summer: { snow: 0, storm: 1.6, clear: 1.3, fog: 0.7 },
    fall: { overcast: 1.3, fog: 1.5, rain: 1.2, snow: 0.5 },
    winter: { snow: 4, fog: 1.4, storm: 1.2, clear: 0.8, rain: 0.6 },
  };

/* ─────────────────────────── dials ─────────────────────────── */

/**
 * The weather subsystem's tuning dials. Playtest values, not plan
 * decisions — the home that kills the `defaults.ts` reflex.
 */
export const WEATHER_DEFAULTS = {
  /** Segment length in game-seconds — a piecewise-constant ambient (6h). */
  SEGMENT_LENGTH_S: 6 * 3600,
  /** Global base seed XOR'd into every locality seed (and the `null` seed). */
  GLOBAL_BASE_SEED: 0x5715_9b2d,
  /** Default number of upcoming segments `forecastFor` reports. */
  FORECAST_SEGMENTS: 4,
  /**
   * Bounded warmup-anchor depth (D-C): `typeForSegment` re-anchors every
   * `GRAMMAR_WARMUP` segments and walks forward at most this many steps.
   * O(WARMUP), pure, process-stable.
   */
  GRAMMAR_WARMUP: 8,
  /**
   * Interpolation lead-in band (D-D): the fraction of a segment, measured
   * from its start boundary, over which the deviation ramps from the
   * previous segment's targets to the current's. Outside the band the
   * deviation is the current segment's targets (piecewise-constant within
   * thermal's tolerance). Keeps the deviation continuous across
   * boundaries; the type is always the current segment's.
   */
  INTERP_BAND: 0.15,
  /**
   * The floor of the `alive`-pin intensity animation (Wave 2). A
   * `pinned-but-alive` scope forces its `type` but lets the model still
   * animate the deviation magnitude — a per-segment deterministic scale
   * in `[ALIVE_ANIM_MIN, 1]` of the pinned type's profile deviation.
   * `1` would make `alive` indistinguishable from `frozen`; a lower floor
   * gives a visibly breathing storm without ever changing the type. The
   * exact formula is a playtest dial; the type-forcing is the invariant.
   */
  ALIVE_ANIM_MIN: 0.6,
} as const;

/* ─────────────────────────── Wave-2 coexistence resolve ─────────────────────────── */

/**
 * An authored climate lean: a soft per-`Locality`
 * multiplicative bias over the procgen transition/anchor distribution — a
 * direct `SEASON_BIAS` sibling multiplied into `pickWeighted`. "Narnia is
 * polar" is `{ snow: 4, storm: 1.5, clear: 0.5 }`. A missing / `1` entry is
 * neutral. It shapes only the **procgen branch** a hard pin outranks, so
 * "author always wins" (D) is preserved.
 */
export type ClimateLean = Partial<Record<WeatherType, number>>;

/**
 * The two flavors an authored weather pin carries:
 * `frozen` — fully static, the weather never changes here (the cheap
 * narrative set-piece); `alive` — the *type* is forced but the model still
 * animates its intensity by season / time-of-day.
 */
export type WeatherPinMode = 'frozen' | 'alive';

/**
 * An authored weather pin: "this scope is *always*
 * this weather." One declarative `{ type, mode }` field, authored on both
 * the `Locality` tier (covers its address subtree) and the scope tier
 * (`AtmosphericMixin`, a single room overriding within an otherwise-
 * modelled Locality), resolved by one shared upward walk. Higher-precedence
 * than the {@link ClimateLean}; the model never overrides it (D).
 */
export interface WeatherPin {
  type: WeatherType;
  mode: WeatherPinMode;
}

/* ─────────────────────────── cloud forms (Wave 2, Phase H) ─────────────────────────── */

/**
 * A small cloud-genus vocabulary (Phase H) — the sky's visible *form*,
 * **derived** from the resolved weather type + the near-term forecast trend
 * (the Wave-1 `cloud` scalar is the sky's *coverage*; this is its *form*).
 * A legibility + inquiry (sky-reading) surface — **presentation only, never
 * a physics input**. High wisps (`cirrus`) genuinely presage a front because
 * our weather is deterministic, so the tell is a *true, learnable* signal —
 * but the player-facing prose stays honestly hedged.
 */
export type CloudForm =
  | 'clear'
  | 'cirrus'
  | 'cirrostratus'
  | 'cumulus'
  | 'stratus'
  | 'nimbostratus'
  | 'cumulonimbus';

/** Validation array for {@link CloudForm}. */
export const CLOUD_FORMS: readonly CloudForm[] = [
  'clear',
  'cirrus',
  'cirrostratus',
  'cumulus',
  'stratus',
  'nimbostratus',
  'cumulonimbus',
] as const;

/**
 * The base cloud form each resolved weather *type* shows when nothing is
 * changing (no presaging front). `storm → cumulonimbus`, `overcast →
 * stratus`, `rain → nimbostratus`. The presage upgrade (a fair sky with a
 * front in the near forecast → `cirrus`/`cirrostratus` thickening) is layered
 * on top by the derivation, not stored here.
 */
export const CLOUD_FORM_BY_TYPE: Record<WeatherType, CloudForm> = {
  clear: 'clear',
  overcast: 'stratus',
  rain: 'nimbostratus',
  storm: 'cumulonimbus',
  fog: 'stratus',
  snow: 'nimbostratus',
};

/** A derived sky reading (`look up` / `analyze weather`, Phase H). */
export interface SkyRead {
  /** The current resolved weather type. */
  currentType: WeatherType;
  /** The derived visible cloud form. */
  cloudForm: CloudForm;
  /** True iff the form presages a front (a hedged forecast tell). */
  presageFront: boolean;
}

/**
 * How the resolved atmospheric state was reached, for `analyze weather`
 * legibility (the provenance the acceptance criterion requires):
 * - `pin-frozen` / `pin-alive` — an authored pin won (frozen static /
 *   type-forced animated).
 * - `climate-leaned` — no pin, procgen, but a `Locality` climate lean
 *   shaped the distribution.
 * - `procgen` — no pin, no lean; the shipped per-Locality field.
 * - `biome` — weather is inactive (or the scope resolves no sky); the
 *   static biome baseline, zero deviation.
 */
export type WeatherProvenance =
  | 'pin-frozen'
  | 'pin-alive'
  | 'climate-leaned'
  | 'procgen'
  | 'biome';

/**
 * The single resolved atmospheric state every Wave-2 consumer reads
 * (wetness / thermal / electricity / light / `analyze`), folding
 * **authored pin → procgen (climate-lean-shaped) → biome** in precedence.
 * Indifferent to whether the weather is authored or modelled — an authored
 * always-rainy room and a procgen storm produce the same `precipitationHere`
 * downstream (the spine invariant). Nobody calls `weatherAt`/`deviationFor`
 * directly except the resolver and the biome fold.
 */
export interface ResolvedWeather {
  /** The resolved weather sample (type / deviation / cloud / precipitation). */
  sample: WeatherSample;
  /** How the state was reached (for legibility). */
  provenance: WeatherProvenance;
  /**
   * The resolved "is it raining here" read — **not** sky-gated for an
   * authored pin (an indoor weeping chamber rains), sky-gated for the
   * procgen branch (Wave-1 field-deviation behavior preserved). The
   * wetness / puddle consumers read this, never the raw sample.
   */
  precipitationHere: 'none' | 'rain' | 'snow';
  /**
   * The derived base cloud form for the resolved type (Phase H) — the sky's
   * visible genus with no presaging trend applied. `skyReadFor` layers the
   * presage upgrade on top. Presentation only — no consequence reads it.
   */
  cloudForm: CloudForm;
}

/* ─────────────────────────── output shapes ─────────────────────────── */

/** A resolved weather reading for an instant + locality. */
export interface WeatherSample {
  /** The current segment's weather type (piecewise-constant). */
  type: WeatherType;
  /** The integer segment index `floor(time / SEGMENT_LENGTH_S)`. */
  segmentIndex: number;
  /** The interpolated per-field deviation at the instant. */
  deviation: WeatherDeviation;
  /** Cloud cover descriptor for the current type (0..1). */
  cloud: number;
  /** Precipitation descriptor for the current type. */
  precipitation: 'none' | 'rain' | 'snow';
  /** The season governing the grammar at this instant. */
  season: Season;
}

/** One upcoming segment in a forecast (type only — free from determinism). */
export interface WeatherForecastEntry {
  segmentIndex: number;
  type: WeatherType;
  /** Game-time the segment begins. */
  startsAt: Quantity<'s'>;
}

/** Current sample + the next-N segment types. */
export interface WeatherForecast {
  current: WeatherSample;
  upcoming: WeatherForecastEntry[];
}
