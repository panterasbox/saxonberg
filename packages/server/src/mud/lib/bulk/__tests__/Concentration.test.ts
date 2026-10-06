/**
 * ⭐⭐ The volume-weighted blend, promoted out of `DissolvedToxins` when it
 * got a sibling and a third call site.
 *
 * ⚠ **Every number here is worked out by hand in the test**, never read
 * off the implementation — the subtractive-colour lesson: a blend you did
 * not compute yourself is a blend you are asserting from the code you are
 * checking.
 *
 * The load-bearing fact is the DILUTION, in both directions. Everything
 * downstream rests on it: the cut is a skill because a bad foreshot
 * poured into a lot of clean spirit is weaker but not gone, and blending
 * is worth doing because a peated malt vatted into grain spirit is
 * fainter but still peated.
 */

import { describe, it, expect } from 'vitest';
import { Concentration } from '../Concentration';

describe('Concentration.blend', () => {
  it('carries a set across at strength into an empty destination', () => {
    // 2 L at 100 mg/L meeting nothing: still 100 mg/L.
    const out = Concentration.blend([{ type: 'methanol', amount: 100 }], 2, [], 0);
    expect(out).toEqual([{ type: 'methanol', amount: 100 }]);
  });

  it('dilutes a one-sided type by volume — the anti-laundering rule read backwards', () => {
    // 30 mL of 1000 mg/L foreshots into 720 mL of clean spirit.
    // 1000 × 0.03 / 0.75 = 40 exactly.
    const out = Concentration.blend(
      [{ type: 'methanol', amount: 1000 }],
      0.03,
      [],
      0.72,
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.type).toBe('methanol');
    expect(out[0]?.amount).toBeCloseTo(40, 10);
  });

  it('does not clean a dose by decanting it into a clean vessel', () => {
    // 1 L at 300 into an EMPTY 0 L destination is still 300 — the pour
    // cannot be used as a wash.
    const out = Concentration.blend([{ type: 'methanol', amount: 300 }], 1, undefined, 0);
    expect(out[0]?.amount).toBeCloseTo(300, 10);
  });

  it('sums two sides of one type by volume', () => {
    // 0.3 L at 435 + 0.45 L at 40:
    //   (435 × 0.3 + 40 × 0.45) / 0.75 = (130.5 + 18) / 0.75 = 198
    const out = Concentration.blend(
      [{ type: 'methanol', amount: 435 }],
      0.3,
      [{ type: 'methanol', amount: 40 }],
      0.45,
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.amount).toBeCloseTo(198, 10);
  });

  it('keeps distinct types distinct, each diluted by its own side', () => {
    // 1 L of smoke-30 meeting 3 L of oak-8:
    //   smoke → 30 × 1 / 4 = 7.5 ; oak → 8 × 3 / 4 = 6
    const out = Concentration.blend(
      [{ type: 'smoke', amount: 30 }],
      1,
      [{ type: 'oak', amount: 8 }],
      3,
    );
    const by = new Map(out.map((t) => [t.type, t.amount]));
    expect(by.get('smoke')).toBeCloseTo(7.5, 10);
    expect(by.get('oak')).toBeCloseTo(6, 10);
  });

  it('drops a non-positive amount rather than carrying a zero tag', () => {
    const out = Concentration.blend([{ type: 'smoke', amount: 0 }], 1, [], 0);
    expect(out).toEqual([]);
  });

  it('returns a copy of the incoming set when there is no volume at all', () => {
    const input = [{ type: 'smoke', amount: 5 }];
    const out = Concentration.blend(input, 0, [], 0);
    expect(out).toEqual(input);
    expect(out[0]).not.toBe(input[0]);
  });

  it('aliases neither input — the result is fresh tags', () => {
    const a = [{ type: 'smoke', amount: 10 }];
    const b = [{ type: 'oak', amount: 10 }];
    const out = Concentration.blend(a, 1, b, 1);
    for (const tag of out) tag.amount = 999;
    expect(a[0]?.amount).toBe(10);
    expect(b[0]?.amount).toBe(10);
  });

  it('reconciles a non-amount field by filling gaps, never averaging', () => {
    // ⚠ `labileAtK` is a physical constant of the substance, so two sets
    // naming one type cannot honestly disagree. The side that HAS it
    // wins; an average of 400 and nothing would be a number that is
    // wrong in a way that still looks like an answer.
    const out = Concentration.blend(
      [{ type: 'lectin', amount: 100 }],
      1,
      [{ type: 'lectin', amount: 100, labileAtK: 373 }],
      1,
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.amount).toBeCloseTo(100, 10);
    expect((out[0] as { labileAtK?: number }).labileAtK).toBe(373);
  });

  it('keeps the first answer when both sides name the same field', () => {
    const out = Concentration.blend(
      [{ type: 'lectin', amount: 10, labileAtK: 350 }],
      1,
      [{ type: 'lectin', amount: 10, labileAtK: 373 }],
      1,
    );
    expect((out[0] as { labileAtK?: number }).labileAtK).toBe(350);
  });
});

describe('Concentration.isClean', () => {
  it('is clean for nothing, an empty set, and a set of zeroes', () => {
    expect(Concentration.isClean(undefined)).toBe(true);
    expect(Concentration.isClean(null)).toBe(true);
    expect(Concentration.isClean([])).toBe(true);
    expect(Concentration.isClean([{ type: 'smoke', amount: 0 }])).toBe(true);
  });

  it('is not clean when any amount is positive', () => {
    expect(
      Concentration.isClean([
        { type: 'smoke', amount: 0 },
        { type: 'oak', amount: 0.001 },
      ]),
    ).toBe(false);
  });
});
