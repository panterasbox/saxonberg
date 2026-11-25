/**
 * ⭐ Parts that change (organism-biology D7): a severed part is a thing in
 * the world (a corpse of its subtree); a claw regrows at the moult unless
 * the stump was burned; a burn aimed at a stump seals it and lands on what
 * is there; a row may author a body already missing a part.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { TemplatePaths } from '../../paths';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { standMaterials, TEST_TISSUES } from '../../material/__tests__/materials';
import { setFlatParts } from '../../species/__tests__/flat-body';
import type { Trauma } from '../../../platform/idea/Condition';

const FLESH = '/stuff/idea/material/tissue/flesh';
let seq = 0;

function crab(moult = 60): Creature {
  const id = seq++;
  const plan = makeStuffAtPath(() => new BodyPlan(), `/stuff/idea/species/BodyPlan/_test-crab-${id}`);
  setFlatParts(plan, [
    { key: 'body.torso', parent: null, tissues: [{ tissuePath: FLESH, share: 0.8 }] },
    { key: 'body.claw.left', parent: 'body.torso', severable: true, regrows: 'moult', tissues: [{ tissuePath: FLESH, share: 0.1 }] },
    { key: 'body.claw.right', parent: 'body.torso', severable: true, tissues: [{ tissuePath: FLESH, share: 0.1 }] },
  ]);
  const sp = makeStuffAtPath(() => {
    const s = new Species();
    s._bodyPlanPath = plan.getTemplatePath();
    s.setMoultEveryDays(moult);
    return s;
  }, `/stuff/idea/species/_test/crab-${id}`);
  const c = makeStuff(() => new Creature());
  c._speciesPath = sp.getTemplatePath();
  c.setLifecycleState('alive');
  return c;
}

describe('parts that change', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    standMaterials(TEST_TISSUES);
    WorldClockApi._setNowProviderForTesting(() => 9_000_000_000);
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      makeStuffAtPath(() => new WorldClockRegistry(), TemplatePaths.worldClockRegistry);
    }
  });
  afterEach(() => {
    StuffApi.clearAll();
    WorldClockApi._resetForTesting();
  });

  it('⭐ a claw lost before the moult comes back after it', () => {
    const c = crab();
    c.setAge(10);
    c.severPart('body.claw.left');
    expect(c.getPart('body.claw.left')?.missing).toBe(true);
    c.setAge(70);
    expect(c.capacity('consciousness')).toBeDefined(); // a read reconciles
    expect(c.getPart('body.claw.left')?.missing).toBe(false);
  });

  it('⭐ a burned stump never regrows; a part that does not regrow stays gone', () => {
    const c = crab();
    c.setAge(10);
    c.severPart('body.claw.left');
    c.afflict({ kind: 'trauma', type: 'burn', site: 'body.claw.left', severity: 2, mechanism: 'heat' } as Trauma);
    c.severPart('body.claw.right');
    c.setAge(70);
    c.capacity('consciousness');
    expect(c.getPart('body.claw.left')?.missing).toBe(true);
    expect(c.getPart('body.claw.right')?.missing).toBe(true);
  });

  it('⭐ a burn aimed at a stump lands on the part that is there (P3)', () => {
    const c = crab();
    c.severPart('body.claw.left');
    c.afflict({ kind: 'trauma', type: 'burn', site: 'body.claw.left', severity: 2, mechanism: 'heat' } as Trauma);
    const burn = c.getConditions().find((x) => x.kind === 'trauma') as Trauma;
    expect(burn.site).toBe('body.torso');
    expect(c.getLostParts()).toEqual([expect.objectContaining({ part: 'body.claw.left', sealed: 'heat' })]);
  });

  it('⭐ a row may author a body already missing a part (applied once, at mint)', () => {
    const c = crab();
    c.seedLostParts([{ part: 'body.claw.right', atAgeDays: 5 }]);
    expect(c.getPart('body.claw.right')?.missing).toBe(true);
    expect(c.getLostParts()[0]).toEqual({ part: 'body.claw.right', atAgeDays: 5 });
  });

  it('⭐⭐ a body restricted to a part reads only that part', () => {
    const c = crab();
    c.afflict({ kind: 'trauma', type: 'laceration', site: 'body.torso', severity: 1, mechanism: 'edge' } as Trauma);
    c.afflict({ kind: 'trauma', type: 'laceration', site: 'body.claw.left', severity: 1, mechanism: 'edge' } as Trauma);
    c.restrictToSubtree('body.claw.left');
    expect(c.getSubtree()).toBe('body.claw.left');
    expect(c.getParts().filter((p) => !p.missing).map((p) => p.key)).toEqual(['body.claw.left']);
    expect(c.getConditions().filter((x) => x.kind === 'trauma').map((x) => (x as Trauma).site)).toEqual(['body.claw.left']);
  });
});
