/**
 * D14 — the teleport ripple, and the honest refusal.
 *
 * *Ripple what is ON you; refuse what you are ATTACHED to, and say what
 * blocked it.* Before this, `teleport` moved a rider and left the horse
 * standing, and hitched a cart to nothing — silently, in both cases.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MobileMixin } from '../Mobile';
import { ContainableMixin } from '../Containable';
import { ContainerMixin } from '../Container';
import { SlottedMixin } from '../../slot/Slotted';
import { SlottableMixin } from '../../slot/Slottable';
import { HaulerMixin } from '../../slot/Hauler';
import { Idea } from '../../stuff/Idea';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuff } from '../../security/__tests__/test-setup';
import { cart } from '../../slot/__tests__/haulage-fixtures';
import { massThing } from '../../encumbrance/__tests__/encumbrance-fixtures';

/** A mover that can pull a cart. */
class MobileHauler extends HaulerMixin(MobileMixin(ContainableMixin(Idea))) {
  static _mixinName = 'MobileHauler';
}

/** A mover that can also hold contents — a pack, worn gear. */
class MobileBearer extends ContainerMixin(MobileMixin(ContainableMixin(Idea))) {
  static _mixinName = 'MobileBearer';
}

/** A mount: mobile, and carries occupants in slots. */
class Mount extends SlottedMixin(MobileMixin(ContainableMixin(Idea))) {
  static _mixinName = 'TestMount';
}

/** A rider: mobile, and can occupy somebody else's slot. */
class Rider extends SlottableMixin(MobileMixin(ContainableMixin(Idea))) {
  static _mixinName = 'TestRider';
}

function tworoom(): { locA: CartesianLocation; locB: CartesianLocation } {
  const zone = makeStuff(() => new CartesianZone());
  const locA = makeStuff(() => new CartesianLocation());
  const locB = makeStuff(() => new CartesianLocation());
  zone.addLocation(locA, 0, 0, 0);
  zone.addLocation(locB, 0, 1, 0);
  return { locA, locB };
}

describe('Mobile.teleport — D14', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('⭐⭐ teleporting while HITCHED slips the hitch — you go, the cart stays', () => {
    /*
     * ⚠ It used to REFUSE, which was correct about the data and wrong
     * about the world: it made the spell feel broken rather than the
     * wagon feel heavy, and *"you cannot teleport while holding a rope"*
     * is not a rule anybody would write on purpose.
     *
     * ⭐ Freight still does not teleport — the cost surface is untouched
     * — and the cart is not lost: a parked vehicle vetoes residency
     * eviction, so it is there when you walk back for it.
     */
    const { locA, locB } = tworoom();
    const mover = makeStuff(() => new MobileHauler());
    ContainmentApi.move(mover, locA);
    const c = cart();
    ContainmentApi.move(c, locA);
    mover.hitch(c);

    mover.teleport(locB);

    expect(mover.getContainer()).toBe(locB);
    // The cart stayed, and the coupling is severed at BOTH ends — the
    // dangling ref is what the refusal was really protecting against.
    expect(c.getContainer()).toBe(locA);
    expect(mover.isHitched()).toBe(false);
  });

  it('⭐ teleporting while MOUNTED leaves the saddle — and vacates the slot', () => {
    const { locA, locB } = tworoom();
    const mount = makeStuff(() => new Mount());
    mount.setStaticSlots([{ name: 'mount:1', accepts: 'SlottableMixin' }]);
    ContainmentApi.move(mount, locA);
    const rider = makeStuff(() => new Rider());
    ContainmentApi.move(rider, locA);
    mount.occupy(rider, 'mount:1');

    rider.teleport(locB);

    expect(rider.getContainer()).toBe(locB);
    expect(mount.getContainer()).toBe(locA);
    // ⚠ The slot is free, not still claiming a rider who is elsewhere.
    expect(rider.occupiedSlots().size).toBe(0);
    expect(mount.getAllOccupants().get('mount:1') ?? []).toHaveLength(0);
  });

  it('a MOUNT teleporting carries its rider', () => {
    const { locA, locB } = tworoom();
    const mount = makeStuff(() => new Mount());
    mount.setStaticSlots([{ name: 'mount:1', accepts: 'SlottableMixin' }]);
    ContainmentApi.move(mount, locA);
    const rider = makeStuff(() => new Rider());
    ContainmentApi.move(rider, locA);
    mount.occupy(rider, 'mount:1');

    // The mount is not attached to anything — it is the one attached TO,
    // so nothing is severed and the rider rides along.
    mount.teleport(locB);

    expect(mount.getContainer()).toBe(locB);
    expect(rider.getContainer()).toBe(locB);
    expect(rider.getOccupiedHost()).toBe(mount);
  });

  it('contents — worn gear and a pack — come along as they always did', () => {
    const { locA, locB } = tworoom();
    const mover = makeStuff(() => new MobileBearer());
    ContainmentApi.move(mover, locA);
    const pack = massThing(3);
    ContainmentApi.move(pack, mover);

    mover.teleport(locB);

    expect(mover.getContainer()).toBe(locB);
    expect(pack.getContainer()).toBe(mover);
  });

  it('a silent spawn is unaffected — a fresh avatar is never hitched', () => {
    const { locA } = tworoom();
    const mover = makeStuff(() => new MobileHauler());
    mover.teleport(locA, { silent: true });
    expect(mover.getContainer()).toBe(locA);
  });
});
