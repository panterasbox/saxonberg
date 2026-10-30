/**
 * ⭐⭐ One damage record (review R2-D1): a body's flaws are its damage, its
 * condition is wear × integrity, a rivet is a mend recorded once, and a
 * fault in the making is a ceiling on the grade.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import Material from '../Material';
import { DurableMixin, type MendRecord } from '../Durable';
import { GradedMixin } from '../../craft/Graded';
import { Grade } from '../../craft/Grade';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import '../../../platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Jug extends DurableMixin(GradedMixin(Good)) {
  static _mixinName = 'TestIntegrityJug';
}

let now = 1_000;
let stoneware: Material;

function jug(): Jug {
  return makeStuff(() => {
    const j = new Jug();
    j.setMass(Quantity.of(1, 'kg'));
    j.setMaterial(stoneware);
    return j;
  });
}

const rivet = (at: number): MendRecord => ({
  at,
  by: '/test/agent/tinker',
  byName: 'the tinker',
  band: 'competent',
  discipline: 'pottery',
  kind: 'riveted',
  result: 'sound',
});

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  WorldClockApi._setNowProviderForTesting(() => now);
  stoneware = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('integrity-stoneware');
    m.setTags(['ceramic', 'fired', 'brittle']);
    m.setDensity(Quantity.of(2300, 'kg/m³'));
    m.setToughness(Quantity.of(7, 'MJ/m³'));
    m.setHardness(Quantity.of(600, 'MPa'));
    return m;
  }, '/test/idea/material/integrity-stoneware') as unknown as Material;
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('one damage record (review R2-D1)', () => {
  it('a cracked jug reads worn: condition is wear × integrity', () => {
    const j = jug();
    expect(j.getCondition()).toBe(1);
    j.addFlaw('crack', true);
    expect(j.getIntegrity()).toBeCloseTo(0.5, 9);
    expect(j.getCondition()).toBeCloseTo(0.5, 9);
    expect(j.getWearCondition()).toBe(1);
    expect(j.getConditionWord()).toBe('worn');
    j.setCondition(0.5); // worn by use as well
    expect(j.getCondition()).toBeCloseTo(0.25, 9);
    expect(j.getConditionWord()).toBe('badly worn');
  });

  it('enough damage breaks it — capability lost, still in one piece', () => {
    const j = jug();
    j.addFlaw('crack', true);
    j.addFlaw('crack', true);
    expect(j.getCondition()).toBeLessThanOrEqual(0.1);
    expect(j.isBroken()).toBe(true);
    expect(j.isDestroyed()).toBe(false);
  });

  it('⭐ a rivet is a mend recorded ONCE: the cracks before it read mended, a crack after it does not', () => {
    const j = jug();
    const gameNow = (): number => WorldClockApi.getNow().rawValue();
    j.addFlaw('crack', false); // a hidden crack, now
    now = 2_000_000;
    j.recordMend(rivet(gameNow()));
    const [mended] = j.getFlaws();
    expect(mended?.mended).toBe('riveted');
    expect(mended?.visible).toBe(true); // the staples show
    expect(j.getCondition()).toBeCloseTo(0.75, 9); // a riveted crack costs half
    now = 3_000_000;
    j.addFlaw('crack', true);
    expect(j.getFlaws()[1]?.mended).toBeUndefined();
    expect(j.getCondition()).toBeCloseTo(0.25, 9);
  });

  it('a worn jug is weaker under a blow — strength reads the same condition', () => {
    const fresh = jug();
    const worn = jug();
    worn.setCondition(0.5);
    expect(worn.impactStrengthJ()).toBeCloseTo(fresh.impactStrengthJ() * 0.5, 6);
  });
});

describe('a fault in the making is a ceiling on the grade', () => {
  it('a misrun is at most poor; shrinkage at most fair; a sound casting keeps its made grade', () => {
    const misrun = jug();
    misrun.setGrade(Grade.of('fine'));
    misrun.addFlaw('misrun', true);
    expect(misrun.getGrade().getBand()).toBe('poor');
    const porous = jug();
    porous.setGrade(Grade.of('fine'));
    porous.addFlaw('shrinkage', true);
    expect(porous.getGrade().getBand()).toBe('fair');
    expect(porous.getGradeBand()).toBe('fine'); // the made band is kept
    expect(porous.getCondition()).toBe(1); // not damage
  });

  it('⚠ a grade read and written back does not fall again (a ceiling, never a drop)', () => {
    const porous = jug();
    porous.setGrade(Grade.of('fine'));
    porous.addFlaw('shrinkage', true);
    for (let i = 0; i < 3; i++) porous.setGrade(porous.getGrade());
    expect(porous.getGrade().getBand()).toBe('fair');
  });
});
