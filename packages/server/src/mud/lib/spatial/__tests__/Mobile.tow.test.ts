/**
 * The haulage tow — a hitched cart (and its cargo) follows the hauler
 * through an exit on the hauler's own traverse, riding the conveyance
 * ripple region of Mobile.traverse. The raw move stays encumbrance-free;
 * a non-hauler leaves room objects untouched.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MobileMixin } from '../Mobile';
import { ContainableMixin } from '../Containable';
import { HaulerMixin } from '../../slot/Hauler';
import { Idea } from '../../stuff/Idea';
import CartesianZone from '../../../obj/location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import Exit from '../../boundary/Exit';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuff } from '../../security/__tests__/test-setup';
import { cart } from '../../slot/__tests__/haulage-fixtures';
import { massThing } from '../../encumbrance/__tests__/encumbrance-fixtures';

// A mover that is both Mobile and a Hauler (the cart-puller).
class MobileHauler extends HaulerMixin(MobileMixin(ContainableMixin(Idea))) {
  static _mixinName = 'MobileHauler';
}

function tworoom(): { locA: CartesianLocation; locB: CartesianLocation; exit: Exit } {
  const zone = makeStuff(() => new CartesianZone());
  const locA = makeStuff(() => new CartesianLocation());
  const locB = makeStuff(() => new CartesianLocation());
  zone.addLocation(locA, 0, 0, 0);
  zone.addLocation(locB, 0, 1, 0);
  const exit = makeStuff(
    () => new Exit({ direction: 'north', source: locA, destination: locB }),
  );
  return { locA, locB, exit };
}

describe('Mobile.traverse — the tow', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('a hitched cart and its cargo follow the hauler as a unit', async () => {
    const { locA, locB, exit } = tworoom();
    const mover = makeStuff(() => new MobileHauler());
    ContainmentApi.move(mover, locA);
    const c = cart();
    ContainmentApi.move(c, locA);
    const chest = massThing(60);
    ContainmentApi.move(chest, c);
    mover.hitch(c);

    await mover.traverse(exit, 'walk');

    expect(mover.getContainer()).toBe(locB);
    expect(c.getContainer()).toBe(locB); // cart towed
    expect(chest.getContainer()).toBe(c); // cargo rode inside the cart
  });

  it('a non-hauling mover leaves room objects behind', async () => {
    const { locA, locB, exit } = tworoom();
    const mover = makeStuff(() => new MobileHauler());
    ContainmentApi.move(mover, locA);
    const c = cart();
    ContainmentApi.move(c, locA); // present but NOT hitched

    await mover.traverse(exit, 'walk');

    expect(mover.getContainer()).toBe(locB);
    expect(c.getContainer()).toBe(locA); // stays put
  });
});
