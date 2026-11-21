/**
 * ⭐⭐ The batch is the contents' (matter-model-overlaps D2). A batch's
 * grade, maker, recipe and time made ride its `BulkPayload`, and
 * `BulkableApi.transfer` decides what happens to them:
 *
 * - a fill from empty carries the payload;
 * - a top-up folds the grade to the lower of the two (one side ungraded:
 *   the other's stands) and never re-signs the maker or the recipe;
 * - `faceCheckedS` — the old wall's clock — never rides a pour;
 * - out of a set the drainings take no grade (the mould grades them).
 *
 * And the vessel's own `Graded`/`Crafted` face is never touched: it is the
 * vessel's making, whatever is poured into it.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import Good from '../../stuff/Good';
import { BulkableMixin, type BulkPayload } from '../Bulkable';
import { CraftedMixin, type Crafted } from '../../craft/Crafted';
import { NamedMixin } from '../../description/Named';
import { Grade } from '../../craft/Grade';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

/** A vat-like source / bottle-like target with a making of its own. */
class MarkedVessel extends CraftedMixin(BulkableMixin(Good)) {
  static _mixinName = 'GradeCarryMarkedVessel';
}

/**
 * TS view of a MarkedVessel's grade surface — the inner GradedMixin's
 * members are present at runtime but not surfaced on the anonymous
 * mixin base (the documented Crafted.ts cast pattern).
 */
function marked(v: MarkedVessel): Crafted {
  return v as unknown as Crafted;
}

/** A potter's jug: made, and nameable by its maker while it has no name. */
class Jug extends CraftedMixin(NamedMixin(BulkableMixin(Good))) {
  static _mixinName = 'GradeCarryJug';
}

/** Neither graded nor marked — a mug; a batch's grade still rides into it. */
class PlainVessel extends BulkableMixin(Good) {
  static _mixinName = 'GradeCarryPlainVessel';
}

const WINE = '/stuff/idea/material/_test/grade-carry-wine';
const MAKER = '/platform/agent/Avatar/grade-carry-vintner';
const OTHER = '/platform/agent/Avatar/grade-carry-other';
const COOPER = '/platform/agent/Avatar/grade-carry-cooper';
const POTTER = '/platform/agent/Avatar/grade-carry-potter';

function prime<T extends InstanceType<ReturnType<typeof BulkableMixin>>>(
  v: T,
  amountL: number,
  payload: BulkPayload | null = null,
): T {
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(1, 'L'));
  if (amountL > 0) {
    (v as unknown as { interiorMaterial: string }).interiorMaterial = WINE;
    v.setInteriorAmount(Quantity.of(amountL, 'L'));
    if (payload) slotOf(v).setPayload(payload);
  }
  return v;
}

function makeMaterial(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test wine');
    return m;
  }, WINE);
}

function slotOf(v: unknown) {
  return BulkableApi.slotFor(v as never, undefined)!;
}

function pour(from: unknown, to: unknown, litres: number) {
  return BulkableApi.transfer(slotOf(from), to === null ? null : slotOf(to), {
    kind: 'measure',
    litres,
    mode: 'strict',
  });
}

afterEach(() => StuffApi.clearAll());

describe('the batch rides the payload on BulkableApi.transfer', () => {
  it('a fill from empty carries grade, maker and time made — onto the CONTENTS', () => {
    makeMaterial();
    const vat = prime(makeStuff(() => new MarkedVessel()), 0.8, {
      grade: 'fine',
      maker: MAKER,
      craftedAt: 12345,
    });
    const bottle = prime(makeStuff(() => new MarkedVessel()), 0);

    const res = pour(vat, bottle, 0.5);
    expect(res.applied).toBeCloseTo(0.5, 9);
    const landed = slotOf(bottle).getPayload();
    expect(landed?.grade).toBe('fine');
    expect(landed?.maker).toBe(MAKER);
    expect(landed?.craftedAt).toBe(12345);
    // ⭐ The bottle keeps its own making: nobody made it by filling it.
    expect(bottle.getMaker()).toBe('');
    expect(marked(bottle).getGradeBand()).toBe('fair');
  });

  it('⭐ a fine wine in a poor bottle stays fine, and the bottle stays poor', () => {
    makeMaterial();
    const cask = prime(makeStuff(() => new MarkedVessel()), 0.8, { grade: 'fine', maker: MAKER });
    const bottle = prime(makeStuff(() => new MarkedVessel()), 0);
    marked(bottle).setGrade(Grade.of('poor'));

    pour(cask, bottle, 0.5);
    expect(slotOf(bottle).getPayload()?.grade).toBe('fine');
    expect(marked(bottle).getGradeBand()).toBe('poor');
  });

  it('an ungraded source leaves the contents ungraded and the bottle as it was', () => {
    makeMaterial();
    const jug = prime(makeStuff(() => new PlainVessel()), 0.8);
    const bottle = prime(makeStuff(() => new MarkedVessel()), 0);
    marked(bottle).setGrade(Grade.of('exceptional'));

    const res = pour(jug, bottle, 0.5);
    expect(res.applied).toBeCloseTo(0.5, 9);
    expect(slotOf(bottle).getPayload()?.grade).toBeUndefined();
    expect(marked(bottle).getGradeBand()).toBe('exceptional');
    expect(bottle.getMaker()).toBe('');
  });

  it('a graded batch keeps its grade in a vessel that has none of its own', () => {
    makeMaterial();
    const vat = prime(makeStuff(() => new MarkedVessel()), 0.8, { grade: 'masterful' });
    const mug = prime(makeStuff(() => new PlainVessel()), 0);

    pour(vat, mug, 0.2);
    expect(slotOf(mug).getAmount().rawValue()).toBeCloseTo(0.2, 9);
    expect(slotOf(mug).getPayload()?.grade).toBe('masterful');
  });

  it('a top-up keeps the destination batch\'s maker and time made', () => {
    makeMaterial();
    const vat = prime(makeStuff(() => new MarkedVessel()), 0.8, {
      grade: 'fine',
      maker: MAKER,
      craftedAt: 12345,
    });
    const bottle = prime(makeStuff(() => new MarkedVessel()), 0.3, {
      grade: 'poor',
      maker: OTHER,
      craftedAt: 99,
    });

    const res = pour(vat, bottle, 0.2);
    expect(res.applied).toBeCloseTo(0.2, 9);
    const held = slotOf(bottle).getPayload();
    expect(held?.grade).toBe('poor');
    expect(held?.maker).toBe(OTHER);
    expect(held?.craftedAt).toBe(99);
  });

  // ⭐⭐ Quality is a property of the matter, so a top-up is weakest-link
  // both ways; otherwise pouring a bad cask into a good bottle would leave
  // it reading `fine` — a laundry.
  it('a POOR top-up drags a fine batch down, and never re-signs it', () => {
    makeMaterial();
    const slops = prime(makeStuff(() => new MarkedVessel()), 0.8, { grade: 'poor', maker: OTHER });
    const bottle = prime(makeStuff(() => new MarkedVessel()), 0.3, { grade: 'fine', maker: MAKER });

    pour(slops, bottle, 0.2);
    expect(slotOf(bottle).getPayload()?.grade).toBe('poor');
    // You cannot make somebody else answer for what you poured into their batch.
    expect(slotOf(bottle).getPayload()?.maker).toBe(MAKER);
  });

  it('a top-up never RAISES the batch\'s grade', () => {
    makeMaterial();
    const cask = prime(makeStuff(() => new PlainVessel()), 0.8, { grade: 'masterful' });
    const cup = prime(makeStuff(() => new PlainVessel()), 0.3, { grade: 'fair' });

    pour(cask, cup, 0.2);
    expect(slotOf(cup).getPayload()?.grade).toBe('fair');
  });

  it('with one side ungraded, the other\'s grade stands', () => {
    makeMaterial();
    const cask = prime(makeStuff(() => new PlainVessel()), 0.8, { grade: 'fine' });
    const cup = prime(makeStuff(() => new PlainVessel()), 0.3);

    pour(cask, cup, 0.2);
    expect(slotOf(cup).getPayload()?.grade).toBe('fine');

    const water = prime(makeStuff(() => new PlainVessel()), 0.5);
    pour(water, cup, 0.1);
    expect(slotOf(cup).getPayload()?.grade).toBe('fine');
  });

  it('the old wall\'s clock never rides a pour', () => {
    makeMaterial();
    const vat = prime(makeStuff(() => new PlainVessel()), 0.8, { grade: 'fine', faceCheckedS: 777 });
    const bottle = prime(makeStuff(() => new PlainVessel()), 0);

    pour(vat, bottle, 0.4);
    expect(slotOf(bottle).getPayload()?.grade).toBe('fine');
    expect(slotOf(bottle).getPayload()?.faceCheckedS).toBeUndefined();
  });

  it('⭐ a ferment in a cooper\'s cask leaves the cask the cooper\'s', () => {
    makeMaterial();
    const must = prime(makeStuff(() => new PlainVessel()), 0.8, { grade: 'fine', maker: MAKER });
    const cask = prime(makeStuff(() => new MarkedVessel()), 0);
    cask.stamp({ maker: COOPER, grade: Grade.of('exceptional'), recipe: '', craftedAt: 1 });

    pour(must, cask, 0.6);
    expect(cask.getMaker()).toBe(COOPER);
    expect(marked(cask).getGradeBand()).toBe('exceptional');
    expect(slotOf(cask).getPayload()?.maker).toBe(MAKER);
  });

  it('⭐ filling a potter\'s jug leaves it hers to name', () => {
    makeMaterial();
    const cask = prime(makeStuff(() => new PlainVessel()), 0.8, { grade: 'fine', maker: MAKER });
    const jug = prime(makeStuff(() => new Jug()), 0);
    jug.stamp({ maker: POTTER, grade: Grade.of('fine'), recipe: '', craftedAt: 1 });
    expect(jug.canBeNamedBy(POTTER)).toBe(true);

    pour(cask, jug, 0.5);
    expect(jug.canBeNamedBy(POTTER)).toBe(true);
    expect(jug.canBeNamedBy(MAKER)).toBe(false);
  });

  it('out of a set the drainings take no grade — the mould grades them', () => {
    const wine = makeMaterial();
    const pool = prime(makeStuff(() => new PlainVessel()), 0.8, { grade: 'fine', maker: MAKER });
    const pail = prime(makeStuff(() => new PlainVessel()), 0);

    BulkableApi.transfer(
      slotOf(pool),
      slotOf(pail),
      { kind: 'measure', litres: 0.2, mode: 'lenient' },
      { through: 'set', arrivesAs: wine },
    );
    expect(slotOf(pail).getAmount().rawValue()).toBeCloseTo(0.2, 9);
    expect(slotOf(pail).getPayload()?.grade).toBeUndefined();
    // …but whose they are rides with them.
    expect(slotOf(pail).getPayload()?.maker).toBe(MAKER);
  });
});
