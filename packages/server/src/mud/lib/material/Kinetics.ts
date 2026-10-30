/**
 * Kinetics — ⭐⭐ **how a substance changes over time at a rate set by
 * temperature**, as data on its material row. Firing is high-temperature
 * kinetics; staling is low-temperature kinetics; they are one evaluator
 * (the ceramics build's `HeatTransition` folded into the sugar build's
 * `Kinetics`, 2026-10-28; both generalised the rubber build's
 * `Crosslinking`).
 *
 * Every material a change runs in says how on its own row, and
 * `ThermalMixin` holds how far each change has gone on a good (its
 * kinetic record), integrated over the good's OWN temperature trajectory:
 *
 * ```yaml
 * # on /stuff/idea/material/rock/limestone — a dose to completion
 * kinetics:
 *   - key: calcine
 *     rate: { referenceK: 1170, zK: 60, fullDoseS: 3600 }
 *     massRetained: 0.56     # CO₂ leaves; the stone keeps 56 % of its mass
 *     ladder:
 *       - { atDegree: 1, becomes: /stuff/idea/material/caustic/quicklime }
 *     discipline: quarrying
 *
 * # on a cane stalk — a point curve
 * kinetics:
 *   - key: inversion          # names the change on the good
 *     order: 1                # 0: accumulates (staling) · 1: what is left turns
 *     rate:                   # per hour, by kelvin — points, interpolated,
 *       - [283, 0.005]        #   flat past the ends; NEGATIVE is a reversal
 *       - [300, 0.02]
 *     grade: [[0.25, 1], [0.5, 2]]   # extent → grade bands lost from the start
 *     floor: 0.2              # how far a reversal brings it back
 *     words:                  # extent → what `look` says ('' says nothing)
 *       - [0, 'fresh-cut and running with juice']
 *       - [0.1, 'turning — a day off the stalk']
 *     senses: [vision]        # the channels the words are read through
 * ```
 *
 * ⭐ **Two rate laws, one extent.** The exponential law (`rate: {
 * referenceK, zK, fullDoseS }`) banks a dose `∫10^((T − ref)/z) dt` and its
 * extent is `min(1, dose/fullDoseS) · min(1, agent/optimum)` — the shipped
 * thermal-dose shape, right for a firing that runs only when hot. The point
 * curve (`rate: [[K, perHour]…]` with an `order`) covers what one exponential
 * cannot: a peak just above freezing that stops at ice (staling — why the
 * icebox is the worst place for bread) and a reversal (a negative rate: an
 * oven un-crystallises the starch, but only to `floor`).
 *
 * Everything else is the same for both laws, and any change may use it:
 * a `ladder` of rungs at which the good BECOMES another material (its mass
 * falling toward `massRetained`; between rungs it is part-converted —
 * *burnt to the skin, raw at the heart* — and reads so), grade bands lost
 * by extent, words by extent, the scorch, the over-range agent, the
 * volatiles, the vapor coat, the Discipline a rung credits.
 *
 * Lime, clay, gypsum, a glaze, the glass batch, wood in a starved chamber,
 * rubber compounded with sulfur, a loaf and a cut cane all ride this one
 * evaluator. ⭐ There is no "if clay" anywhere: a material with no
 * `kinetics` is inert, and a second fired material is a row.
 *
 * ⚠ **Not spoilage.** `Freshness` is a POPULATION growing (multiplicative,
 * set by water activity, killed by a heat hold, seeded by contamination)
 * and it decides SAFETY. Kinetics is a reaction running toward completion
 * and decides QUALITY. They point opposite ways in the cold, which is the
 * lesson, so they are never one model. And not maturation: there the
 * VESSEL runs a profile on its contents on purpose; here the substance
 * changes on its own.
 *
 * ⚠ There is no knowledge gate anywhere near this: nothing reads who fired
 * the charge or what they know.
 */

import { Grade } from '../craft/Grade';

/** The exponential rate law — a dose to completion. */
export interface KineticDoseLaw {
  /** The rate is 1 here, K. */
  referenceK: number;
  /** A decade of rate per this many kelvin. */
  zK: number;
  /** Dose-seconds at reference for a full conversion. */
  fullDoseS: number;
}

/** The point-curve rate law: `[kelvin, per hour]`, ascending in kelvin. */
export type KineticCurve = [number, number][];

/** One step on a change's ladder. */
export interface KineticRung {
  /** The degree (the change's extent, `0..1`) at which the piece becomes this material. */
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
export interface KineticAgent {
  material: string;
  /** The fraction that converts best. */
  optimum: number;
  /** At or above this fraction a converted piece is the `over` material. */
  over: number;
}

/** A third product: what leaves the piece as it converts (tar, gas). */
export interface KineticVolatile {
  material: string;
  litresPerKg: number;
}

/** One authored change, on a material's row. */
export interface KineticSpec {
  /** Unique within the material — the key the good's record files under. */
  key: string;
  /** The rate law: a dose to completion, or a point curve. */
  rate: KineticDoseLaw | KineticCurve;
  /** A curve's: 0 — the extent accumulates at the rate; 1 — what is left turns at the rate. */
  order?: 0 | 1;
  /** The share of the piece's mass a FULL conversion keeps (default 1). */
  massRetained?: number;
  /** A dose law's agent — its share caps the degree. */
  agent?: KineticAgent;
  /** Above this peak, a converting piece is the `scorched` material. */
  scorchAboveK?: number;
  /**
   * ⭐ Pyrolysis: the change accrues only where a flame CANNOT burn —
   * in a chamber whose air is below `fire.air.flamingCompleteness`, the
   * same dial `FireLogic.mediumBurns` reads. One dial, two readers.
   */
  requiresStarvedAir?: boolean;
  volatiles?: KineticVolatile[];
  /** The rungs at which the piece becomes another material. */
  ladder?: KineticRung[];
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
  /** `[extent, bands lost]`, ascending in extent. */
  grade?: [number, number][];
  /** A curve's: the lowest a reversal (a negative rate) brings the extent back to. */
  floor?: number;
  /** `[extent, phrase]`, ascending in extent; `''` says nothing. */
  words?: [number, string][];
  /** The sense channels the words are read through (absent: every channel). */
  senses?: string[];
}

/** One change's progress on one good. */
export interface KineticProgress {
  /** `0..1` — how far the change has gone (a ladder's degree). */
  extent: number;
  /** A dose law's dose-seconds banked at reference. */
  dose?: number;
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
 * ⭐ A good's kinetic record AS PERSISTED on `ThermalMixin` — plain data.
 * Inert (`null`) until the good's material declares a change. The
 * arithmetic over it is `KineticRecord`'s (B105).
 */
export interface KineticRecordData {
  /** Game-second the record was last integrated to (`null`: never). */
  checkedS: number | null;
  /** Each change's progress, by key. */
  changes: Record<string, KineticProgress>;
  /** The material the good WAS when its record began — whose changes keep running. */
  origin: string | null;
  /** Its mass before any conversion, kg (`null` until a change converts mass). */
  originMassKg: number | null;
  /** The grade the good had when its clock started — `grade` tables lower it from here. */
  startBand: string | null;
  /**
   * The grade the piece had before an agent's cure graded it (a cured
   * piece's grade is the weaker of this and the cure's, re-read as the
   * degree rises — so looking at a firing never changes how it comes out).
   */
  gradeCap: string | null;
  /** The hottest the good has been, K. */
  peakK: number;
  /** Seconds banked hot enough for a dose law to accrue anything. */
  aboveS: number;
  /** The steepest temperature change seen, K/s (the thermal-shock read). */
  maxRateKPerS: number;
  /**
   * The firing's atmosphere, weighted by dose: the heat source's
   * completeness while the dose was accruing (`< reducingBelow` = a
   * reducing firing). `vapors` — what was in the chamber's air at the rung.
   */
  atmosphere: { completeness: number; weight: number; vapors: string[] };
  /** Game-second the last rung was reached (the maker's mark's date). */
  lastTransitionAtS: number | null;
  /** What the last rung said of the piece — replaced, never stacked, at the next. */
  prose: { prefix: string; sentence: string };
  /** Who held the firing — `fire` stamps it; an unwatched rung credits them. */
  firedBy: string | null;
  /** Disciplines rungs reached that nobody has been credited for yet. */
  uncredited: string[];
}

/** What a rung resolves to on a particular piece. */
export interface KineticOutcome {
  kind: 'rung' | 'over' | 'scorched';
  materialPath: string;
}

/**
 * One change, validated — the evaluator over one authored spec. Read
 * through `Material.getKinetics()` and the good's kinetic reconcile.
 */
export class KineticChange {
  private readonly spec: KineticSpec;

  /** Validates the authored spec; throws on a curve that cannot be evaluated. */
  constructor(raw: KineticSpec) {
    this.spec = validated(raw);
  }

  public getKey(): string {
    return this.spec.key;
  }

  /** The authored form, for the row's round trip. */
  public toSpec(): KineticSpec {
    return { ...this.spec };
  }

  /** ⭐ Is the rate a dose to completion (the exponential law), not a point curve? */
  public isDoseLaw(): boolean {
    return !Array.isArray(this.spec.rate);
  }

  /** A dose law's reference temperature, K — or `null` for a point curve. */
  public getReferenceK(): number | null {
    return isDoseLaw(this.spec.rate) ? this.spec.rate.referenceK : null;
  }

  public getMassRetained(): number {
    return this.spec.massRetained ?? 1;
  }

  public getAgent(): KineticAgent | null {
    return this.spec.agent ?? null;
  }

  public requiresStarvedAir(): boolean {
    return this.spec.requiresStarvedAir === true;
  }

  public getVolatiles(): readonly KineticVolatile[] {
    return this.spec.volatiles ?? [];
  }

  public getVapor(): Readonly<Record<string, string>> {
    return this.spec.vapor ?? {};
  }

  public getDiscipline(): string {
    return this.spec.discipline ?? '';
  }

  public getLadder(): readonly KineticRung[] {
    return this.spec.ladder ?? [];
  }

  public getScorchAboveK(): number | null {
    return this.spec.scorchAboveK ?? null;
  }

  /** The sense channels its words are read through (`undefined`: every channel). */
  public getSenses(): readonly string[] | undefined {
    return this.spec.senses;
  }

  /** The reversal floor (`0` when none). */
  public getFloor(): number {
    return this.spec.floor ?? 0;
  }

  /**
   * The rate at `kelvin`, in the law's own unit: a dose law's dose rate
   * `10^((K − ref)/z)` (dose-seconds per second), or a curve's extent per
   * hour — the points interpolated, flat past the ends.
   */
  public rateAt(kelvin: number): number {
    const rate = this.spec.rate;
    if (isDoseLaw(rate)) return Math.pow(10, (kelvin - rate.referenceK) / rate.zK);
    if (kelvin <= rate[0]![0]) return rate[0]![1];
    const last = rate[rate.length - 1]!;
    if (kelvin >= last[0]) return last[1];
    for (let i = 1; i < rate.length; i++) {
      const [k1, r1] = rate[i]!;
      if (kelvin <= k1) {
        const [k0, r0] = rate[i - 1]!;
        return k1 === k0 ? r1 : r0 + ((r1 - r0) * (kelvin - k0)) / (k1 - k0);
      }
    }
    return last[1];
  }

  /**
   * The temperature below which a dose law's rate is too small to matter
   * (a thousandth of reference): the reconcile skips a window that never
   * reaches it, so a lump of limestone on a shelf costs one comparison. A
   * point curve has no floor — it runs at every temperature.
   */
  public floorK(): number {
    const rate = this.spec.rate;
    return isDoseLaw(rate) ? rate.referenceK - 3 * rate.zK : Number.NEGATIVE_INFINITY;
  }

  /** ⭐ A dose law's degree, by its dose and its agent. */
  public degreeFor(dose: number, agentFraction: number): number {
    const rate = this.spec.rate;
    if (!isDoseLaw(rate)) return 0;
    const byDose = Math.min(1, Math.max(0, dose) / rate.fullDoseS);
    const a = this.spec.agent;
    if (!a) return byDose;
    return byDose * Math.min(1, Math.max(0, agentFraction) / a.optimum);
  }

  /**
   * The extent after a window whose rate integrated to `hours` (signed:
   * ∫ rate dt). A reversal never brings it below `floor`, and never raises
   * an extent that was already under it. A dose law accumulates
   * (`hours × 3600 / fullDoseS`).
   */
  public advance(extent: number, hours: number): number {
    if (!Number.isFinite(hours) || hours === 0) return extent;
    const rate = this.spec.rate;
    if (isDoseLaw(rate)) return clamp01(extent + (hours * 3_600) / rate.fullDoseS);
    if (hours < 0) {
      const back = this.spec.order === 1 ? extent * Math.exp(hours) : extent + hours;
      const floor = Math.min(extent, this.spec.floor ?? 0);
      return clamp01(Math.max(floor, back));
    }
    const next = this.spec.order === 1 ? 1 - (1 - extent) * Math.exp(-hours) : extent + hours;
    return clamp01(next);
  }

  /**
   * ⭐ One window's accrual: `integral` is `∫ rateAt(T) dt` over the window
   * in seconds. A dose law banks the dose and its degree never falls; a
   * curve advances its extent by the integral in hours.
   */
  public accrue(progress: KineticProgress, integral: number, agentFraction: number): KineticProgress {
    if (this.isDoseLaw()) {
      const dose = (progress.dose ?? 0) + integral;
      return {
        ...progress,
        dose,
        extent: Math.max(progress.extent, this.degreeFor(dose, agentFraction)),
      };
    }
    return { ...progress, extent: this.advance(progress.extent, integral / 3_600) };
  }

  /** The highest ladder index at or below `extent`, or `-1`. */
  public rungIndexFor(extent: number): number {
    let idx = -1;
    this.getLadder().forEach((r, i) => {
      if (extent + 1e-9 >= r.atDegree) idx = i;
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
  ): KineticOutcome | null {
    const rung = this.getLadder()[index];
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
   * ⭐ How good a cure is, as a band: the shortfall in degree, or half the
   * agent's relative miss, whichever is worse. The change alone reaches
   * `fine`; a better band is a hand's, not a kiln's.
   */
  public gradeOf(degree: number, agentFraction: number, kind: KineticOutcome['kind']): Grade {
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

  /** Does the change lower the grade by extent (a `grade` table)? */
  public hasGradeTable(): boolean {
    return (this.spec.grade?.length ?? 0) > 0;
  }

  /** Grade bands lost at `extent`. */
  public gradeDrop(extent: number): number {
    let drop = 0;
    for (const [at, bands] of this.spec.grade ?? []) if (extent >= at) drop = bands;
    return drop;
  }

  /** What `look` says at `extent` (`''` for nothing). */
  public phrase(extent: number): string {
    let line = '';
    for (const [at, words] of this.spec.words ?? []) if (extent >= at) line = words;
    return line;
  }
}

/** A material's changes — the row's `kinetics:` list. */
export class Kinetics {
  private readonly list: readonly KineticChange[];

  /** Validates every change; throws on one that cannot be evaluated or a repeated key. */
  constructor(specs: readonly KineticSpec[]) {
    const seen = new Set<string>();
    this.list = specs.map((s) => {
      const change = new KineticChange(s);
      if (seen.has(change.getKey())) {
        throw new RangeError(`Kinetics: duplicate key '${change.getKey()}'`);
      }
      seen.add(change.getKey());
      return change;
    });
  }

  /** The changes this material undergoes. */
  public changes(): readonly KineticChange[] {
    return this.list;
  }

  /** The change keyed `key`, or `undefined`. */
  public change(key: string): KineticChange | undefined {
    return this.list.find((c) => c.getKey() === key);
  }

  /**
   * ⭐ The change a POOL of this matter sets by in a mould (review R2-D3):
   * the first point curve with a ladder — a chemical set that runs at a
   * mould's temperature (plaster slurry curing in a quarter of an hour).
   * A dose law is heat-work, the kiln's, never a mould's. `null` when this
   * matter does not set that way.
   */
  public poolSet(): KineticChange | null {
    return this.list.find((c) => !c.isDoseLaw() && c.getLadder().length > 0) ?? null;
  }

  /** ⭐ Does any change set this by HEAT-work (a dose law) — a glaze the fire fuses? */
  public setsByHeat(): boolean {
    return this.list.some((c) => c.isDoseLaw());
  }

  /** The authored form, for the row's round trip. */
  public toSpec(): KineticSpec[] {
    return this.list.map((c) => c.toSpec());
  }
}

function isDoseLaw(rate: KineticSpec['rate']): rate is KineticDoseLaw {
  return !Array.isArray(rate);
}

/** ⚠ Fail loudly at the row: a malformed curve is an authoring error, never a silent zero. */
function validated(raw: KineticSpec): KineticSpec {
  const where = `kinetics '${String((raw as { key?: unknown })?.key ?? '?')}'`;
  const fail = (what: string): never => {
    throw new RangeError(`Kinetics: ${where} ${what}`);
  };
  const num = (v: unknown, k: string): number => {
    if (typeof v !== 'number' || !Number.isFinite(v)) fail(`'${k}' must be a finite number`);
    return v as number;
  };
  if (!raw || typeof raw.key !== 'string' || raw.key.trim() === '') {
    throw new RangeError(`Kinetics: every change needs a key (${where})`);
  }
  const ascending = (pts: unknown, label: string): void => {
    if (pts === undefined) return;
    if (!Array.isArray(pts)) fail(`${label} must be a list of pairs`);
    let prev = -Infinity;
    for (const p of pts as unknown[]) {
      if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'number' || !Number.isFinite(p[0])) {
        fail(`${label} entries are [number, value] pairs`);
      }
      const at = (p as [number, unknown])[0];
      if (at < prev) fail(`${label} must ascend`);
      prev = at;
    }
  };

  const rate = raw.rate as unknown;
  let law: KineticSpec['rate'];
  if (Array.isArray(rate)) {
    if (rate.length === 0) fail('needs a rate curve');
    ascending(rate, 'rate');
    for (const [, r] of rate as [number, unknown][]) {
      if (typeof r !== 'number' || !Number.isFinite(r)) fail('rates are numbers');
    }
    if (raw.order !== 0 && raw.order !== 1) fail('order must be 0 or 1');
    if (raw.agent !== undefined) fail('takes no agent on a point curve (an agent caps a dose)');
    law = (rate as [number, number][]).map(([k, r]) => [k, r] as [number, number]);
  } else if (rate !== null && typeof rate === 'object') {
    const d = rate as Partial<KineticDoseLaw>;
    num(d.referenceK, 'rate.referenceK');
    if (!(num(d.zK, 'rate.zK') > 0)) fail("'rate.zK' must be > 0");
    if (!(num(d.fullDoseS, 'rate.fullDoseS') > 0)) fail("'rate.fullDoseS' must be > 0");
    if (raw.order !== undefined) fail('takes no order on a dose law');
    if (raw.floor !== undefined) fail('takes no floor on a dose law (a dose never reverses)');
    law = { referenceK: d.referenceK!, zK: d.zK!, fullDoseS: d.fullDoseS! };
  } else {
    return fail('needs a rate: a dose law { referenceK, zK, fullDoseS } or a point curve');
  }

  if ((raw as { becomes?: unknown }).becomes !== undefined) {
    fail("names what it becomes on a 'ladder' rung (- { atDegree: 1, becomes: … })");
  }
  if (raw.massRetained !== undefined) {
    const m = num(raw.massRetained, 'massRetained');
    if (!(m > 0 && m <= 1)) fail("'massRetained' must be in (0, 1]");
  }
  if (raw.scorchAboveK !== undefined) num(raw.scorchAboveK, 'scorchAboveK');
  if (raw.agent !== undefined) {
    const a = raw.agent;
    if (typeof a.material !== 'string' || a.material === '') fail("'agent.material' must be a material path");
    if (!(num(a.optimum, 'agent.optimum') > 0)) fail("'agent.optimum' must be > 0");
    if (!(num(a.over, 'agent.over') > a.optimum)) fail("'agent.over' must exceed 'agent.optimum'");
  }
  if (raw.ladder !== undefined) {
    if (!Array.isArray(raw.ladder) || raw.ladder.length === 0) fail("'ladder', when given, lists at least one rung");
    let last = -1;
    for (const r of raw.ladder) {
      const d = num(r?.atDegree, 'ladder[].atDegree');
      if (d < 0 || d > 1 || d < last) fail('ladder degrees must rise within [0, 1]');
      last = d;
      if (typeof r.becomes !== 'string' || r.becomes === '') fail("every rung must name what it 'becomes'");
    }
  }
  for (const v of raw.volatiles ?? []) {
    if (typeof v?.material !== 'string' || !(num(v.litresPerKg, 'volatiles[].litresPerKg') > 0)) {
      fail('a volatile names a material and positive litresPerKg');
    }
  }
  ascending(raw.grade, 'grade');
  ascending(raw.words, 'words');
  if (raw.floor !== undefined && !(raw.floor >= 0 && raw.floor <= 1)) fail('floor is a fraction 0..1');

  return {
    ...raw,
    key: raw.key.trim(),
    rate: law,
    ...(raw.ladder ? { ladder: raw.ladder.map((r) => ({ ...r })) } : {}),
    ...(raw.grade ? { grade: raw.grade.map(([e, b]) => [e, b] as [number, number]) } : {}),
    ...(raw.words ? { words: raw.words.map(([e, w]) => [e, String(w)] as [number, string]) } : {}),
    ...(raw.senses ? { senses: [...raw.senses] } : {}),
  };
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
