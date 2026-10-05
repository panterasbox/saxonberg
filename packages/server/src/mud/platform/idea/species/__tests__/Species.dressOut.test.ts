/**
 * ⭐⭐ `Species.dressOut` — **one yield model, because there used to be
 * two.**
 *
 * Before the carcass-chain build the game had two `butcher` verbs. The
 * stockyard's read a module-level table of five hardcoded fractions and
 * scaled the meat line by the animal's condition; the kitchen's read this
 * field's unit counts and scaled nothing. An animal therefore gave
 * different things depending on which verb you typed at it, and neither
 * answer was the species'.
 *
 * These tests pin the law rather than any species: the counted shape
 * passes through untouched, the dressed shape is `liveKg × fraction ×
 * finish` split into `units` pieces, and `conditioned: false` is the real
 * fact that a hide and a skeleton are the size the animal IS and not the
 * shape it is in.
 *
 * ⚠ And they pin what `dressOut` deliberately does NOT do: the butcher's
 * skill and the floor of one piece belong where the competence band is
 * read, because they are facts about the hand and not about the animal.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Species from '../Species';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';

const MEAT = '/stuff/thing/items/stew-meat';
const HIDE = '/trade/ranching/thing/hide';

function species(lines: Parameters<Species['setButcheryYield']>[0]): Species {
  const s = makeStuff(() => new Species());
  s.setButcheryYield(lines);
  return s;
}

beforeEach(() => StuffApi.clearAll());
afterEach(() => StuffApi.clearAll());

describe('the counted shape — unchanged', () => {
  it('passes a fraction-less line through with no mass', () => {
    const s = species([{ cut: MEAT, units: 3 }]);
    expect(s.dressOut({ liveKg: 70, fleshPct: 55 })).toEqual([
      { cut: MEAT, units: 3, kgEach: null },
    ]);
  });

  it('is indifferent to the weight and the condition', () => {
    const s = species([{ cut: MEAT, units: 3 }]);
    expect(s.dressOut({ liveKg: 0 })).toEqual(
      s.dressOut({ liveKg: 550, fleshPct: 95 }),
    );
  });

  it('yields nothing at all when the species authors nothing', () => {
    expect(species([]).dressOut({ liveKg: 70 })).toEqual([]);
  });
});

describe('the dressed shape — size and condition pay off', () => {
  it('splits liveKg x fraction x finish across the units', () => {
    const s = species([{ cut: MEAT, units: 12, fraction: 0.4 }]);
    // finish(55) = 0.55 + 25/90 = 0.8278
    const line = s.dressOut({ liveKg: 70, fleshPct: 55 })[0]!;
    expect(line.units).toBe(12);
    expect(line.kgEach).toBeCloseTo((70 * 0.4 * (0.55 + 25 / 90)) / 12, 2);
  });

  it('a bigger animal gives more off the same line (AC3)', () => {
    const s = species([{ cut: MEAT, units: 12, fraction: 0.4 }]);
    const ewe = s.dressOut({ liveKg: 70, fleshPct: 55 })[0]!.kgEach!;
    const cow = s.dressOut({ liveKg: 550, fleshPct: 55 })[0]!.kgEach!;
    expect(cow).toBeGreaterThan(ewe * 7);
  });

  it('a finished animal gives more than a thin one (AC3)', () => {
    const s = species([{ cut: MEAT, units: 12, fraction: 0.4 }]);
    const thin = s.dressOut({ liveKg: 70, fleshPct: 20 })[0]!.kgEach!;
    const fat = s.dressOut({ liveKg: 70, fleshPct: 95 })[0]!.kgEach!;
    expect(fat).toBeGreaterThan(thin);
    // ⭐ **The curve SATURATES at the top**, which is the shipped figure
    // and the interesting half of it: `finish` is clamped to 1, so
    // everything from about flesh 93 upward dresses the same. Feeding a
    // beast past finished buys nothing, and the decision the dial is
    // actually asking is *did you get it to finished at all* — a thin
    // animal loses more than half its carcass.
    expect(thin / fat).toBeCloseTo(0.55 + (20 - 30) / 90, 2);
    expect(s.dressOut({ liveKg: 70, fleshPct: 100 })[0]!.kgEach).toBe(fat);
  });

  it('an unstated condition is the ordinary animal, not a perfect one', () => {
    const s = species([{ cut: MEAT, units: 12, fraction: 0.4 }]);
    expect(s.dressOut({ liveKg: 70 })[0]!.kgEach).toBe(
      s.dressOut({ liveKg: 70, fleshPct: 55 })[0]!.kgEach,
    );
    expect(s.dressOut({ liveKg: 70 })[0]!.kgEach).toBeLessThan(
      s.dressOut({ liveKg: 70, fleshPct: 100 })[0]!.kgEach!,
    );
  });
});

describe('conditioned: false — the bones are the bones', () => {
  it('ignores condition entirely', () => {
    const s = species([
      { cut: HIDE, units: 1, fraction: 0.08, conditioned: false },
    ]);
    const thin = s.dressOut({ liveKg: 70, fleshPct: 10 })[0]!.kgEach!;
    const fat = s.dressOut({ liveKg: 70, fleshPct: 100 })[0]!.kgEach!;
    expect(thin).toBe(fat);
    expect(thin).toBeCloseTo(70 * 0.08, 2);
  });

  it('still scales with the size of the animal', () => {
    const s = species([
      { cut: HIDE, units: 1, fraction: 0.08, conditioned: false },
    ]);
    expect(s.dressOut({ liveKg: 550 })[0]!.kgEach).toBeGreaterThan(
      s.dressOut({ liveKg: 70 })[0]!.kgEach!,
    );
  });
});

describe('the thresholds', () => {
  it('drops a line that would yield less than a mouthful', () => {
    // A 0.2 kg bird: 4 % of it is 8 grams of suet, which is nothing.
    const s = species([
      { cut: MEAT, units: 2, fraction: 0.4 },
      { cut: '/trade/ranching/thing/suet', units: 1, fraction: 0.04 },
    ]);
    const lines = s.dressOut({ liveKg: 0.2 });
    expect(lines.map((l) => l.cut)).toEqual([MEAT]);
  });

  it('keeps at least one piece of a line it keeps at all', () => {
    const s = species([{ cut: MEAT, units: 0, fraction: 0.4 }]);
    expect(s.dressOut({ liveKg: 70 })[0]!.units).toBe(1);
  });

  it('a weightless body dresses out to nothing rather than throwing', () => {
    const s = species([{ cut: MEAT, units: 12, fraction: 0.4 }]);
    expect(s.dressOut({ liveKg: 0 })).toEqual([]);
  });
});

describe('setButcheryYield refuses a nonsense share', () => {
  it('throws on a percentage authored as a fraction', () => {
    // ⚠ The defect this closes: `fraction: 40` would dress a 70 kg ewe
    // out at 2,800 kg of meat and nothing would say a word.
    const s = makeStuff(() => new Species());
    expect(() =>
      s.setButcheryYield([{ cut: MEAT, units: 12, fraction: 40 }]),
    ).toThrow(/share of live weight/);
  });

  it('throws on zero and on a negative', () => {
    const s = makeStuff(() => new Species());
    expect(() => s.setButcheryYield([{ cut: MEAT, units: 1, fraction: 0 }])).toThrow();
    expect(() => s.setButcheryYield([{ cut: MEAT, units: 1, fraction: -0.4 }])).toThrow();
  });

  it('accepts the counted shape and a legal share', () => {
    const s = makeStuff(() => new Species());
    expect(() =>
      s.setButcheryYield([
        { cut: MEAT, units: 3 },
        { cut: HIDE, units: 1, fraction: 1 },
      ]),
    ).not.toThrow();
  });
});
