import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { Smell, SMELL_SOURCE_CAP } from '../Smell';
import { Quantity } from '../../quantity';
import { installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

describe('Smell value object', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
  });

  it('Smell.ZERO is the canonical zero', () => {
    expect(Smell.ZERO.concentration.rawValue()).toBe(0);
    expect(Smell.ZERO.identity).toBe('');
    expect(Smell.ZERO.sources).toEqual([]);
  });

  it('Smell.of constructs with concentration and identity', () => {
    const s = Smell.of(50, 'garlic');
    expect(s.concentration.rawValue()).toBe(50);
    expect(s.identity).toBe('garlic');
    expect(s.sources).toEqual([]);
  });

  it('Smell.of(0, "", undefined) folds to ZERO', () => {
    expect(Smell.of(0, '')).toBe(Smell.ZERO);
  });

  it('Smell.of with a source records attribution', () => {
    const s = Smell.of(50, 'garlic', {
      stuffId: 'candle-1',
      concentration: 50,
      identity: 'garlic',
    });
    expect(s.sources).toHaveLength(1);
    expect(s.sources[0]!.stuffId).toBe('candle-1');
  });

  it('Smell.from rehydrates a plain-object shape', () => {
    const s = Smell.from({
      concentration: Quantity.of(30, 'ppm'),
      identity: 'pine',
      sources: [
        { stuffId: 'tree-1', concentration: 30, identity: 'pine' },
      ],
    });
    expect(s.concentration.rawValue()).toBe(30);
    expect(s.identity).toBe('pine');
    expect(s.sources).toHaveLength(1);
  });

  it('add sums concentrations and merges sources', () => {
    const a = Smell.of(20, 'garlic', {
      stuffId: 'c1',
      concentration: 20,
      identity: 'garlic',
    });
    const b = Smell.of(30, 'smoke', {
      stuffId: 'c2',
      concentration: 30,
      identity: 'smoke',
    });
    const sum = a.add(b);
    expect(sum.concentration.rawValue()).toBe(50);
    expect(sum.sources).toHaveLength(2);
    // Dominant identity is the larger contribution (smoke at 30 ppm).
    expect(sum.identity).toBe('smoke');
  });

  it('attenuate scales concentration and per-source contributions', () => {
    const s = Smell.of(100, 'garlic', {
      stuffId: 'c1',
      concentration: 100,
      identity: 'garlic',
    });
    const half = s.attenuate(0.5);
    expect(half.concentration.rawValue()).toBe(50);
    expect(half.sources[0]!.concentration).toBe(50);
  });

  it('attenuate(0) returns ZERO', () => {
    const s = Smell.of(100, 'garlic');
    expect(s.attenuate(0)).toBe(Smell.ZERO);
  });

  it('source cap respected on merge', () => {
    let s: Smell = Smell.ZERO;
    for (let i = 0; i < SMELL_SOURCE_CAP + 2; i++) {
      s = s.add(
        Smell.of(10 * (i + 1), `id-${i}`, {
          stuffId: `s-${i}`,
          concentration: 10 * (i + 1),
          identity: `id-${i}`,
        }),
      );
    }
    expect(s.sources.length).toBeLessThanOrEqual(SMELL_SOURCE_CAP);
    // Strongest contributor wins.
    expect(s.sources[0]!.stuffId).toBe(`s-${SMELL_SOURCE_CAP + 1}`);
  });

  it('coerces invalid concentration', () => {
    expect(() => Smell.of(-1, 'x')).toThrow();
    expect(() => Smell.of(Number.NaN, 'x')).toThrow();
  });
});
