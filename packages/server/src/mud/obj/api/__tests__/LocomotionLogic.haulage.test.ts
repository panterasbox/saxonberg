/**
 * The haulage move-time gates in LocomotionApi.canTraverseExit — terrain
 * (wheel-passability) and breakaway (draft vs strain ceiling). The ridden
 * host-resolved path is exercised end-to-end in the Phase-6 integration
 * test (it needs the full mount machinery).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { HaulerMixin } from '../../../lib/slot/Hauler';
import { Idea } from '../../../lib/stuff/Idea';
import CartesianZone from '../../../lib/location/CartesianZone';
import CartesianLocation from '../../../lib/location/CartesianLocation';
import Exit from '../../../lib/boundary/Exit';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { LocomotionApi } from '../../../api/locomotion';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Quantity } from '../../../lib/quantity';
import { buildMode } from '../../../lib/locomotion/__tests__/test-helpers';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import {
  cart,
  walkingHaulingBearer,
} from '../../../lib/slot/__tests__/haulage-fixtures';

// A non-Organism Mobile hauler — passes the bodyPlan gate trivially, so
// terrain tests don't need a species/plan.
class MobileHauler extends HaulerMixin(MobileMixin(ContainableMixin(Idea))) {
  static _mixinName = 'MobileHauler';
}

function groundExit(wheelPassable = true): {
  locA: CartesianLocation;
  exit: Exit;
} {
  const zone = makeStuff(() => new CartesianZone());
  const locA = makeStuff(() => new CartesianLocation());
  const locB = makeStuff(() => new CartesianLocation());
  zone.addLocation(locA, 0, 0, 0);
  zone.addLocation(locB, 0, 1, 0);
  const exit = makeStuff(
    () =>
      new Exit({
        direction: 'north',
        source: locA,
        destination: locB,
        media: ['ground'],
        wheelPassable,
      }),
  );
  return { locA, exit };
}

describe('LocomotionApi haulage gates', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    buildMode('walk');
    buildMode('wheeled');
  });
  afterEach(() => StuffApi.clearAll());

  const walk = () => LocomotionApi.modeOfOrThrow('walk');

  it('terrain: a light cart rolls through a wheel-passable ground exit', () => {
    const { locA, exit } = groundExit(true);
    const mover = makeStuff(() => new MobileHauler());
    ContainmentApi.move(mover, locA);
    mover.hitch(cart(10, 0.03));
    const guard = LocomotionApi.canTraverseExit(mover, exit, walk(), 'north');
    expect(guard.ok).toBe(true);
  });

  it('terrain: a cart is refused at a non-wheel-passable (stairs) exit', () => {
    const { locA, exit } = groundExit(false);
    const mover = makeStuff(() => new MobileHauler());
    ContainmentApi.move(mover, locA);
    mover.hitch(cart(10, 0.03));
    const guard = LocomotionApi.canTraverseExit(mover, exit, walk(), 'north');
    expect(guard.ok).toBe(false);
    expect(guard.ok ? null : guard.gate).toBe('terrain');
  });

  it('a non-hauler walks the same stairs exit fine (gate only fires for carts)', () => {
    const { locA, exit } = groundExit(false);
    const mover = makeStuff(() => new MobileHauler()); // not hitched
    ContainmentApi.move(mover, locA);
    const guard = LocomotionApi.canTraverseExit(mover, exit, walk(), 'north');
    expect(guard.ok).toBe(true);
  });

  it('breakaway: a cart over the strain ceiling won\'t budge', () => {
    const { locA, exit } = groundExit(true);
    const bearer = walkingHaulingBearer(70); // capacity 35, ceiling 70
    ContainmentApi.move(bearer, locA);
    bearer.hitch(cart(200, 0.5)); // draft 100 > 70
    const guard = LocomotionApi.canTraverseExit(bearer, exit, walk(), 'north');
    expect(guard.ok).toBe(false);
    expect(guard.ok ? null : guard.gate).toBe('breakaway');
  });

  it('breakaway: a cart under the ceiling rolls', () => {
    const { locA, exit } = groundExit(true);
    const bearer = walkingHaulingBearer(70); // ceiling 70
    ContainmentApi.move(bearer, locA);
    bearer.hitch(cart(20, 0.5)); // draft 10 < 70
    const guard = LocomotionApi.canTraverseExit(bearer, exit, walk(), 'north');
    expect(guard.ok).toBe(true);
  });

  it('exhaustion lowers the budge threshold (a fresh cart later won\'t budge)', () => {
    const { locA, exit } = groundExit(true);
    const bearer = walkingHaulingBearer(70); // fresh ceiling 70
    ContainmentApi.move(bearer, locA);
    bearer.hitch(cart(100, 0.5)); // draft 50 — rolls when fresh

    expect(
      LocomotionApi.canTraverseExit(bearer, exit, walk(), 'north').ok,
    ).toBe(true);

    // Drain endurance to the floor → the endurance margin shaves capacity,
    // so the strain ceiling drops below the cart's draft (no new code).
    bearer.adjustReserve('endurance', Quantity.of(-100, '%'));
    const guard = LocomotionApi.canTraverseExit(bearer, exit, walk(), 'north');
    expect(guard.ok).toBe(false);
    expect(guard.ok ? null : guard.gate).toBe('breakaway');
  });
});
