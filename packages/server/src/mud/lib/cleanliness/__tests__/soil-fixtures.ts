/**
 * A biped small enough to reason about — a torso, two hands, two legs and
 * two feet — for the cleanliness tests. Covering slots mirror the shipped
 * biped's: torso, hands, feet.
 */

import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Garment from '../../../platform/thing/equipment/Garment';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';

let seq = 0;
const planPaths = new WeakMap<Creature, string>();

export function soilBody(): Creature {
  const n = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`soil-biped-${n}`);
  plan.setBaseMass(70);
  plan.setBaseStature(1.75);
  plan.setSlots([
    { name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body.torso'] },
    {
      name: 'hands',
      accepts: 'WearableMixin',
      capacity: 4,
      covers: ['body.arm.left.hand', 'body.arm.right.hand'],
    },
    {
      name: 'feet',
      accepts: 'WearableMixin',
      capacity: 4,
      covers: ['body.leg.left.foot', 'body.leg.right.foot'],
    },
  ]);
  plan.setBodyParts([
    { key: 'body.torso', parent: null, tissues: [] },
    { key: 'body.arm.left.hand', parent: 'body.torso', serves: ['manipulation'], tissues: [] },
    { key: 'body.arm.right.hand', parent: 'body.torso', serves: ['manipulation'], tissues: [] },
    { key: 'body.leg.left', parent: 'body.torso', serves: ['locomotion'], tissues: [] },
    { key: 'body.leg.left.foot', parent: 'body.leg.left', tissues: [] },
    { key: 'body.leg.right', parent: 'body.torso', serves: ['locomotion'], tissues: [] },
    { key: 'body.leg.right.foot', parent: 'body.leg.right', tissues: [] },
  ]);
  const planPath = `/stuff/idea/species/BodyPlan/soil-${n}`;
  stampTemplatePathForTest(plan, planPath);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/soil-${n}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  planPaths.set(c, planPath);
  return c;
}

/** Put a fresh Garment on `body` in `slot`. */
export function wear(body: Creature, slot: 'torso' | 'hands' | 'feet'): Garment {
  const g = makeStuff(() => new Garment());
  g.setSlotClaim(planPaths.get(body) ?? '', [slot]);
  body.occupyAll(g, [slot]);
  return g;
}
