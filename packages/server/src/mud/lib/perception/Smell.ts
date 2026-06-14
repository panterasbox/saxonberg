/**
 * Smell — immutable value object describing the olfactory signal at
 * a location.
 *
 * Carries:
 *   - `concentration: Quantity<'ppm'>` — total odor concentration
 *     at the receiving scope, summed across contributing sources
 *     and identities.
 *   - `identity: string` — dominant odor identity (by total
 *     concentration). When multiple identities contribute, the
 *     source list still carries each one individually for prose.
 *   - `sources: readonly SmellSourceRef[]` — capped contributing-
 *     source list for prose attribution; runtime-only.
 *
 * Same shape as `Light`: factory-constructed (`Smell.of` /
 * `Smell.from`), immutable, capped source list. Persistence: the
 * value is runtime-only. `SmellSourceMixin` stores its scalar
 * fields per the scalar-default rule.
 */

import { Quantity } from '../quantity';

export interface SmellSourceRef {
  readonly stuffId: string;
  readonly concentration: number; // ppm
  readonly identity: string;
}

export interface SmellDataShape {
  concentration: number | Quantity<'ppm'>;
  identity: string;
  sources?: readonly SmellSourceRef[];
}

/** Maximum number of contributing sources tracked on a single Smell. */
export const SMELL_SOURCE_CAP = 3;

/**
 * Coerce a number (ppm) or `Quantity<'ppm'>` into `Quantity<'ppm'>`.
 * Numeric inputs are interpreted as canonical ppm. Negative or
 * non-finite values throw — same shape as `coerceLux` for light.
 */
function coercePpm(value: number | Quantity<'ppm'>): Quantity<'ppm'> {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        `Smell concentration must be a non-negative finite number, got ${value}`,
      );
    }
    return Quantity.of(value, 'ppm');
  }
  if (!(value instanceof Quantity) || value.unit !== 'ppm') {
    throw new TypeError(
      `Smell concentration must be a number or Quantity<'ppm'>`,
    );
  }
  if (value.rawValue() < 0) {
    throw new Error(
      `Smell concentration must be non-negative, got ${value.rawValue()}`,
    );
  }
  return value;
}

export class Smell {
  /** The zero-smell singleton. */
  public static readonly ZERO: Smell = new Smell(
    Quantity.of(0, 'ppm'),
    '',
    [],
  );

  /** Construct-with-defaults helper. */
  public static of(
    concentration: number | Quantity<'ppm'>,
    identity: string,
    source?: SmellSourceRef,
  ): Smell {
    const concentrationQ = coercePpm(concentration);
    if (concentrationQ.rawValue() === 0 && !source) return Smell.ZERO;
    const sources: SmellSourceRef[] = source ? [source] : [];
    return new Smell(concentrationQ, identity, sources);
  }

  /** Coerce a Smell-shaped plain-object into a Smell. */
  public static from(value: Smell | SmellDataShape): Smell {
    if (value instanceof Smell) return value;
    if (
      !value ||
      typeof value !== 'object' ||
      (typeof value.concentration !== 'number' &&
        !(value.concentration instanceof Quantity))
    ) {
      throw new TypeError(
        'Smell.from: expected a Smell or { concentration, identity, sources? } shape.',
      );
    }
    const concentrationQ = coercePpm(value.concentration);
    const sources: SmellSourceRef[] = value.sources
      ? Array.from(value.sources)
      : [];
    if (concentrationQ.rawValue() === 0 && sources.length === 0) {
      return Smell.ZERO;
    }
    return new Smell(concentrationQ, value.identity, sources);
  }

  public readonly concentration: Quantity<'ppm'>;
  public readonly identity: string;
  public readonly sources: readonly SmellSourceRef[];

  protected constructor(
    concentration: Quantity<'ppm'>,
    identity: string,
    sources: readonly SmellSourceRef[],
  ) {
    this.concentration = concentration;
    this.identity = identity;
    this.sources = sources;
  }

  /**
   * Sum two Smells. ppm concentrations add. Dominant `identity` is
   * the identity carrying the highest contribution across the
   * merged source list. Per-identity attribution stays on
   * `sources` for prose nuance.
   */
  public add(other: Smell): Smell {
    if (other.concentration.rawValue() === 0 && other.sources.length === 0) {
      return this;
    }
    if (this.concentration.rawValue() === 0 && this.sources.length === 0) {
      return other;
    }
    const concentration = this.concentration.add(other.concentration);
    const merged = mergeSources(this.sources, other.sources);
    const dominant = dominantIdentity(merged) || this.identity || other.identity;
    return new Smell(concentration, dominant, merged);
  }

  /**
   * Scale ppm concentration by a 0..1 factor. Sources scale in
   * lockstep so the cap stays accurate.
   */
  public attenuate(factor: number): Smell {
    if (!Number.isFinite(factor) || factor <= 0) return Smell.ZERO;
    if (factor >= 1) return this;
    if (this.concentration.rawValue() === 0 && this.sources.length === 0) {
      return Smell.ZERO;
    }
    const concentration = this.concentration.scale(factor);
    const sources: SmellSourceRef[] = this.sources.map((s) => ({
      stuffId: s.stuffId,
      identity: s.identity,
      concentration: s.concentration * factor,
    }));
    return new Smell(concentration, this.identity, sources);
  }

  public toJSON(): {
    concentration: { value: number; unit: 'ppm' };
    identity: string;
    sources: SmellSourceRef[];
  } {
    return {
      concentration: this.concentration.toJSON(),
      identity: this.identity,
      sources: this.sources.map((s) => ({ ...s })),
    };
  }
}

function mergeSources(
  a: readonly SmellSourceRef[],
  b: readonly SmellSourceRef[],
): SmellSourceRef[] {
  if (a.length === 0 && b.length === 0) return [];
  const byId = new Map<string, SmellSourceRef>();
  for (const s of [...a, ...b]) {
    const existing = byId.get(s.stuffId);
    if (!existing) {
      byId.set(s.stuffId, { ...s });
    } else {
      byId.set(s.stuffId, {
        stuffId: s.stuffId,
        identity:
          s.concentration > existing.concentration ? s.identity : existing.identity,
        concentration: s.concentration + existing.concentration,
      });
    }
  }
  return Array.from(byId.values())
    .sort((x, y) => y.concentration - x.concentration)
    .slice(0, SMELL_SOURCE_CAP);
}

function dominantIdentity(sources: readonly SmellSourceRef[]): string {
  if (sources.length === 0) return '';
  const totals = new Map<string, number>();
  for (const s of sources) {
    totals.set(s.identity, (totals.get(s.identity) ?? 0) + s.concentration);
  }
  let best = '';
  let bestC = 0;
  for (const [identity, conc] of totals.entries()) {
    if (conc > bestC) {
      best = identity;
      bestC = conc;
    }
  }
  return best;
}
