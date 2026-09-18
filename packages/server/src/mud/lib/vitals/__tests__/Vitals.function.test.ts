/**
 * ⭐⭐ The function axis — what a wound COSTS, as opposed to what it is.
 *
 * The three claims this pins:
 *
 * 1. **min along the supply path.** A part is only as good as its own
 *    tissue, the limb it hangs off, and the conduits that reach it. A cut
 *    spine takes a perfectly healthy hand with it.
 * 2. **`governs` is min, `serves` is mean.** One brain, so losing it loses
 *    the capacity; two legs, so losing one is a hobble.
 * 3. **byte-parity at the threshold the boolean rule used** — a 0.5
 *    fracture greys the slot exactly as it did before.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { StuffApi } from '../../../api/stuff';
import type { Trauma } from '../../../platform/idea/Condition';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

let seq = 0;

/** A body with a brain, a spine, two arms/hands and two legs. */
function person(): Creature {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('test-person');
  plan.setSlots([
    { name: 'hand:left', accepts: 'WieldableMixin', bodyPart: 'body.arm.left.hand' },
    { name: 'hand:right', accepts: 'WieldableMixin', bodyPart: 'body.arm.right.hand' },
  ]);
  plan.setBodyParts([
    { key: 'body.torso', parent: null, tissues: [] },
    { key: 'body.head', parent: 'body.torso', tissues: [] },
    {
      key: 'body.head.brain',
      parent: 'body.head',
      governs: ['consciousness'],
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 1.3 }],
    },
    { key: 'body.torso.spine.upper', parent: 'body.torso', tissues: [] },
    { key: 'body.torso.spine.lower', parent: 'body.torso.spine.upper', tissues: [] },
    {
      key: 'body.arm.left',
      parent: 'body.torso',
      innervatedBy: ['body.torso.spine.upper'],
      tissues: [],
    },
    {
      key: 'body.arm.left.hand',
      parent: 'body.arm.left',
      serves: ['manipulation'],
      tissues: [],
    },
    {
      key: 'body.arm.right',
      parent: 'body.torso',
      innervatedBy: ['body.torso.spine.upper'],
      tissues: [],
    },
    {
      key: 'body.arm.right.hand',
      parent: 'body.arm.right',
      serves: ['manipulation'],
      tissues: [],
    },
    {
      key: 'body.leg.left',
      parent: 'body.torso',
      serves: ['locomotion'],
      severable: true,
      innervatedBy: ['body.torso.spine.lower'],
      tissues: [],
    },
    {
      key: 'body.leg.right',
      parent: 'body.torso',
      serves: ['locomotion'],
      severable: true,
      innervatedBy: ['body.torso.spine.lower'],
      tissues: [],
    },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/fn-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/fn-${id}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}

function wound(type: Trauma['type'], site: string, severity: number): Trauma {
  return { kind: 'trauma', type, site, severity };
}

describe('the function axis — functionAt', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('an untouched body reads `full` everywhere', () => {
    const c = person();
    expect(c.functionAt('body.arm.left.hand')).toBe('full');
    expect(c.functionAt('body.leg.left')).toBe('full');
  });

  it('a wound costs the part it sits on, at its own type weight', () => {
    const c = person();
    // fracture 1.2/severity: 0.5 → 0.4 → exactly the `impaired` edge.
    c.afflict(wound('fracture', 'body.arm.left.hand', 0.5));
    expect(c.functionAt('body.arm.left.hand')).toBe('impaired');
  });

  it('⭐⭐ min along the path — a CUT SPINE zeroes a healthy hand', () => {
    const c = person();
    expect(c.functionAt('body.arm.left.hand')).toBe('full');
    // The hand is untouched. The nerve that reaches it is not. ⚠ And the
    // hand authors NO innervation — the ARM names the spine, and the walk
    // carries it down. That is what lets D8 author innervation only where
    // the supply path diverges from the tree.
    c.afflict(wound('laceration', 'body.torso.spine.upper', 3));
    expect(c.functionAt('body.arm.left.hand')).toBe('lost');
  });

  it('⭐⭐ …and WHERE the spine is cut decides how much goes — the real rule', () => {
    // Nobody authored this and it is the best thing in the wave: the lower
    // spine hangs off the upper, so a HIGH cut takes the arms and the legs
    // and a LOW cut takes only the legs. Quadriplegia and paraplegia, out
    // of two `parent` edges and a min.
    const high = person();
    high.afflict(wound('laceration', 'body.torso.spine.upper', 3));
    expect(high.functionAt('body.arm.left.hand')).toBe('lost');
    expect(high.functionAt('body.leg.left')).toBe('lost');

    const low = person();
    low.afflict(wound('laceration', 'body.torso.spine.lower', 3));
    expect(low.functionAt('body.leg.left')).toBe('lost');
    expect(low.functionAt('body.arm.left.hand')).toBe('full');
  });

  it('⭐ a conduit TOLERATES a scratch — a graze paralyses nothing', () => {
    const c = person();
    c.afflict(wound('laceration', 'body.torso.spine.upper', 0.8));
    expect(c.functionAt('body.arm.left.hand')).toBe('full');
  });

  it('⭐ the parent chain IS the supply path — a crushed arm cuts the hand', () => {
    const c = person();
    // Nobody authored an edge from hand to arm; the tree already says it.
    c.afflict(wound('fracture', 'body.arm.left', 3));
    expect(c.functionAt('body.arm.left.hand')).toBe('lost');
    expect(c.functionAt('body.arm.right.hand')).toBe('full');
  });

  it('⚠ the ROOT contributes nothing — a chest wound does not weaken your hands', () => {
    const c = person();
    c.afflict(wound('laceration', 'body.torso', 4));
    expect(c.functionAt('body.arm.left.hand')).toBe('full');
  });

  it('a missing part is `lost`, with no wound needed', () => {
    const c = person();
    c.severPart('body.leg.left');
    expect(c.functionAt('body.leg.left')).toBe('lost');
  });
});

describe('the function axis — capacity', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('⭐⭐ `governs` is MIN — one brain, and consciousness goes with it', () => {
    const c = person();
    expect(c.capacity('consciousness')).toBe('full');
    // ⚠ A contusion is the cheapest weight there is (0.1) — a concussion
    // at severity 6 is `impaired`, not `lost`, and that is correct. It
    // takes a real brain injury to take the capacity.
    c.afflict(wound('contusion', 'body.head.brain', 6));
    expect(c.capacity('consciousness')).toBe('impaired');
    c.afflict(wound('laceration', 'body.head.brain', 4));
    expect(c.capacity('consciousness')).toBe('lost');
    expect(c.getConsciousness()).toBe('unconscious');
  });

  it('⭐⭐ `serves` is MEAN — one leg gone is a hobble, not a halt', () => {
    const c = person();
    c.severPart('body.leg.left');
    // 0 and 1 → 0.5 → `impaired`. The body still walks.
    expect(c.capacity('locomotion')).toBe('impaired');
    expect(c.canBearWeight()).toBe(true);
  });

  it('…and both legs gone IS a halt', () => {
    const c = person();
    c.severPart('body.leg.left');
    c.severPart('body.leg.right');
    expect(c.capacity('locomotion')).toBe('lost');
    expect(c.canBearWeight()).toBe(false);
  });

  it('⭐ one wound upstream of BOTH legs takes locomotion whole', () => {
    const c = person();
    c.afflict(wound('fracture', 'body.torso.spine.lower', 3.5));
    expect(c.capacity('locomotion')).toBe('lost');
  });

  it('a capacity nothing governs or serves reads `full` — data, not a guard', () => {
    // This body has no organ running circulation. That is a fact about the
    // species, and the honest answer is that it cannot lose what it never
    // had — not a throw, and not zero.
    const c = person();
    expect(c.capacity('circulation')).toBe('full');
    expect(c.capacity('clearance')).toBe('full');
  });
});

describe('the function axis — the slot consumers', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('⭐ byte-parity: a 0.5 fracture greys the slot exactly as before', () => {
    const c = person();
    expect(c.isSlotImpairedByCondition('hand:left')).toBe(false);
    const f = wound('fracture', 'body.arm.left.hand', 0.5);
    c.afflict(f);
    // 1 − 0.5 × 1.2 = 0.4 — the `impaired` edge, and `canGrip` holds there.
    expect(c.isSlotImpairedByCondition('hand:left')).toBe(false);
    f.severity = 0.6;
    expect(c.isSlotImpairedByCondition('hand:left')).toBe(true);
  });

  it('a slot with no anatomy behind it is never refused', () => {
    const c = person();
    expect(c.canGrip('no-such-slot')).toBe(true);
  });

  it('the refusal NAMES the part and the wound', () => {
    const c = person();
    c.afflict(wound('fracture', 'body.arm.left.hand', 3));
    const why = c.slotRefusalReason('hand:left');
    expect(why).toContain('body.arm.left.hand');
    expect(why).toContain('fracture');
  });

  it('…and says the part is GONE when it is gone, not that it is hurt', () => {
    const c = person();
    c.severPart('body.arm.left.hand');
    expect(c.slotRefusalReason('hand:left')).toContain('gone');
  });

  it('an intact slot has no refusal reason at all', () => {
    const c = person();
    expect(c.slotRefusalReason('hand:left')).toBeNull();
  });

  it('⭐ a wound on the ARM refuses the HAND slot — the path, not the site', () => {
    // The old rule compared the trauma's site to the slot's `bodyPart`
    // exactly, so a shattered forearm left the hand gripping happily.
    const c = person();
    c.afflict(wound('fracture', 'body.arm.left', 3));
    expect(c.isSlotImpairedByCondition('hand:left')).toBe(true);
    expect(c.slotRefusalReason('hand:left')).toContain('fracture');
  });
});
