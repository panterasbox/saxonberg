/**
 * Light — immutable value object describing the ambient illuminance at
 * a location.
 *
 * Saxonberg's light model carries real units:
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
 * Abstract color tag — string alias for the stained-glass /
 * atmospheric-tint family of things that aren't color
 * temperatures. Concrete Kelvin values use `Quantity<'K'>`
 * exclusively; bare `ColorTag` is reserved for the abstraction
 * layer above color temperature (palette names, stylized tints).
 *
 * Today's only user is `Window.colorTint`. New abstract-color
 * concepts plug in here without colliding with the color-temperature
 * machinery on `Light` / `LightSource` / `AmbientLit`.
 */
export type ColorTag = string;

/**
 * A single contributor to a `Light` total. Used by the renderer to
 * attribute prose to specific sources ("by the candlelight, the
 * fireplace…"). Carries the source's `stuffId` so the description
 * layer can resolve a display name on demand. `flux` is the source's
 * lumen contribution; `colorTemperature` is its color temperature
 * in Kelvin (numeric, nullable). The naming reserves bare `color`
 * for a future abstraction layer above color temperature; concrete
 * Kelvin values always carry "temperature" in the name.
 */
export interface LightSourceRef {
  readonly stuffId: string;
  readonly flux: number;
  readonly colorTemperature: number | null;
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
  colorTemperature?: string | Quantity<'K'> | null;
  sources?: readonly LightSourceRef[];
}

/** Maximum number of contributing sources tracked on a single Light. */
export const LIGHT_SOURCE_CAP = 3;

/**
 * Bands for the `bandFor` lookup. Crossing-the-band boundaries is the
 * granularity controllers and prose check against — most code never
 * touches the raw illuminance number.
 *
 * Single source of truth for the lux band vocabulary in TypeScript:
 * the `as const` tuple drives the `LightBand` type union, the
 * runtime membership check in `bandFor` (below), and pairs with the
 * lux tag-table thresholds authored in `mud/config/quantity-tags.yaml`.
 * `bandFor` enforces drift between the YAML and this tuple at runtime.
 *
 * `bandFor`, `applyBandShift`, and `compareBand` live next to the
 * `LightBand` vocabulary — they're vision-modality domain. The
 * propagation walk that produces a Light value lives in
 * `lib/perception/modalities/VisionModality.ts` as the modality's
 * `signalAt`; outside consumers dispatch via
 * `PerceptionApi.signalAt(loc, VisionModality)`.
 */
export const LIGHT_BANDS = [
  'pitch-black',
  'very-dim',
  'dim',
  'lit',
  'bright',
  'blinding',
] as const;

export type LightBand = (typeof LIGHT_BANDS)[number];

/**
 * Visibility detail levels — the per-call resolution the perception
 * surface (`Perception.canSee`, `Light.canSee`) gates on. v1 uses a
 * flat four-level vocabulary; finer-grained values can layer in later
 * without changing call sites.
 */
export type VisibilityDetail = 'shape' | 'figure' | 'detail' | 'fine';

/**
 * Per-species vision profile. Stored on `Species` as authored data;
 * consumed by `VisionModality.perceiveFor` and
 * `VisionModality.viewerVisionProfile` to shift band thresholds at
 * perception time. v1 returns a single human-shaped default when no
 * profile is set.
 *
 * - `scotopicMin` / `photopicMax` — the visible-band window for the
 *   species. Anything dimmer than `scotopicMin` reads as
 *   `pitch-black`; anything brighter than `photopicMax` reads as
 *   `blinding`.
 * - `bandShift` — integer offset applied to the perceived band; +1
 *   makes everything read one band brighter (good night vision), -1
 *   one band dimmer.
 */
export interface VisionProfile {
  scotopicMin: LightBand;
  photopicMax: LightBand;
  bandShift: number;
}

/**
 * Concealment qualities exposed by `Light.shadowsAt`. Reserved
 * surface for Hidden / Stealthing.
 */
export type ShadowQuality =
  | 'none'
  | 'faint'
  | 'partial'
  | 'deep'
  | 'absolute';

/**
 * Lux unit + scale the lux tag-table is registered under. Encoded
 * once so all the `Quantity.*('lux', LUX_SCALE)` callers stay in
 * sync if the scale name ever changes.
 */
const LUX_SCALE = 'default';

/**
 * Membership set for runtime narrowing — derived from the
 * type-system source of truth (`LIGHT_BANDS`) so there's no second
 * copy to keep in sync.
 */
const LIGHT_BAND_SET: ReadonlySet<LightBand> = new Set<LightBand>(LIGHT_BANDS);

/**
 * Map a lux numeric value to a `LightBand`. Consults the live
 * `Quantity` tag-table registry — the lux thresholds live in
 * `mud/config/quantity-tags.yaml` and load at boot via
 * `QuantityApi.loadTagTables`. `bandFor` is a thin typed adapter
 * over `Quantity.tag()` for the lux unit; reload of the YAML
 * propagates here transparently.
 *
 * Throws if the lux table isn't registered (test setup gap) or if
 * the registered tags don't match `LightBand` (content-side bug —
 * the YAML tag list must equal the typed union by construction).
 */
export function bandFor(luxValue: number): LightBand {
  const tag = Quantity.of(luxValue, 'lux').tag();
  if (!LIGHT_BAND_SET.has(tag as LightBand)) {
    throw new Error(
      `bandFor: lux value ${luxValue} produced unexpected tag '${tag}'. ` +
        `Either the lux tag table is not registered (call ` +
        `QuantityApi.loadTagTables / installV1QuantityTagTables) ` +
        `or the registered entries don't match the LightBand union.`,
    );
  }
  return tag as LightBand;
}

/**
 * Band shift arithmetic delegates to the generic `Quantity.shiftTag`
 * machinery applied to the lux unit.
 */
export function applyBandShift(band: LightBand, shift: number): LightBand {
  return Quantity.shiftTag('lux', band, shift, LUX_SCALE) as LightBand;
}

/**
 * Band compare arithmetic delegates to the generic
 * `Quantity.compareTag` machinery applied to the lux unit.
 */
export function compareBand(a: LightBand, b: LightBand): number {
  return Quantity.compareTag('lux', a, b, LUX_SCALE);
}

/** Detail level → minimum band required to discern at that level. */
export const REQUIRED_BAND_FOR_DETAIL: Record<VisibilityDetail, LightBand> = {
  shape: 'very-dim',
  figure: 'dim',
  detail: 'lit',
  fine: 'bright',
};

/**
 * Coerce a tag string, a `Quantity<'K'>`, or null into a
 * `Quantity<'K'> | null`. Used by `Light.of` and the mixin setters.
 * String input resolves through the registered `KELVIN_TAGS` table
 * (in `api/light.ts`), so author-friendly tags like `'warm'` and
 * `'cool'` round-trip to their canonical Kelvin values.
 */
export function coerceColorTemperature(
  value: string | Quantity<'K'> | null | undefined
): Quantity<'K'> | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Quantity) {
    if (value.unit !== 'K') {
      throw new TypeError(
        `Light color temperature must be Quantity<'K'>, got Quantity<'${value.unit}'>`
      );
    }
    return value;
  }
  if (typeof value === 'string') {
    return Quantity.parse(value, 'K');
  }
  throw new TypeError(
    `Light color temperature must be a string tag, Quantity<'K'>, or null; got ${typeof value}`
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
   * `Quantity<'lux'>` for intensity; tag-string, Quantity<'K'>, or
   * null for color temperature.
   */
  public static of(
    intensity: number | Quantity<'lux'>,
    colorTemperature: string | Quantity<'K'> | null = null,
    source?: LightSourceRef
  ): Light {
    const intensityQ = coerceLux(intensity);
    const colorTempQ = coerceColorTemperature(colorTemperature);
    if (
      intensityQ.rawValue() === 0 &&
      colorTempQ === null &&
      !source
    ) {
      return Light.ZERO;
    }
    const sources: LightSourceRef[] = source ? [source] : [];
    return new Light(intensityQ, colorTempQ, sources);
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
        'Light.from: expected a Light or { intensity, colorTemperature?, sources? } shape.'
      );
    }
    const data = value as LightDataShape;
    const intensityQ = coerceLux(data.intensity);
    const colorTempQ = coerceColorTemperature(data.colorTemperature ?? null);
    const sources: LightSourceRef[] = data.sources
      ? Array.from(data.sources)
      : [];
    if (
      intensityQ.rawValue() === 0 &&
      colorTempQ === null &&
      sources.length === 0
    ) {
      return Light.ZERO;
    }
    return new Light(intensityQ, colorTempQ, sources);
  }

  public readonly intensity: Quantity<'lux'>;
  public readonly colorTemperature: Quantity<'K'> | null;
  public readonly sources: readonly LightSourceRef[];

  protected constructor(
    intensity: Quantity<'lux'>,
    colorTemperature: Quantity<'K'> | null,
    sources: readonly LightSourceRef[]
  ) {
    this.intensity = intensity;
    this.colorTemperature = colorTemperature;
    this.sources = sources;
  }

  /**
   * Sum two Lights. Lux intensities add. Color temperature blends as
   * the **flux-weighted average** across all contributing sources;
   * sources whose `colorTemperature` is null are excluded from the
   * weighting.
   */
  public add(other: Light): Light {
    if (other === Light.ZERO || other.intensity.rawValue() === 0) return this;
    if (this === Light.ZERO || this.intensity.rawValue() === 0) return other;

    const intensity = this.intensity.add(other.intensity);
    const merged = mergeSources(this.sources, other.sources);
    const colorTemp =
      mixColorTemperature(merged) ??
      this.colorTemperature ??
      other.colorTemperature;
    return new Light(intensity, colorTemp, merged);
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
      colorTemperature: s.colorTemperature,
      flux: s.flux * factor,
    }));
    return new Light(intensity, this.colorTemperature, sources);
  }

  /** Return a copy with the color temperature overridden. */
  public withColorTemperature(
    colorTemperature: string | Quantity<'K'> | null
  ): Light {
    const c = coerceColorTemperature(colorTemperature);
    if (c === null && this.colorTemperature === null) return this;
    if (
      c !== null &&
      this.colorTemperature !== null &&
      c.equals(this.colorTemperature)
    ) {
      return this;
    }
    return new Light(this.intensity, c, this.sources);
  }

  /** JSON serialization shape for tests / debugging. */
  public toJSON(): {
    intensity: { value: number; unit: 'lux' };
    colorTemperature: { value: number; unit: 'K' } | null;
    sources: LightSourceRef[];
  } {
    return {
      intensity: this.intensity.toJSON(),
      colorTemperature: this.colorTemperature
        ? this.colorTemperature.toJSON()
        : null,
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
      // Brighter contribution wins for the color temperature too;
      // flux sums.
      byId.set(s.stuffId, {
        stuffId: s.stuffId,
        colorTemperature:
          s.flux > existing.flux
            ? s.colorTemperature
            : existing.colorTemperature,
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
 * source list. Sources with a null `colorTemperature` are excluded
 * from the numerator AND denominator; if no source carries a
 * color temperature, returns null. Single-source-color rooms
 * reproduce that source's color exactly.
 */
function mixColorTemperature(
  sources: readonly LightSourceRef[]
): Quantity<'K'> | null {
  let weightedSum = 0;
  let weight = 0;
  for (const s of sources) {
    if (s.colorTemperature === null) continue;
    weightedSum += s.colorTemperature * s.flux;
    weight += s.flux;
  }
  if (weight === 0) return null;
  return Quantity.of(weightedSum / weight, 'K');
}
