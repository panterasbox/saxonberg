/**
 * HeatTransition — ⭐⭐ **what heat does to a material, as data on its row**
 * (ceramics build, M1; generalised from the rubber build's `Crosslinking`).
 *
 * Firing is ONE rule. A body that has been hot carries a HEAT HISTORY
 * (`ThermalMixin.heatWork`), and every material that heat changes says how
 * on its own row:
 *
 * ```yaml
 * # on /stuff/idea/material/rock/limestone
 * heatTransitions:
 *   - key: calcine
 *     referenceK: 1170       # the rate is 1 here
 *     zK: 60                 # a decade of rate per 60 K
 *     fullDoseS: 3600        # dose-seconds at reference for a full conversion
 *     massRetained: 0.56     # CO₂ leaves; the stone keeps 56 % of its mass
 *     ladder:
 *       - { atDegree: 1, becomes: /stuff/idea/material/caustic/quicklime }
 *     discipline: quarrying
 * ```
 *
 * `dose = ∫ 10^((T − referenceK)/zK) dt` over the body's OWN temperature
 * trajectory (the shipped thermal-dose shape); `degree = min(1,
 * dose/fullDoseS) · min(1, agent/optimum)`. The piece keeps its identity;
 * at each rung of the ladder its MATERIAL swaps and its mass falls toward
 * `massRetained`. Between rungs a piece is part-converted — *burnt to the
 * skin, raw at the heart* — and reads so.
 *
 * Lime, clay, gypsum, a glaze, the glass batch, wood in a starved chamber
 * and rubber compounded with sulfur all ride this one evaluator. ⭐ There
 * is no "if clay" anywhere: a material with no `heatTransitions` is inert,
 * and a second fired material is a row.
 *
 * ⚠ There is no knowledge gate anywhere near this: nothing reads who fired
 * the charge or what they know.
 */

import { Grade } from '../craft/Grade';

/** One step on a transition's ladder. */
export interface HeatTransitionRung {
  /** The degree at which the piece becomes this material, `0..1`. */
  atDegree: number;
  /** The material path the piece becomes. */
  becomes: string;
  /**
   * The material it becomes instead when the firing was REDUCING (the
   * chamber starved of air while it was hot) — the blue brick, celadon.
   */
  reducing?: string;
  /**
   * A word for the piece at this rung when its description does not name
   * its old material (a *length of cordwood* reads *charred* — its name
   * says nothing of hazel). Where the old material's name IS in the
   * description (*lump of limestone*), the name is swapped instead.
   */
  describes?: string;
}

/**
 * An agent the piece carries in its OWN composition (rubber compounded
 * with sulfur). Nothing sums sibling pieces: the fraction is
 * `fractionOf(material)` on the piece.
 */
export interface HeatTransitionAgent {
  material: string;
  /** The fraction that converts best. */
  optimum: number;
  /** At or above this fraction a converted piece is the `over` material. */
  over: number;
}

/** A third product: what leaves the piece as it converts (tar, gas). */
export interface HeatTransitionVolatile {
  material: string;
  litresPerKg: number;
}

/** The authored curve, on a material's row. */
export interface HeatTransitionSpec {
  /** Unique within the material — the key the heat-work record files under. */
  key: string;
  referenceK: number;
  zK: number;
  fullDoseS: number;
  /** The share of the piece's mass a FULL conversion keeps (default 1). */
  massRetained?: number;
  agent?: HeatTransitionAgent;
  /** Above this peak, a converting piece is the `scorched` material. */
  scorchAboveK?: number;
  /**
   * ⭐ Pyrolysis: the conversion accrues only where a flame CANNOT burn —
   * in a chamber whose air is below `fire.air.flamingCompleteness`, the
   * same dial `FireLogic.mediumBurns` reads. One dial, two readers.
   */
  requiresStarvedAir?: boolean;
  volatiles?: HeatTransitionVolatile[];
  ladder: HeatTransitionRung[];
  /** What the piece becomes at a rung when its agent is at or over `agent.over`. */
  over?: string;
  /** What the piece becomes at a rung when its peak exceeded `scorchAboveK`. */
  scorched?: string;
  /**
   * A vapor in the chamber's atmosphere at the rung lays a fused coat of
   * the named material on the piece's outside face (salt → salt glaze).
   */
  vapor?: Record<string, string>;
  /** The Discipline a completed rung credits. */
  discipline?: string;
}

/** One transition's progress on one body. */
export interface HeatWorkConversion {
  /** Dose-seconds banked at reference. */
  dose: number;
  /** `0..1` — how far the conversion has gone. */
  degree: number;
  /** The highest ladder index reached (`-1` = none). */
  rung: number;
  /**
   * The agent's share the piece carried when it last accrued — kept so a
   * cast poured from it (a boot from compounded stock) still knows how much
   * sulfur cured it, though the boot itself records no composition.
   */
  agentFraction?: number;
}

/**
 * ⭐ A body's heat history — persisted on `ThermalMixin`. Inert (`null`)
 * until the body's material declares a transition.
 */
export interface HeatWorkRecord {
  /** The hottest the body has been, K. */
  peakK: number;
  /** Seconds banked hot enough to accrue anything. */
  aboveS: number;
  /**
   * The firing's atmosphere, weighted by dose: the heat source's
   * completeness while the dose was accruing (`< reducingBelow` = a
   * reducing firing). `vapors` — what was in the chamber's air at the rung.
   */
  atmosphere: { completeness: number; weight: number; vapors: string[] };
  /** Game-second the record was last integrated to. */
  checkedS: number | null;
  conversions: Record<string, HeatWorkConversion>;
  /** Game-second the last rung was reached (the maker's mark's date). */
  lastTransitionAtS: number | null;
  /** The material the body WAS before its first rung — whose transitions keep running. */
  origin: string | null;
  /** Its mass before any conversion, kg. */
  originMassKg: number | null;
  /** What the last rung said of the piece — replaced, never stacked, at the next. */
  prose: { prefix: string; sentence: string };
  /** Who held the firing — `fire` stamps it; an unwatched rung credits them. */
  firedBy: string | null;
  /** The steepest temperature change seen, K/s (the thermal-shock read). */
  maxRateKPerS: number;
  /** Disciplines rungs reached that nobody has been credited for yet. */
  uncredited: string[];
  /**
   * The grade the piece had before an agent's cure graded it (a cured
   * piece's grade is the weaker of this and the cure's, re-read as the
   * degree rises — so looking at a firing never changes how it comes out).
   */
  gradeCap: string | null;
}

/** What a rung resolves to on a particular piece. */
export interface HeatTransitionOutcome {
  kind: 'rung' | 'over' | 'scorched';
  materialPath: string;
}

/**
 * The evaluator over one authored spec. `@internal` — read through
 * `Material.getHeatTransitions()` and the heat-work reconcile.
 *
 * @internal
 */
export class HeatTransition {
  private readonly spec: HeatTransitionSpec;

  /** Validates the authored spec; throws on a curve that cannot be evaluated. */
  constructor(spec: HeatTransitionSpec) {
    const num = (v: unknown, k: string): number => {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new RangeError(`HeatTransition: '${k}' must be a finite number`);
      }
      return v;
    };
    if (!spec || typeof spec.key !== 'string' || spec.key === '') {
      throw new RangeError("HeatTransition: 'key' must name the transition");
    }
    num(spec.referenceK, 'referenceK');
    if (!(num(spec.zK, 'zK') > 0)) throw new RangeError("HeatTransition: 'zK' must be > 0");
    if (!(num(spec.fullDoseS, 'fullDoseS') > 0)) {
      throw new RangeError("HeatTransition: 'fullDoseS' must be > 0");
    }
    if (spec.massRetained !== undefined) {
      const m = num(spec.massRetained, 'massRetained');
      if (!(m > 0 && m <= 1)) throw new RangeError("HeatTransition: 'massRetained' must be in (0, 1]");
    }
    if (spec.scorchAboveK !== undefined) num(spec.scorchAboveK, 'scorchAboveK');
    if (spec.agent !== undefined) {
      const a = spec.agent;
      if (typeof a.material !== 'string' || a.material === '') {
        throw new RangeError("HeatTransition: 'agent.material' must be a material path");
      }
      if (!(num(a.optimum, 'agent.optimum') > 0)) {
        throw new RangeError("HeatTransition: 'agent.optimum' must be > 0");
      }
      if (!(num(a.over, 'agent.over') > a.optimum)) {
        throw new RangeError("HeatTransition: 'agent.over' must exceed 'agent.optimum'");
      }
    }
    if (!Array.isArray(spec.ladder) || spec.ladder.length === 0) {
      throw new RangeError("HeatTransition: 'ladder' must list at least one rung");
    }
    let last = -1;
    for (const r of spec.ladder) {
      const d = num(r?.atDegree, 'ladder[].atDegree');
      if (d < 0 || d > 1 || d < last) {
        throw new RangeError('HeatTransition: ladder degrees must rise within [0, 1]');
      }
      last = d;
      if (typeof r.becomes !== 'string' || r.becomes === '') {
        throw new RangeError("HeatTransition: every rung must name what it 'becomes'");
      }
    }
    for (const v of spec.volatiles ?? []) {
      if (typeof v?.material !== 'string' || !(num(v.litresPerKg, 'volatiles[].litresPerKg') > 0)) {
        throw new RangeError('HeatTransition: a volatile names a material and positive litresPerKg');
      }
    }
    this.spec = { ...spec, ladder: [...spec.ladder] };
  }

  public getKey(): string {
    return this.spec.key;
  }

  /** The raw spec, for persistence and the row it came from. */
  public toSpec(): HeatTransitionSpec {
    return this.spec;
  }

  public getReferenceK(): number {
    return this.spec.referenceK;
  }

  public getMassRetained(): number {
    return this.spec.massRetained ?? 1;
  }

  public getAgent(): HeatTransitionAgent | null {
    return this.spec.agent ?? null;
  }

  public requiresStarvedAir(): boolean {
    return this.spec.requiresStarvedAir === true;
  }

  public getVolatiles(): readonly HeatTransitionVolatile[] {
    return this.spec.volatiles ?? [];
  }

  public getVapor(): Readonly<Record<string, string>> {
    return this.spec.vapor ?? {};
  }

  public getDiscipline(): string {
    return this.spec.discipline ?? '';
  }

  public getLadder(): readonly HeatTransitionRung[] {
    return this.spec.ladder;
  }

  /** The dose rate at `K` — `10^((K − ref)/z)`. */
  public rateAt(k: number): number {
    return Math.pow(10, (k - this.spec.referenceK) / this.spec.zK);
  }

  /**
   * The temperature below which the rate is too small to matter (a
   * thousandth of reference): the reconcile skips a window that never
   * reaches it, so a lump of limestone on a shelf costs one comparison.
   */
  public floorK(): number {
    return this.spec.referenceK - 3 * this.spec.zK;
  }

  /** ⭐ How far the conversion has gone, by its dose and its agent. */
  public degreeFor(dose: number, agentFraction: number): number {
    const byDose = Math.min(1, Math.max(0, dose) / this.spec.fullDoseS);
    const a = this.spec.agent;
    if (!a) return byDose;
    return byDose * Math.min(1, Math.max(0, agentFraction) / a.optimum);
  }

  /** The highest ladder index at or below `degree`, or `-1`. */
  public rungIndexFor(degree: number): number {
    let idx = -1;
    this.spec.ladder.forEach((r, i) => {
      if (degree + 1e-9 >= r.atDegree) idx = i;
    });
    return idx;
  }

  /**
   * ⭐ What a piece becomes at rung `index`, read off the piece: scorched
   * when its peak passed `scorchAboveK`, the over-range material when its
   * agent is at or over `agent.over`, the rung's reducing twin when the
   * firing was reducing, else the rung's own material.
   */
  public outcomeAt(
    index: number,
    piece: { peakK: number; agentFraction: number; reducing: boolean },
  ): HeatTransitionOutcome | null {
    const rung = this.spec.ladder[index];
    if (!rung) return null;
    const s = this.spec;
    if (s.scorched && s.scorchAboveK !== undefined && piece.peakK > s.scorchAboveK) {
      return { kind: 'scorched', materialPath: s.scorched };
    }
    if (s.over && s.agent && piece.agentFraction >= s.agent.over) {
      return { kind: 'over', materialPath: s.over };
    }
    if (piece.reducing && rung.reducing) {
      return { kind: 'rung', materialPath: rung.reducing };
    }
    return { kind: 'rung', materialPath: rung.becomes };
  }

  /**
   * ⭐ How good a conversion is, as a band: the shortfall in degree, or
   * half the agent's relative miss, whichever is worse. The transition alone
   * reaches `fine`; a better band is a hand's, not a kiln's.
   */
  public gradeOf(degree: number, agentFraction: number, kind: HeatTransitionOutcome['kind']): Grade {
    if (kind === 'scorched') return Grade.of('poor');
    const a = this.spec.agent;
    const missAgent =
      !a || kind === 'over'
        ? 0
        : 0.5 * Math.min(1, Math.abs(agentFraction - a.optimum) / a.optimum);
    const deviation = Math.max(1 - degree, missAgent);
    if (deviation <= 0.1) return Grade.of('fine');
    if (deviation <= 0.25) return Grade.of('fair');
    return Grade.of('poor');
  }
}
