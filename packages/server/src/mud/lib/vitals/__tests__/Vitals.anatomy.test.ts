/**
 * VitalsMixin anatomy — the instance-delta → BodyPlan resolution chain,
 * per-part tissue composition, and the coarse part→slot coupling (a
 * missing part disables the slots it enables).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../obj/species/Species';
import BodyPlan from '../../../obj/species/BodyPlan';
import Thing from '../../stuff/Thing';
import { SlottableMixin } from '../../slot/Slottable';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const SlottableThingBase = SlottableMixin(Thing);
class SlottableThing extends SlottableThingBase {}

/** A Creature whose species has a small anatomical body plan. */
function anatomicalCreature(): Creature {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('test-biped');
  plan.setSlots([
    { name: 'grip', accepts: 'SlottableMixin', bodyPart: 'body.arm.left.hand' },
  ]);
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: '/obj/material/tissue/bone', mass: 8 }],
    },
    {
      key: 'body.arm.left',
      parent: 'body.torso',
      severable: true,
      tissues: [{ tissuePath: '/obj/material/tissue/muscle', mass: 3 }],
    },
    {
      key: 'body.arm.left.hand',
      parent: 'body.arm.left',
      severable: true,
      tissues: [{ tissuePath: '/obj/material/tissue/bone', mass: 0.4 }],
    },
    {
      key: 'body.torso.heart',
      parent: 'body.torso',
      governsVital: 'heartRate',
      tissues: [{ tissuePath: '/obj/material/tissue/muscle', mass: 0.3 }],
    },
  ]);
  stampTemplatePathForTest(plan, '/obj/species/BodyPlan/test-biped');

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, '/obj/species/test/anatomical');

  const creature = makeStuff(() => new Creature());
  creature.setSpecies(species);
  return creature;
}

describe('VitalsMixin — anatomy resolver', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('resolves parts from the species body plan', () => {
    const creature = anatomicalCreature();
    const keys = creature.getParts().map((p) => p.key);
    expect(keys).toContain('body.torso');
    expect(keys).toContain('body.arm.left.hand');
    expect(creature.getPart('body.torso.heart')?.governsVital).toBe(
      'heartRate',
    );
  });

  it('reads per-part tissue composition', () => {
    const creature = anatomicalCreature();
    const arm = creature.getPart('body.arm.left');
    expect(arm?.tissues).toEqual([
      { tissuePath: '/obj/material/tissue/muscle', mass: 3 },
    ]);
  });

  it('returns [] for a body with no species/bodyplan', () => {
    const bare = makeStuff(() => new Creature());
    expect(bare.getParts()).toEqual([]);
  });

  it('an instance delta marks a part missing → injured + slot disabled', () => {
    const creature = anatomicalCreature();
    expect(creature.getInjuredParts()).toEqual([]);
    expect(creature.isSlotDisabledByAnatomy('grip')).toBe(false);

    creature.bodyPartDeltas['body.arm.left.hand'] = { missing: true };

    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(true);
    expect(creature.getInjuredParts().map((p) => p.key)).toEqual([
      'body.arm.left.hand',
    ]);
    expect(creature.isSlotDisabledByAnatomy('grip')).toBe(true);
  });

  it('canOccupy honours the anatomy gate (coarse part→slot coupling)', () => {
    const creature = anatomicalCreature();
    const item = makeStuff(() => new SlottableThing());

    // Intact hand → the grip slot accepts the item.
    expect(creature.canOccupy(item, 'grip')).toBe(true);

    // Sever the hand → its slot is disabled.
    creature.bodyPartDeltas['body.arm.left.hand'] = { missing: true };
    expect(creature.canOccupy(item, 'grip')).toBe(false);
  });
});
