/**
 * Crosslinking — ⭐⭐ **the cure as data on the feedstock** (rubber build,
 * D9).
 *
 * Vulcanization is sulfur bridging the long chains of raw rubber. How far
 * it goes is set by three things a player controls — how much sulfur is in
 * the charge, how hot it is held, and for how long — and nothing else. So
 * the curve is a fact about the FEEDSTOCK MATERIAL, authored on its row,
 * and evaluated here; no controller holds a table of outcomes.
 *
 * ```yaml
 * # on /stuff/idea/material/organic/raw-rubber
 * crosslinking:
 *   agent: sulfur            # a material TAG the charge's other inputs carry
 *   referenceK: 418          # 145 °C — the rate is 1 here
 *   zK: 12                   # a decade of rate per 12 K
 *   fullDoseS: 1800          # dose-seconds at reference for a full cure
 *   agentOptimum: 0.03       # the agent's mass fraction that cures best
 *   agentOver: 0.20          # at or above, a full cure is the over-range material
 *   scorchAboveK: 455
 *   products: { under: …, cured: …, over: …, scorched: … }
 * ```
 *
 * `dose = holdS · 10^((heldK − referenceK)/zK)` (the shipped thermal-dose
 * shape); `degree = min(1, dose/fullDoseS) · min(1, agent/agentOptimum)`.
 * Under 0.6 the charge is under-cured — it stays what it was, now
 * weeping. Otherwise a charge at or past `agentOver` is the over-range
 * material (ebonite); one held above `scorchAboveK` is scorched; anything
 * else is cured, graded by how far it sat from the optimum.
 *
 * ⭐ Each outcome is a different material ROW, so an author names, prices
 * and describes each — and the product says what it is through its own
 * material. A second polymer is a spec on a second feedstock.
 *
 * ⚠ There is no knowledge gate anywhere near this: nothing reads who
 * fired the charge or what they know.
 */

import { Grade } from '../craft/Grade';

/** The four material rows a cure can end in. */
export interface CrosslinkProducts {
  under: string;
  cured: string;
  over: string;
  scorched: string;
}

/** The authored curve, on a feedstock material's row. */
export interface CrosslinkSpec {
  agent: string;
  referenceK: number;
  zK: number;
  fullDoseS: number;
  agentOptimum: number;
  agentOver: number;
  scorchAboveK: number;
  products: CrosslinkProducts;
}

/** Which of the four a charge came out as. */
export type CrosslinkKind = 'under' | 'cured' | 'over' | 'scorched';

/** What a charge became. */
export interface CrosslinkOutcome {
  kind: CrosslinkKind;
  /** The product material's template path. */
  materialPath: string;
  /** How cured, `0..1`. */
  degree: number;
  /** The cure's own grade — a cast takes the weaker of this and its mould's. */
  grade: Grade;
}

/** The inputs a firing knows. */
export interface CrosslinkCharge {
  /** The agent's mass over the consumed charge's mass, `0..1`. */
  agentFraction: number;
  /** The temperature the chamber held, K. */
  heldK: number;
  /** How long it was held, game-seconds. */
  holdS: number;
}

/** Below this degree the charge has not cured at all. */
const UNDER_CURED_BELOW = 0.6;

export class Crosslinking {
  private readonly spec: CrosslinkSpec;

  /** Validates the authored spec; throws on a curve that cannot be evaluated. */
  constructor(spec: CrosslinkSpec) {
    const num = (k: keyof CrosslinkSpec): number => {
      const v = spec[k];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new RangeError(`Crosslinking: '${String(k)}' must be a finite number`);
      }
      return v;
    };
    if (typeof spec.agent !== 'string' || spec.agent === '') {
      throw new RangeError("Crosslinking: 'agent' must name a material tag");
    }
    if (!(num('zK') > 0)) throw new RangeError("Crosslinking: 'zK' must be > 0");
    if (!(num('fullDoseS') > 0)) throw new RangeError("Crosslinking: 'fullDoseS' must be > 0");
    if (!(num('agentOptimum') > 0)) throw new RangeError("Crosslinking: 'agentOptimum' must be > 0");
    if (!(num('agentOver') > spec.agentOptimum)) {
      throw new RangeError("Crosslinking: 'agentOver' must exceed 'agentOptimum'");
    }
    num('referenceK');
    num('scorchAboveK');
    const p = spec.products;
    for (const k of ['under', 'cured', 'over', 'scorched'] as const) {
      if (!p || typeof p[k] !== 'string' || p[k] === '') {
        throw new RangeError(`Crosslinking: 'products.${k}' must be a material path`);
      }
    }
    this.spec = spec;
  }

  /** The material TAG an input must carry to count as the agent. */
  public getAgent(): string {
    return this.spec.agent;
  }

  /** The raw spec, for persistence and the row it came from. */
  public toSpec(): CrosslinkSpec {
    return this.spec;
  }

  /** ⭐ What a charge becomes, by its agent, its heat and its time. */
  public outcome(charge: CrosslinkCharge): CrosslinkOutcome {
    const s = this.spec;
    const holdS = Math.max(0, charge.holdS);
    const agent = Math.max(0, charge.agentFraction);
    const dose = holdS * Math.pow(10, (charge.heldK - s.referenceK) / s.zK);
    const degree =
      Math.min(1, dose / s.fullDoseS) * Math.min(1, agent / s.agentOptimum);
    if (degree < UNDER_CURED_BELOW) {
      return { kind: 'under', materialPath: s.products.under, degree, grade: Grade.of('poor') };
    }
    if (agent >= s.agentOver) {
      return { kind: 'over', materialPath: s.products.over, degree, grade: this.gradeOf(degree, agent, true) };
    }
    if (charge.heldK > s.scorchAboveK) {
      return { kind: 'scorched', materialPath: s.products.scorched, degree, grade: Grade.of('poor') };
    }
    return { kind: 'cured', materialPath: s.products.cured, degree, grade: this.gradeOf(degree, agent, false) };
  }

  /**
   * How far a cure sat from the optimum, as a band: the shortfall in
   * degree, or half the agent's relative miss, whichever is worse. The
   * cure alone reaches `fine`; a better band is a hand's, not a recipe's.
   */
  private gradeOf(degree: number, agent: number, over: boolean): Grade {
    const missAgent = over
      ? 0
      : 0.5 * Math.min(1, Math.abs(agent - this.spec.agentOptimum) / this.spec.agentOptimum);
    const deviation = Math.max(1 - degree, missAgent);
    if (deviation <= 0.1) return Grade.of('fine');
    if (deviation <= 0.25) return Grade.of('fair');
    return Grade.of('poor');
  }
}
