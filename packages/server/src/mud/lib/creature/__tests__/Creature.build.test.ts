/**
 * The mirror's reads (nutrition-and-fitness W0): the lean band, the
 * build phrase (flesh × lean), the BMI band and the body density — every
 * one a band or a percept, never a number a player sees. And ⭐ the
 * stocks reach mass: a fresh body masses exactly its frame, a body that
 * has put on flesh or lean masses more, so the tailor's tape notices.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature, LEAN_BANDS, BODY_CONDITION_BANDS } from '../Creature';
import { StuffApi } from '../../../api/stuff';
import { AppApi } from '../../../api/app';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const set = (c: Creature, key: string, level: number): void => {
  const cur = c.getReserve(key)!.current.rawValue();
  c.adjustReserve(key, Quantity.of(level - cur, '%'));
};

describe('the build — what a body looks like', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a fresh body reads IN GOOD FLESH and nothing more', () => {
    const c = makeStuff(() => new Creature());
    expect(c.leanBand()).toBe('ordinary');
    expect(c.bodyBuildPhrase()).toBe('in good flesh');
  });

  it('the lean bands sit at their thresholds', () => {
    const c = makeStuff(() => new Creature());
    const expected: Array<[number, string]> = [
      [0, 'slight'],
      [24, 'slight'],
      [25, 'ordinary'],
      [59, 'ordinary'],
      [60, 'hard'],
      [84, 'hard'],
      [85, 'powerful'],
      [100, 'powerful'],
    ];
    for (const [level, band] of expected) {
      set(c, 'lean', level);
      expect(c.leanBand()).toBe(band);
    }
  });

  it('⭐ every adjacent cell of the phrase table reads differently, and none is a number', () => {
    const c = makeStuff(() => new Creature());
    const fleshAt = { emaciated: 5, thin: 20, good: 55, fleshy: 80, fat: 95 };
    const leanAt = { slight: 10, ordinary: 40, hard: 70, powerful: 95 };
    const grid: string[][] = [];
    for (const f of BODY_CONDITION_BANDS) {
      const row: string[] = [];
      for (const l of LEAN_BANDS) {
        set(c, 'flesh', fleshAt[f]);
        set(c, 'lean', leanAt[l]);
        const phrase = c.bodyBuildPhrase();
        expect(phrase).not.toMatch(/\d/);
        row.push(phrase);
      }
      grid.push(row);
    }
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < LEAN_BANDS.length; j++) {
        // The one deliberate repeat: emaciated × powerful is unreachable
        // in practice and renders the hard cell.
        if (i === 0 && j === 3) continue;
        if (j > 0) expect(grid[i]![j]).not.toBe(grid[i]![j - 1]);
        if (i > 0) expect(grid[i]![j]).not.toBe(grid[i - 1]![j]);
      }
    }
  });

  it('BMI: a body with no species has no index and reads healthy', () => {
    const c = makeStuff(() => new Creature());
    expect(c.bodyMassIndex()).toBeNull();
    expect(c.bodyMassIndexBand()).toBe('healthy');
  });

  it('BMI: 70 kg on 1.75 m is healthy; the bands sit at 18.5 / 25 / 30', () => {
    const c = makeStuff(() => new Creature());
    vi.spyOn(c, 'getSpecies').mockReturnValue({
      getStature: () => 1.75,
    } as unknown as ReturnType<Creature['getSpecies']>);
    c.setMass(Quantity.of(70, 'kg'));
    expect(c.bodyMassIndex()).toBeCloseTo(22.9, 1);
    expect(c.bodyMassIndexBand()).toBe('healthy');
    c.setMass(Quantity.of(55, 'kg'));
    expect(c.bodyMassIndexBand()).toBe('underweight');
    c.setMass(Quantity.of(80, 'kg'));
    expect(c.bodyMassIndexBand()).toBe('overweight');
    c.setMass(Quantity.of(95, 'kg'));
    expect(c.bodyMassIndexBand()).toBe('obese');
  });

  it('⭐ density falls as flesh rises — fat floats', () => {
    const c = makeStuff(() => new Creature());
    set(c, 'flesh', 10);
    const thin = c.getBodyDensity().rawValue();
    set(c, 'flesh', 95);
    const fat = c.getBodyDensity().rawValue();
    expect(thin).toBeGreaterThan(fat);
    expect(fat).toBeGreaterThan(900);
    expect(thin).toBeLessThan(1100);
  });

  it('⭐⭐ the stocks reach mass: a fresh body is exactly its frame; a worked body has moved', () => {
    const c = makeStuff(() => new Creature());
    c.setMass(Quantity.of(70, 'kg'));
    expect(c.getMass().rawValue()).toBe(70);
    set(c, 'lean', 70);
    expect(c.getMass().rawValue()).toBeCloseTo(70 + 0.25 * 20, 6);
    set(c, 'flesh', 15);
    expect(c.getMass().rawValue()).toBeCloseTo(70 + 5 - 0.3 * 40, 6);
  });

  it('a body with no frame masses nothing whatever its stocks', () => {
    const c = makeStuff(() => new Creature());
    set(c, 'lean', 90);
    expect(c.getMass().rawValue()).toBe(0);
  });
});
