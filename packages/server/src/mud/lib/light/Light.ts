/**
 * Light — immutable value object describing a quantity of light.
 *
 * Saxonberg's light model is abstract (a text MUD, not a renderer). A
 * `Light` carries:
 *   - `intensity` — abstract lumens, ≥ 0. The propagation walk sums
 *     these and the band derivation uses
 *     `intensity / loc.getSizeScale()` to map "total light" to
 *     "perceived light in this volume."
 *   - `color` — atmospheric only; nullable. Highest-intensity-source
 *     wins when two sources blend (the source list is sorted by
 *     intensity, so `sources[0]?.color ?? null` after a blend).
 *   - `sources` — capped list of contributing sources for prose
 *     ("by the lamp, the candle, and the moonlight"). Capped at 3 by
 *     intensity to keep the structure bounded.
 *
 * Construction goes through `Light.of` / `Light.from` rather than the
 * public constructor so callers can't accidentally pass an invalid
 * shape. Mutation is unsupported — `add`, `attenuate`, `withColor`
 * each return a new `Light`.
 *
 * Persistence: stored on hosts via `AmbientLitMixin` and (eventually)
 * `LightSourceMixin`. The setter on each accepts a `Light` directly
 * or the raw `LightDataShape` produced by `JSON.stringify(light)` so
 * the `PersistentHydrator`'s bracket-assign round-trips cleanly.
 */

/**
 * Atmospheric color tag. Opaque string today; a future palette
 * registry can constrain the values without changing the type at
 * call sites that already use string-literal tags.
 */
export type ColorTag = string;

/**
 * A single contributor to a `Light` total. Used by the renderer to
 * attribute prose to specific sources ("by the candlelight, the
 * fireplace…"). Carries the source's `stuffId` so the description
 * layer can resolve a display name on demand.
 */
export interface LightSourceRef {
  readonly stuffId: string;
  readonly intensity: number;
  readonly color: ColorTag | null;
}

/**
 * Raw data shape produced by `JSON.stringify(light)` and consumed by
 * `Light.from` / the AmbientLit setter. Lets the
 * `PersistentHydrator` round-trip via plain bracket-assign without a
 * custom `persistenceHandler`.
 */
export interface LightDataShape {
  intensity: number;
  color?: ColorTag | null;
  sources?: readonly LightSourceRef[];
}

/** Maximum number of contributing sources tracked on a single Light. */
export const LIGHT_SOURCE_CAP = 3;

/**
 * Bands for the `bandAt` lookup. Crossing-the-band boundaries is the
 * granularity controllers and prose check against — most code never
 * touches the raw intensity number.
 */
export type LightBand =
  | 'pitch-black'
  | 'very-dim'
  | 'dim'
  | 'lit'
  | 'bright'
  | 'blinding';

/**
 * Initial threshold table. `bandFor(intensity)` returns the first
 * band whose lower bound the intensity does not exceed.
 *
 * | effective | band         |
 * |-----------|--------------|
 * | < 1       | pitch-black  |
 * | < 5       | very-dim     |
 * | < 20      | dim          |
 * | < 60      | lit          |
 * | < 200     | bright       |
 * | ≥ 200     | blinding     |
 *
 * Tunable by adjusting this table; integration tests in Phase 4 are
 * the source of validation for the cutoffs.
 */
const BAND_THRESHOLDS: ReadonlyArray<readonly [number, LightBand]> = [
  [1, 'pitch-black'],
  [5, 'very-dim'],
  [20, 'dim'],
  [60, 'lit'],
  [200, 'bright'],
] as const;

/**
 * Map an effective intensity value to a `LightBand`. Effective means
 * "after applying the receiving location's `getSizeScale()`" — i.e.
 * `light.intensity / loc.getSizeScale()`.
 */
export function bandFor(effective: number): LightBand {
  for (const [threshold, band] of BAND_THRESHOLDS) {
    if (effective < threshold) return band;
  }
  return 'blinding';
}

export class Light {
  /** The zero-light singleton. Returned by `lightAt` for empty rooms. */
  public static readonly ZERO: Light = new Light(0, null, []);

  /** Public construct-with-defaults helper. */
  public static of(
    intensity: number,
    color: ColorTag | null = null,
    source?: LightSourceRef
  ): Light {
    if (!Number.isFinite(intensity) || intensity < 0) {
      throw new Error(
        `Light.of: intensity must be a non-negative finite number, got ${intensity}`
      );
    }
    if (intensity === 0 && color === null && !source) return Light.ZERO;
    const sources: LightSourceRef[] = source ? [source] : [];
    return new Light(intensity, color, sources);
  }

  /**
   * Coerce a `Light | LightDataShape` value into a `Light`. The setter
   * on `AmbientLitMixin` (and Phase 3's `LightSourceMixin`) routes
   * hydrated data through here so persistence round-trips look like
   * regular value objects to the rest of the code.
   */
  public static from(value: Light | LightDataShape): Light {
    if (value instanceof Light) return value;
    if (
      !value ||
      typeof value !== 'object' ||
      typeof (value as LightDataShape).intensity !== 'number'
    ) {
      throw new TypeError(
        'Light.from: expected a Light or { intensity, color?, sources? } shape.'
      );
    }
    const data = value as LightDataShape;
    if (!Number.isFinite(data.intensity) || data.intensity < 0) {
      throw new Error(
        `Light.from: intensity must be a non-negative finite number, got ${data.intensity}`
      );
    }
    const color: ColorTag | null = data.color ?? null;
    const sources: LightSourceRef[] = data.sources
      ? Array.from(data.sources)
      : [];
    if (data.intensity === 0 && color === null && sources.length === 0) {
      return Light.ZERO;
    }
    return new Light(data.intensity, color, sources);
  }

  /**
   * Public constructors above guarantee the invariants. The fields
   * are public-readonly so JSON serialization and bracket-read in
   * `Persistable.toDocument` produce the data shape directly — no
   * `toJSON` indirection needed.
   */
  public readonly intensity: number;
  public readonly color: ColorTag | null;
  public readonly sources: readonly LightSourceRef[];

  protected constructor(
    intensity: number,
    color: ColorTag | null,
    sources: readonly LightSourceRef[]
  ) {
    this.intensity = intensity;
    this.color = color;
    this.sources = sources;
  }

  /**
   * Sum two Lights. Intensity adds; color follows the
   * "highest-intensity contributor wins" rule (sources are kept
   * sorted descending by intensity, so the first source's color is
   * the dominant one); the source list merges and is capped at
   * `LIGHT_SOURCE_CAP`.
   */
  public add(other: Light): Light {
    if (other === Light.ZERO || other.intensity === 0) return this;
    if (this === Light.ZERO || this.intensity === 0) return other;

    const intensity = this.intensity + other.intensity;
    const merged = mergeSources(this.sources, other.sources);
    // Highest-intensity-wins for color. Prefer the merged top
    // source's color when present so the canonical winner is the
    // single brightest contributor across the whole list. If neither
    // input had any sources, keep whichever existing color was set
    // (favouring `this` for stability).
    let color: ColorTag | null;
    if (merged.length > 0) {
      color = merged[0]!.color;
    } else {
      color = this.color ?? other.color;
    }
    return new Light(intensity, color, merged);
  }

  /**
   * Multiply intensity by a 0..1 factor (e.g., a Boundary's
   * transmissivity, or `EXIT_TAU` for cross-exit propagation).
   * Factors ≤ 0 collapse to `Light.ZERO`; factor ≥ 1 returns `this`
   * unchanged. Sources are scaled in lockstep so the cap stays
   * accurate.
   */
  public attenuate(factor: number): Light {
    if (!Number.isFinite(factor) || factor <= 0) return Light.ZERO;
    if (factor >= 1) return this;
    if (this === Light.ZERO || this.intensity === 0) return Light.ZERO;
    const intensity = this.intensity * factor;
    const sources: LightSourceRef[] = this.sources.map((s) => ({
      stuffId: s.stuffId,
      color: s.color,
      intensity: s.intensity * factor,
    }));
    return new Light(intensity, this.color, sources);
  }

  /** Return a copy with the color tag overridden. */
  public withColor(color: ColorTag | null): Light {
    if (color === this.color) return this;
    return new Light(this.intensity, color, this.sources);
  }

  /** Convenience for tests / serialization debugging. */
  public toJSON(): LightDataShape {
    return {
      intensity: this.intensity,
      color: this.color,
      sources: this.sources.map((s) => ({ ...s })),
    };
  }
}

/**
 * Merge two source lists into a single descending-intensity list of
 * up to `LIGHT_SOURCE_CAP` entries. Same `stuffId` from both inputs
 * are summed (rare but possible if a source contributes via two
 * paths).
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
      byId.set(s.stuffId, {
        stuffId: s.stuffId,
        // Brighter contribution wins for the color tag too — mirrors
        // the rule documented above for cross-Light blending.
        color:
          s.intensity > existing.intensity ? s.color : existing.color,
        intensity: s.intensity + existing.intensity,
      });
    }
  }
  const merged = Array.from(byId.values()).sort(
    (x, y) => y.intensity - x.intensity
  );
  return merged.slice(0, LIGHT_SOURCE_CAP);
}
