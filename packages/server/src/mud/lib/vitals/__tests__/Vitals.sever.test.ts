/**
 * The sever — `VitalsMixin.severPart`, the one writer of
 * `BodyPartDelta.missing`, which shipped as a persisted field nothing ever
 * set.
 *
 * What is pinned here:
 *
 * - the **subtree** goes, not the part (sever the arm, lose the hand);
 * - what the part **held falls** — the slot is vacated and the occupant
 *   lands wherever the body is;
 * - it **persists** through a capture/materialize round-trip, which is what
 *   makes "log out and back in; it is still missing" true;
 * - ⭐ a **vetoed** avulsion severs nothing (D1's whole point — the onset
 *   now runs after `afflict` has accepted the wound).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Thing from '../../stuff/Thing';
import { SlottableMixin } from '../../slot/Slottable';
import { ContainerMixin } from '../../spatial/Container';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import {
  AVULSION_BEHAVIOR,
  HARM_DEFAULTS,
  type Trauma,
} from '../../../platform/idea/Condition';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const SlottableThingBase = SlottableMixin(Thing);
class SlottableThing extends SlottableThingBase {}

const ContainerThingBase = ContainerMixin(Thing);
class Room extends ContainerThingBase {}

/** A Creature with an arm, a hand under it, and a grip slot on the hand. */
function armedCreature(): Creature {
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
  stampTemplatePathForTest(species, '/stuff/idea/species/test/armed');

  const creature = makeStuff(() => new Creature());
  creature.setSpecies(species);
  return creature;
}

function avulsionAt(site: string, severity: number): Trauma {
  return { kind: 'trauma', type: 'avulsion', site, severity };
}

describe('VitalsMixin — severPart', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('takes the part AND every descendant', () => {
    const creature = armedCreature();

    creature.severPart('body.arm.left');

    const missing = creature.getMissingParts().map((p) => p.key).sort();
    expect(missing).toEqual(['body.arm.left', 'body.arm.left.hand']);
    // Nothing above it goes — a lost arm is not a lost torso.
    expect(creature.getPart('body.torso')?.missing).toBe(false);
  });

  it('releases what the lost slot was holding, onto the floor', () => {
    const room = makeStuff(() => new Room());
    const creature = armedCreature();
    const sword = makeStuff(() => new SlottableThing());
    ContainmentApi.move(creature, room);
    ContainmentApi.move(sword, room);
    creature.occupy(sword, 'grip');
    expect(creature.getOccupant('grip')).toBe(sword);

    creature.severPart('body.arm.left.hand');

    // ⭐ The shipped `canOccupy` gate only ever refused NEW occupancy — a
    // severed hand kept its sword. It does not any more.
    expect(creature.getOccupant('grip')).toBeNull();
    expect(sword.getContainer()).toBe(room);
  });

  it('severing the arm also drops what the hand under it held', () => {
    const room = makeStuff(() => new Room());
    const creature = armedCreature();
    const sword = makeStuff(() => new SlottableThing());
    ContainmentApi.move(creature, room);
    ContainmentApi.move(sword, room);
    creature.occupy(sword, 'grip');

    creature.severPart('body.arm.left');

    expect(creature.getOccupant('grip')).toBeNull();
  });

  it('is idempotent, and ignores a part the plan does not have', () => {
    const creature = armedCreature();
    creature.severPart('body.arm.left.hand');
    creature.severPart('body.arm.left.hand');
    creature.severPart('body.wing.left');
    expect(creature.getMissingParts().map((p) => p.key)).toEqual([
      'body.arm.left.hand',
    ]);
  });

  it('survives a persistence round-trip — the loss is not runtime-only', () => {
    const creature = armedCreature();
    creature.severPart('body.arm.left.hand');

    // `bodyPartDeltas` is `{persistent, runtimeState}`, so the capture the
    // login path uses carries it. Assert the SHAPE that rides — serialize
    // it, wipe the live state as a logout would, and restore.
    const captured = JSON.parse(
      JSON.stringify(creature.bodyPartDeltas),
    ) as Record<string, { missing?: boolean }>;
    expect(captured['body.arm.left.hand']?.missing).toBe(true);

    creature.bodyPartDeltas = {};
    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(false);

    creature.bodyPartDeltas = captured;
    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(true);
    expect(creature.isSlotDisabledByAnatomy('grip')).toBe(true);
  });

  it('a missing leg costs the limp even with no wound left', () => {
    // The limp sums WOUND severity, and a severed part carries none — so
    // without the missing-part term a body walks off a lost leg.
    const plan = makeStuff(() => new BodyPlan());
    plan.setName('test-walker');
    plan.setBodyParts([
      {
        key: 'body.torso',
        parent: null,
        tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 8 }],
      },
      {
        key: 'body.leg.left',
        parent: 'body.torso',
        severable: true,
        tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', mass: 9 }],
      },
      {
        key: 'body.leg.left.foot',
        parent: 'body.leg.left',
        severable: true,
        tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 1 }],
      },
    ]);
    stampTemplatePathForTest(plan, '/stuff/idea/species/BodyPlan/test-walker');
    const species = makeStuff(() => new Species());
    species.setBodyPlan(plan);
    stampTemplatePathForTest(species, '/stuff/idea/species/test/walker');
    const creature = makeStuff(() => new Creature());
    creature.setSpecies(species);

    const before = creature.getReserve('endurance')?.current.rawValue() ?? 0;
    creature.severPart('body.leg.left');
    creature.drainForLimp();
    const after = creature.getReserve('endurance')?.current.rawValue() ?? 0;

    // One loss, not two — the foot went with the leg and is not counted
    // again.
    expect(before - after).toBeCloseTo(
      HARM_DEFAULTS.LIMP_DRAIN_PER_SEVERITY * HARM_DEFAULTS.LIMP_MISSING_SEVERITY,
      5,
    );
  });
});

describe('AVULSION_BEHAVIOR — the sever gate', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('severs at or above SEVER_SEVERITY on a severable part', () => {
    const creature = armedCreature();
    const t = avulsionAt('body.arm.left.hand', HARM_DEFAULTS.SEVER_SEVERITY);
    AVULSION_BEHAVIOR.onset(creature, t);
    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(true);
  });

  it('does NOT sever below the threshold — a severe wound is still a wound', () => {
    const creature = armedCreature();
    const t = avulsionAt('body.arm.left.hand', HARM_DEFAULTS.SEVER_SEVERITY - 0.5);
    AVULSION_BEHAVIOR.onset(creature, t);
    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(false);
    // …and it still bleeds like the severe laceration it is.
    expect(t.bleeding).toBe(true);
  });

  it('does NOT sever an unseverable part however bad the wound', () => {
    const creature = armedCreature();
    const t = avulsionAt('body.torso', 99);
    AVULSION_BEHAVIOR.onset(creature, t);
    // ⭐ You cannot lop off somebody's chest. `severable` is authored on
    // limbs and the head, and this is its first production reader.
    expect(creature.getPart('body.torso')?.missing).toBe(false);
  });

  it('floors severity to AVULSION_SEVERITY_FLOOR before the sever gate', () => {
    const creature = armedCreature();
    const t = avulsionAt('body.arm.left.hand', 0.1);
    AVULSION_BEHAVIOR.onset(creature, t);
    expect(t.severity).toBe(HARM_DEFAULTS.AVULSION_SEVERITY_FLOOR);
    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(false);
  });
});
