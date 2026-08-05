/**
 * Dose — how much of a thing you took, and what that does to the effect.
 *
 * Potions ride `Bulkable` (requirements D4), which means the amount
 * consumed is a **real volume in litres** rather than a use-count. That
 * one decision makes dose-response, dilution, splitting a flask and
 * spilling fall out of shipped machinery instead of being invented — and
 * it means the effect has to know what a partial dose means.
 *
 * The answer is real pharmacology, and it is the same split the effect
 * union already has:
 *
 * | Response | Behaviour | Maps onto |
 * |---|---|---|
 * | **graded** | scales continuously with the dose | impulse magnitude, modifier duration |
 * | **threshold** | nothing at all below its minimum, then full | all-or-nothing effects |
 *
 * Half a healing draught heals half as much; half a dose of a
 * polymorph does nothing. Both are honest, and which one an effect is
 * is authored, not guessed.
 *
 * Pure value + a static holder — no Stuff, no I/O, no clock. That is
 * deliberate: this is one of the modules AC 4's test drives directly,
 * and a pure function is the only way to test a dose-response curve
 * exactly rather than approximately.
 */

/** How an effect answers a partial dose. */
export const DOSE_RESPONSES = ['graded', 'threshold'] as const;

/** A dose-response mode — one of {@link DOSE_RESPONSES}. */
export type DoseResponse = (typeof DOSE_RESPONSES)[number];

/** The authored dose curve for one potable substance. */
export interface DoseSpec {
  readonly response: DoseResponse;
  /**
   * The volume (litres) the effect's authored magnitudes are quoted at
   * — *"this is what a full dose does"*. A graded effect scales against
   * it linearly.
   */
  readonly referenceLitres: number;
  /**
   * **Threshold only.** The volume below which nothing happens at all.
   * Ignored for a graded response, where any amount does proportionally
   * something.
   */
  readonly minimumLitres: number;
}

export class Dose {
  /**
   * The neutral spec: a graded quarter-litre dose. A quarter litre is
   * a flask, which is the shape a potion is authored as.
   */
  public static readonly DEFAULT: DoseSpec = {
    response: 'graded',
    referenceLitres: 0.25,
    minimumLitres: 0,
  };

  /** Narrowing predicate for the response vocabulary. */
  public static isResponse(s: unknown): s is DoseResponse {
    return (
      typeof s === 'string' && (DOSE_RESPONSES as readonly string[]).includes(s)
    );
  }

  /** Parse an authored `dose` blob; a missing blob yields {@link DEFAULT}. */
  public static validate(raw: unknown): DoseSpec {
    if (raw == null) return Dose.DEFAULT;
    if (typeof raw !== 'object') {
      throw new TypeError('dose: expected an object');
    }
    const d = raw as Record<string, unknown>;
    const response = d.response ?? Dose.DEFAULT.response;
    if (!Dose.isResponse(response)) {
      throw new TypeError(`dose: unknown response '${String(response)}'`);
    }
    const reference =
      d.referenceLitres === undefined
        ? Dose.DEFAULT.referenceLitres
        : Number(d.referenceLitres);
    if (!Number.isFinite(reference) || reference <= 0) {
      throw new TypeError(
        `dose: referenceLitres must be positive, got '${String(d.referenceLitres)}'`,
      );
    }
    const minimum =
      d.minimumLitres === undefined ? 0 : Number(d.minimumLitres);
    if (!Number.isFinite(minimum) || minimum < 0) {
      throw new TypeError(
        `dose: minimumLitres must be non-negative, got '${String(d.minimumLitres)}'`,
      );
    }
    return { response, referenceLitres: reference, minimumLitres: minimum };
  }

  /**
   * **The multiplier a consumed volume applies to the authored
   * magnitudes.** `1` means *exactly the authored effect*; `0` means
   * *nothing happened*.
   *
   * - **graded** — `litres / referenceLitres`, unclamped above 1 on
   *   purpose: drinking two flasks really is twice the dose, and
   *   whether that is wise is the player's problem. Clamped at 0 below,
   *   because a negative volume is not a thing.
   * - **threshold** — 1 at or above the minimum, 0 below it. No
   *   partial credit; that is what "threshold" means.
   */
  public static scaleFor(spec: DoseSpec, litres: number): number {
    const taken = Number.isFinite(litres) ? Math.max(0, litres) : 0;
    if (spec.response === 'threshold') {
      return taken >= spec.minimumLitres && taken > 0 ? 1 : 0;
    }
    return taken / spec.referenceLitres;
  }

  /**
   * Did this volume do anything at all? The legible half of
   * {@link scaleFor} — a threshold effect that did nothing should say
   * so rather than reporting a silent success.
   */
  public static isEffective(spec: DoseSpec, litres: number): boolean {
    return Dose.scaleFor(spec, litres) > 0;
  }
}
