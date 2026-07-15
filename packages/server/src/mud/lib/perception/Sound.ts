/**
 * Sound — immutable value object describing the auditory signal at
 * a location.
 *
 * Carries:
 *   - `amplitude: Quantity<'dB'>` — total sound pressure level at
 *     the receiving scope (logarithmic, incoherent sum across sources).
 *   - `character: string` — dominant source character ("whistle",
 *     "hum", "voices") for prose.
 *   - `sources: readonly SoundSourceRef[]` — capped contributing-
 *     source list for prose attribution; runtime-only.
 *
 * Same factory + immutable + capped-list pattern as `Light` / `Smell`.
 *
 * dB arithmetic note: `amplitude.add(other)` does NOT simply add the
 * numeric dB values — `dB`'s registered UnitOps (in `quantity.ts`)
 * implement the logarithmic sum `10 * log10(10^(a/10) + 10^(b/10))`.
 * Two 60 dB sources sum to ~63 dB, not 120. The walk uses linear
 * accumulation internally (sum the 10^(dB/10) terms) and converts
 * back to dB at the wrap step.
 */

import { Quantity } from '../quantity';

export interface SoundSourceRef {
  readonly stuffId: string;
  readonly amplitude: number; // dB
  readonly character: string;
}

export interface SoundDataShape {
  amplitude: number | Quantity<'dB'>;
  character: string;
  sources?: readonly SoundSourceRef[];
}

/** Maximum number of contributing sources tracked on a single Sound. */
export const SOUND_SOURCE_CAP = 3;

/**
 * Coerce a number (dB) or `Quantity<'dB'>` into `Quantity<'dB'>`.
 * Negative or non-finite values throw — negative dB is technically
 * meaningful (-10 dB = 1/10 reference pressure) but the v1 value
 * object treats the floor as 0 dB. Adjust if a sub-silent signal
 * needs surfacing.
 */
function coerceDb(value: number | Quantity<'dB'>): Quantity<'dB'> {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(
        `Sound amplitude must be a finite number, got ${value}`,
      );
    }
    return Quantity.of(value, 'dB');
  }
  if (!(value instanceof Quantity) || value.unit !== 'dB') {
    throw new TypeError(
      `Sound amplitude must be a number or Quantity<'dB'>`,
    );
  }
  return value;
}

export class Sound {
  /** Silence — the canonical zero. */
  public static readonly SILENT: Sound = new Sound(
    Quantity.of(0, 'dB'),
    '',
    [],
  );

  /**
   * Default per-viewer hearing floor in dB — the level below which a
   * signal isn't perceived. Shared by the `listen` field read
   * (`ListenController`) and the discrete-event push
   * (`Scene.toAudible`) so both gate at the same threshold. v1 species
   * have no `hearingProfile`; a future profile field overrides this
   * per-viewer.
   */
  public static readonly DEFAULT_HEARING_THRESHOLD_DB = 10;

  public static of(
    amplitude: number | Quantity<'dB'>,
    character: string,
    source?: SoundSourceRef,
  ): Sound {
    const amplitudeQ = coerceDb(amplitude);
    if (amplitudeQ.rawValue() === 0 && !source) return Sound.SILENT;
    const sources: SoundSourceRef[] = source ? [source] : [];
    return new Sound(amplitudeQ, character, sources);
  }

  public static from(value: Sound | SoundDataShape): Sound {
    if (value instanceof Sound) return value;
    if (
      !value ||
      typeof value !== 'object' ||
      (typeof value.amplitude !== 'number' &&
        !(value.amplitude instanceof Quantity))
    ) {
      throw new TypeError(
        'Sound.from: expected a Sound or { amplitude, character, sources? } shape.',
      );
    }
    const amplitudeQ = coerceDb(value.amplitude);
    const sources: SoundSourceRef[] = value.sources
      ? Array.from(value.sources)
      : [];
    if (amplitudeQ.rawValue() === 0 && sources.length === 0) return Sound.SILENT;
    return new Sound(amplitudeQ, value.character, sources);
  }

  public readonly amplitude: Quantity<'dB'>;
  public readonly character: string;
  public readonly sources: readonly SoundSourceRef[];

  protected constructor(
    amplitude: Quantity<'dB'>,
    character: string,
    sources: readonly SoundSourceRef[],
  ) {
    this.amplitude = amplitude;
    this.character = character;
    this.sources = sources;
  }

  /**
   * Sum two Sounds. dB amplitudes combine logarithmically (via the
   * registered `dB` UnitOps). The merged source list is capped per
   * `SOUND_SOURCE_CAP`; the dominant character is the character
   * whose total contribution wins on linear amplitude.
   */
  public add(other: Sound): Sound {
    if (other === Sound.SILENT || other.amplitude.rawValue() === 0) return this;
    if (this === Sound.SILENT || this.amplitude.rawValue() === 0) return other;
    const amplitude = this.amplitude.add(other.amplitude);
    const merged = mergeSources(this.sources, other.sources);
    const character = dominantCharacter(merged) || this.character || other.character;
    return new Sound(amplitude, character, merged);
  }

  /**
   * Apply a linear-amplitude scale factor (multiplier on the 10^(dB/10)
   * term). `dB`'s registered UnitOps handle the dB-side arithmetic
   * (subtract 10 * log10(1/factor) from the value).
   */
  public attenuate(factor: number): Sound {
    if (!Number.isFinite(factor) || factor <= 0) return Sound.SILENT;
    if (factor >= 1) return this;
    if (this === Sound.SILENT || this.amplitude.rawValue() === 0) return Sound.SILENT;
    const amplitude = this.amplitude.scale(factor);
    const sources: SoundSourceRef[] = this.sources.map((s) => ({
      stuffId: s.stuffId,
      character: s.character,
      amplitude: s.amplitude + 10 * Math.log10(factor),
    }));
    return new Sound(amplitude, this.character, sources);
  }

  public toJSON(): {
    amplitude: { value: number; unit: 'dB' };
    character: string;
    sources: SoundSourceRef[];
  } {
    return {
      amplitude: this.amplitude.toJSON(),
      character: this.character,
      sources: this.sources.map((s) => ({ ...s })),
    };
  }
}

function mergeSources(
  a: readonly SoundSourceRef[],
  b: readonly SoundSourceRef[],
): SoundSourceRef[] {
  if (a.length === 0 && b.length === 0) return [];
  const byId = new Map<string, SoundSourceRef>();
  for (const s of [...a, ...b]) {
    const existing = byId.get(s.stuffId);
    if (!existing) {
      byId.set(s.stuffId, { ...s });
    } else {
      // Take the louder contribution's character; sum amplitudes
      // logarithmically.
      const summed =
        10 *
        Math.log10(
          Math.pow(10, s.amplitude / 10) + Math.pow(10, existing.amplitude / 10),
        );
      byId.set(s.stuffId, {
        stuffId: s.stuffId,
        character:
          s.amplitude > existing.amplitude ? s.character : existing.character,
        amplitude: summed,
      });
    }
  }
  return Array.from(byId.values())
    .sort((x, y) => y.amplitude - x.amplitude)
    .slice(0, SOUND_SOURCE_CAP);
}

function dominantCharacter(sources: readonly SoundSourceRef[]): string {
  if (sources.length === 0) return '';
  // Pick the character whose summed linear amplitude is highest.
  const totals = new Map<string, number>();
  for (const s of sources) {
    totals.set(
      s.character,
      (totals.get(s.character) ?? 0) + Math.pow(10, s.amplitude / 10),
    );
  }
  let best = '';
  let bestLin = 0;
  for (const [character, lin] of totals.entries()) {
    if (lin > bestLin) {
      best = character;
      bestLin = lin;
    }
  }
  return best;
}
