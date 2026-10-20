/**
 * ⭐⭐ What heat does to a material, printed — the table a reviewer reads
 * (ceramics M1; the rubber build's cure, generalised). One evaluator: a
 * degree from dose × agent, a ladder of rungs, and three ways a rung can
 * resolve — its own material, the over-range material, the scorched one,
 * or its reducing twin.
 */

import { describe, it, expect } from 'vitest';
import { HeatTransition, type HeatTransitionSpec } from '../HeatTransition';

const RUBBER: HeatTransitionSpec = {
  key: 'cure',
  referenceK: 418,
  zK: 12,
  fullDoseS: 1800,
  agent: { material: '/stuff/idea/material/element/sulfur', optimum: 0.03, over: 0.2 },
  scorchAboveK: 455,
  ladder: [{ atDegree: 0.6, becomes: '/stuff/idea/material/organic/rubber' }],
  over: '/stuff/idea/material/organic/ebonite',
  scorched: '/stuff/idea/material/organic/rubber-scorched',
};

const LIME: HeatTransitionSpec = {
  key: 'calcine',
  referenceK: 1170,
  zK: 60,
  fullDoseS: 3600,
  massRetained: 0.56,
  ladder: [{ atDegree: 1, becomes: '/stuff/idea/material/caustic/quicklime' }],
};

const CLAY: HeatTransitionSpec = {
  key: 'fire',
  referenceK: 1350,
  zK: 120,
  fullDoseS: 20_000,
  ladder: [
    { atDegree: 0.15, becomes: 'terracotta', reducing: 'terracotta-reduced' },
    { atDegree: 0.4, becomes: 'earthenware' },
    { atDegree: 0.7, becomes: 'stoneware' },
  ],
  scorchAboveK: 1600,
  scorched: 'clinker',
};

/** Dose at a constant temperature held for `s`. */
const doseAt = (t: HeatTransition, k: number, s: number): number => s * t.rateAt(k);

describe('the cure (rubber) rides the one evaluator', () => {
  const cure = new HeatTransition(RUBBER);

  it('prints the curve', () => {
    const rows: string[] = [];
    for (const agent of [0.01, 0.03, 0.1, 0.25]) {
      for (const k of [400, 418, 440, 470]) {
        for (const s of [600, 1800, 7200]) {
          const degree = cure.degreeFor(doseAt(cure, k, s), agent);
          const idx = cure.rungIndexFor(degree);
          const out = idx < 0 ? null : cure.outcomeAt(idx, { peakK: k, agentFraction: agent, reducing: false });
          rows.push(
            `${(agent * 100).toFixed(0).padStart(3)}% S ${k} K ${String(s).padStart(5)} s → ` +
              `${(out?.kind ?? 'under').padEnd(8)} degree ${degree.toFixed(2)}`,
          );
        }
      }
    }
    console.log(`\nthe cure:\n${rows.join('\n')}`);
    expect(rows.length).toBe(48);
  });

  it('3 % sulfur at 418 K for 30 minutes → rubber, fine', () => {
    const d = cure.degreeFor(doseAt(cure, 418, 1800), 0.03);
    expect(d).toBeCloseTo(1, 5);
    const out = cure.outcomeAt(cure.rungIndexFor(d), { peakK: 418, agentFraction: 0.03, reducing: false });
    expect(out).toEqual({ kind: 'rung', materialPath: RUBBER.ladder[0]!.becomes });
    expect(cure.gradeOf(d, 0.03, 'rung').getBand()).toBe('fine');
  });

  it('1 % for ten minutes never reaches the rung — it stays what it was', () => {
    const d = cure.degreeFor(doseAt(cure, 418, 600), 0.01);
    expect(d).toBeLessThan(0.6);
    expect(cure.rungIndexFor(d)).toBe(-1);
  });

  it('25 % for an hour → ebonite; held past 455 K → scorched', () => {
    const d = cure.degreeFor(doseAt(cure, 418, 3600), 0.25);
    expect(cure.outcomeAt(cure.rungIndexFor(d), { peakK: 418, agentFraction: 0.25, reducing: false })?.kind).toBe('over');
    expect(cure.outcomeAt(0, { peakK: 470, agentFraction: 0.03, reducing: false })?.kind).toBe('scorched');
  });
});

describe('lime and clay — no agent, the same arithmetic', () => {
  it('limestone converts in full at reference in an hour, keeping 56 %', () => {
    const lime = new HeatTransition(LIME);
    expect(lime.degreeFor(doseAt(lime, 1170, 3600), 0)).toBeCloseTo(1, 5);
    expect(lime.getMassRetained()).toBe(0.56);
    // Ten minutes: part-converted, no rung yet.
    const part = lime.degreeFor(doseAt(lime, 1170, 600), 0);
    expect(part).toBeGreaterThan(0);
    expect(lime.rungIndexFor(part)).toBe(-1);
  });

  it('clay climbs its ladder rung by rung with heat-work', () => {
    const clay = new HeatTransition(CLAY);
    const rungAfter = (k: number, s: number): number =>
      clay.rungIndexFor(clay.degreeFor(doseAt(clay, k, s), 0));
    expect(rungAfter(1000, 3600)).toBe(-1);
    expect(rungAfter(1250, 36_000)).toBe(0);
    expect(rungAfter(1350, 10_000)).toBe(1);
    expect(rungAfter(1450, 20_000)).toBe(2);
  });

  it('a reducing firing takes the rung’s twin; a rung with none is itself', () => {
    const clay = new HeatTransition(CLAY);
    expect(clay.outcomeAt(0, { peakK: 1200, agentFraction: 0, reducing: true })?.materialPath).toBe('terracotta-reduced');
    expect(clay.outcomeAt(1, { peakK: 1300, agentFraction: 0, reducing: true })?.materialPath).toBe('earthenware');
    expect(clay.outcomeAt(2, { peakK: 1650, agentFraction: 0, reducing: false })?.materialPath).toBe('clinker');
  });
});

describe('a curve that cannot be evaluated fails at the row', () => {
  it('rejects an empty ladder, a falling ladder and a bad retention', () => {
    expect(() => new HeatTransition({ ...LIME, ladder: [] })).toThrow(RangeError);
    expect(
      () =>
        new HeatTransition({
          ...CLAY,
          ladder: [
            { atDegree: 0.5, becomes: 'a' },
            { atDegree: 0.2, becomes: 'b' },
          ],
        }),
    ).toThrow(RangeError);
    expect(() => new HeatTransition({ ...LIME, massRetained: 1.5 })).toThrow(RangeError);
    expect(() => new HeatTransition({ ...RUBBER, agent: { material: 'x', optimum: 0.2, over: 0.1 } })).toThrow(RangeError);
  });
});
