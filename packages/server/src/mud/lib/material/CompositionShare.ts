/**
 * CompositionShare — a share of a bulk that DERIVES from its material's
 * composition (the dairy build, D3).
 *
 * ⭐ Why it exists: cream is the fat that rose, and curd is the fat and
 * the protein the rennet caught, so how much of a litre of milk ends up as
 * cream or curd is a fact about the MILK, not the process. A literal
 * `leesFraction` per profile would need one profile per species; a share
 * evaluated against the material's own `nutrientAmounts` gives ewe's milk
 * roughly twice the cow's curd with nothing authored per species.
 *
 *   `share = clamp(Σ nutrientAmounts[n] / 1e6 × k_n, floor, cap)`
 *
 * — `nutrientAmounts` is mg per kg (`milk.yaml`: fat 34000 = 3.4 %), so
 * `/ 1e6` is the mass fraction. The result is always in `(0, 0.9]`: a
 * share of nothing is meaningless and a share of everything leaves no
 * drawn fraction to separate.
 *
 * A value object — constructed from its authored spec, never a static
 * (`lint:lib-statics`). Read by `MaturationProfile.leesShare` and
 * `FractionSchedule.residueShare`.
 */
import type Material from './Material';

/** The authored shape — a row's `leesShare:` / `residueShare:` block. */
export interface CompositionShareSpec {
  /** Nutrient key → multiplier on its mass fraction. */
  nutrients: Record<string, number>;
  /** The least the share may be (default 0.01). */
  floor?: number;
  /** The most the share may be (default 0.9). */
  cap?: number;
}

const MIN_SHARE = 0.01;
const MAX_SHARE = 0.9;

export class CompositionShare {
  private readonly nutrients: Record<string, number>;
  private readonly floor: number;
  private readonly cap: number;

  constructor(spec: CompositionShareSpec) {
    if (spec === null || typeof spec !== 'object' || typeof spec.nutrients !== 'object' || spec.nutrients === null) {
      throw new Error('CompositionShare: expected { nutrients: Record<string, number> }');
    }
    for (const [k, v] of Object.entries(spec.nutrients)) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        throw new Error(`CompositionShare: nutrients['${k}'] must be a finite number >= 0`);
      }
    }
    this.nutrients = { ...spec.nutrients };
    const floor = spec.floor ?? MIN_SHARE;
    const cap = spec.cap ?? MAX_SHARE;
    if (!(floor > 0) || !(cap <= MAX_SHARE) || floor > cap) {
      throw new Error(`CompositionShare: need 0 < floor <= cap <= ${MAX_SHARE}`);
    }
    this.floor = floor;
    this.cap = cap;
  }

  /** True when the spec names no nutrient — evaluates to its floor. */
  isEmpty(): boolean {
    return Object.keys(this.nutrients).length === 0;
  }

  /** The share of a bulk of `material` this spec names. */
  evaluate(material: Material | null): number {
    const amounts = material?.getNutrientAmounts() ?? {};
    let sum = 0;
    for (const [n, k] of Object.entries(this.nutrients)) {
      sum += ((amounts[n] ?? 0) / 1e6) * k;
    }
    return Math.min(this.cap, Math.max(this.floor, sum));
  }

  /** The authored spec back — for a row's round-trip. */
  toSpec(): CompositionShareSpec {
    return { nutrients: { ...this.nutrients }, floor: this.floor, cap: this.cap };
  }
}
