/**
 * Light — immutable value object describing the ambient illuminance at
 * a location.
 *
 * Saxonberg's light model carries real units after Wave 2:
 *   - `intensity: Quantity<'lux'>` — illuminance at the receiving
 *     surface. The propagation walk's lumen contributions are
 *     divided by the receiving Container's `getSizeScale()` (m²)
 *     before being wrapped here.
 *   - `color: Quantity<'K'> | null` — color temperature, atmospheric
 *     only. Multi-source mixing uses the flux-weighted average.
 *   - `sources: readonly LightSourceRef[]` — capped contributing-
 *     source list for prose attribution; runtime-only.
 *
 * Construction goes through `Light.of` / `Light.from` so callers can't
 * accidentally pass an invalid shape; mutation is unsupported (`add`,
 * `attenuate`, `withColor` each return a new `Light`).
 *
 * Persistence: `Light` is a value object. `AmbientLitMixin` and
 * `LightSourceMixin` decompose into named scalar fields per the
 * scalar-default rule (`docs/subsystems/persistence.md`). The runtime
 * API stays strict on the value class.
 */

import { Quantity } from '../quantity';

/**
 * Atmospheric color tag — string alias retained for back-compat with
 * tagged-string call sites. `Quantity.parse('warm', 'K')` looks up the
 * registered Kelvin tag table and produces a `Quantity<'K'>` value;
 * callers that already typed `'warm'` continue to round-trip via the
 * setter coercion path.
 */
export type ColorTag = string;

/**
 * A single contributor to a `Light` total. Used by the renderer to
 * attribute prose to specific sources ("by the candlelight, the
 * fireplace…"). Carries the source's `stuffId` so the description
 * layer can resolve a display name on demand. `flux` is the source's
 * lumen contribution; `colorK` is its color temperature in Kelvin
 * (numeric, nullable).
 */
export interface LightSourceRef {
  readonly stuffId: string;
  readonly flux: number;
  readonly colorK: number | null;
}

/**
 * Plain-object data shape mirroring a Light's public-readonly fields.
 * Used by `Light.from` for coercing externally-sourced data shapes
 * (test fixtures, JSON over the wire) into a `Light` value object.
 *
 * NOT used as a persistence shape — the persistence subsystem
 * decomposes Light values into scalar fields instead.
 */
export interface LightDataShape {
  intensity: number | Quantity<'lux'>;
  color?: ColorTag | Quantity<'K'> | null;
  sources?: readonly LightSourceRef[];
}

/** Maximum number of contributing sources tracked on a single Light. */
export const LIGHT_SOURCE_CAP = 3;

/**
 * Bands for the `bandAt` lookup. Crossing-the-band boundaries is the
 * granularity controllers and prose check against — most code never
 * touches the raw illuminance number.
 */
export type LightBand =
  | 'pitch-black'
  | 'very-dim'
  | 'dim'
  | 'lit'
  | 'bright'
  | 'blinding';

/**
 * Lux thresholds for the band lookup. Each entry is the LOWER bound
 * of its band: a value `>= threshold` lands in that band; below the
 * lowest threshold reads `'pitch-black'`. Mirrors the LUX_TAGS table
 * registered in `api/light.ts` so `lightAt(loc).intensity.tag()` and
 * `bandAt(loc)` agree by construction.
 *
 * **Calibration — MUD-game scale, NOT photometric scale.** Real-world
 * lux runs from ~0.01 (moonlight) through ~500 (office lighting) to
 * ~120,000 (direct sunlight). Our bands ([1, 5, 20, 60, 200]) are
 * compressed for fantasy-game ambient where authored flux values are
 * smaller (a candle is ~12 lumens, a torch ~50, a magic lantern
 * ~200). Authors writing real photometric values (8000 lumens for
 * sunlight) in small rooms (1 m²) read 'blinding' — close enough.
 * Authors writing fantasy values (40 lumens of "warm ambient") in a
 * 5 m² alcove read 'lit' — also close.
 *
 * Tuning is content-driven; revisit when world content actually
 * stresses the table.
 */
const BAND_THRESHOLDS: ReadonlyArray<readonly [number, LightBand]> = [
  [0, 'pitch-black'],
  [1, 'very-dim'],
  [5, 'dim'],
  [20, 'lit'],
  [60, 'bright'],
  [200, 'blinding'],
] as const;

/**
 * Map a lux numeric value to a `LightBand`. Walks the table descending;
 * first threshold met-or-exceeded wins.
 */
export function bandFor(luxValue: number): LightBand {
  for (let i = BAND_THRESHOLDS.length - 1; i >= 0; i--) {
    const [threshold, band] = BAND_THRESHOLDS[i]!;
    if (luxValue >= threshold) return band;
  }
  return 'pitch-black';
}

/** Public threshold table for tag-table registration in api/light.ts. */
export const LUX_BAND_THRESHOLDS: ReadonlyArray<{
  tag: LightBand;
  threshold: number;
}> = BAND_THRESHOLDS.map(([threshold, tag]) => ({ tag, threshold }));

/**
 * Coerce a `ColorTag` string, a `Quantity<'K'>`, or null into a
 * `Quantity<'K'> | null`. Used by `Light.of` and the mixin setters.
 */
export function coerceColor(
  value: ColorTag | Quantity<'K'> | null | undefined
): Quantity<'K'> | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Quantity) {
    if (value.unit !== 'K') {
      throw new TypeError(
        `Light color must be Quantity<'K'>, got Quantity<'${value.unit}'>`
      );
    }
    return value;
  }
  if (typeof value === 'string') {
    return Quantity.parse(value, 'K');
  }
  throw new TypeError(
    `Light color must be a string ColorTag, Quantity<'K'>, or null; got ${typeof value}`
  );
}

/**
 * Coerce a `number` (lux) or `Quantity<'lux'>` into a
 * `Quantity<'lux'>`. Numeric inputs are interpreted as canonical lux.
 */
export function coerceLux(value: number | Quantity<'lux'>): Quantity<'lux'> {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        `Light intensity must be a non-negative finite number, got ${value}`
      );
    }
    return Quantity.of(value, 'lux');
  }
  if (!(value instanceof Quantity) || value.unit !== 'lux') {
    throw new TypeError(
      `Light intensity must be a number or Quantity<'lux'>`
    );
  }
  if (value.rawValue() < 0) {
    throw new Error(
      `Light intensity must be non-negative, got ${value.rawValue()}`
    );
  }
  return value;
}

export class Light {
  /** The zero-light singleton. */
  public static readonly ZERO: Light = new Light(
    Quantity.of(0, 'lux'),
    null,
    []
  );

  /**
   * Public construct-with-defaults helper. Accepts numeric lux or a
   * `Quantity<'lux'>` for intensity; string ColorTag, Quantity<'K'>,
   * or null for color.
   */
  public static of(
    intensity: number | Quantity<'lux'>,
    color: ColorTag | Quantity<'K'> | null = null,
    source?: LightSourceRef
  ): Light {
    const intensityQ = coerceLux(intensity);
    const colorQ = coerceColor(color);
    if (
      intensityQ.rawValue() === 0 &&
      colorQ === null &&
      !source
    ) {
      return Light.ZERO;
    }
    const sources: LightSourceRef[] = source ? [source] : [];
    return new Light(intensityQ, colorQ, sources);
  }

  /**
   * Coerce a `Light | LightDataShape` into a `Light`. Utility for
   * callers holding an externally-sourced plain-object shape and
   * needing a Light instance. NOT part of the persistence path.
   */
  public static from(value: Light | LightDataShape): Light {
    if (value instanceof Light) return value;
    if (
      !value ||
      typeof value !== 'object' ||
      (typeof (value as LightDataShape).intensity !== 'number' &&
        !((value as LightDataShape).intensity instanceof Quantity))
    ) {
      throw new TypeError(
        'Light.from: expected a Light or { intensity, color?, sources? } shape.'
      );
    }
    const data = value as LightDataShape;
    const intensityQ = coerceLux(data.intensity);
    const colorQ = coerceColor(data.color ?? null);
    const sources: LightSourceRef[] = data.sources
      ? Array.from(data.sources)
      : [];
    if (
      intensityQ.rawValue() === 0 &&
      colorQ === null &&
      sources.length === 0
    ) {
      return Light.ZERO;
    }
    return new Light(intensityQ, colorQ, sources);
  }

  public readonly intensity: Quantity<'lux'>;
  public readonly color: Quantity<'K'> | null;
  public readonly sources: readonly LightSourceRef[];

  protected constructor(
    intensity: Quantity<'lux'>,
    color: Quantity<'K'> | null,
    sources: readonly LightSourceRef[]
  ) {
    this.intensity = intensity;
    this.color = color;
    this.sources = sources;
  }

  /**
   * Sum two Lights. Lux intensities add. Color temperature blends as
   * the **flux-weighted average** across all contributing sources;
   * sources whose `colorK` is null are excluded from the weighting.
   */
  public add(other: Light): Light {
    if (other === Light.ZERO || other.intensity.rawValue() === 0) return this;
    if (this === Light.ZERO || this.intensity.rawValue() === 0) return other;

    const intensity = this.intensity.add(other.intensity);
    const merged = mergeSources(this.sources, other.sources);
    const color = mixColor(merged) ?? this.color ?? other.color;
    return new Light(intensity, color, merged);
  }

  /**
   * Multiply lux intensity by a 0..1 factor. Sources scale in lockstep
   * so the cap stays accurate.
   */
  public attenuate(factor: number): Light {
    if (!Number.isFinite(factor) || factor <= 0) return Light.ZERO;
    if (factor >= 1) return this;
    if (this === Light.ZERO || this.intensity.rawValue() === 0) return Light.ZERO;
    const intensity = this.intensity.scale(factor);
    const sources: LightSourceRef[] = this.sources.map((s) => ({
      stuffId: s.stuffId,
      colorK: s.colorK,
      flux: s.flux * factor,
    }));
    return new Light(intensity, this.color, sources);
  }

  /** Return a copy with the color tag overridden. */
  public withColor(color: ColorTag | Quantity<'K'> | null): Light {
    const c = coerceColor(color);
    if (c === null && this.color === null) return this;
    if (c !== null && this.color !== null && c.equals(this.color)) return this;
    return new Light(this.intensity, c, this.sources);
  }

  /** JSON serialization shape for tests / debugging. */
  public toJSON(): {
    intensity: { value: number; unit: 'lux' };
    color: { value: number; unit: 'K' } | null;
    sources: LightSourceRef[];
  } {
    return {
      intensity: this.intensity.toJSON(),
      color: this.color ? this.color.toJSON() : null,
      sources: this.sources.map((s) => ({ ...s })),
    };
  }
}

/**
 * Merge two source lists into a single descending-flux list of up to
 * `LIGHT_SOURCE_CAP` entries. Same `stuffId` from both inputs are
 * summed (rare, but possible if a source contributes via two paths).
 */
function mergeSources(
  a: readonly LightSourceRef[],
  b: readonly LightSourceRef[]
): LightSourceRef[] {
  if (a.length === 0 && b.length === 0) return [];
  const byId = new Map<string, LightSourceRef>();
  for (const s of [...a, ...b]) {
    const existing = byId.get(s.stuffId);
    if (!existing) {
      byId.set(s.stuffId, { ...s });
    } else {
      // Brighter contribution wins for the color tag too; flux sums.
      byId.set(s.stuffId, {
        stuffId: s.stuffId,
        colorK: s.flux > existing.flux ? s.colorK : existing.colorK,
        flux: s.flux + existing.flux,
      });
    }
  }
  return Array.from(byId.values())
    .sort((x, y) => y.flux - x.flux)
    .slice(0, LIGHT_SOURCE_CAP);
}

/**
 * Compute the flux-weighted average color temperature across the
 * source list. Sources with a null `colorK` are excluded from the
 * numerator AND denominator; if no source carries color, returns
 * null. Single-color rooms reproduce that color exactly.
 */
function mixColor(sources: readonly LightSourceRef[]): Quantity<'K'> | null {
  let weightedSum = 0;
  let weight = 0;
  for (const s of sources) {
    if (s.colorK === null) continue;
    weightedSum += s.colorK * s.flux;
    weight += s.flux;
  }
  if (weight === 0) return null;
  return Quantity.of(weightedSum / weight, 'K');
}
