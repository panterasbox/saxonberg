/**
 * Haulage integration — the acceptance roster end-to-end with real
 * classes: the self-haul handcart loop (free offload → hitch → tow →
 * stairs blocked → breakaway) and the ridden-haul loop (a horse tows the
 * cart and carries the rider; the rider bears nothing; the host is gated).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../../../lib/creature/Creature';
import Species from '../../../idea/species/Species';
import BodyPlan from '../../../idea/species/BodyPlan';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { SlottableMixin } from '../../../../lib/slot/Slottable';
import { MountableMixin } from '../../../../lib/slot/Mountable';
import { HaulerMixin } from '../../../../lib/slot/Hauler';
import Handcart from '../Handcart';
import CartesianZone from '../../../idea/location/CartesianZone';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import Exit from '../../../../lib/boundary/Exit';
import { Quantity } from '../../../../lib/quantity';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { LocomotionApi } from '../../../../api/locomotion';
import { buildMode } from '../../../../lib/locomotion/__tests__/test-helpers';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';
import { massThing } from '../../../../lib/encumbrance/__tests__/encumbrance-fixtures';

class SelfHauler extends HaulerMixin(MobileMixin(SensorMixin(Creature))) {
  static _mixinName = 'SelfHauler';
}
class Steed extends MountableMixin(
  HaulerMixin(MobileMixin(SensorMixin(Creature))),
) {
  static _mixinName = 'Steed';
}
class Rider extends MobileMixin(SlottableMixin(SensorMixin(Creature))) {
  static _mixinName = 'Rider';
}

let seq = 0;
function bearer<T extends Creature>(factory: () => T, baseMass: number): T {
  const n = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`haul-int-${n}`);
  plan.setBaseMass(baseMass);
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 8 }],
    },
  ]);
  plan.setSlots([
    { name: 'torso', accepts: 'WearableMixin', covers: ['body.torso'] },
    { name: 'back:1', accepts: 'SlottableMixin' },
  ]);
  plan.setLocomotionModes(['walk']);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/haul-int-${n}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/haul-int-${n}`);
  const c = makeStuff(factory);
  c.setSpecies(species);
  return c;
}

function handcart(massKg: number, draftFactor: number): Handcart {
  const c = makeStuff(() => new Handcart());
  c.setMass(Quantity.of(massKg, 'kg'));
  c.setDraftFactor(draftFactor);
  return c;
}

function tworoom() {
  const zone = makeStuff(() => new CartesianZone());
  const locA = makeStuff(() => new CartesianLocation());
  const locB = makeStuff(() => new CartesianLocation());
  zone.addLocation(locA, 0, 0, 0);
  zone.addLocation(locB, 0, 1, 0);
  const north = makeStuff(
    () =>
      new Exit({
        direction: 'north',
        source: locA,
        destination: locB,
        media: ['ground'],
      }),
  );
  const stairs = makeStuff(
    () =>
      new Exit({
        direction: 'up',
        source: locA,
        destination: locB,
        media: ['ground'],
        wheelPassable: false,
        oneWay: true,
      }),
  );
  return { locA, locB, north, stairs };
}

const walk = () => LocomotionApi.modeOfOrThrow('walk');

describe('haulage integration — self-haul', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    buildMode('walk');
    buildMode('wheeled');
  });
  afterEach(() => StuffApi.clearAll());

  it('free offload → hitch → tow (the handcart loop)', async () => {
    const { locA, locB, north } = tworoom();
    const giver = bearer(() => new SelfHauler(), 70);
    ContainmentApi.move(giver, locA);
    const cart = handcart(25, 0.04);
    ContainmentApi.move(cart, locA);

    // Free offload — the chest leaves the giver's books the moment it
    // goes into the cart's container (no haulage code involved).
    const before = giver.getBorneBurden().rawValue();
    const chest = massThing(60);
    ContainmentApi.move(chest, cart);
    expect(giver.getBorneBurden().rawValue()).toBeCloseTo(before);

    giver.hitch(cart);
    await giver.traverse(north, 'walk');

    expect(giver.getContainer()).toBe(locB);
    expect(cart.getContainer()).toBe(locB);
    expect(chest.getContainer()).toBe(cart);
  });

  it('a wheeled cart is blocked at stairs (terrain)', () => {
    const { locA, stairs } = tworoom();
    const giver = bearer(() => new SelfHauler(), 70);
    ContainmentApi.move(giver, locA);
    const cart = handcart(25, 0.04);
    ContainmentApi.move(cart, locA);
    giver.hitch(cart);
    const guard = LocomotionApi.canTraverseExit(giver, stairs, walk(), 'up');
    expect(guard.ok).toBe(false);
    expect(guard.ok ? null : guard.gate).toBe('terrain');
  });

  it("a heavy sledge won't budge (breakaway)", () => {
    const { locA, north } = tworoom();
    const giver = bearer(() => new SelfHauler(), 70); // ceiling 70
    ContainmentApi.move(giver, locA);
    const sledge = handcart(25, 0.5); // bad coupling (dragged)
    ContainmentApi.move(sledge, locA);
    ContainmentApi.move(massThing(200), sledge); // draft (225)*0.5 = 112.5 > 70
    giver.hitch(sledge);
    const guard = LocomotionApi.canTraverseExit(giver, north, walk(), 'north');
    expect(guard.ok).toBe(false);
    expect(guard.ok ? null : guard.gate).toBe('breakaway');
  });
});

describe('haulage integration — ridden (animal-hauled)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    buildMode('walk');
    buildMode('wheeled');
  });
  afterEach(() => StuffApi.clearAll());

  it('the horse tows the cart and carries the rider; the rider bears nothing', async () => {
    const { locA, locB, north } = tworoom();
    const steed = bearer(() => new Steed(), 400); // strong puller
    steed.setMountSlot('back:1');
    ContainmentApi.move(steed, locA);
    const rider = bearer(() => new Rider(), 70);
    steed.occupy(rider, 'back:1'); // mount

    const cart = handcart(25, 0.04);
    ContainmentApi.move(cart, locA);
    const chest = massThing(300); // a load a person couldn't carry
    ContainmentApi.move(chest, cart);
    steed.hitch(cart);

    // The draft lands on the horse, not the rider.
    expect(steed.getHaulDraft().rawValue()).toBeCloseTo((25 + 300) * 0.04);
    expect(rider.getBorneBurden().rawValue()).toBeCloseTo(0);

    await steed.traverse(north, 'walk');

    expect(steed.getContainer()).toBe(locB); // host moved
    expect(rider.getContainer()).toBe(locB); // rider rode along (ripple)
    expect(cart.getContainer()).toBe(locB); // cart towed
    expect(chest.getContainer()).toBe(cart); // cargo rode inside
  });

  it('the horse (the hauler) is gated at stairs', () => {
    const { locA, stairs } = tworoom();
    const steed = bearer(() => new Steed(), 400);
    steed.setMountSlot('back:1');
    ContainmentApi.move(steed, locA);
    const cart = handcart(25, 0.04);
    ContainmentApi.move(cart, locA);
    steed.hitch(cart);
    // The gate that fires for a ridden move is the host's own traverse
    // (the horse is the hauler/traverser).
    const guard = LocomotionApi.canTraverseExit(steed, stairs, walk(), 'up');
    expect(guard.ok).toBe(false);
    expect(guard.ok ? null : guard.gate).toBe('terrain');
  });
});
