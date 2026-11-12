/**
 * ⭐ Leading is a held rope (size-and-carrying D18): the end in the
 * leader's hand brings the animal at the other end through the way after
 * the leader; the animal's own refusal at the way stops the leader too.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildAllModes } from '../../locomotion/__tests__/test-helpers';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Location from '../../location/Location';
import Exit from '../../boundary/Exit';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuff } from '../../security/__tests__/test-setup';
import { TetherEndMixin } from '../TetherEnd';
import { WieldableMixin } from '../../slot/Wieldable';
import { SlottableMixin } from '../../slot/Slottable';
import Thing from '../../../platform/thing/Thing';
import type { Stuff } from '../../stuff/Stuff';
import { makeBody } from '../../slot/__tests__/carrying-fixture';
import { TieableMixin } from '../Tieable';
import { WearableMixin } from '../../slot/Wearable';

/** A collar: a worn Tieable a lead is made fast to (the W6 halter's shape). */
class Collar extends TieableMixin(WearableMixin(SlottableMixin(Thing))) {}

/** The end of a lead: held, and its line's far end is the animal. */
class LeadEnd extends TetherEndMixin(WieldableMixin(SlottableMixin(Thing))) {
  public animal: Stuff | null = null;
  public override tetheredTo(): Stuff | null {
    return this.animal;
  }
}

function tworoom(): { locA: Location; locB: Location; exit: Exit } {
  const zone = makeStuff(() => new CartesianZone());
  const locA = makeStuff(() => new Location());
  const locB = makeStuff(() => new Location());
  zone.addLocation(locA, 0, 0, 0);
  zone.addLocation(locB, 0, 1, 0);
  const exit = makeStuff(() => new Exit({ direction: 'north', source: locA, destination: locB, media: ['ground'] }));
  return { locA, locB, exit };
}

describe('Mobile.traverse — leading (D18)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    buildAllModes();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  function setup() {
    const { locA, locB, exit } = tworoom();
    const { me, plan } = makeBody();
    const { me: mule } = makeBody({ mass: 300, stature: 1.4, hands: false });
    ContainmentApi.move(me, locA);
    ContainmentApi.move(mule, locA);
    const end = makeStuff(() => new LeadEnd());
    end.setShortDescription('end of a lead');
    end.animal = mule;
    end.setSlotClaims({ [plan]: ['hand:right'] });
    me.seatInSlot(end, 'hand:right');
    return { locA, locB, exit, me, mule, end };
  }

  it('the mule follows the leader through the way', async () => {
    const { locB, exit, me, mule, end } = setup();
    const guard = await me.traverse(exit, 'walk');
    expect(guard.ok).toBe(true);
    expect(me.getContainer()).toBe(locB);
    expect(mule.getContainer()).toBe(locB);
    expect(end.getContainer()).toBe(me);
  });

  it("the mule's own refusal at the way stops the leader", async () => {
    const { locA, exit, me, mule } = setup();
    const real = exit.canTraverse.bind(exit);
    vi.spyOn(exit, 'canTraverse').mockImplementation(async (mover, mode) =>
      mover === mule ? { ok: false, gate: 'clearance', reason: 'the panniers won\'t fit.' } : real(mover, mode),
    );
    const guard = await me.traverse(exit, 'walk');
    expect(guard.ok).toBe(false);
    expect(guard.reason).toMatch(/won't follow you: the panniers won't fit/);
    expect(me.getContainer()).toBe(locA);
    expect(mule.getContainer()).toBe(locA);
  });

  it('a person on a line walks their own way (only a handless body is led)', async () => {
    const { locA, locB, exit, me, end } = setup();
    const { me: diver } = makeBody();
    ContainmentApi.move(diver, locA);
    end.animal = diver;
    await me.traverse(exit, 'walk');
    expect(me.getContainer()).toBe(locB);
    expect(diver.getContainer()).toBe(locA);
  });

  it('⭐ a body with a hand of its own is still LED on a halter (W6: a dog\'s mouth is a hand)', async () => {
    const { locA, locB, exit, me, end } = setup();
    const { me: dog, plan } = makeBody({ mass: 30, stature: 0.6 });
    ContainmentApi.move(dog, locA);
    const collar = makeStuff(() => new Collar());
    collar.setSlotClaims({ [plan]: ['torso'] });
    dog.seatInSlot(collar, 'torso');
    expect(dog.handSlots().length).toBeGreaterThan(0);
    expect(dog.halter()).toBe(collar);
    end.animal = dog;
    await me.traverse(exit, 'walk');
    expect(me.getContainer()).toBe(locB);
    expect(dog.getContainer()).toBe(locB);
  });
});
