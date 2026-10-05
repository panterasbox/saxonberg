/**
 * ⭐⭐ The dissolved dose — a toxin concentration that blends by volume on
 * every pour, and scales with how much you drink.
 *
 * Three facts are under test and each one is a decision:
 *
 *   1. **The arithmetic**, computed in the test rather than read off the
 *      implementation (the subtractive-colour lesson: a blend you did not
 *      work out by hand is a blend you are asserting from the code you are
 *      checking).
 *   2. **The laundering case** — tipping a poisoned bottle into a clean
 *      cask does not clean it, and tipping clean spirit into a poisoned
 *      bottle DILUTES it rather than keeping it at strength. The cut is a
 *      skill because of the second half.
 *   3. **The heat filter** — `labileAtK` against the payload's
 *      `cookedAtK`, the same comparison `BlendLabel.toxicityOf` makes.
 *      Methanol authors none; distilling it is how it got there.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import Good from '../../stuff/Good';
import { BulkableMixin } from '../Bulkable';
import { DissolvedToxins } from '../../metabolism/DissolvedToxins';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

class Jar extends BulkableMixin(Good) {
  static _mixinName = 'DissolvedToxinsJar';
}

const SPIRIT = '/stuff/idea/material/_test/dissolved-spirit';

function prime(v: Jar, amountL: number): Jar {
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(5, 'L'));
  if (amountL > 0) {
    (v as unknown as { interiorMaterial: string }).interiorMaterial = SPIRIT;
    v.setInteriorAmount(Quantity.of(amountL, 'L'));
  }
  return v;
}

function makeMaterial(): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test spirit');
    return m;
  }, SPIRIT);
}

function slotOf(v: Jar) {
  return BulkableApi.slotFor(v as never, undefined)!;
}

function pour(from: Jar, to: Jar | null, litres: number) {
  return BulkableApi.transfer(slotOf(from), to === null ? null : slotOf(to), {
    kind: 'measure',
    litres,
    mode: 'strict',
  });
}

function doseOf(v: Jar, type: string): number {
  const tags = new DissolvedToxins(slotOf(v)).raw();
  return tags.find((t) => t.type === type)?.amount ?? 0;
}

afterEach(() => StuffApi.clearAll());

describe('DissolvedToxins.blend — the arithmetic', () => {
  it('30 mL of 1000 mg/L into 720 mL of clean reads 40 mg/L', () => {
    // Worked by hand: (0.03 × 1000 + 0.72 × 0) / 0.75 = 30 / 0.75 = 40.
    const out = DissolvedToxins.blend(
      [{ type: 'methanol', amount: 1000 }],
      0.03,
      [],
      0.72,
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.amount).toBeCloseTo(40, 9);
  });

  it('two populated sides average by volume per type', () => {
    // methanol: (1 × 200 + 3 × 40) / 4 = 320 / 4 = 80
    // ethyl-acetate present on one side only: (1 × 60 + 3 × 0) / 4 = 15
    const out = DissolvedToxins.blend(
      [
        { type: 'methanol', amount: 200 },
        { type: 'ethyl-acetate', amount: 60 },
      ],
      1,
      [{ type: 'methanol', amount: 40 }],
      3,
    );
    const by = new Map(out.map((t) => [t.type, t.amount]));
    expect(by.get('methanol')).toBeCloseTo(80, 9);
    expect(by.get('ethyl-acetate')).toBeCloseTo(15, 9);
  });

  it('a zero total volume keeps the incoming set rather than dividing by zero', () => {
    const out = DissolvedToxins.blend(
      [{ type: 'methanol', amount: 500 }],
      0,
      [],
      0,
    );
    expect(out[0]!.amount).toBeCloseTo(500, 9);
  });

  it('keeps a labile temperature rather than averaging a physical constant', () => {
    const out = DissolvedToxins.blend(
      [{ type: 'botulinum-toxin', amount: 10, labileAtK: 358 }],
      1,
      [{ type: 'botulinum-toxin', amount: 10 }],
      1,
    );
    expect(out[0]!.labileAtK).toBe(358);
    expect(out[0]!.amount).toBeCloseTo(10, 9);
  });
});

describe('the heat filter', () => {
  it('drops a dose the working got hot enough to destroy, and keeps the rest', () => {
    const surviving = DissolvedToxins.surviving(
      [
        { type: 'botulinum-toxin', amount: 10, labileAtK: 358 },
        { type: 'methanol', amount: 400 },
      ],
      370,
    );
    expect(surviving.map((t) => t.type)).toEqual(['methanol']);
  });

  it('keeps a labile dose when the working never reached its temperature', () => {
    const surviving = DissolvedToxins.surviving(
      [{ type: 'botulinum-toxin', amount: 10, labileAtK: 358 }],
      320,
    );
    expect(surviving).toHaveLength(1);
  });
});

describe('the pour — through the real transfer primitive', () => {
  it('a poisoned pour into a clean vessel arrives diluted, not at strength', () => {
    makeMaterial();
    const heads = prime(makeStuff(() => new Jar()), 0.5);
    new DissolvedToxins(slotOf(heads)).stamp([
      { type: 'methanol', amount: 1000 },
    ]);
    const bottle = prime(makeStuff(() => new Jar()), 0);

    pour(heads, bottle, 0.03);
    // An EMPTY destination takes the payload across whole, so the
    // concentration is the source's — that is honest: 30 mL of foreshots
    // in a bottle holding only 30 mL IS 1000 mg/L.
    expect(doseOf(bottle, 'methanol')).toBeCloseTo(1000, 6);

    // Now top it up with clean spirit and the concentration falls.
    const clean = prime(makeStuff(() => new Jar()), 1);
    pour(clean, bottle, 0.72);
    expect(doseOf(bottle, 'methanol')).toBeCloseTo(40, 6);
  });

  it('⭐ decanting is not a laundry — the dose follows the matter', () => {
    makeMaterial();
    const bad = prime(makeStuff(() => new Jar()), 1);
    new DissolvedToxins(slotOf(bad)).stamp([{ type: 'methanol', amount: 600 }]);
    const clean = prime(makeStuff(() => new Jar()), 1);

    // Tip the bad half into the clean half: 1 L at 600 into 1 L at 0.
    pour(bad, clean, 1);
    expect(doseOf(clean, 'methanol')).toBeCloseTo(300, 6);
  });

  it('a clean pour between clean vessels stores no field at all', () => {
    makeMaterial();
    const a = prime(makeStuff(() => new Jar()), 1);
    const b = prime(makeStuff(() => new Jar()), 0.5);
    pour(a, b, 0.5);
    expect(slotOf(b).getPayload()?.dissolvedToxins).toBeUndefined();
  });
});

describe('the payloadForDraw seam', () => {
  it('base policy answers with the slot payload, whatever the litres', () => {
    makeMaterial();
    const jar = prime(makeStuff(() => new Jar()), 1);
    new DissolvedToxins(slotOf(jar)).stamp([{ type: 'methanol', amount: 50 }]);
    const whole = slotOf(jar).payloadForDraw(1);
    const sip = slotOf(jar).payloadForDraw(0.01);
    expect(whole?.dissolvedToxins?.[0]!.amount).toBe(50);
    expect(sip?.dissolvedToxins?.[0]!.amount).toBe(50);
  });
});
