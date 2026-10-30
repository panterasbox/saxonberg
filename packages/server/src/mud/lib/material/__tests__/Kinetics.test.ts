/**
 * Kinetics — how a substance changes over time at a rate set by
 * temperature: the value object on the material row and the kinetic record
 * `ThermalMixin` keeps on the good (the sugar build's review, 2026-10-24;
 * the ceramics build's heat transitions folded in, 2026-10-28). Synthetic
 * fixtures; the authored curves are proven beside their rows (baking's
 * staling, sugar's inversion, the fired materials').
 *
 * ⭐⭐ The dose law, printed — the table a reviewer reads (ceramics M1; the
 * rubber build's cure, generalised). A degree from dose × agent, a ladder of
 * rungs, and three ways a rung can resolve — its own material, the
 * over-range material, the scorched one, or its reducing twin.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kinetics, KineticChange, type KineticSpec } from '../Kinetics';
import Material from '../Material';
import Provision from '../../../platform/thing/Provision';
import { Grade } from '../../craft/Grade';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const TURNS: KineticSpec = {
  key: 'turning',
  order: 1,
  rate: [
    [280, 0.01],
    [300, 0.05],
  ],
  grade: [
    [0.25, 1],
    [0.5, 2],
  ],
  words: [
    [0, ''],
    [0.25, 'It has started to turn.'],
  ],
  senses: ['vision'],
};
const STALES: KineticSpec = {
  key: 'staling',
  order: 0,
  rate: [
    [273, 0],
    [277, 0.02],
    [329, 0],
    [330, -1],
  ],
  floor: 0.2,
};

describe('Kinetics — the curve on the row', () => {
  const turns = new KineticChange(TURNS);
  const stales = new KineticChange(STALES);
  it('interpolates the rate between points and holds it flat past the ends', () => {
    expect(turns.rateAt(290)).toBeCloseTo(0.03, 9);
    expect(turns.rateAt(250)).toBeCloseTo(0.01, 9);
    expect(turns.rateAt(350)).toBeCloseTo(0.05, 9);
  });

  it('order 0 accumulates; order 1 turns what is left', () => {
    expect(stales.advance(0.1, 0.3)).toBeCloseTo(0.4, 9);
    expect(turns.advance(0, 1)).toBeCloseTo(1 - Math.exp(-1), 9);
    expect(turns.advance(0.5, 1)).toBeCloseTo(1 - 0.5 * Math.exp(-1), 9);
  });

  it('⭐ a reversal stops at the floor, and never RAISES an extent already under it', () => {
    expect(stales.advance(0.9, -5)).toBeCloseTo(0.2, 9);
    expect(stales.advance(0.1, -5)).toBeCloseTo(0.1, 9);
  });

  it('reads grade bands lost and words by extent', () => {
    expect(turns.gradeDrop(0.1)).toBe(0);
    expect(turns.gradeDrop(0.3)).toBe(1);
    expect(turns.gradeDrop(0.7)).toBe(2);
    expect(turns.phrase(0.1)).toBe('');
    expect(turns.phrase(0.3)).toBe('It has started to turn.');
  });

  it('⚠ a malformed curve fails LOUDLY at the row', () => {
    expect(() => new Kinetics([{ ...TURNS, order: 2 as 0 }])).toThrow(/order/);
    expect(() => new Kinetics([{ ...TURNS, rate: [] }])).toThrow(/rate/);
    expect(() => new Kinetics([{ ...TURNS, rate: [[300, 1], [280, 1]] }])).toThrow(/ascend/);
    expect(() => new Kinetics([{ ...STALES, floor: 2 }])).toThrow(/floor/);
  });
});

const RUBBER: KineticSpec = {
  key: 'cure',
  rate: { referenceK: 418, zK: 12, fullDoseS: 1800 },
  agent: { material: '/stuff/idea/material/element/sulfur', optimum: 0.03, over: 0.2 },
  scorchAboveK: 455,
  ladder: [{ atDegree: 0.6, becomes: '/stuff/idea/material/organic/rubber' }],
  over: '/stuff/idea/material/organic/ebonite',
  scorched: '/stuff/idea/material/organic/rubber-scorched',
};

const LIME: KineticSpec = {
  key: 'calcine',
  rate: { referenceK: 1170, zK: 60, fullDoseS: 3600 },
  massRetained: 0.56,
  ladder: [{ atDegree: 1, becomes: '/stuff/idea/material/caustic/quicklime' }],
};

const CLAY: KineticSpec = {
  key: 'fire',
  rate: { referenceK: 1350, zK: 120, fullDoseS: 20_000 },
  ladder: [
    { atDegree: 0.15, becomes: 'terracotta', reducing: 'terracotta-reduced' },
    { atDegree: 0.4, becomes: 'earthenware' },
    { atDegree: 0.7, becomes: 'stoneware' },
  ],
  scorchAboveK: 1600,
  scorched: 'clinker',
};

/** Dose at a constant temperature held for `s`. */
const doseAt = (t: KineticChange, k: number, s: number): number => s * t.rateAt(k);

describe('the cure (rubber) rides the one evaluator', () => {
  const cure = new KineticChange(RUBBER);

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
    expect(out).toEqual({ kind: 'rung', materialPath: RUBBER.ladder![0]!.becomes });
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
    const lime = new KineticChange(LIME);
    expect(lime.degreeFor(doseAt(lime, 1170, 3600), 0)).toBeCloseTo(1, 5);
    expect(lime.getMassRetained()).toBe(0.56);
    // Ten minutes: part-converted, no rung yet.
    const part = lime.degreeFor(doseAt(lime, 1170, 600), 0);
    expect(part).toBeGreaterThan(0);
    expect(lime.rungIndexFor(part)).toBe(-1);
  });

  it('clay climbs its ladder rung by rung with heat-work', () => {
    const clay = new KineticChange(CLAY);
    const rungAfter = (k: number, s: number): number =>
      clay.rungIndexFor(clay.degreeFor(doseAt(clay, k, s), 0));
    expect(rungAfter(1000, 3600)).toBe(-1);
    expect(rungAfter(1250, 36_000)).toBe(0);
    expect(rungAfter(1350, 10_000)).toBe(1);
    expect(rungAfter(1450, 20_000)).toBe(2);
  });

  it('a reducing firing takes the rung’s twin; a rung with none is itself', () => {
    const clay = new KineticChange(CLAY);
    expect(clay.outcomeAt(0, { peakK: 1200, agentFraction: 0, reducing: true })?.materialPath).toBe('terracotta-reduced');
    expect(clay.outcomeAt(1, { peakK: 1300, agentFraction: 0, reducing: true })?.materialPath).toBe('earthenware');
    expect(clay.outcomeAt(2, { peakK: 1650, agentFraction: 0, reducing: false })?.materialPath).toBe('clinker');
  });
});

describe('a curve that cannot be evaluated fails at the row', () => {
  it('rejects an empty ladder, a falling ladder and a bad retention', () => {
    expect(() => new KineticChange({ ...LIME, ladder: [] })).toThrow(RangeError);
    expect(
      () =>
        new KineticChange({
          ...CLAY,
          ladder: [
            { atDegree: 0.5, becomes: 'a' },
            { atDegree: 0.2, becomes: 'b' },
          ],
        }),
    ).toThrow(RangeError);
    expect(() => new KineticChange({ ...LIME, massRetained: 1.5 })).toThrow(RangeError);
    expect(() => new KineticChange({ ...RUBBER, agent: { material: 'x', optimum: 0.2, over: 0.1 } })).toThrow(RangeError);
  });
});

/** ⚠ Monotonic fake clock — rewinding it strands earlier stamps (see staling.test). */
let real = 5_000_000;
const SCALE = 12;
const tick = (gameHours: number): void => {
  real += ((gameHours * 3600) / SCALE) * 1000;
};

describe('the kinetic record — the change on the good', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real += 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => real);
    for (const [p, specs] of [
      ['/test/idea/material/turning-stuff', [TURNS]],
      ['/test/idea/material/inert-stuff', null],
    ] as const) {
      if (StuffApi.findByTemplatePath(p)) continue;
      makeStuffAtPath(() => {
        const m = new Material();
        m.setName(p.split('/').pop()!);
        m.setDensity(Quantity.of(500, 'kg/m³'));
        m.setSpecificHeat(Quantity.of(2500, 'J/(kg·K)'));
        m.setThermalConductivity(Quantity.of(0.05, 'W/(m·K)'));
        if (specs) m.setKinetics([...specs]);
        return m;
      }, p);
    }
  });
  afterEach(() => WorldClockApi._resetForTesting());

  function good(materialPath: string, tempK: number): Provision {
    const g = makeStuff(() => new Provision());
    g.setMass(Quantity.of(1, 'kg'));
    g.setMaterial(StuffApi.findByTemplatePath<Material>(materialPath)!);
    g.setStampedTemperatureK(tempK);
    g.setLastAmbientK(tempK);
    g.setGrade(Grade.of('fine'));
    return g;
  }

  it('⭐ inert matter reads and writes NOTHING (the sparse rule)', () => {
    const g = good('/test/idea/material/inert-stuff', 300);
    g.reconcileKinetics();
    tick(48);
    expect(g.getKineticExtent('turning')).toBe(0);
    expect(g.getKineticRecord()).toBeNull();
  });

  it('runs at the temperature it is kept at, and the grade falls from where it started', () => {
    const warm = good('/test/idea/material/turning-stuff', 300);
    const cool = good('/test/idea/material/turning-stuff', 280);
    warm.reconcileKinetics();
    cool.reconcileKinetics();
    tick(10);
    // ∫ 0.05/h × 10 h = 0.5 → 1 − e^−0.5 ≈ 0.39; at 280 K, 0.1 → ≈ 0.095.
    expect(warm.getKineticExtent('turning')).toBeCloseTo(1 - Math.exp(-0.5), 2);
    expect(cool.getKineticExtent('turning')).toBeCloseTo(1 - Math.exp(-0.1), 2);
    expect(warm.getGrade().getBand()).toBe(Grade.fromOrdinal(Grade.of('fine').getOrdinal() - 1).getBand());
    expect(cool.getGrade().getBand()).toBe('fine');
  });

  it('`look` reads the change in words, through the senses its row names', () => {
    const g = good('/test/idea/material/turning-stuff', 300);
    g.setKineticExtent('turning', 0.3);
    expect(g.kineticPhrases()).toEqual([{ key: 'turning', phrase: 'It has started to turn.', senses: ['vision'] }]);
  });
});

describe('⭐ what sets a pool, and what the fire fuses (review R2-D3)', () => {
  const plaster = new Kinetics([
    { key: 'set', rate: [[273, 4], [373, 4]], order: 0, ladder: [{ atDegree: 1, becomes: '/x/cast-plaster' }] },
  ]);
  const glaze = new Kinetics([
    {
      key: 'fuse',
      rate: { referenceK: 1250, zK: 30, fullDoseS: 3600 },
      ladder: [{ atDegree: 1, becomes: '/x/glass' }],
    },
  ]);

  it("a pool sets by its first point curve with a ladder — plaster's quarter-hour cure", () => {
    const set = plaster.poolSet()!;
    expect(set.getKey()).toBe('set');
    expect(set.advance(0, set.rateAt(293) * 0.25)).toBeCloseTo(1, 9);
    expect(set.rungIndexFor(set.advance(0, set.rateAt(293) * 0.2))).toBe(-1);
    expect(plaster.setsByHeat()).toBe(false);
  });

  it('a dose law is heat-work — the kiln’s, never a mould’s', () => {
    expect(glaze.poolSet()).toBeNull();
    expect(glaze.setsByHeat()).toBe(true);
  });
});
