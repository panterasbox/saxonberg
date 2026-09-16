/**
 * VitalsMixin anatomy — the instance-delta → BodyPlan resolution chain,
 * per-part tissue composition, and the coarse part→slot coupling (a
 * missing part disables the slots it enables).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
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
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 8 }],
    },
    {
      key: 'body.arm.left',
      parent: 'body.torso',
      severable: true,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', mass: 3 }],
    },
    {
      key: 'body.arm.left.hand',
      parent: 'body.arm.left',
      severable: true,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 0.4 }],
    },
    {
      key: 'body.torso.heart',
      parent: 'body.torso',
      governs: ['heartRate'],
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', mass: 0.3 }],
    },
  ]);
  stampTemplatePathForTest(plan, '/stuff/idea/species/BodyPlan/test-biped');

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, '/stuff/idea/species/test/anatomical');

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
    expect(creature.getPart('body.torso.heart')?.governs?.[0]).toBe(
      'heartRate',
    );
  });

  it('reads per-part tissue composition', () => {
    const creature = anatomicalCreature();
    const arm = creature.getPart('body.arm.left');
    expect(arm?.tissues).toEqual([
      { tissuePath: '/stuff/idea/material/tissue/muscle', mass: 3 },
    ]);
  });

  it('returns [] for a body with no species/bodyplan', () => {
    const bare = makeStuff(() => new Creature());
    expect(bare.getParts()).toEqual([]);
  });

  it('an instance delta marks a part missing → injured + slot disabled', () => {
    const creature = anatomicalCreature();
    expect(creature.getMissingParts()).toEqual([]);
    expect(creature.isSlotDisabledByAnatomy('grip')).toBe(false);

    creature.bodyPartDeltas['body.arm.left.hand'] = { missing: true };

    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(true);
    expect(creature.getMissingParts().map((p) => p.key)).toEqual([
      'body.arm.left.hand',
    ]);
    expect(creature.isSlotDisabledByAnatomy('grip')).toBe(true);
  });

  it('⭐ interiority is a PREDICATE — a governing organ is inside you', () => {
    const creature = anatomicalCreature();
    const plan = creature.getSpecies()!.getBodyPlan()!;
    expect(plan.isInterior('body.torso.heart')).toBe(true);
    expect(plan.isInterior('body.arm.left.hand')).toBe(false);
    expect(plan.isInterior('body.torso')).toBe(false);
  });

  it('⭐⭐ a CONDUIT is interior even though it governs nothing — the spine', () => {
    // The case that made interiority a method instead of an inline field
    // read. The spine governs no sign and no capacity; it is inside you
    // because the arm's control runs through it. Without this it would be
    // an exterior part — counted in the surface-fraction walk, expected to
    // be covered by a garment, and colder for having no sleeve.
    const plan = makeStuff(() => new BodyPlan());
    plan.setName('test-spined');
    plan.setBodyParts([
      { key: 'body.torso', parent: null, tissues: [] },
      { key: 'body.torso.spine', parent: 'body.torso', tissues: [] },
      {
        key: 'body.arm.left',
        parent: 'body.torso',
        innervatedBy: ['body.torso.spine'],
        tissues: [],
      },
    ]);
    expect(plan.isInterior('body.torso.spine')).toBe(true);
    expect(plan.isInterior('body.arm.left')).toBe(false);
  });

  it('⚠ a typo in `governs` THROWS at registration — never an inert organ', () => {
    const plan = makeStuff(() => new BodyPlan());
    expect(() =>
      plan.setBodyParts([
        { key: 'body.torso', parent: null, tissues: [] },
        {
          key: 'body.torso.heart',
          parent: 'body.torso',
          governs: ['hartRate'],
          tissues: [],
        },
      ]),
    ).toThrow(/governs unknown key 'hartRate'/);
  });

  it('`governs` accepts a CAPACITY as well as a vital sign', () => {
    const plan = makeStuff(() => new BodyPlan());
    expect(() =>
      plan.setBodyParts([
        { key: 'body.torso', parent: null, tissues: [] },
        {
          key: 'body.torso.lungs',
          parent: 'body.torso',
          governs: ['respiratoryRate', 'respiration'],
          tissues: [],
        },
      ]),
    ).not.toThrow();
  });

  it('⚠ `serves` is capacities ONLY — a vital sign is not a thing a limb is for', () => {
    const plan = makeStuff(() => new BodyPlan());
    expect(() =>
      plan.setBodyParts([
        { key: 'body.torso', parent: null, tissues: [] },
        {
          key: 'body.leg.left',
          parent: 'body.torso',
          serves: ['heartRate'],
          tissues: [],
        },
      ]),
    ).toThrow(/serves unknown capacity 'heartRate'/);
  });

  it('⭐ `serves` does NOT make a part interior — a hand must stay coverable', () => {
    const plan = makeStuff(() => new BodyPlan());
    plan.setBodyParts([
      { key: 'body.torso', parent: null, tissues: [] },
      {
        key: 'body.arm.left.hand',
        parent: 'body.torso',
        serves: ['manipulation'],
        tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 0.4 }],
      },
    ]);
    expect(plan.isInterior('body.arm.left.hand')).toBe(false);
    // …and therefore it still carries a share of the external surface.
    expect(plan.getPartSurfaceFraction('body.arm.left.hand')).toBeGreaterThan(0);
  });

  it('interior parts carry NO share of the external surface', () => {
    const creature = anatomicalCreature();
    const plan = creature.getSpecies()!.getBodyPlan()!;
    expect(plan.getPartSurfaceFraction('body.torso.heart')).toBe(0);
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
