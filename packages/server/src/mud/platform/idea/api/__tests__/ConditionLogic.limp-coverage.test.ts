/**
 * Phase 3 — the limp (LocomotionApi seam).
 *
 * An active foot laceration imposes a severity-gated endurance drain at the
 * universal self-powered traverse chokepoint (`engageAround`), scaling with
 * severity and clearing as the wound heals.
 *
 * (The binary `ConditionApi.isSiteCovered` coverage-presence read is
 * retired — materials-response resolves coverage *degree* through the
 * `inflict` covering stack. See `material-response.inflict.test.ts`.)
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocomotionApi } from '../../../../api/locomotion';
import { LocomotionMode } from '../../LocomotionMode';
import { buildMode } from '../../../../lib/locomotion/__tests__/test-helpers';
import Location from '../../../../lib/stuff/Location';
import Exit from '../../../../lib/boundary/Exit';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import { Creature } from '../../../../lib/creature/Creature';
import { ContainmentApi } from '../../../../api/containment';
import { StuffApi } from '../../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';
import Species from '../../species/Species';
import BodyPlan from '../../species/BodyPlan';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../Condition';

class MobileCreature extends MobileMixin(Creature) {
  static _mixinName = 'MobileCreature';
}

// ⚠⚠ **The fixture now needs an ANATOMY, and that is the point.** The limp
// used to key on the trauma's site STRING (`c.site.startsWith('body.leg')`),
// so it worked on a body with no body plan at all — and equally failed on a
// plan whose legs were not spelled `body.leg.*`. It is now a read of the
// `locomotion` capacity, which a plan DECLARES with `serves`. Every shipped
// plan with legs authors it (biped, quadruped, avian).
let planSeq = 0;
function walker(): MobileCreature {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('test-walker');
  plan.setBodyParts([
    { key: 'body.torso', parent: null, tissues: [] },
    {
      key: 'body.arm.left',
      parent: 'body.torso',
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', mass: 3 }],
    },
    {
      key: 'body.leg.left',
      parent: 'body.torso',
      serves: ['locomotion'],
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', mass: 8 }],
    },
    {
      key: 'body.leg.left.foot',
      parent: 'body.leg.left',
      serves: ['locomotion'],
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 0.8 }],
    },
    {
      key: 'body.leg.right',
      parent: 'body.torso',
      serves: ['locomotion'],
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', mass: 8 }],
    },
    {
      key: 'body.leg.right.foot',
      parent: 'body.leg.right',
      serves: ['locomotion'],
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 0.8 }],
    },
  ]);
  const id = planSeq++;
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/limp-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/limp-${id}`);
  const c = makeStuff(() => new MobileCreature());
  c.setSpecies(species);
  return c;
}

const endurance = (c: Creature): number =>
  c.getReserve('endurance')!.current.rawValue();

function footLaceration(severity: number): Trauma {
  return {
    kind: 'trauma',
    type: 'laceration',
    site: 'body.leg.left.foot',
    severity,
    bleeding: true,
  };
}

describe('the limp — LocomotionApi.engageAround endurance drain', () => {
  let walk: LocomotionMode;
  beforeEach(() => {
    installV1QuantityMarshallers();
    walk = buildMode('walk');
  });
  afterEach(() => StuffApi.clearAll());

  function exitBetween(from: Location, to: Location): Exit {
    return makeStuff(
      () => new Exit({ direction: 'north', source: from, destination: to })
    );
  }

  async function traverse(a: MobileCreature): Promise<number> {
    const here = a.getContainer() as Location;
    const there = makeStuff(() => new Location());
    const before = endurance(a);
    await LocomotionApi.engageAround(
      a,
      walk,
      exitBetween(here, there),
      async () => {}
    );
    return before - endurance(a);
  }

  it('a foot laceration drains endurance on traverse, scaling with severity', async () => {
    const here = makeStuff(() => new Location());

    const light = walker();
    ContainmentApi.move(light, here);
    light.afflict(footLaceration(1));
    const dropLight = await traverse(light);
    expect(dropLight).toBeGreaterThan(0);

    const heavy = walker();
    ContainmentApi.move(heavy, here);
    heavy.afflict(footLaceration(2));
    const dropHeavy = await traverse(heavy);
    expect(dropHeavy).toBeGreaterThan(dropLight);
  });

  it('an unwounded body pays no limp cost', async () => {
    const here = makeStuff(() => new Location());
    const a = walker();
    ContainmentApi.move(a, here);
    expect(await traverse(a)).toBe(0);
  });

  it('the limp clears when the wound heals (severity 0)', async () => {
    const here = makeStuff(() => new Location());
    const a = walker();
    ContainmentApi.move(a, here);
    const wound = footLaceration(1.5);
    a.afflict(wound);
    expect(await traverse(a)).toBeGreaterThan(0);

    wound.severity = 0; // healed
    expect(await traverse(a)).toBe(0);
  });

  it('a non-locomotor (arm) laceration does not limp', async () => {
    const here = makeStuff(() => new Location());
    const a = walker();
    ContainmentApi.move(a, here);
    a.afflict({
      kind: 'trauma',
      type: 'laceration',
      site: 'body.arm.left.hand',
      severity: 2,
      bleeding: true,
    });
    expect(await traverse(a)).toBe(0);
  });
});
