/**
 * ⭐⭐ The depth ladder — what a blow that got through the skin meets
 * underneath it.
 *
 * Three claims:
 *
 * 1. **Order is cross-section, and it is deterministic.** The biggest
 *    organ under the site is reached first, every time. No roll — a
 *    weighted site pick would be a roll deciding what your action DID,
 *    which `docs/uncertainty.md` bans.
 * 2. **Depth reaches MORE, not merely worse.** Each organ takes a step out
 *    of what is left, so a deeper blow reaches further down the list.
 * 3. **The channel decides what it does to the organ** — and blunt is the
 *    interesting one: hard enough and it tears, otherwise it bruises.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConditionApi } from '../../../../api/condition';
import { Creature } from '../../../../lib/creature/Creature';
import Species from '../../species/Species';
import BodyPlan from '../../species/BodyPlan';
import { StuffApi } from '../../../../api/stuff';
import { TRAUMA_BEHAVIOR } from '../../Condition';
import type { Trauma } from '../../Condition';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

let seq = 0;

/**
 * A torso with three organs of deliberately different mass: liver 1.5 >
 * lungs 1.0 > heart 0.3. The ladder must reach them in that order.
 */
function torsoWithOrgans(): Creature {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('test-torso');
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [
        { tissuePath: '/stuff/idea/material/tissue/bone', mass: 8 },
        { tissuePath: '/stuff/idea/material/tissue/flesh', mass: 20 },
      ],
    },
    {
      key: 'body.torso.liver',
      parent: 'body.torso',
      governs: ['clearance'],
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 1.5 }],
    },
    {
      key: 'body.torso.lungs',
      parent: 'body.torso',
      governs: ['respiration'],
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 1 }],
    },
    {
      key: 'body.torso.heart',
      parent: 'body.torso',
      governs: ['circulation'],
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', mass: 0.3 }],
    },
    // An EXTERIOR child, to prove the ladder ignores it.
    {
      key: 'body.torso.skin',
      parent: 'body.torso',
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 4 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/organs-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/organs-${id}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}

const at = (c: Creature, site: string): Trauma | undefined =>
  c.getConditions().find((x): x is Trauma => x.kind === 'trauma' && x.site === site);

describe('the depth ladder — reaching the interior', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('a shallow wound reaches nothing', () => {
    const c = torsoWithOrgans();
    const out = ConditionApi.inflict(c, {
      mechanism: 'point',
      site: 'body.torso',
      energy: 1.5,
    });
    expect(out.afflicted).toBe(true);
    expect(out.reached).toBeUndefined();
  });

  it('⭐⭐ the LARGEST organ is reached first — liver before heart', () => {
    const c = torsoWithOrgans();
    // Severity 4.5, threshold 2 → excess 2.5 into the first organ.
    const out = ConditionApi.inflict(c, {
      mechanism: 'point',
      site: 'body.torso',
      energy: 4.5,
    });
    expect(out.reached?.[0]?.site).toBe('body.torso.liver');
    expect(out.reached?.[0]?.severity).toBeCloseTo(2.5, 5);
    expect(out.reached?.[0]?.type).toBe('puncture');
    // ⭐ The heart is the SMALLEST and is reached last and least — mass
    // order, and an author changes it by changing a mass.
    expect(out.reached?.map((t) => t.site)).toEqual([
      'body.torso.liver',
      'body.torso.lungs',
      'body.torso.heart',
    ]);
    expect(at(c, 'body.torso.heart')!.severity).toBeLessThan(
      at(c, 'body.torso.liver')!.severity,
    );
  });

  it('⭐ a deeper blow reaches MORE organs, not just a worse first one', () => {
    const c = torsoWithOrgans();
    // excess 5 → liver 5, lungs 4, heart 3.
    const out = ConditionApi.inflict(c, {
      mechanism: 'point',
      site: 'body.torso',
      energy: 7,
    });
    expect(out.reached?.map((t) => t.site)).toEqual([
      'body.torso.liver',
      'body.torso.lungs',
      'body.torso.heart',
    ]);
    expect(out.reached?.map((t) => t.severity)).toEqual([5, 4, 3]);
  });

  it('⚠ an EXTERIOR child of the site is never reached — it is not inside', () => {
    const c = torsoWithOrgans();
    ConditionApi.inflict(c, {
      mechanism: 'point',
      site: 'body.torso',
      energy: 7,
    });
    // `body.torso.skin` is the biggest child by mass after the torso
    // itself, and the ladder correctly never touches it.
    expect(at(c, 'body.torso.skin')).toBeUndefined();
  });

  it('⭐ blunt TEARS an organ when hard enough, and bruises it below', () => {
    const hard = torsoWithOrgans();
    ConditionApi.inflict(hard, {
      mechanism: 'blunt',
      site: 'body.torso',
      energy: 4.5,
    });
    expect(at(hard, 'body.torso.liver')?.type).toBe('rupture');

    const soft = torsoWithOrgans();
    // excess 0.5 — over the no-wound floor, under the rupture threshold.
    ConditionApi.inflict(soft, {
      mechanism: 'blunt',
      site: 'body.torso',
      energy: 2.5,
    });
    expect(at(soft, 'body.torso.liver')?.type).toBe('contusion');
  });

  it('an edge lacerates the organ, as it would skin', () => {
    const c = torsoWithOrgans();
    ConditionApi.inflict(c, {
      mechanism: 'edge',
      site: 'body.torso',
      energy: 4.5,
    });
    expect(at(c, 'body.torso.liver')?.type).toBe('laceration');
  });

  it('a site with no interior children reaches nothing however deep', () => {
    const c = torsoWithOrgans();
    const out = ConditionApi.inflict(c, {
      mechanism: 'point',
      site: 'body.torso.skin',
      energy: 9,
    });
    expect(out.reached).toBeUndefined();
  });

  it('⭐ an interior wound bleeds into the body — the cavity is a floor you cannot see', () => {
    const c = torsoWithOrgans();
    ConditionApi.inflict(c, {
      mechanism: 'blunt',
      site: 'body.torso',
      energy: 4.5,
    });
    const rupture = at(c, 'body.torso.liver');
    expect(rupture?.type).toBe('rupture');
    expect(rupture?.bleeding).toBe(true);
  });

  it('⚠ a rupture cannot be dressed — `resolve` is a no-op, not laceration’s', () => {
    const c = torsoWithOrgans();
    ConditionApi.inflict(c, {
      mechanism: 'blunt',
      site: 'body.torso',
      energy: 4.5,
    });
    const rupture = at(c, 'body.torso.liver')!;
    // Even reaching past the verb and calling resolve directly changes
    // nothing: you cannot put pressure on a liver.
    TRAUMA_BEHAVIOR.rupture.resolve(c, rupture);
    expect(rupture.dressed).toBeUndefined();
    expect(rupture.bleeding).toBe(true);
  });
});
