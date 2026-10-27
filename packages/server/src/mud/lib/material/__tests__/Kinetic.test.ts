/**
 * Kinetics — what a substance does by itself over time, at a rate set by
 * temperature: the value object on the material row and `KineticMixin` on
 * the good (the sugar build's review, 2026-10-24). Synthetic fixtures; the
 * authored curves are proven beside their rows (baking's staling, sugar's
 * inversion).
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

/** ⚠ Monotonic fake clock — rewinding it strands earlier stamps (see staling.test). */
let real = 5_000_000;
const SCALE = 12;
const tick = (gameHours: number): void => {
  real += ((gameHours * 3600) / SCALE) * 1000;
};

describe('KineticMixin — the change on the good', () => {
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
    expect(g.kineticStamp).toBe(0);
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
