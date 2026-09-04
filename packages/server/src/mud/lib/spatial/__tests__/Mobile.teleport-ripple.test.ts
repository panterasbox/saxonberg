/**
 * D14 — the teleport ripple, and the honest refusal.
 *
 * *Ripple what is ON you; refuse what you are ATTACHED to, and say what
 * blocked it.* Before this, `teleport` moved a rider and left the horse
 * standing, and hitched a cart to nothing — silently, in both cases.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MobileMixin, TeleportRefused } from '../Mobile';
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

  it('refuses while hitched, and names the cart', () => {
    const { locA, locB } = tworoom();
    const mover = makeStuff(() => new MobileHauler());
    ContainmentApi.move(mover, locA);
    const c = cart();
    ContainmentApi.move(c, locA);
    mover.hitch(c);

    expect(mover.teleportBlockedBy()).toBe(c.getPresentation());
    expect(() => mover.teleport(locB)).toThrow(TeleportRefused);
    try {
      mover.teleport(locB);
    } catch (err) {
      expect((err as TeleportRefused).blockedBy).toBe(c.getPresentation());
    }
    // Nothing moved — the refusal is before the move, not after it.
    expect(mover.getContainer()).toBe(locA);
    expect(c.getContainer()).toBe(locA);
  });

  it('refuses while mounted, and names the mount', () => {
    const { locA, locB } = tworoom();
    const mount = makeStuff(() => new Mount());
    mount.setStaticSlots([{ name: 'mount:1', accepts: 'SlottableMixin' }]);
    ContainmentApi.move(mount, locA);
    const rider = makeStuff(() => new Rider());
    ContainmentApi.move(rider, locA);
    mount.occupy(rider, 'mount:1');

    expect(rider.teleportBlockedBy()).toBe(mount.getPresentation());
    expect(() => rider.teleport(locB)).toThrow(/attached to/);
    expect(rider.getContainer()).toBe(locA);
  });

  it('a MOUNT teleporting carries its rider', () => {
    const { locA, locB } = tworoom();
    const mount = makeStuff(() => new Mount());
    mount.setStaticSlots([{ name: 'mount:1', accepts: 'SlottableMixin' }]);
    ContainmentApi.move(mount, locA);
    const rider = makeStuff(() => new Rider());
    ContainmentApi.move(rider, locA);
    mount.occupy(rider, 'mount:1');

    // The mount is not attached to anything — it is the one attached TO.
    expect(mount.teleportBlockedBy()).toBeNull();
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
    expect(mover.teleportBlockedBy()).toBeNull();
    mover.teleport(locA, { silent: true });
    expect(mover.getContainer()).toBe(locA);
  });
});
