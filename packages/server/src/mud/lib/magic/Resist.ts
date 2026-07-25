/**
 * Resist — the N-axis passive-gate vocabulary + fold arithmetic.
 *
 * The materials-response shape, generalized: **mitigators subtract**
 * (each removes a fraction of intensity, folded outside-in; a mitigator
 * returning `1` drives residual to 0 — immunity is the limit of graded
 * resist, not a special case), **the substrate gates** (it sets the
 * stage thresholds and picks the outcome type, scaled by a `factor()`
 * read from live target state).
 *
 * The axis catalogue (v1): **`channel`** is the shipped function — the
 * whole fold + gate lives behind `ConditionApi.inflict`, so magic
 * *delegates*, it re-implements nothing. **`toxin`** is likewise the
 * shipped metabolism banding, recognized-not-wired (no v1 toxin spell).
 * **`mental`** is the one genuinely new resolver (Composure as the
 * substrate, no mitigator layer in v1 — wards are later content), and
 * it lives on `MagicLogic`; this module carries only the pure shapes +
 * fold arithmetic it uses. **`none`** lands in full.
 *
 * Intensity units are **per-axis, deliberately not unified**: the
 * channel axis carries real energy (joules); the mental axis carries an
 * authored potency scalar — dimensionless and legitimate because magic
 * is authored-but-lawful (Principle 4). No fake unified unit.
 *
 * Pure value-object module (the `Channel`/`Grade` precedent) — all
 * magnitudes ride `magic.*` AppSettings read by the consumers.
 */

/** The resist axes. `none` = unresisted (self-buffs, utility). */
export const RESIST_AXES = ['channel', 'mental', 'toxin', 'none'] as const;

/** A resist axis — one of {@link RESIST_AXES}. */
export type ResistAxis = (typeof RESIST_AXES)[number];

/**
 * The one field where an effect meets the passive gate. Absent on an
 * effect = unresisted. `intensity` is in the axis's own unit (channel:
 * joules; mental: authored potency scalar).
 */
export interface ResistSpec {
  readonly axis: ResistAxis;
  readonly intensity: number;
}

/**
 * A mitigator — one subtracting layer in the fold. Returns the
 * *fraction removed* in `[0, 1]`; `1` = total (immunity). v1 registers
 * none for the mental axis (Composure-alone); the shape ships so wards
 * drop in later as pure content.
 */
export interface ResistMitigator {
  fraction(): number;
}

/**
 * One ascending stage cutoff — the authored-bands shape (the metabolism
 * `toxinBehavior.bands` precedent): the highest band whose `threshold`
 * the effective intensity clears is the onset stage.
 */
export interface ResistBand {
  readonly threshold: number;
  readonly stage: number;
}

/** Thin static holder — the pure fold + gate arithmetic. */
export class Resists {
  /** Is `a` a resist axis? */
  public static isAxis(a: unknown): a is ResistAxis {
    return (
      typeof a === 'string' && (RESIST_AXES as readonly string[]).includes(a)
    );
  }

  /**
   * Fold mitigators outside-in: each removes its fraction of what
   * remains. Any mitigator at `1` ⇒ residual 0 (deflected/immune).
   */
  public static fold(
    intensity: number,
    mitigators: readonly ResistMitigator[],
  ): number {
    let residual = Math.max(0, intensity);
    for (const m of mitigators) {
      const f = Math.min(1, Math.max(0, m.fraction()));
      residual *= 1 - f;
      if (residual <= 0) return 0;
    }
    return residual;
  }

  /**
   * The substrate gate: evaluate the post-fold residual against the
   * authored ascending bands, scaled by the substrate `factor` (> 1 =
   * resists better — the residual is divided by it, so a drained mage
   * with a low factor stages worse from the same insult). Returns the
   * onset stage, or `null` when even band 0's threshold isn't cleared
   * (shrugged off).
   */
  public static stageFor(
    residual: number,
    bands: readonly ResistBand[],
    factor: number,
  ): number | null {
    if (residual <= 0 || bands.length === 0) return null;
    const effective = residual / Math.max(factor, 1e-6);
    let stage: number | null = null;
    for (const band of [...bands].sort((a, b) => a.threshold - b.threshold)) {
      if (effective >= band.threshold) stage = band.stage;
    }
    return stage;
  }

  /** Parse an authored `resist` seed blob; throws on malformed data. */
  public static validate(raw: unknown): ResistSpec {
    const r = raw as { axis?: unknown; intensity?: unknown };
    if (!Resists.isAxis(r?.axis)) {
      throw new TypeError(`resist: unknown axis '${String(r?.axis)}'`);
    }
    const intensity = Number(r.intensity);
    if (!Number.isFinite(intensity) || intensity < 0) {
      throw new TypeError(`resist: bad intensity '${String(r.intensity)}'`);
    }
    return { axis: r.axis, intensity };
  }
}
