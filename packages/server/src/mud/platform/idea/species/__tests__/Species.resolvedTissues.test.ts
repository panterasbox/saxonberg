/**
 * `Species.resolvedTissues()` — the plan's topology as proportions of a
 * whole body, which is what a cut's mass and texture are weighted by.
 *
 * ⭐⭐ **The body plan owns the topology.** A sheep and a cow genuinely
 * share which muscles they have and where; this read is how butchery asks
 * for them without caring which animal it is.
 *
 * ⚠ **A per-SPECIES share override is deferred**, and the reason is worth
 * keeping: it was written, tested and then taken back out, because
 * `lint:unconsumed-seams` refused an authored field whose only reader was
 * a derived method in its own file. It lands with the butcher's cut
 * masses — the wave where a pig being a third fat changes something a
 * player can see. The deferred test is kept in the scratchpad for that
 * wave.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Species from '../Species';
import BodyPlan from '../BodyPlan';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

afterEach(() => StuffApi.clearAll());

const FAT = '/stuff/idea/material/food/animal-fat';
const LOIN = '/stuff/idea/material/tissue/muscles/loin';
const BONE = '/stuff/idea/material/tissue/bone';

function speciesWithPlan(): Species {
  const plan = makeStuffAtPath(
    () => new BodyPlan(),
    '/stuff/idea/species/BodyPlan/test-quad',
  );
  plan.setName('test-quad');
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [
        { tissuePath: BONE, share: 0.14 },
        { tissuePath: LOIN, share: 0.3 },
        { tissuePath: FAT, share: 0.06 },
      ],
    },
    {
      key: 'body.leg.left',
      parent: 'body.torso',
      tissues: [{ tissuePath: LOIN, share: 0.5 }],
    },
  ]);
  const sp = makeStuff(() => new Species());
  sp._bodyPlanPath = '/stuff/idea/species/BodyPlan/test-quad';
  return sp;
}

describe('Species.resolvedTissues', () => {
  it('⭐ resolves the plan as proportions summing to 1', () => {
    const sp = speciesWithPlan();
    const sum = sp.resolvedTissues().reduce((a, t) => a + t.share, 0);
    expect(sum).toBeCloseTo(1, 9);
    expect(sp.tissueShareOf(FAT)).toBeCloseTo(0.06, 9);
    // ⭐ A muscle on two parts sums across both — the shoulder comes off
    // both forelegs at once, and so does the loin here.
    expect(sp.tissueShareOf(LOIN)).toBeCloseTo(0.8, 9);
  });

  it('⚠ NORMALISES a partial plan, so a test fixture stays honest', () => {
    // Shipped rows sum to 1 (`lint:anatomy` clause (a)) and the division
    // is identity there; a one-part fixture is still read as proportions
    // rather than as a body that is mostly missing.
    const plan = makeStuffAtPath(
      () => new BodyPlan(),
      '/stuff/idea/species/BodyPlan/test-partial',
    );
    plan.setName('test-partial');
    plan.setBodyParts([
      { key: 'body.torso', parent: null, tissues: [{ tissuePath: LOIN, share: 0.3 }] },
    ]);
    const sp = makeStuff(() => new Species());
    sp._bodyPlanPath = '/stuff/idea/species/BodyPlan/test-partial';
    expect(sp.tissueShareOf(LOIN)).toBeCloseTo(1, 9);
  });

  it('names the parts carrying a tissue', () => {
    const sp = speciesWithPlan();
    expect(sp.partsCarrying(LOIN)).toEqual(['body.torso', 'body.leg.left']);
    expect(sp.partsCarrying(FAT)).toEqual(['body.torso']);
    expect(sp.partsCarrying('/nope')).toEqual([]);
  });

  it('a species with no plan resolves to nothing rather than throwing', () => {
    const sp = makeStuff(() => new Species());
    expect(sp.resolvedTissues()).toEqual([]);
    expect(sp.tissueShareOf(LOIN)).toBe(0);
  });
});
