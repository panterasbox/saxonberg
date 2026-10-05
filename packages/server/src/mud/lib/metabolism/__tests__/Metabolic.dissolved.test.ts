/**
 * ⭐⭐ **A concentration times a volume is a dose** — the one thing that
 * separates a dissolved toxin from every other kind the body already
 * routes.
 *
 * `Material.toxicity` and `BulkPayload.formedToxins` are both PER SERVING:
 * `routeIntake` adds the tag's `amount` once per ingest, whether you took
 * a sip or drained the bottle. That is right for them — a spoiled batch's
 * ptomaine is a dose, and a bean's lectin is a property of beans.
 *
 * It is wrong for a cut. The methanol in a badly-made spirit is mg per
 * litre of what is in the glass, so finishing the bottle must hurt you
 * twenty-five times as much as tasting it. This file is that arithmetic,
 * taken at the digestion pool — the first thing `routeIntake` writes,
 * before absorption has had a chance to blur it.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

function spirit(): Material {
  return makeStuff(() => {
    const m = new Material();
    m.setName('new-make spirit');
    m.setNutrients(['water']);
    m.setEdibility(true);
    return m;
  }) as unknown as Material;
}

const pool = (c: Creature, type: string): number =>
  c.digestionPools[type] ?? 0;

beforeEach(() => installV1QuantityMarshallers());
afterEach(() => StuffApi.clearAll());

describe('a dissolved dose scales with the litres drunk', () => {
  it('⭐ a 30 mL taste of 400 mg/L is 12 mg; the 0.75 L bottle is 300', () => {
    const taster = makeStuff(() => new Creature());
    taster.ingest(spirit(), Quantity.of(0.03, 'L'), 'liquid', {
      dissolvedToxins: [{ type: 'methanol', amount: 400 }],
    } as never);
    expect(pool(taster, 'methanol')).toBeCloseTo(12, 9);

    const drinker = makeStuff(() => new Creature());
    drinker.ingest(spirit(), Quantity.of(0.75, 'L'), 'liquid', {
      dissolvedToxins: [{ type: 'methanol', amount: 400 }],
    } as never);
    expect(pool(drinker, 'methanol')).toBeCloseTo(300, 9);
  });

  it('⛔ and a PER-SERVING formed toxin does NOT scale — the contrast is the point', () => {
    const sip = makeStuff(() => new Creature());
    sip.ingest(spirit(), Quantity.of(0.03, 'L'), 'liquid', {
      formedToxins: [{ type: 'ptomaine', amount: 10 }],
    } as never);
    const gulp = makeStuff(() => new Creature());
    gulp.ingest(spirit(), Quantity.of(0.75, 'L'), 'liquid', {
      formedToxins: [{ type: 'ptomaine', amount: 10 }],
    } as never);

    expect(pool(sip, 'ptomaine')).toBeCloseTo(10, 9);
    expect(pool(gulp, 'ptomaine')).toBeCloseTo(10, 9);
  });

  it('a dose the working destroyed never reaches the pool', () => {
    const eater = makeStuff(() => new Creature());
    eater.ingest(spirit(), Quantity.of(0.5, 'L'), 'liquid', {
      cookedAtK: 370,
      dissolvedToxins: [
        { type: 'botulinum-toxin', amount: 100, labileAtK: 358 },
        { type: 'methanol', amount: 100 },
      ],
    } as never);

    expect(pool(eater, 'botulinum-toxin')).toBe(0);
    expect(pool(eater, 'methanol')).toBeCloseTo(50, 9);
  });

  it('matter with no dissolved field routes exactly as before', () => {
    const eater = makeStuff(() => new Creature());
    eater.ingest(spirit(), Quantity.of(0.5, 'L'), 'liquid', {} as never);
    expect(Object.keys(eater.digestionPools)).not.toContain('methanol');
  });
});
