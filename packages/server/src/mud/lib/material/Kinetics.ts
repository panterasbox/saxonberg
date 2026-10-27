/**
 * Kinetics — ⭐⭐ **what a substance does by itself over time, at a rate set
 * by temperature**, as data on its material row (the sugar build's review,
 * 2026-10-24).
 *
 * Cut cane's sucrose inverts; a loaf's starch re-crystallises (staling);
 * roast coffee goes flat; picked sweetcorn turns its sugar to starch. Each
 * is chemistry the SUBSTANCE undergoes wherever it is, so it is authored on
 * the material and evaluated here — the `Crosslinking` shape (the rubber
 * cure: a time × temperature dose on the feedstock, a kernel evaluator).
 * `KineticMixin` on the good holds how far each change has gone.
 *
 * ```yaml
 * # on a material row
 * kinetics:
 *   - key: inversion          # names the change on the good
 *     order: 1                # 0: accumulates (staling) · 1: what is left turns
 *     rate:                   # per hour, by kelvin — points, interpolated,
 *       - [283, 0.005]        #   flat past the ends; NEGATIVE is a reversal
 *       - [300, 0.02]
 *     grade: [[0.25, 1], [0.5, 2]]   # extent → grade bands lost from the start
 *     becomes: /path/to/material     # optional: what it is at extent 1
 *     floor: 0.2              # optional: how far a reversal brings it back
 *     words:                  # extent → what `look` says ('' says nothing)
 *       - [0, 'fresh-cut and running with juice']
 *       - [0.1, 'turning — a day off the stalk']
 *     senses: [vision]        # the channels the words are read through
 * ```
 *
 * ⭐ **One curve form covers every case** because the curve is points: a
 * Q10 rise (inversion: doubling per 10 K), a peak just above freezing that
 * stops at ice (staling — why the icebox is the worst place for bread),
 * and a reversal (a negative rate: heat un-crystallises the starch, so a
 * stale loaf comes back in the oven, but only to `floor`).
 *
 * ⚠ **Not spoilage.** `Freshness` is a POPULATION growing (multiplicative,
 * set by water activity, killed by a heat hold, seeded by contamination)
 * and it decides SAFETY. Kinetics is a reaction running toward completion
 * and decides QUALITY. They point opposite ways in the cold, which is the
 * lesson, so they are never one model. And not maturation: there the
 * VESSEL runs a profile on its contents on purpose; here the substance
 * changes on its own.
 */

/** One authored change a material undergoes. */
export interface KineticSpec {
  /** The change's name on the good (`inversion`, `staling`). */
  key: string;
  /** 0 — the extent accumulates at the rate; 1 — what is left turns at the rate. */
  order: 0 | 1;
  /** `[kelvin, per hour]`, ascending in kelvin; interpolated, flat past the ends. */
  rate: [number, number][];
  /** `[extent, bands lost]`, ascending in extent. */
  grade?: [number, number][];
  /** The material it becomes at extent 1. */
  becomes?: string;
  /** The lowest a reversal (a negative rate) brings the extent back to. */
  floor?: number;
  /** `[extent, phrase]`, ascending in extent; `''` says nothing. */
  words?: [number, string][];
  /** The sense channels the words are read through (absent: every channel). */
  senses?: string[];
}

/** One change, validated — what the good's extent for it does over time. */
export class KineticChange {
  private readonly spec: KineticSpec;

  constructor(raw: KineticSpec) {
    this.spec = validated(raw);
  }

  public getKey(): string {
    return this.spec.key;
  }

  /** The material it becomes at extent 1, or `undefined`. */
  public getBecomes(): string | undefined {
    return this.spec.becomes;
  }

  /** The sense channels its words are read through (`undefined`: every channel). */
  public getSenses(): readonly string[] | undefined {
    return this.spec.senses;
  }

  /** The authored form, for the row's round trip. */
  public toSpec(): KineticSpec {
    return { ...this.spec };
  }

  /** The rate, per hour, at `kelvin` — the points interpolated, flat past the ends. */
  public rateAt(kelvin: number): number {
    const pts = this.spec.rate;
    if (kelvin <= pts[0]![0]) return pts[0]![1];
    const last = pts[pts.length - 1]!;
    if (kelvin >= last[0]) return last[1];
    for (let i = 1; i < pts.length; i++) {
      const [k1, r1] = pts[i]!;
      if (kelvin <= k1) {
        const [k0, r0] = pts[i - 1]!;
        return k1 === k0 ? r1 : r0 + ((r1 - r0) * (kelvin - k0)) / (k1 - k0);
      }
    }
    return last[1];
  }

  /**
   * The extent after a window whose rate integrated to `hours` (signed:
   * ∫ rate dt). A reversal never brings it below `floor`, and never raises
   * an extent that was already under it.
   */
  public advance(extent: number, hours: number): number {
    if (!Number.isFinite(hours) || hours === 0) return extent;
    if (hours < 0) {
      const back = this.spec.order === 1 ? extent * Math.exp(hours) : extent + hours;
      const floor = Math.min(extent, this.spec.floor ?? 0);
      return clamp01(Math.max(floor, back));
    }
    const next = this.spec.order === 1 ? 1 - (1 - extent) * Math.exp(-hours) : extent + hours;
    return clamp01(next);
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

  /** The reversal floor (`0` when none). */
  public getFloor(): number {
    return this.spec.floor ?? 0;
  }
}

/** A material's changes — the row's `kinetics:` list. */
export class Kinetics {
  private readonly list: readonly KineticChange[];

  constructor(specs: readonly KineticSpec[]) {
    this.list = specs.map((s) => new KineticChange(s));
  }

  /** The changes this material undergoes. */
  public changes(): readonly KineticChange[] {
    return this.list;
  }

  /** The change keyed `key`, or `undefined`. */
  public change(key: string): KineticChange | undefined {
    return this.list.find((c) => c.getKey() === key);
  }

  /** The authored form, for the row's round trip. */
  public toSpec(): KineticSpec[] {
    return this.list.map((c) => c.toSpec());
  }
}

/** ⚠ Fail loudly at the row: a malformed curve is an authoring error, never a silent zero. */
function validated(raw: KineticSpec): KineticSpec {
  const where = `kinetics '${String((raw as { key?: unknown })?.key ?? '?')}'`;
  if (!raw || typeof raw.key !== 'string' || raw.key.trim() === '') {
    throw new Error(`Kinetics: every change needs a key (${where})`);
  }
  if (raw.order !== 0 && raw.order !== 1) {
    throw new Error(`Kinetics: ${where} order must be 0 or 1`);
  }
  const ascending = (pts: unknown, label: string): void => {
    if (pts === undefined) return;
    if (!Array.isArray(pts)) throw new Error(`Kinetics: ${where} ${label} must be a list of pairs`);
    let prev = -Infinity;
    for (const p of pts) {
      if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'number' || !Number.isFinite(p[0])) {
        throw new Error(`Kinetics: ${where} ${label} entries are [number, value] pairs`);
      }
      if (p[0] < prev) throw new Error(`Kinetics: ${where} ${label} must ascend`);
      prev = p[0];
    }
  };
  if (!Array.isArray(raw.rate) || raw.rate.length === 0) {
    throw new Error(`Kinetics: ${where} needs a rate curve`);
  }
  ascending(raw.rate, 'rate');
  for (const [, r] of raw.rate) {
    if (typeof r !== 'number' || !Number.isFinite(r)) throw new Error(`Kinetics: ${where} rates are numbers`);
  }
  ascending(raw.grade, 'grade');
  ascending(raw.words, 'words');
  if (raw.floor !== undefined && !(raw.floor >= 0 && raw.floor <= 1)) {
    throw new Error(`Kinetics: ${where} floor is a fraction 0..1`);
  }
  return {
    key: raw.key.trim(),
    order: raw.order,
    rate: raw.rate.map(([k, r]) => [k, r] as [number, number]),
    ...(raw.grade ? { grade: raw.grade.map(([e, b]) => [e, b] as [number, number]) } : {}),
    ...(raw.becomes ? { becomes: raw.becomes } : {}),
    ...(raw.floor !== undefined ? { floor: raw.floor } : {}),
    ...(raw.words ? { words: raw.words.map(([e, w]) => [e, String(w)] as [number, string]) } : {}),
    ...(raw.senses ? { senses: [...raw.senses] } : {}),
  };
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
