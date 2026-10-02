/**
 * Trajectory primitive — Piecewise + TrajectoryLog.
 *
 * A pure value object; no wired runtime, so no test-bootstrap.
 */

import { describe, it, expect } from 'vitest';
import { Piecewise, TrajectoryLog, type Stretch } from '../Trajectory';
import { Decay } from '../Decay';

const constant = (v: number, fromS: number, toS: number): Stretch => ({
  fromS,
  toS,
  startValue: v,
  target: v,
  tau: 0,
});

describe('Piecewise', () => {
  it('a constant stretch reads flat', () => {
    const pw = new Piecewise([constant(277, 0, 1000)]);
    expect(pw.at(0)).toBe(277);
    expect(pw.at(500)).toBe(277);
    expect(pw.at(1000)).toBe(277);
    expect(pw.window()).toEqual({ fromS: 0, toS: 1000 });
  });

  it('a decay stretch matches Decay.toward', () => {
    const pw = new Piecewise([
      { fromS: 0, toS: 1000, startValue: 300, target: 270, tau: 200 },
    ]);
    expect(pw.at(0)).toBeCloseTo(300, 6);
    expect(pw.at(400)).toBeCloseTo(Decay.toward(300, 270, 400, 200), 6);
  });

  it('is never empty', () => {
    const pw = new Piecewise([]);
    expect(pw.stretches.length).toBe(1);
    expect(Number.isFinite(pw.at(0))).toBe(true);
  });

  it('integrate of a constant rate equals rate × duration', () => {
    const pw = new Piecewise([constant(5, 0, 100)]);
    // f returns the value itself; constant 5 over 100s → 500.
    expect(pw.integrate((v) => v, 8)).toBeCloseTo(500, 6);
  });

  it('integrate over a decay matches a fine Riemann reference', () => {
    const st: Stretch = { fromS: 0, toS: 600, startValue: 350, target: 290, tau: 120 };
    const pw = new Piecewise([st]);
    const simpson = pw.integrate((v) => v * v, 8);
    // Fine reference: midpoint sum of f over 10,000 steps.
    const N = 10000;
    const h = 600 / N;
    let ref = 0;
    for (let i = 0; i < N; i++) {
      const s = (i + 0.5) * h;
      const v = Decay.toward(350, 290, s, 120);
      ref += v * v * h;
    }
    expect(Math.abs(simpson - ref) / ref).toBeLessThan(0.001);
  });

  it('samples cover the window with equal slices summing to the duration', () => {
    const pw = new Piecewise([constant(10, 0, 80)]);
    const s = pw.samples(4);
    expect(s).toHaveLength(4);
    expect(s.reduce((n, x) => n + x.durationS, 0)).toBeCloseTo(80, 6);
    for (const x of s) expect(x.value).toBe(10);
  });

  it('refine merges two trajectories breakpoints within the overlap', () => {
    const a = new Piecewise([constant(1, 0, 100), constant(2, 100, 200)]);
    const b = new Piecewise([constant(3, 50, 150)]);
    // overlap [50,150]; a contributes a break at 100.
    expect(a.refine(b)).toEqual([50, 100, 150]);
  });
});

describe('TrajectoryLog', () => {
  it('reconstructs a single recorded decay segment', () => {
    const records: ConstructorParameters<typeof TrajectoryLog>[0] = [];
    const log = new TrajectoryLog(records);
    log.record(0, 300, 270, 200);
    const pw = log.window(0, 1000, 300);
    expect(pw.at(0)).toBeCloseTo(300, 6);
    expect(pw.at(400)).toBeCloseTo(Decay.toward(300, 270, 400, 200), 6);
    // Past the breakpoint the single segment extends to the window end.
    expect(pw.at(1000)).toBeCloseTo(Decay.toward(300, 270, 1000, 200), 6);
  });

  it('a window reaching before the horizon holds the oldest value', () => {
    const records: ConstructorParameters<typeof TrajectoryLog>[0] = [];
    const log = new TrajectoryLog(records);
    log.record(100, 290, 270, 200);
    const pw = log.window(0, 300, 290);
    // [0,100] is before the oldest breakpoint → held flat at 290.
    expect(pw.at(0)).toBe(290);
    expect(pw.at(50)).toBe(290);
    // [100,300] follows the decay.
    expect(pw.at(200)).toBeCloseTo(Decay.toward(290, 270, 100, 200), 6);
  });

  it('two segments: a step at a cut reconstructs across the boundary', () => {
    const records: ConstructorParameters<typeof TrajectoryLog>[0] = [];
    const log = new TrajectoryLog(records);
    // Powered: holding 277 (toward 277). Then a cut at t=1000: warm toward 293.
    log.record(0, 277, 277, 500);
    const valueAtCut = 277; // held flat
    log.record(1000, valueAtCut, 293, 3000);
    const pw = log.window(0, 4000, 277);
    expect(pw.at(500)).toBeCloseTo(277, 6);
    expect(pw.at(1000)).toBeCloseTo(277, 6);
    expect(pw.at(2500)).toBeCloseTo(Decay.toward(277, 293, 1500, 3000), 6);
    // Reconstruction from a mid-segment window start re-anchors exactly.
    const mid = log.window(1500, 4000, 277);
    expect(mid.at(2500)).toBeCloseTo(Decay.toward(277, 293, 1500, 3000), 6);
  });

  it('caps at capacity, dropping the oldest', () => {
    const records: ConstructorParameters<typeof TrajectoryLog>[0] = [];
    const log = new TrajectoryLog(records, 3);
    log.record(0, 1, 1, 0);
    log.record(10, 2, 2, 0);
    log.record(20, 3, 3, 0);
    log.record(30, 4, 4, 0);
    expect(records).toHaveLength(3);
    expect(log.horizonS()).toBe(10);
    expect(log.latest()!.value).toBe(4);
  });

  it('an idempotent re-record at the same instant adds nothing', () => {
    const records: ConstructorParameters<typeof TrajectoryLog>[0] = [];
    const log = new TrajectoryLog(records);
    log.record(100, 290, 270, 200);
    log.record(100, 290, 270, 200);
    expect(records).toHaveLength(1);
  });
});
