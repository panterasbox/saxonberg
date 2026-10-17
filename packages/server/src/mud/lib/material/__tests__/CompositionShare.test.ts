/**
 * ⭐ A share of a bulk that DERIVES from its material's composition
 * (dairy D3): cream is the fat that rose, curd the fat and protein the
 * rennet caught — so ewe's milk gives more of both than cow's, from one
 * row and no per-species authoring.
 */
import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import Material from '../Material';
import { CompositionShare } from '../CompositionShare';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

let seq = 0;
function milk(fat: number, protein: number): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`share-milk-${seq}`);
    m.setNutrientAmounts({ fat, protein, sugar: 48000, water: 870000 });
    return m;
  }, `/stuff/idea/material/_share/milk-${seq}`) as unknown as Material;
}

describe('CompositionShare', () => {
  const cow = milk(34000, 33000);
  const ewe = milk(70000, 55000);
  const goat = milk(41000, 33000);
  const cream = new CompositionShare({ nutrients: { fat: 2.5 } });
  const curd = new CompositionShare({ nutrients: { fat: 1.6, protein: 1.6 } });

  it('cream and curd are monotone in the milk: ewe > goat > cow', () => {
    expect(cream.evaluate(ewe)).toBeGreaterThan(cream.evaluate(goat));
    expect(cream.evaluate(goat)).toBeGreaterThan(cream.evaluate(cow));
    expect(curd.evaluate(ewe)).toBeGreaterThan(curd.evaluate(goat));
    expect(curd.evaluate(goat)).toBeGreaterThan(curd.evaluate(cow));
    // The cow's cream is fat 3.4 % × 2.5.
    expect(cream.evaluate(cow)).toBeCloseTo(0.085, 6);
  });

  it('honours the floor and the cap', () => {
    const tiny = new CompositionShare({ nutrients: { fat: 0.01 }, floor: 0.05 });
    expect(tiny.evaluate(cow)).toBe(0.05);
    const huge = new CompositionShare({ nutrients: { fat: 100 }, cap: 0.4 });
    expect(huge.evaluate(cow)).toBe(0.4);
    // The default cap is 0.9 — a share of everything separates nothing.
    expect(new CompositionShare({ nutrients: { fat: 100 } }).evaluate(cow)).toBe(0.9);
  });

  it('an empty spec is empty and evaluates to its floor', () => {
    const empty = new CompositionShare({ nutrients: {} });
    expect(empty.isEmpty()).toBe(true);
    expect(empty.evaluate(cow)).toBe(0.01);
    expect(empty.evaluate(null)).toBe(0.01);
    expect(cream.isEmpty()).toBe(false);
  });

  it('refuses a bad spec at construction', () => {
    expect(() => new CompositionShare({ nutrients: { fat: -1 } })).toThrow();
    expect(() => new CompositionShare({ nutrients: { fat: 1 }, floor: 0 })).toThrow();
    expect(() => new CompositionShare({ nutrients: { fat: 1 }, cap: 2 })).toThrow();
    expect(
      () => new CompositionShare({ nutrients: { fat: 1 }, floor: 0.5, cap: 0.2 }),
    ).toThrow();
    expect(
      () => new CompositionShare(null as unknown as { nutrients: Record<string, number> }),
    ).toThrow();
  });
});
