/**
 * KineticRecord — ⭐ what heat and time have done to ONE good, and the
 * arithmetic over it (B105). `Kinetics` is the material's law (the changes
 * it undergoes and their rates); this is one good's history under it: each
 * change's progress, the hottest it has been, the firing's atmosphere, the
 * mass it started from, the grade its clock started at.
 *
 * The record is persisted on `ThermalMixin` as plain data
 * ({@link KineticRecordData}); this value class wraps a COPY of it, does
 * the bookkeeping, and hands a copy back (`toData()`). Thermal keeps the
 * driver — integrating its own trajectory — and the consequences on the
 * host (its mass, grade, material, prose, the mould seam).
 */
import type { KineticChange, KineticProgress, KineticRecordData } from './Kinetics';
import { Grade } from '../craft/Grade';

export class KineticRecord {
  /** The working copy — the host stores `toData()`, never this. */
  public readonly data: KineticRecordData;

  /** A copy of `from`, or a fresh record when there is none. */
  public constructor(from?: Readonly<KineticRecordData> | null) {
    const r = from ?? null;
    const changes: Record<string, KineticProgress> = {};
    for (const [k, c] of Object.entries(r?.changes ?? {})) changes[k] = { ...c };
    this.data = {
      checkedS: r?.checkedS ?? null,
      changes,
      origin: r?.origin ?? null,
      originMassKg: r?.originMassKg ?? null,
      startBand: r?.startBand ?? null,
      gradeCap: r?.gradeCap ?? null,
      peakK: r?.peakK ?? 0,
      aboveS: r?.aboveS ?? 0,
      maxRateKPerS: r?.maxRateKPerS ?? 0,
      atmosphere: {
        completeness: r?.atmosphere?.completeness ?? 1,
        weight: r?.atmosphere?.weight ?? 0,
        vapors: [...(r?.atmosphere?.vapors ?? [])],
      },
      lastTransitionAtS: r?.lastTransitionAtS ?? null,
      prose: { prefix: r?.prose?.prefix ?? '', sentence: r?.prose?.sentence ?? '' },
      firedBy: r?.firedBy ?? null,
      uncredited: [...(r?.uncredited ?? [])],
    };
  }

  /** A deep copy to persist. */
  public toData(): KineticRecordData {
    return new KineticRecord(this.data).data;
  }

  /** A change's progress so far — before anything accrued, its start. */
  public progressOf(c: KineticChange | undefined, key: string): KineticProgress {
    const had = this.data.changes[key];
    if (had) return { ...had };
    return { extent: 0, rung: c?.rungIndexFor(0) ?? -1, ...(c?.isDoseLaw() ? { dose: 0 } : {}) };
  }

  /** The extent a change has reached, `0` when it has not begun. */
  public extentOf(key: string): number {
    return this.data.changes[key]?.extent ?? 0;
  }

  /** Begin the record on `origin` (the material it WAS) if it has none. */
  public beginOn(origin: string | null): void {
    if (this.data.origin === null) this.data.origin = origin;
  }

  /** The hottest it has been and the steepest it has changed. */
  public noteHeat(peakK: number, rateKPerS: number): void {
    if (peakK > this.data.peakK) this.data.peakK = peakK;
    if (rateKPerS > this.data.maxRateKPerS) this.data.maxRateKPerS = rateKPerS;
  }

  /**
   * ⭐ The firing's atmosphere, weighted by dose: the chamber's completeness
   * while `integral` of dose accrued, folded into the running mean.
   */
  public weighAtmosphere(completeness: number, integral: number): void {
    const a = this.data.atmosphere;
    a.completeness = (a.completeness * a.weight + completeness * integral) / (a.weight + integral);
    a.weight += integral;
  }

  /** A reducing firing: dosed under a chamber starved below `threshold`. */
  public isReducing(threshold: number): boolean {
    const a = this.data.atmosphere;
    return a.weight > 0 && a.completeness < threshold;
  }

  /**
   * ⭐ Part-conversion is mass: `Π(1 − extent × (1 − retained))` of the mass
   * it began with — a half-burnt limestone has lost half its CO₂.
   */
  public massFactor(changes: readonly KineticChange[]): number {
    let factor = 1;
    for (const c of changes) {
      const p = this.data.changes[c.getKey()];
      if (p) factor *= 1 - p.extent * (1 - c.getMassRetained());
    }
    return factor;
  }

  /**
   * The grade its `grade` tables have brought it to from where its clock
   * started — `null` when no change grades, or no start was taken.
   */
  public gradeAfterLoss(changes: readonly KineticChange[]): Grade | null {
    const start = this.data.startBand;
    if (start === null || !Grade.isBand(start) || !changes.some((c) => c.hasGradeTable())) return null;
    const drop = changes.reduce((d, c) => d + c.gradeDrop(this.extentOf(c.getKey())), 0);
    return Grade.fromOrdinal(Grade.of(start).getOrdinal() - drop);
  }

  /** Take the grade its tables lower from — once, as the clock starts. */
  public captureStartBand(changes: readonly KineticChange[], band: string): void {
    if (this.data.startBand !== null || !changes.some((c) => c.hasGradeTable())) return;
    this.data.startBand = band;
  }

  /** The Disciplines rungs reached that nobody was credited for — and clear them. */
  public drainCredits(): string[] {
    const out = this.data.uncredited;
    this.data.uncredited = [];
    return out;
  }
}
