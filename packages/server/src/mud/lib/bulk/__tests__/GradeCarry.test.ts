/**
 * The grade seam (fermentation D6/W0): `BulkableApi.transfer` carries a
 * graded batch's identity — grade band, and the maker's mark — from the
 * source holder onto a freshly filled destination. Ungraded sources and
 * unmarkable targets leave the transfer exactly as before, and a top-up
 * into a non-empty vessel keeps the destination's own identity (the
 * payload rule, applied to identity).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import Thing from '../../stuff/Thing';
import { BulkableMixin } from '../Bulkable';
import { CraftedMixin, type Crafted } from '../../craft/Crafted';
import { GradedMixin } from '../../craft/Graded';
import { Grade } from '../../craft/Grade';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

/** A vat-like source / bottle-like target: graded AND markable. */
class MarkedVessel extends CraftedMixin(BulkableMixin(Thing)) {
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

/** Graded but not Crafted — band carries, no mark to hold. */
class GradedVessel extends GradedMixin(BulkableMixin(Thing)) {
  static _mixinName = 'GradeCarryGradedVessel';
}

/** Neither — the pre-seam vessel; transfers must be unchanged. */
class PlainVessel extends BulkableMixin(Thing) {
  static _mixinName = 'GradeCarryPlainVessel';
}

const WINE = '/stuff/idea/material/_test/grade-carry-wine';
const MAKER = '/stuff/agent/_test/grade-carry-vintner';

function prime<T extends InstanceType<ReturnType<typeof BulkableMixin>>>(
  v: T,
  amountL: number,
): T {
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(1, 'L'));
  if (amountL > 0) {
    (v as unknown as { interiorMaterial: string }).interiorMaterial = WINE;
    v.setInteriorAmount(Quantity.of(amountL, 'L'));
  }
  return v;
}

function makeMaterial(): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test wine');
    return m;
  }, WINE);
}

function pour(from: unknown, to: unknown, litres: number) {
  const fromSlot = BulkableApi.slotFor(from as never, undefined)!;
  const toSlot = to === null ? null : BulkableApi.slotFor(to as never, undefined)!;
  return BulkableApi.transfer(fromSlot, toSlot, {
    kind: 'measure',
    litres,
    mode: 'strict',
  });
}

afterEach(() => StuffApi.clearAll());

describe('the grade seam on BulkableApi.transfer', () => {
  it('vat→bottle stamps both the band and the maker\'s mark', () => {
    makeMaterial();
    const vat = prime(makeStuff(() => new MarkedVessel()), 0.8);
    vat.stamp({
      maker: MAKER,
      grade: Grade.of('fine'),
      recipe: 'test-red-wine',
      craftedAt: 12345,
    });
    const bottle = prime(makeStuff(() => new MarkedVessel()), 0);

    const res = pour(vat, bottle, 0.5);
    expect(res.applied).toBeCloseTo(0.5, 9);
    expect(marked(bottle).getGradeBand()).toBe('fine');
    expect(bottle.getMaker()).toBe(MAKER);
    expect(bottle.getRecipe()).toBe('test-red-wine');
    expect(bottle.getCraftedAt()).toBe(12345);
  });

  it('an ungraded source leaves the target unchanged', () => {
    makeMaterial();
    const jug = prime(makeStuff(() => new PlainVessel()), 0.8);
    const bottle = prime(makeStuff(() => new MarkedVessel()), 0);
    marked(bottle).setGrade(Grade.of('exceptional')); // pre-set; must survive

    const res = pour(jug, bottle, 0.5);
    expect(res.applied).toBeCloseTo(0.5, 9);
    expect(marked(bottle).getGradeBand()).toBe('exceptional');
    expect(bottle.getMaker()).toBe('');
  });

  it('a graded source into an unmarkable target carries nothing and still transfers', () => {
    makeMaterial();
    const vat = prime(makeStuff(() => new MarkedVessel()), 0.8);
    marked(vat).setGrade(Grade.of('fine'));
    const mug = prime(makeStuff(() => new PlainVessel()), 0);

    const res = pour(vat, mug, 0.5);
    expect(res.applied).toBeCloseTo(0.5, 9);
    const slot = BulkableApi.slotFor(mug, undefined)!;
    expect(slot.getAmount().rawValue()).toBeCloseTo(0.5, 9);
  });

  it('a merely-Graded pair carries the band and no mark', () => {
    makeMaterial();
    const cask = prime(makeStuff(() => new GradedVessel()), 0.8);
    cask.setGrade(Grade.of('masterful'));
    const cup = prime(makeStuff(() => new GradedVessel()), 0);

    pour(cask, cup, 0.2);
    expect(cup.getGradeBand()).toBe('masterful');
  });

  it('a top-up into a non-empty vessel keeps the destination\'s identity', () => {
    makeMaterial();
    const vat = prime(makeStuff(() => new MarkedVessel()), 0.8);
    vat.stamp({
      maker: MAKER,
      grade: Grade.of('fine'),
      recipe: 'test-red-wine',
      craftedAt: 12345,
    });
    const bottle = prime(makeStuff(() => new MarkedVessel()), 0.3);
    bottle.stamp({
      maker: '/stuff/agent/_test/other-maker',
      grade: Grade.of('poor'),
      recipe: 'plonk',
      craftedAt: 99,
    });

    const res = pour(vat, bottle, 0.2);
    expect(res.applied).toBeCloseTo(0.2, 9);
    expect(marked(bottle).getGradeBand()).toBe('poor');
    expect(bottle.getMaker()).toBe('/stuff/agent/_test/other-maker');
  });
});
