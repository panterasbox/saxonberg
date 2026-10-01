/**
 * Trajectory — the general resolve-on-read primitive.
 *
 * ⭐⭐ **The law** (`uncertainty.md § The second abstraction law`):
 * reconcile-on-read is exact only when the driver's trajectory is
 * reconstructible from stored state. A gauge that sampled its driver's
 * END value over an unobserved gap guessed — and the guess depended on
 * *when you looked*. A fridge that warmed during a power cut and
 * re-cooled under-spoiled when read cold and insta-spoiled when read
 * mid-outage, from the same history.
 *
 * The fix, built once here and applied everywhere the census found a
 * sampled dependency: **a changing value publishes its trajectory as
 * segments; a dependent gauge integrates over the segments** instead of
 * sampling the endpoint.
 *
 * Two value objects:
 *
 * - {@link Piecewise} — a trajectory as an ordered list of
 *   exponential-relaxation `Stretch`es (the one shape every thermal
 *   driver takes — Newton cooling toward a moving target). Integrate a
 *   rate over it (`integrate`), fold a closed-form gauge over its samples
 *   (`samples`), or read a point (`at`).
 * - {@link TrajectoryLog} — the publisher's **bounded ring** of
 *   breakpoints. A publisher records `(atS, value, target, tau)` at each
 *   re-stamp; `window(fromS, toS)` reconstructs the curve over any window
 *   inside the ring's horizon. ⚠ A ring, not one field — a scope read by
 *   many bodies at *different* stamps needs each body's curve from its
 *   own stamp, which only a short history can answer (plan F2).
 *
 * ⚠ Construction is **public constructors + instance methods only** — no
 * public statics (the `lint:lib-statics` ratchet sits at its ceiling; a
 * new value-static would raise it, which it may never do). A constant
 * trajectory is `new Piecewise([{ fromS, toS, startValue: v, target: v,
 * tau: 0 }])`; a single decay is the same with `target`/`tau` set.
 *
 * Precedent reused: `Decay.toward` (the closed-form Newton step) and
 * `ThermalDose`'s Simpson integrator with `SUB_STEPS = 8`, lifted here.
 */

import { Decay } from './Decay';

/**
 * One segment of a trajectory: an exponential relaxation from
 * `startValue` (its value at `fromS`) toward `target` with time constant
 * `tau`, over `[fromS, toS]`.
 *
 * `tau <= 0` is a **constant** segment at `target` (so a flat stretch
 * sets `startValue === target`). Exponential relaxation is memoryless, so
 * restricting a segment to a sub-window and re-anchoring `startValue` to
 * the value at the new start preserves the curve exactly — which is what
 * lets {@link TrajectoryLog.window} clip the ring to any window.
 */
export interface Stretch {
  readonly fromS: number;
  readonly toS: number;
  readonly startValue: number;
  readonly target: number;
  readonly tau: number;
}

/** One piecewise-constant sample: a value held for a duration. */
export interface TrajectorySample {
  readonly value: number;
  readonly durationS: number;
}

/** The value of one stretch at absolute time `s` (clamped to its span). */
function stretchAt(st: Stretch, s: number): number {
  const clamped = s < st.fromS ? st.fromS : s > st.toS ? st.toS : s;
  if (!(st.tau > 0)) return st.target;
  return Decay.toward(st.startValue, st.target, clamped - st.fromS, st.tau);
}

export class Piecewise {
  /** The segments, in order. Never empty. */
  public readonly stretches: readonly Stretch[];

  /**
   * ⚠ Never empty — a window with no information is one constant stretch
   * (the `airSegmentsFor` contract). An empty list is coerced to a
   * zero-span stretch at 0 rather than throwing, so a caller that mis-
   * builds one gets a harmless flat line, not a crash in a reconcile.
   */
  public constructor(stretches: readonly Stretch[]) {
    this.stretches =
      stretches.length > 0
        ? stretches
        : [{ fromS: 0, toS: 0, startValue: 0, target: 0, tau: 0 }];
  }

  /** The window this trajectory covers. */
  public window(): { fromS: number; toS: number } {
    const first = this.stretches[0]!;
    const last = this.stretches[this.stretches.length - 1]!;
    return { fromS: first.fromS, toS: last.toS };
  }

  /** The value at absolute time `t` (clamped to the window). */
  public at(t: number): number {
    for (const st of this.stretches) {
      if (t <= st.toS) return stretchAt(st, t);
    }
    return stretchAt(this.stretches[this.stretches.length - 1]!, t);
  }

  /**
   * Midpoint samples — `subSteps` per stretch, each a value held for an
   * equal slice of the stretch's duration. A gauge with a closed form per
   * constant rate (`Freshness.advance`, `Contamination.advance`) folds
   * itself over these: exact for a piecewise-constant rate, convergent in
   * `subSteps` for the true curve.
   */
  public samples(subSteps: number): TrajectorySample[] {
    const n = Math.max(1, Math.floor(subSteps));
    const out: TrajectorySample[] = [];
    for (const st of this.stretches) {
      const dur = st.toS - st.fromS;
      if (!(dur > 0)) continue;
      const h = dur / n;
      for (let i = 0; i < n; i++) {
        out.push({ value: stretchAt(st, st.fromS + (i + 0.5) * h), durationS: h });
      }
    }
    if (out.length === 0) {
      out.push({ value: this.at(this.window().fromS), durationS: 0 });
    }
    return out;
  }

  /**
   * ∫ f(value(s)) ds over the whole window — Simpson per stretch
   * (`subSteps` even sub-intervals, forced even). This is `ThermalDose`'s
   * integrator, generalised to a moving driver: for one constant-ambient
   * stretch it reproduces the old numbers exactly.
   */
  public integrate(f: (value: number) => number, subSteps: number): number {
    const n0 = Math.max(2, Math.floor(subSteps));
    const n = n0 % 2 === 0 ? n0 : n0 + 1;
    let total = 0;
    for (const st of this.stretches) {
      const dur = st.toS - st.fromS;
      if (!(dur > 0)) continue;
      const h = dur / n;
      let acc = 0;
      for (let i = 0; i <= n; i++) {
        const w = i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2;
        acc += w * f(stretchAt(st, st.fromS + i * h));
      }
      total += (acc * h) / 3;
    }
    return total;
  }

  /**
   * The sorted, de-duplicated breakpoint times shared by this trajectory
   * and `other`, within their overlapping window — so a gauge that reads
   * TWO drivers (temperature AND, later, humidity) can walk one set of
   * sub-windows and sample both on each. Endpoints included.
   */
  public refine(other: Piecewise): number[] {
    const a = this.window();
    const b = other.window();
    const lo = Math.max(a.fromS, b.fromS);
    const hi = Math.min(a.toS, b.toS);
    if (!(hi > lo)) return [lo];
    const marks = new Set<number>([lo, hi]);
    for (const st of this.stretches) {
      if (st.fromS > lo && st.fromS < hi) marks.add(st.fromS);
    }
    for (const st of other.stretches) {
      if (st.fromS > lo && st.fromS < hi) marks.add(st.fromS);
    }
    return [...marks].sort((x, y) => x - y);
  }
}

/** One recorded point on a publisher's curve. */
export interface Breakpoint {
  atS: number;
  value: number;
  target: number;
  tau: number;
}

/** The default ring depth — breakpoints kept per publisher. */
export const TRAJECTORY_RING_CAPACITY = 24;

/**
 * A publisher's bounded ring of breakpoints, wrapping a plain array it
 * does not own (the host's persistent field), so the host keeps the
 * storage and this is a thin, stateless-shaped view over it.
 */
export class TrajectoryLog {
  private readonly records: Breakpoint[];
  private readonly capacity: number;

  /**
   * Wrap `records` **by reference** — `record` mutates it in place, so the
   * host's field sees every change with no write-back. `capacity` bounds
   * the ring; the oldest breakpoints fall off the front.
   */
  public constructor(
    records: Breakpoint[],
    capacity: number = TRAJECTORY_RING_CAPACITY,
  ) {
    this.records = records;
    this.capacity = Math.max(1, Math.floor(capacity));
  }

  /**
   * Record a breakpoint. A repeat of the latest `(value, target, tau)` at
   * the same instant is dropped (an idempotent re-read records nothing).
   */
  public record(atS: number, value: number, target: number, tau: number): void {
    const last = this.records[this.records.length - 1];
    if (
      last &&
      last.atS === atS &&
      last.value === value &&
      last.target === target &&
      last.tau === tau
    ) {
      return;
    }
    // Keep strictly increasing in atS — a clock that did not advance
    // overwrites the tail rather than appending a zero-span segment.
    if (last && atS <= last.atS) {
      last.value = value;
      last.target = target;
      last.tau = tau;
      return;
    }
    this.records.push({ atS, value, target, tau });
    while (this.records.length > this.capacity) this.records.shift();
  }

  /** The oldest breakpoint time still held, or `null` when empty. */
  public horizonS(): number | null {
    return this.records.length > 0 ? this.records[0]!.atS : null;
  }

  /** The most recent breakpoint, or `null` when empty. */
  public latest(): Breakpoint | null {
    return this.records.length > 0
      ? this.records[this.records.length - 1]!
      : null;
  }

  /**
   * Reconstruct the curve over `[fromS, toS]` as a {@link Piecewise}.
   *
   * Each breakpoint `i` defines the curve from `atS_i` until the next
   * breakpoint as `Decay.toward(value_i, target_i, s - atS_i, tau_i)`; the
   * last extends to `toS`. A window that reaches before the oldest
   * breakpoint (the ring's horizon) is **held** at that breakpoint's value
   * — bounded and honest, the ring cannot know what came before it.
   *
   * `fallbackValue` is used only when the ring is entirely empty, so the
   * result is still never empty.
   */
  public window(fromS: number, toS: number, fallbackValue: number): Piecewise {
    const end = toS > fromS ? toS : fromS;
    if (this.records.length === 0) {
      return new Piecewise([
        { fromS, toS: end, startValue: fallbackValue, target: fallbackValue, tau: 0 },
      ]);
    }
    const recs = this.records;
    const stretches: Stretch[] = [];

    // Leading hold: window starts before the oldest breakpoint.
    const oldest = recs[0]!;
    if (oldest.atS > fromS) {
      const holdTo = Math.min(end, oldest.atS);
      stretches.push({
        fromS,
        toS: holdTo,
        startValue: oldest.value,
        target: oldest.value,
        tau: 0,
      });
    }

    for (let i = 0; i < recs.length; i++) {
      const bp = recs[i]!;
      const segStart = Math.max(fromS, bp.atS);
      const nextAt = i + 1 < recs.length ? recs[i + 1]!.atS : end;
      const segEnd = Math.min(end, nextAt);
      if (segStart >= segEnd) {
        if (bp.atS >= end) break;
        continue;
      }
      const startValue =
        bp.tau > 0
          ? Decay.toward(bp.value, bp.target, segStart - bp.atS, bp.tau)
          : bp.target === bp.value
            ? bp.value
            : bp.target;
      stretches.push({
        fromS: segStart,
        toS: segEnd,
        startValue,
        target: bp.target,
        tau: bp.tau,
      });
      if (segEnd >= end) break;
    }

    if (stretches.length === 0) {
      const last = recs[recs.length - 1]!;
      stretches.push({
        fromS,
        toS: end,
        startValue: last.value,
        target: last.value,
        tau: 0,
      });
    }
    return new Piecewise(stretches);
  }
}
